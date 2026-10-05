import * as THREE from "three/webgpu";
import { CameraController } from "./camera-controller";
import { createComponent, deleteComponent } from "../core/ComponentRegistry";
import { InputSystem, PointerInfo } from "../input/input-system";
import { Settings } from "../core/settings";
import { AppContainer } from "../core/app-container";
import { Disposable } from "../core/disposable";
import { ObjectDisposedError } from "../app-error";

const debugModeEnabled = false;

export class CameraSystem implements Disposable {
    private debugCameraController: CameraController;

    private appContainer: AppContainer;
    private inputSystem: InputSystem;
    private settings: Settings;

    private debugCamera: THREE.PerspectiveCamera;
    private pointerLocked = false;
    private pointerLockToken = "camera-system";

    private _mainCamera: THREE.PerspectiveCamera | null = null;
    private _enabled = true;
    private _disposed = false;

    get disposed() {
        return this._disposed;
    }

    set mainCamera(camera: THREE.PerspectiveCamera) {
        this.throwIfDisposed();

        this._mainCamera = camera;

        if (this._mainCamera) {
            this._mainCamera.aspect = this.appContainer.aspect;
            this._mainCamera.updateProjectionMatrix();
        }
    }

    get mainCamera(): THREE.PerspectiveCamera | null {
        return this._mainCamera;
    }

    get activeCamera() {
        return this.debugCameraController.enabled ? this.debugCamera : this.mainCamera;
    }

    get enabled() {
        return this._enabled;
    }

    set enabled(enabled: boolean) {
        this.throwIfDisposed();

        if (this._enabled === enabled) {
            return;
        }

        if (enabled && debugModeEnabled) {
            this.attachInputActions();
        } else {
            this.detachInputActions();
        }

        this._enabled = enabled;
    }

    private constructor() {}

    static create(appContainer: AppContainer, inputSystem: InputSystem, settings: Settings) {
        return new CameraSystem().init(appContainer, inputSystem, settings);
    }

    private init(appContainer: AppContainer, inputSystem: InputSystem, settings: Settings) {
        this.appContainer = appContainer;
        this.inputSystem = inputSystem;
        this.settings = settings;

        this.debugCamera = new THREE.PerspectiveCamera(60, this.appContainer.aspect, 0.01, 100);

        if (this._enabled && debugModeEnabled) {
            this.attachInputActions();
        }

        this.debugCameraController = createComponent(CameraController, this.debugCamera, inputSystem);
        this.debugCameraController.enabled = false;

        this.settings.onResolutionChanged.add(this.handleResolutionChanged);

        return this;
    }

    private handleResolutionChanged = () => {
        if (this._mainCamera) {
            this._mainCamera.aspect = this.appContainer.aspect;
            this._mainCamera.updateProjectionMatrix();
        }

        this.debugCamera.aspect = this.appContainer.aspect;
        this.debugCamera.updateProjectionMatrix();
    };

    private attachInputActions() {
        this.inputSystem.onPointerDown.add(this.handlePointerDown);
        this.inputSystem.onPointerUp.add(this.handlePointerUp);
        this.inputSystem.onPointerLockChange.add(this.handlePointerLockChange);
    }

    private detachInputActions() {
        this.inputSystem.onPointerDown.remove(this.handlePointerDown);
        this.inputSystem.onPointerUp.remove(this.handlePointerUp);
        this.inputSystem.onPointerLockChange.remove(this.handlePointerLockChange);
    }

    private enableDebugCamera() {
        this.debugCameraController.enabled = true;

        if (this.mainCamera) {
            this.mainCamera.matrixWorld.decompose(
                this.debugCamera.position,
                this.debugCamera.quaternion,
                this.debugCamera.scale,
            );

            const quaternion = new THREE.Quaternion();
            this.mainCamera.getWorldQuaternion(quaternion);

            this.debugCameraController.setRotationFromQuaternion(quaternion);
        }
    }

    private handlePointerDown = (pointerInfo: PointerInfo) => {
        if (pointerInfo.button !== 2) {
            return;
        }

        this.inputSystem.requestPointerLock(this.pointerLockToken);

        if (this.inputSystem.isPointerLocked) {
            this.enableDebugCamera();
            this.pointerLocked = true;
        }
    };

    private handlePointerUp = (pointerInfo: PointerInfo) => {
        if (pointerInfo.button !== 2) {
            return;
        }

        this.inputSystem.exitPointerLock(this.pointerLockToken);
        this.debugCameraController.enabled = false;
        this.pointerLocked = false;
    };

    private handlePointerLockChange = () => {
        if (this.inputSystem.isPointerLocked && this.inputSystem.isMouseButtonDown(2)) {
            if (!this.pointerLocked) {
                this.enableDebugCamera();
                this.pointerLocked = true;
            }
        } else {
            if (this.pointerLocked) {
                this.debugCameraController.enabled = false;
                this.pointerLocked = false;
            }
        }
    };

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

        this.detachInputActions();

        if (this.inputSystem && !this.inputSystem.disposed) {
            this.inputSystem.exitPointerLock(this.pointerLockToken);
        }

        if (this.debugCameraController) {
            this.debugCameraController.enabled = false;
        }

        deleteComponent(this.debugCameraController);

        this.settings?.onResolutionChanged.remove(this.handleResolutionChanged);
    }
}
