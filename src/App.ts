import * as THREE from "three/webgpu";
import { AssetDatabase } from "./assets/asset-database";
import { InputSystem } from "./input/input-system";
import { CameraSystem } from "./camera/camera-system";
import { createComponent, resetComponentRegistry, updateComponents } from "./core/ComponentRegistry";
import { AppShellUI } from "./app-shell-ui/app-shell-ui";
import { AppContainer } from "./core/app-container";
import { RendererService } from "./core/renderer-service";
import { MainScene } from "./scene/main-scene";
import { SceneManager } from "./scene/scene-manager";
import { GameManager } from "./game/game-manager";
import { UIManager } from "./user-interface/ui-manager";
import { UIEventBusHandler } from "./user-interface/ui-event-bus";
import { AudioService } from "./core/audio-service";
import { LoadingPanel } from "./app-shell-ui/loading-panel";
import { ContinuePanel } from "./app-shell-ui/continue-panel";
import { BlackPanel } from "./app-shell-ui/black-panel";
import { Settings } from "./core/settings";
import { Localization } from "./localization/localization";
import { TimerService } from "./core/timer-service";
import { Disposable } from "./core/disposable";
import { AppError } from "./app-error";

const maxDeltaTime = 0.1;
const measureInterval = 1000;

const LoadingSplit = {
    Fonts: { share: 10 },
    Assets: { share: 30 },
    Textures: { share: 30 },
    Audio: { share: 10 },
    Shaders: { share: 20 },
} as const;

type LoadingSplit = (typeof LoadingSplit)[keyof typeof LoadingSplit];

export class App implements Disposable {
    private settings: Settings;
    private localization: Localization;
    private timerService: TimerService;

    private assetDatabase: AssetDatabase;
    private inputSystem: InputSystem;
    private cameraSystem: CameraSystem;
    private appShellUI: AppShellUI;
    private appContainer: AppContainer;
    private rendererService: RendererService;
    private sceneManager: SceneManager;
    private audioService: AudioService;

    private uiManager: UIManager;

    private _disposed = false;

    get disposed() {
        return this._disposed;
    }

    constructor() {}

    private calculateSplitProgress(progress: { completed: number; total: number; split: LoadingSplit }) {
        const splits = Object.values(LoadingSplit);
        const splitIndex = splits.indexOf(progress.split);

        let splitsTotal = 0;
        let previousSplitsShare = 0;

        for (let i = 0; i < splits.length; i++) {
            if (i < splitIndex) {
                previousSplitsShare += splits[i].share;
            }

            splitsTotal += splits[i].share;
        }

        return (
            (progress.completed / progress.total) * (progress.split.share / splitsTotal) +
            previousSplitsShare / splitsTotal
        );
    }

    private async load() {
        // Black panel is simply a black background, it's here to avoid showing "nothing" when canvas is still
        // not ready to render the app
        const blackPanel = this.appShellUI.getPanelByType(BlackPanel);
        const loadingPanel = this.appShellUI.getPanelByType(LoadingPanel);
        const continuePanel = this.appShellUI.getPanelByType(ContinuePanel);

        blackPanel.hide();
        loadingPanel.show();

        await loadingPanel.showProgressBar(true);

        await this.assetDatabase.loadFonts((progress) =>
            loadingPanel.setProgress(this.calculateSplitProgress({ ...progress, split: LoadingSplit.Fonts })),
        );

        await this.assetDatabase.loadAssets((progress) =>
            loadingPanel.setProgress(this.calculateSplitProgress({ ...progress, split: LoadingSplit.Assets })),
        );

        await this.assetDatabase.preloadTextures(this.rendererService.renderer, (progress) =>
            loadingPanel.setProgress(this.calculateSplitProgress({ ...progress, split: LoadingSplit.Textures })),
        );

        await this.audioService.load(this.assetDatabase, (progress) =>
            loadingPanel.setProgress(this.calculateSplitProgress({ ...progress, split: LoadingSplit.Audio })),
        );

        // Loading initial scene here since it's nice to merge shader compilation with general app loading phase
        await this.sceneManager.loadInitialScene();

        await this.rendererService.compileShaders(this.sceneManager.currentScene!.root, (progress) =>
            loadingPanel.setProgress(this.calculateSplitProgress({ ...progress, split: LoadingSplit.Shaders })),
        );

        // Set up main camera so we can already start rendering before shell loading screen is gone
        const mainCamera = this.sceneManager.currentScene!.getObjectByName("main-camera") as THREE.PerspectiveCamera;
        this.cameraSystem.mainCamera = mainCamera;

        await loadingPanel.hideProgressBar(true);
        loadingPanel.hide();

        return;

        continuePanel.show();
        continuePanel.showLabel(true);

        const { promise: interactionPromise, resolve } = Promise.withResolvers<void>();

        const keyDownCallback = () => cleanUpAndResolve();
        const clickCallback = () => cleanUpAndResolve();

        // Skipping the input system here, as we want to safe, document wide events
        // to trigger audio context.
        const cleanUpAndResolve = () => {
            document.removeEventListener("keydown", keyDownCallback);
            document.removeEventListener("click", clickCallback);

            this.audioService.tryResume();
            resolve();
        };

        document.addEventListener("keydown", keyDownCallback);
        document.addEventListener("click", clickCallback);

        await interactionPromise;

        await continuePanel.hideLabel(true);
        await continuePanel.hide(true);
    }

