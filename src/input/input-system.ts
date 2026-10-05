import { ObjectDisposedError } from "../app-error";
import { Action } from "../core/Action";
import { Disposable } from "../core/disposable";
import { Float2Like } from "../display/user-interface/elements/components/Float2";

export type PointerType = "mouse" | "pen" | "touch" | "none";

export interface PointerInfo {
    button: number;
    pointerId: number;
    pointerType: PointerType;
}

export class InputSystem implements Disposable {
    public readonly onPointerDown = new Action<[pointerInfo: PointerInfo]>();
    public readonly onPointerUp = new Action<[pointerInfo: PointerInfo]>();
    public readonly onPointerMove = new Action();
    public readonly onPointerCancel = new Action<[pointerInfo: PointerInfo]>();

    public readonly onPointerLockChange = new Action();
    public readonly onMouseWheel = new Action<[deltaY: number]>();
    public readonly onKeyDown = new Action<[keyCode: string]>();

    public readonly onVisibilityChange = new Action<[visible: boolean]>();

    private _position: Float2Like = { x: 0, y: 0 };
    private _movement: Float2Like = { x: 0, y: 0 };

    private _canvas: HTMLCanvasElement;
    private keysDown = new Set<string>();
    private mouseButtonsDown = new Set<number>();
    private pointerLockRequests = new Set<string>();
    private _disposed = false;

    get disposed() {
        return this._disposed;
    }

    get position(): Float2Like {
        return { ...this._position };
    }

    get movement(): Float2Like {
        return { ...this._movement };
    }

    get isPointerOverCanvas() {
        if (this.isPointerLocked) {
            return false;
        }

        return this._canvas.matches(":hover");
    }

    get isPointerLocked() {
        return document.pointerLockElement === this._canvas;
    }

    get isCanvasActive() {
        return document.activeElement === this._canvas;
    }

    get canvas() {
        return this._canvas;
    }

    private constructor() {}

    private updatePointerData(event: PointerEvent) {
        const rect = this._canvas.getBoundingClientRect();

        this._position = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };

