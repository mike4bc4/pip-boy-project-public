import * as THREE from "three/webgpu";
import { DisplayContent } from "./user-interface/display-content";
import { PipBoyMainDisplayMaterial } from "../rendering/materials/createPipBoyMainDisplayMaterial";
import { Action } from "../core/Action";
import { Float2Like } from "./user-interface/elements/components/Float2";
import { AppError } from "../app-error";
import { Disposable } from "../core/disposable";

export interface DisplayEffects {
    renderSynced: boolean;
    requestBlurFactorChange: (blurFactor: number) => void;
    requestUVOffsetChange: (offset: Float2Like) => void;
    requestTextureRepeatChange: (repeat: boolean) => void;
}

class DisplayEffectsInternal implements DisplayEffects {
    public renderSynced = true;
    public requestBlurFactorChangeAction = new Action<[blurFactor: number]>();
    public requestUVOffsetChangeAction = new Action<[offset: Float2Like]>();
    public requestTextureRepeatChangeAction = new Action<[repeat: boolean]>();

    requestBlurFactorChange(blurFactor: number) {
        this.requestBlurFactorChangeAction.invoke(blurFactor);
    }

    requestUVOffsetChange(offset: Float2Like) {
        this.requestUVOffsetChangeAction.invoke(offset);
    }

    requestTextureRepeatChange(repeat: boolean) {
        this.requestTextureRepeatChangeAction.invoke(repeat);
    }
}

export class DisplayContentRenderer implements Disposable {
    public readonly effects: DisplayEffects = new DisplayEffectsInternal();

    private texture: THREE.Texture;
    private canvas = document.createElement("canvas");
    private context: CanvasRenderingContext2D | null;
    private _material: PipBoyMainDisplayMaterial;

    private blurFactor: number;
    private uvOffset: { x: number; y: number };
    private textureRepeat: boolean;

    private _disposed = false;

    get disposed() {
        return this._disposed;
    }

    constructor() {
        this.context = this.canvas.getContext("2d");

        if (!this.context) {
            throw new AppError("Unable to create 2D context.");
        }

        this.texture = new THREE.CanvasTexture(this.canvas);
        DisplayContentRenderer.applyCanvasTextureSettings(this.texture);

        const effectsInternal = this.effects as DisplayEffectsInternal;
        effectsInternal.requestBlurFactorChangeAction.add((blurFactor) => {
            this.blurFactor = blurFactor;

            if (!this.effects.renderSynced && this._material) {
                this._material.blurFactor = blurFactor;
            }
        });

        effectsInternal.requestUVOffsetChangeAction.add((offset) => {
            this.uvOffset = offset;

            if (!this.effects.renderSynced && this._material) {
                this._material.uvOffset = offset;
            }
        });

        effectsInternal.requestTextureRepeatChangeAction.add((repeat) => {
            this.textureRepeat = repeat;

            if (!this.effects.renderSynced && this._material) {
                this._material.textureRepeat = repeat;
            }
        });
    }

    get material() {
        return this._material;
    }

    set material(mat: PipBoyMainDisplayMaterial) {
        this._material = mat;
        mat.texture = this.texture;

        this.blurFactor = this._material.blurFactor;
        this.uvOffset = this._material.uvOffset;
        this.textureRepeat = this._material.textureRepeat;
    }

    static applyCanvasTextureSettings(texture: THREE.Texture) {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.flipY = false;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.generateMipmaps = true;
        texture.needsUpdate = true;
    }

    render(displayContent: DisplayContent) {
        const { width, height } = displayContent;

        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;

            const oldTexture = this.texture;
            this.texture = new THREE.CanvasTexture(this.canvas);
            DisplayContentRenderer.applyCanvasTextureSettings(this.texture);

            if (this._material) {
                this._material.texture = this.texture;
            }

            oldTexture.dispose();
        }

        if (this._material && this.effects.renderSynced) {
            this._material.blurFactor = this.blurFactor;
            this._material.uvOffset = this.uvOffset;
            this._material.textureRepeat = this.textureRepeat;
        }

        displayContent.draw(this.context!);
        this.texture.needsUpdate = true;
    }

    dispose(): void {
        if (this.disposed) {
            return;
        }

        this._disposed = true;

        this.texture?.dispose();

        const effects = this.effects as DisplayEffectsInternal;
        if (effects) {
            effects.requestBlurFactorChangeAction.dispose();
            effects.requestTextureRepeatChangeAction.dispose();
            effects.requestUVOffsetChangeAction.dispose();
        }
    }
}
