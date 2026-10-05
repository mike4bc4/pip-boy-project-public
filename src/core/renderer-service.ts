import * as THREE from "three/webgpu";
import { AppContainer } from "./app-container";
import { Settings } from "./settings";
import { Timer, TimerService } from "./timer-service";
import { Disposable } from "./disposable";
import { ObjectDisposedError } from "../app-error";

const compileTimeBudgetMs = 30;
const updateRendererSizeTimeout = 0.5;

export type ProgressCallback = (options: { completed: number; total: number }) => void;

export class RendererService implements Disposable {
    private appContainer: AppContainer;
    private settings: Settings;
    private timerService: TimerService;

    private updateRendererTimer: Timer | null = null;

    private _renderer: THREE.Renderer;
    private _disposed = false;

    get disposed() {
        return this._disposed;
    }

    get renderer() {
        return this._renderer;
    }

    private constructor() {}

    private async init(appContainer: AppContainer, settings: Settings, timerService: TimerService) {
        this.appContainer = appContainer;
        this.settings = settings;
        this.timerService = timerService;

        this._renderer = new THREE.WebGPURenderer({ canvas: appContainer.canvas, antialias: true });
        this.updateRendererSize();

        await this._renderer.init();

        this.settings.onResolutionChanged.add(this.updateRendererSize);
        this.appContainer.onResize.add(this.updateRendererSize);

        return this;
    }

    private updateRendererSize = () => {
        if (this.updateRendererTimer) {
            this.updateRendererTimer.cancel();
        }

        // We are updating renderer resolution with slight delay to; A avoid
        // multiple update callbacks stacking, B allow size transition to play
        // without messing up with the canvas.
        this.updateRendererTimer = this.timerService.timeout(
            () => {
                const resolution = this.appContainer.physicalResolution;
                this._renderer.setSize(resolution.x, resolution.y, false);
            },
            updateRendererSizeTimeout,
            false,
        );
    };

    static async create(appContainer: AppContainer, settings: Settings, timerService: TimerService) {
        return await new RendererService().init(appContainer, settings, timerService);
    }

    async compileShaders(scene: THREE.Scene, onProgress: ProgressCallback | null = null) {
        if (this.disposed) {
            throw new ObjectDisposedError();
        }

        const cache = new Map<THREE.Mesh, boolean>();

        scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                cache.set(object, object.frustumCulled);
                object.frustumCulled = false;
            }
        });

        let timestamp = performance.now();
        let completed = 0;
        const meshes = [...cache.keys()];
        const camera = new THREE.PerspectiveCamera(60, 1, 0.01, 100);

        for (const mesh of meshes) {
            await this.renderer.compileAsync(mesh, camera, scene);
            completed += 1;
            onProgress?.({ completed, total: meshes.length });

            const currentTimestamp = performance.now();
            if (currentTimestamp - timestamp > compileTimeBudgetMs) {
                timestamp = currentTimestamp;
                await new Promise((resolve) => requestAnimationFrame(resolve));
            }
        }

        scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                if (cache.has(object)) {
                    object.frustumCulled = cache.get(object)!;
                }
            }
        });
    }

    dispose(): void {
        if (this.disposed) {
            return;
        }

        this._disposed = true;

        this.updateRendererTimer?.cancel();
        this.settings?.onResolutionChanged.remove(this.updateRendererSize);
        this.appContainer?.onResize.remove(this.updateRendererSize);

        this.renderer?.setAnimationLoop(null).catch((reason) => {
            console.error("Failed to stop animation loop on disposal.", reason);
        });

        this.renderer?.dispose();
    }
}