        this._movement.x += event.movementX;
        this._movement.y += event.movementY;
    }

    resetMovement() {
        this.throwIfDisposed();

        this._movement.x = 0;
        this._movement.y = 0;
    }

    static create(canvas: HTMLCanvasElement) {
        return new InputSystem().init(canvas);
    }

    private init(canvas: HTMLCanvasElement) {
        this._canvas = canvas;
        this._canvas.addEventListener("pointerup", this.handleCanvasPointerUp);
        this._canvas.addEventListener("pointerdown", this.handleCanvasPointerDown);
        this._canvas.addEventListener("pointermove", this.handleCanvasPointerMove);
        this._canvas.addEventListener("pointercancel", this.handleCanvasPointerCancel);
        this._canvas.addEventListener("wheel", this.handleMouseWheel, { passive: false });

        document.addEventListener("contextmenu", this.handleContextMenu);
        document.addEventListener("pointerlockchange", this.handlePointerLockChange);
        document.addEventListener("keydown", this.handleKeyDown);
        document.addEventListener("keyup", this.handleKeyUp);
        document.addEventListener("blur", this.handleWindowBlur);

        document.addEventListener("visibilitychange", this.handleVisibilityChange);

        return this;
    }

    isMouseButtonDown(button: number) {
        this.throwIfDisposed();

        return this.mouseButtonsDown.has(button);
    }

    isKeyDown(code: string) {
        this.throwIfDisposed();

        return this.keysDown.has(code);
    }

    requestPointerLock(token: string) {
        this.throwIfDisposed();

        this.pointerLockRequests.add(token);
        this.resolvePointerLockRequest();
    }

    exitPointerLock(token: string) {
        this.throwIfDisposed();

        this.pointerLockRequests.delete(token);
        if (this.pointerLockRequests.size === 0 && this.isPointerLocked) {
            document.exitPointerLock();
        }
    }

    private resolvePointerLockRequest() {
        this._canvas.requestPointerLock()?.catch((err) => {
            console.warn("Tried to lock the pointer outside action. Waiting for next interaction.");
        });
    }

    private handleKeyDown = (event: KeyboardEvent) => {
        const wasDown = this.keysDown.has(event.code);
        this.keysDown.add(event.code);

        if (!wasDown) {
            this.onKeyDown.invoke(event.code);
        }
    };

    private handleKeyUp = (event: KeyboardEvent) => {
        this.keysDown.delete(event.code);
    };

    private handleWindowBlur = () => {
        this.keysDown.clear();
    };

    private handleContextMenu = (event: PointerEvent) => {
        event.preventDefault();
    };

    private handlePointerLockChange = () => {
        if (!this.isPointerLocked) {
            this.pointerLockRequests.clear();
        }

        this.onPointerLockChange.invoke();
    };

    private handleCanvasPointerDown = (event: PointerEvent) => {
        this._canvas.setPointerCapture(event.pointerId);

        this.mouseButtonsDown.add(event.button);

        this.updatePointerData(event);

        this.onPointerDown.invoke({
            button: event.button,
            pointerId: event.pointerId,
            pointerType: event.pointerType as PointerType,
        });

        if (this.pointerLockRequests.size > 0 && !this.isPointerLocked) {
            this.resolvePointerLockRequest();
        }
    };

    private handleCanvasPointerUp = (event: PointerEvent) => {
        this.mouseButtonsDown.delete(event.button);

        this.updatePointerData(event);

        this.onPointerUp.invoke({
            button: event.button,
            pointerId: event.pointerId,
            pointerType: event.pointerType as PointerType,
        });
    };

    private handleCanvasPointerMove = (event: PointerEvent) => {
        if (document.visibilityState !== "visible") {
            return;
        }

        this.updatePointerData(event);

        this.onPointerMove.invoke();
    };

    private handleCanvasPointerCancel = (event: PointerEvent) => {
        this.mouseButtonsDown.delete(event.button);

        this.updatePointerData(event);

        this.onPointerCancel.invoke({
            button: event.button,
            pointerId: event.pointerId,
            pointerType: event.pointerType as PointerType,
        });
    };

    private handleMouseWheel = (event: WheelEvent) => {
        event.preventDefault();
        this.onMouseWheel.invoke(event.deltaY);
    };

    private handleVisibilityChange = () => {
        if (document.visibilityState === "hidden") {
            this._position = { x: -1, y: -1 };
            this.keysDown.clear();
            this.mouseButtonsDown.clear();
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
        this.canvas?.removeEventListener("pointerup", this.handleCanvasPointerUp);
        this.canvas?.removeEventListener("pointerdown", this.handleCanvasPointerDown);
        this.canvas?.removeEventListener("pointermove", this.handleCanvasPointerMove);
        this.canvas?.removeEventListener("pointercancel", this.handleCanvasPointerCancel);
        this.canvas?.removeEventListener("wheel", this.handleMouseWheel);

        document.removeEventListener("contextmenu", this.handleContextMenu);
        document.removeEventListener("pointerlockchange", this.handlePointerLockChange);
        document.removeEventListener("keydown", this.handleKeyDown);
        document.removeEventListener("keyup", this.handleKeyUp);
        document.removeEventListener("blur", this.handleWindowBlur);
        document.removeEventListener("visibilitychange", this.handleVisibilityChange);

        this.onPointerDown.dispose();
        this.onPointerUp.dispose();
        this.onPointerMove.dispose();
        this.onPointerCancel.dispose();
        this.onPointerLockChange.dispose();
        this.onMouseWheel.dispose();
        this.onKeyDown.dispose();
        this.onVisibilityChange.dispose();

        this.keysDown.clear();
        this.mouseButtonsDown.clear();

        if (this.isPointerLocked) {
            document.exitPointerLock();
        }
    }
}
