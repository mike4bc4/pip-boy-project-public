import { createComponent, deleteComponent } from "../core/ComponentRegistry";
import { Background } from "./background";
import { Environment } from "./environment";
import { createArmSkinnedMesh } from "../objects/create-arm-skinned-mesh";
import { createPipBoyMesh } from "../objects/create-pip-boy-mesh-object";
import { AssetDatabase } from "../assets/asset-database";
import { Scene as GameScene } from "./scene-manager";
import { GameObject } from "../core/game-object";
import { createRightArm } from "../objects/create-right-arm";
import {
    AmbientLight,
    Color,
    DirectionalLight,
    Light,
    Material,
    Mesh,
    PerspectiveCamera,
    Scene,
} from "three/webgpu";
import { AppError } from "../app-error";
import { PipBoyMainDisplayMaterial } from "../rendering/materials/createPipBoyMainDisplayMaterial";

export class MainScene implements GameScene {
    private _root: Scene;
    private _background: Background;
    private _environment: Environment;
    private _disposed = false;

    private objects = new Set<GameObject>();

    get disposed() {
        return this._disposed;
    }

    get root() {
        return this._root;
    }

    get environment() {
        return this._environment;
    }

    get background() {
        return this._background;
    }

    private constructor() {}

    getObjectByName(name: string) {
        const object = [...this.objects.values()].find((entry) => entry.name === name);
        if (!object) {
            throw new AppError(`Object "${name}" not found.`);
        }

        return object;
    }

    private init(assetDatabase: AssetDatabase) {
        const root = new Scene();
        root.background = new Color(0x202020);
        this._root = root;

        this._background = createComponent(Background, this._root, assetDatabase.getAsset("/textures/background"));
        this._environment = new Environment(root, assetDatabase.getAsset("/textures/forest"));

        const ambientLight = new AmbientLight(0xffffff, 1.0);
        ambientLight.name = "ambient-light";
        root.add(ambientLight);
        this.objects.add(ambientLight);

        const mainLight = new DirectionalLight(0xffffff, 2.0);
        mainLight.name = "main-light";
        mainLight.position.set(3, 5, 2);
        root.attach(mainLight);
        this.objects.add(mainLight);

        const arm = createArmSkinnedMesh(assetDatabase);
        arm.name = "arm";
        root.add(arm.root);
        this.objects.add(arm);

        const pipBoy = createPipBoyMesh(assetDatabase);
        pipBoy.name = "pip-boy";
        pipBoy.root.position.set(0, 0, 0);
        pipBoy.root.rotation.set(0, 0, 0);
        pipBoy.root.scale.set(1, 1, 1);
        this.objects.add(pipBoy);

        const pipBoyMarker = arm.root.getObjectByName("pipboy_marker");
        pipBoyMarker!.add(pipBoy.root);

        const mainCamera = new PerspectiveCamera(60, 16 / 9, 0.01, 100);
        mainCamera.name = "main-camera";
        this.objects.add(mainCamera);

        const cameraMarker = arm.root.getObjectByName("camera_marker");
        mainCamera.position.set(0.005, -0.005, 0.0275);
        mainCamera.rotation.set(0, Math.PI, 0);
        mainCamera.scale.set(1, 1, 1);
        cameraMarker!.add(mainCamera);

        const rightArm = createRightArm(assetDatabase);
        rightArm.name = "right-arm";
        root.add(rightArm.root);
        this.objects.add(rightArm);

        return this;
    }

    static create(assetDatabase: AssetDatabase) {
        return new MainScene().init(assetDatabase);
    }

    dispose(): void {
        if (this.disposed) {
            return;
        }

        this._disposed = true;

        const ambientLight = this.getObjectByName("ambient-light");
        if (ambientLight instanceof Light) {
            ambientLight.dispose();
        }

        const mainLight = this.getObjectByName("main-light");
        if (mainLight instanceof Light) {
            mainLight.dispose();
        }

        // Getting rid of all created materials.
        const materials = new Set<Material>();

        this.root.traverse((object) => {
            if (!(object instanceof Mesh)) {
                return;
            }

            const meshMaterials: Material[] = Array.isArray(object.material) ? object.material : [object.material];

            for (const material of meshMaterials) {
                if (materials.has(material)) {
                    continue;
                }

                materials.add(material);

                // This is a special case, since the main display material uses placeholder texture
                // generated during material creation, it has to be disposed separately.
                if (material.name === "main_display") {
                    const mainDisplayMaterial = material as unknown as PipBoyMainDisplayMaterial;
                    mainDisplayMaterial.placeholderTexture.dispose();
                }

                material.dispose();
            }
        });

        this.objects.clear();
        this.root.clear();

        deleteComponent(this.background);
        this.root.backgroundNode = null;
    }
}
