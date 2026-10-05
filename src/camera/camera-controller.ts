import * as THREE from "three/webgpu";
import { InputSystem } from "../input/input-system";
import { Component } from "../core/ComponentRegistry";

const MAX_PITCH = Math.PI / 2 - 0.001;

export class CameraController implements Component {
    public enabled = true;

    private camera: THREE.PerspectiveCamera;
    private rotation = new THREE.Euler(0, 0, 0, "YXZ");
    private pitch = 0;
    private yaw = 0;
    private lookSensitivity = 0.002;
    private moveSpeed = 0.3;
    private speedChangeFactor = 0.1;
    private forward = new THREE.Vector3();
    private right = new THREE.Vector3();
    private movement = new THREE.Vector3();
    private worldUp = new THREE.Vector3(0, 1, 0);
    private inputSystem: InputSystem;

    constructor(camera: THREE.PerspectiveCamera, inputSystem: InputSystem) {
        this.camera = camera;
        this.inputSystem = inputSystem;

        inputSystem.onMouseWheel.add(this.handleMouseWheel);

        this.rotation.setFromQuaternion(this.camera.quaternion, "YXZ");
        this.pitch = this.rotation.x;
        this.yaw = this.rotation.y;
    }

    setRotationFromQuaternion(quaternion: THREE.Quaternion) {
        this.rotation.setFromQuaternion(quaternion, "YXZ");
        this.pitch = this.rotation.x;
        this.yaw = this.rotation.y;
    }

    update(deltaTime: number) {
        this.updateRotation();
        this.updatePosition(deltaTime);
    }

    private handleMouseWheel = (deltaY: number) => {
        if (deltaY < 0) {
            this.moveSpeed += this.speedChangeFactor;
        } else if (deltaY > 0) {
            this.moveSpeed = Math.max(0, this.moveSpeed - this.speedChangeFactor);
        }
    };

    private updateRotation() {
        this.yaw -= this.inputSystem.movement.x * this.lookSensitivity;
        this.pitch -= this.inputSystem.movement.y * this.lookSensitivity;

        this.pitch = THREE.MathUtils.clamp(this.pitch, -MAX_PITCH, MAX_PITCH);
        this.rotation.set(this.pitch, this.yaw, 0);
        this.camera.quaternion.setFromEuler(this.rotation);
    }

    private updatePosition(deltaTime: number) {
        this.camera.getWorldDirection(this.forward);

        if (this.forward.lengthSq() > 0) {
            this.forward.normalize();
        }

        this.right.crossVectors(this.forward, this.worldUp).normalize();

        this.movement.set(0, 0, 0);

        if (this.inputSystem.isKeyDown("KeyW")) {
            this.movement.add(this.forward);
        }

        if (this.inputSystem.isKeyDown("KeyS")) {
            this.movement.sub(this.forward);
        }

        if (this.inputSystem.isKeyDown("KeyD")) {
            this.movement.add(this.right);
        }

        if (this.inputSystem.isKeyDown("KeyA")) {
            this.movement.sub(this.right);
        }

        if (this.inputSystem.isKeyDown("KeyE")) {
            this.movement.add(this.worldUp);
        }

        if (this.inputSystem.isKeyDown("KeyQ")) {
            this.movement.sub(this.worldUp);
        }

        if (this.movement.lengthSq() === 0) {
            return;
        }

        this.movement.normalize().multiplyScalar(this.moveSpeed * deltaTime);
        this.camera.position.add(this.movement);
    }
}