    async init() {
        if (this.disposed) {
            throw new AppError("Unable to init, app was disposed.");
        }

        try {
            console.log("Starting the app...");

            resetComponentRegistry();

            this.settings = Settings.create();
            this.localization = Localization.create(this.settings);
            this.timerService = TimerService.create();

            this.appContainer = await AppContainer.create(this.settings, this.timerService);
            this.inputSystem = InputSystem.create(this.appContainer.canvas);
            this.rendererService = await RendererService.create(this.appContainer, this.settings, this.timerService);
            this.assetDatabase = AssetDatabase.create();
            this.audioService = await AudioService.create(this.inputSystem, this.settings);
            this.cameraSystem = CameraSystem.create(this.appContainer, this.inputSystem, this.settings);
            this.appShellUI = AppShellUI.create(this.settings, this.localization);
            this.sceneManager = SceneManager.create(this.assetDatabase, MainScene);

            await this.startMainLoop();
            await this.load();

            this.appShellUI.blockInput = false;

            const context = {
                settings: this.settings,
                localization: this.localization,
                timerService: this.timerService,
                appContainer: this.appContainer,
                inputSystem: this.inputSystem,
                rendererService: this.rendererService,
                assetDatabase: this.assetDatabase,
                audioService: this.audioService,
                cameraSystem: this.cameraSystem,
                appShellUI: this.appShellUI,
                sceneManager: this.sceneManager,
                uiEventBus: new UIEventBusHandler(),
            };

            // The "game" actually starts here, everything above is "engine" stuff
            const gameManager = createComponent(GameManager, context);

            gameManager.start();

            this.uiManager = new UIManager(context);
            this.uiManager.start();
        } catch (error) {
            throw new AppError("Failed to initialize the app.", { cause: error });
        }
    }

    private async startMainLoop() {
        let accumulatedDeltaTime = 0;
        let lastFrameTime: number | null = null;

        let frameCount = 0;
        let frameMeasureTimestamp: number | null = null;

        await this.rendererService.renderer
            .setAnimationLoop((timeMs) => {
                if (frameMeasureTimestamp === null) {
                    frameMeasureTimestamp = timeMs;
                }

                const time = timeMs / 1000;

                if (lastFrameTime === null) {
                    lastFrameTime = time;
                    return;
                }

                let deltaTime = Math.min(time - lastFrameTime, maxDeltaTime);
                lastFrameTime = time;

                try {
                    this.timerService.tick(deltaTime);
                    if (this.timerService.error) {
                        throw this.timerService.error;
                    }

                    updateComponents(deltaTime);
                    this.inputSystem.resetMovement();

                    const isFrameRateLimited = this.settings.maxFps > 0;
                    const targetFrameInterval = isFrameRateLimited ? 1 / this.settings.maxFps : 0;

                    accumulatedDeltaTime += deltaTime;

                    if (accumulatedDeltaTime > targetFrameInterval) {
                        const scene = this.sceneManager.currentScene;
                        const camera = this.cameraSystem.activeCamera;

                        if (scene && camera) {
                            this.rendererService.renderer.render(scene.root, camera);
                            frameCount += 1;
                        }

                        accumulatedDeltaTime = isFrameRateLimited ? accumulatedDeltaTime % targetFrameInterval : 0;
                    }

                    if (timeMs - frameMeasureTimestamp > measureInterval) {
                        this.appShellUI.fpsLabel = (frameCount / ((timeMs - frameMeasureTimestamp) / 1000)).toFixed(2);
                        frameCount = 0;
                        frameMeasureTimestamp = timeMs;
                    }
                } catch (error) {
                    throw new AppError("Failed to execute game loop.", { cause: error });
                }
            })
            .catch((reason) => {
                throw new AppError("Failed to execute game loop.", { cause: reason });
            });
    }

    dispose(): void {
        if (this._disposed) {
            return;
        }

        this._disposed = true;

        resetComponentRegistry();
        this.cameraSystem?.dispose();
        this.sceneManager?.currentScene?.dispose();
        this.uiManager?.dispose();
        this.appShellUI?.dispose();
        this.audioService?.dispose();
        this.rendererService?.dispose();
        this.assetDatabase?.dispose();
        this.inputSystem?.dispose();
        this.appContainer?.dispose();
        this.settings?.dispose();
        this.timerService?.dispose();
    }
}
