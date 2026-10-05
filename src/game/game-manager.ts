import { DisplayContentRenderer } from "../display/display-content-renderer";
import { DisplayManager } from "../display/user-interface/display-manager";
import { DisplayInteraction } from "../input/display-interaction";
import { MeshObject } from "../objects/mesh-object";
import { SkinnedMeshObject } from "../objects/skinned-mesh-object";
import { PipBoyMainDisplayMaterial } from "../rendering/materials/createPipBoyMainDisplayMaterial";
import { MainScene } from "../scene/main-scene";
import { Component, createComponent, deleteComponent } from "../core/ComponentRegistry";
import { Locale, Localization } from "../localization/localization";
import { BootPanel } from "../display/user-interface/panels/boot-panel";
import { Settings } from "../core/settings";
import { SceneManager } from "../scene/scene-manager";
import { InputSystem } from "../input/input-system";
import { AssetDatabase } from "../assets/asset-database";
import { Object3D, PerspectiveCamera } from "three/webgpu";
import { AudioService } from "../core/audio-service";
import { UIEventBus } from "../user-interface/ui-event-bus";
import { SettingsPanel } from "../display/user-interface/panels/settings-panel";
import { MainMenuPanel } from "../display/user-interface/panels/main-menu-panel";
import { CVPanel } from "../display/user-interface/panels/cv-panel";
import { AboutPanel } from "../display/user-interface/panels/about-panel";
import { InitPanel } from "../display/user-interface/panels/init-panel";
import { PipBoyPartsMaterial } from "../rendering/materials/create-pip-boy-parts-material";
import { NoiseGenerator } from "./noise-generator";
import { TimerService } from "../core/timer-service";
import { AppError } from "../app-error";
import { Disposable } from "../core/disposable";

interface GameManagerDependencies {
    timerService: TimerService;
    sceneManager: SceneManager;
    inputSystem: InputSystem;
    assetDatabase: AssetDatabase;
    settings: Settings;
    localization: Localization;
    audioService: AudioService;
    uiEventBus: UIEventBus;
}

interface GameManagerContext extends GameManagerDependencies {
    displayRenderer: DisplayContentRenderer;
    displayInteraction: DisplayInteraction;
}

export class GameManager implements Component, Disposable {
    public enabled = true;

    private ctx: GameManagerContext;
    private mainScene: MainScene;
    private mainCamera: PerspectiveCamera;
    private pipBoy: MeshObject;
    private displayManager: DisplayManager;
    private radsHand: Object3D;
    private powerButtonMaterial: PipBoyPartsMaterial;
    private randsHandNoiseGenerator = new NoiseGenerator();
    private powerButtonNoiseGenerator = new NoiseGenerator();

    private _disposed = false;

    get disposed() {
        return this._disposed;
    }

    constructor(deps: GameManagerDependencies) {
        this.ctx = { ...deps } as GameManagerContext;

        this.mainScene = this.ctx.sceneManager.currentScene as MainScene;
        this.mainCamera = this.mainScene.getObjectByName("main-camera") as PerspectiveCamera;
        this.pipBoy = this.mainScene.getObjectByName("pip-boy") as MeshObject;
        this.radsHand = this.pipBoy.root.getObjectByName("rads_hand")!;
        this.powerButtonMaterial = this.pipBoy.materialBinder.getByName(
            "parts-material",
        ) as unknown as PipBoyPartsMaterial;

        const material = this.pipBoy.materialBinder.getByName("main_display") as unknown as PipBoyMainDisplayMaterial;
        this.ctx.displayRenderer = new DisplayContentRenderer();
        this.ctx.displayRenderer.material = material;

        this.ctx.displayInteraction = createComponent(
            DisplayInteraction,
            deps.inputSystem,
            this.mainCamera,
            this.pipBoy.root.getObjectByName("main_display") as Object3D,
        );

        this.displayManager = createComponent(DisplayManager, this.ctx);
    }

    start() {
        this.playArmAnimation().catch((reason) => {
            throw new AppError("Failed to play arm animation.", { cause: reason });
        });
    }

    update(deltaTime: number): void {
        this.randsHandNoiseGenerator.step(deltaTime * 4);
        this.radsHand.rotation.y = this.randsHandNoiseGenerator.value * 8 * (Math.PI / 180);

        this.powerButtonNoiseGenerator.step(deltaTime * 5);
        this.powerButtonMaterial.powerButtonIntensity = 1 + (this.powerButtonNoiseGenerator.value * 2 - 1) * 0.3;
    }

    async playArmAnimation() {
        const arm = this.mainScene.getObjectByName("arm") as SkinnedMeshObject;
        const rightArm = this.mainScene.getObjectByName("right-arm") as SkinnedMeshObject;

        await arm.playAnimation("look_around");

        this.ctx.timerService.timeout(
            () => {
                this.displayManager.navigate(BootPanel).catch((reason) => {
                    throw new AppError("Failed to navigate to boot panel", { cause: reason });
                });
            },
            2,
            true,
        );

        this.ctx.timerService.timeout(
            () => {
                this.mainScene.background.blur(1.5).catch((reason) => {
                    throw new AppError("Failed to blur the background.", { cause: reason });
                });
            },
            1,
            true,
        );

        await Promise.all([arm.playAnimation("pipboy_reach"), rightArm.playAnimation("right-arm-reach")]);

        await Promise.all([
            arm.playAnimation("pipboy_idle", { loop: true }),
            rightArm.playAnimation("right-arm-idle", { loop: true }),
        ]);
    }

    dispose(): void {
        if (this.disposed) {
            return;
        }

        this._disposed = true;
        if (this.ctx?.displayInteraction) {
            deleteComponent(this.ctx.displayInteraction);
        }
    }
}
