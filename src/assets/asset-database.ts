import * as THREE from "three/webgpu";
import { GLTF, GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { assetRegistry } from "./assetRegistry";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";
import { AssetType, ColorSpace } from "./assetTypes";
import { AssetRecord, TextureAssetRecord } from "./AssetRecord";
import { AppError, ObjectDisposedError } from "../app-error";
import { Disposable } from "../core/disposable";

const LOAD_TIME_BUDGET_MS = 30;

export enum LoadPhase {
    Load = "LOAD",
    Gpu = "GPU",
}

export type ProgressCallback = (options: {
    phase: LoadPhase;
    record?: AssetRecord;
    completed: number;
    total: number;
}) => void;

export class AudioAsset {
    public readonly id: string;
    public readonly arrayBuffer: ArrayBuffer;

    constructor(id: string, arrayBuffer: ArrayBuffer) {
        this.id = id;
        this.arrayBuffer = arrayBuffer;
    }
}

export class TextureAsset {
    public readonly texture: THREE.Texture | THREE.DataTexture;
    public readonly image?: HTMLImageElement;

    constructor(texture: THREE.Texture | THREE.DataTexture, image?: HTMLImageElement) {
        this.texture = texture;
        this.image = image;
    }
}

export class OggLoader {
    async loadAsync(record: AssetRecord) {
        const response = await fetch(record.url);
        const arrayBuffer = await response.arrayBuffer();
        return new AudioAsset(record.id, arrayBuffer);
    }
}

export type Asset = GLTF | TextureAsset | AudioAsset;
export type AssetConstructor<T extends Asset> = new (...args: any[]) => T;

export class AssetDatabase implements Disposable {
    private gltfLoader = new GLTFLoader();
    private textureLoader = new THREE.TextureLoader();
    private exrLoader = new EXRLoader();
    private oggLoader = new OggLoader();
    private recordsById = new Map<string, AssetRecord>();
    private loadedAssets = new Map<string, Asset>();
    private _disposed = false;

    get disposed() {
        return this._disposed;
    }

    private constructor() {}

    private buildRecordMap() {
        for (const record of assetRegistry) {
            if (this.recordsById.has(record.id)) {
                throw new AppError(`Duplicate asset id"${record.id}".`);
            }

            this.recordsById.set(record.id, record);
        }
    }

    static create() {
        const assetManager = new AssetDatabase();
        assetManager.buildRecordMap();
        return assetManager;
    }

    getAssetsByType<T extends Asset>(assetType: AssetConstructor<T>) {
        const assets: T[] = [];

        for (const asset of [...this.loadedAssets.values()]) {
            if (asset instanceof assetType) {
                assets.push(asset);
            }
        }

        return assets;
    }

    getAsset<T extends Asset>(id: string): T {
        this.throwIfDisposed();

        const asset = this.loadedAssets.get(id);

        if (!asset) {
            throw new AppError(`Asset "${id}" was not loaded.`);
        }

        return asset as T;
    }

    getAssetMetadata(id: string) {
        return this.recordsById.get(id);
    }

    private async createTextureAsset(texture: THREE.Texture | THREE.DataTexture, record: AssetRecord) {
        const textureAssetRecord = record as TextureAssetRecord;
        this.configureTexture(texture, textureAssetRecord);

        if (textureAssetRecord.preloadImage) {
            const image = new Image();

            await new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = reject;
                image.src = textureAssetRecord.url;
            }).catch((error) => {
                throw new AppError("Failed to load image.", { cause: error });
            });

            return new TextureAsset(texture, image);
        }

        return new TextureAsset(texture);
    }

    private async loadAsset(record: AssetRecord) {
        let asset: Asset | null = null;

        switch (record.type) {
            case AssetType.GLB:
                asset = await this.gltfLoader.loadAsync(record.url);
                break;

            case AssetType.PNG:
            case AssetType.JPG:
                const texture = await this.textureLoader.loadAsync(record.url);
                asset = await this.createTextureAsset(texture, record);
                break;

            case AssetType.EXR: {
                const texture = await this.exrLoader.loadAsync(record.url);
                asset = await this.createTextureAsset(texture, record);
                break;
            }
            case AssetType.OGG:
                asset = await this.oggLoader.loadAsync(record);
                break;

            default:
                throw new AppError(`Unsupported asset type: "${record.type}".`);
        }

        // if (asset instanceof THREE.Texture) {
        //     if (textureAssetRecord.preloadImage) {
        //         const image = new Image();
        //         image.src = textureAssetRecord.url;

        //         await new Promise((resolve, reject) => {
        //             image.onload = resolve;
        //             image.onerror = reject;
        //         }).catch((error) => {
        //             throw new AppError("Failed to load image.", { cause: error });
        //         });

        //         this.loadedImages.set(textureAssetRecord.id, image);
        //     }
        // }

        return asset;
    }

    async loadAssets(onProgress: ProgressCallback = () => {}) {
        this.throwIfDisposed();

        const records = [...this.recordsById.values()];
        const total = records.length;
        let completed = 0;

        for (const record of records) {
            const asset = await this.loadAsset(record);
            this.loadedAssets.set(record.id, asset!);
            completed += 1;
            onProgress?.({ phase: LoadPhase.Load, record, completed, total });
        }
    }

    private configureTexture(texture: THREE.Texture, record: TextureAssetRecord) {
        if (record.colorSpace === ColorSpace.SRGB) {
            texture.colorSpace = THREE.SRGBColorSpace;
        } else if (record.colorSpace === ColorSpace.NONE) {
            texture.colorSpace = THREE.NoColorSpace;
        }

        texture.flipY = record.flipY;
        texture.needsUpdate = true;
    }

    async preloadTextures(renderer: THREE.Renderer, onProgress: ProgressCallback = () => {}) {
        this.throwIfDisposed();

        const textures = [];

        for (const record of [...this.recordsById.values()]) {
            if (record instanceof TextureAssetRecord) {
                textures.push({ record, texture: this.getAsset<TextureAsset>(record.id).texture });
            }
        }

        let timestamp = performance.now();

        for (let idx = 0; idx < textures.length; idx += 1) {
            renderer.initTexture(textures[idx].texture as THREE.Texture);

            const currentTimestamp = performance.now();
            if (currentTimestamp - timestamp > LOAD_TIME_BUDGET_MS) {
                timestamp = currentTimestamp;
                await new Promise((resolve) => requestAnimationFrame(resolve));
            }

            onProgress?.({
                phase: LoadPhase.Gpu,
                record: textures[idx].record,
                completed: idx + 1,
                total: textures.length,
            });
        }
    }

    async loadFonts(onProgress: ProgressCallback = () => {}) {
        this.throwIfDisposed();

        const fonts = new Set<string>();

        for (const sheet of document.styleSheets) {
            try {
                for (const rule of sheet.cssRules) {
                    if (!(rule instanceof CSSFontFaceRule)) {
                        continue;
                    }

                    fonts.add(`${rule.style.fontStyle} ${rule.style.fontWeight} 24px ${rule.style.fontFamily}`);
                }
            } catch (error) {
                // There is an issue if browser decides to inject css style sheet into the app,
                // in such case we are running into security violation. Despite the fact that
                // there is no-translate meta tag in html, this guard might still be useful in
                // some cases.
                if (error instanceof DOMException && error.name === "SecurityError") {
                    console.warn("Skipping inaccessible stylesheet while discovering fonts:", sheet.href);
                    continue;
                }

                throw error;
            }
        }

        let completed = 0;

        for (const font of fonts) {
            await document.fonts.load(font);
            completed += 1;
            onProgress({ phase: LoadPhase.Load, record: undefined, completed, total: fonts.size });
        }
    }

    private throwIfDisposed() {
        if (this.disposed) {
            throw new ObjectDisposedError();
        }
    }

    dispose(): void {
        if (this.disposed) {
            return;
        }

        this._disposed = true;

        for (const asset of this.loadedAssets.values()) {
            if (Object.hasOwn(asset, "scene")) {
                const scene = (asset as unknown as { scene: THREE.Scene }).scene;
                scene.traverse((object) => {
                    if (object instanceof THREE.Mesh) {
                        object.geometry?.dispose?.();

                        if (object instanceof THREE.SkinnedMesh) {
                            object.skeleton?.dispose();
                        }
                    }
                });
            } else if (asset instanceof TextureAsset) {
                asset.texture.dispose();
            }
        }

        this.loadedAssets.clear();
        this.recordsById.clear();
    }
}
