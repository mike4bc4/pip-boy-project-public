import * as THREE from "three/webgpu";
import { InputSystem, PointerInfo, PointerType } from "./input-system";
import { DisplayContent } from "../display/user-interface/display-content";
import { Float2Like } from "../display/user-interface/elements/components/Float2";
import { VisualElement } from "../display/user-interface/elements/visual-element";
import { PointerEventsInternal } from "../display/user-interface/elements/components/pointer-events";
import { Component } from "../core/ComponentRegistry";

export class DisplayInteraction implements Component {
    public enabled = true;

    public camera: THREE.Camera;
    public displayMesh: THREE.Object3D;
    public displayContent: DisplayContent | null;

    private inputSystem: InputSystem;
    private _hoveredElement: VisualElement | null = null;
    private raycaster = new THREE.Raycaster();
    private pointer = new THREE.Vector2();

    private pressedElement: VisualElement | null = null;
    private pressedPointerId = -1;
    private lastPointerType: PointerType = "none";

    get hoveredElement() {
        return this._hoveredElement;
    }

    constructor(
        inputSystem: InputSystem,
        camera: THREE.Camera,
        displayMesh: THREE.Object3D,
        displayContent: DisplayContent | null = null,
    ) {
        this.inputSystem = inputSystem;
        this.camera = camera;
        this.displayMesh = displayMesh;
        this.displayContent = displayContent;

        this.inputSystem.onPointerDown.add(this.handlePointerDown);
        this.inputSystem.onPointerUp.add(this.handlePointerUp);
        this.inputSystem.onPointerCancel.add(this.handlePointerCancel);
        this.inputSystem.onVisibilityChange.add(this.handleVisibilityChange);
    }

    update(deltaTime: number): void {
        if (this.lastPointerType === "touch") {
            return;
        }

        this.updateHoveredElement(this.inputSystem.position);
    }

    private getDisplayIntersection(position: Float2Like) {
        const rect = this.inputSystem.canvas.getBoundingClientRect();

        this.pointer.x = (position.x / rect.width) * 2 - 1;
        this.pointer.y = -(position.y / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.pointer, this.camera);

        const intersection = this.raycaster.intersectObject(this.displayMesh, false)[0];

        if (!intersection?.uv1) {
            return null;
        }

        return { x: intersection.uv1.x, y: intersection.uv1.y };
    }

    private getDisplayElementAt(position: Float2Like) {
        const intersection = this.getDisplayIntersection(position);
        if (!intersection || !this.displayContent) {
            return null;
        }

        return this.displayContent.getInteractiveElementAt(
            intersection.x * this.displayContent.width,
            intersection.y * this.displayContent.height,
        );
    }

    private clearHoveredElement() {
        (this._hoveredElement?.pointerEvents as PointerEventsInternal)?.invoke("onpointerleave");
        this._hoveredElement = null;
    }

    private updateHoveredElement(position: Float2Like) {
        const intersection = this.getDisplayIntersection(position);
        if (!intersection) {
            this.clearHoveredElement();
            return;
        }

        if (!this.displayContent) {
            return;
        }

        const { width, height } = this.displayContent;
        const x = intersection.x * width;
        const y = intersection.y * height;

        const element = this.displayContent.getInteractiveElementAt(x, y);
        if (element === this._hoveredElement) {
            return;
        }

        (this._hoveredElement?.pointerEvents as PointerEventsInternal)?.invoke("onpointerleave");
        this._hoveredElement = element;
        (this._hoveredElement?.pointerEvents as PointerEventsInternal)?.invoke("onpointerenter");
    }

    private resetPressedState() {
        this.pressedElement = null;
        this.pressedPointerId = -1;
    }

    private handlePointerDown = (pointerInfo: PointerInfo) => {
        this.lastPointerType = pointerInfo.pointerType;
        if (pointerInfo.button !== 0) {
            return;
        }

        const element = this.getDisplayElementAt(this.inputSystem.position);

        if (pointerInfo.pointerType === "touch") {
            this.clearHoveredElement();
        }

        this.pressedElement = element;
        this.pressedPointerId = pointerInfo.pointerId;

        (this.pressedElement?.pointerEvents as PointerEventsInternal)?.invoke("onpointerdown", element);
    };

    private handlePointerUp = (pointerInfo: PointerInfo) => {
        this.lastPointerType = pointerInfo.pointerType;
        if (pointerInfo.button !== 0 || pointerInfo.pointerId !== this.pressedPointerId) {
            return;
        }

        const element = this.getDisplayElementAt(this.inputSystem.position);

        (this.pressedElement?.pointerEvents as PointerEventsInternal)?.invoke("onpointerup", element);

        if (this.pressedElement === element) {
            (this.pressedElement?.pointerEvents as PointerEventsInternal)?.invoke("onclick", element);
        }

        this.resetPressedState();
    };

    private handlePointerCancel = (pointerInfo: PointerInfo) => {
        this.lastPointerType = pointerInfo.pointerType;
        if (pointerInfo.pointerId !== this.pressedPointerId) {
            return;
        }

        const element = this.getDisplayElementAt(this.inputSystem.position);

        (this.pressedElement?.pointerEvents as PointerEventsInternal)?.invoke("onpointerup", element);
        this.resetPressedState();
    };

    private handleVisibilityChange = (visible: boolean) => {
        if (!visible) {
            this.clearHoveredElement();
            this.resetPressedState();
        }
    };

    private distance(a: Float2Like, b: Float2Like) {
        const x = b.x - a.x;
        const y = b.y - a.y;
        return Math.sqrt(x * x + y * y);
    }
}
