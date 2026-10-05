import * as THREE from "three/webgpu";
import { MaterialBinder } from "./material-binder";
import { Component } from "../core/ComponentRegistry";
import { AppError, ObjectDisposedError } from "../app-error";
import { Disposable } from "../core/disposable";

export enum AnimationStatus {
    Finished = "FINISHED",
    Stopped = "STOPPED",
    Replaced = "REPLACED",
}

export class SkinnedMeshObject implements Component, Disposable {
    public enabled = true;

    public readonly materialBinder: MaterialBinder;

    private _root: THREE.Object3D;
    private animations: THREE.AnimationClip[];
    private mixer: THREE.AnimationMixer;

    private activeAction: THREE.AnimationAction | null = null;
    private resolvePromise: ((status: AnimationStatus) => void) | null = null;

    private _disposed = false;

    get disposed() {
        return this._disposed;
    }

    constructor(root: THREE.Object3D, animations: THREE.AnimationClip[]) {
        this._root = root;
        this.animations = animations;

        this.mixer = new THREE.AnimationMixer(this._root);
        this.materialBinder = new MaterialBinder(this._root);

        this.mixer.addEventListener("finished", this.handleAnimationFinished);
    }

    get root() {
        return this._root;
    }

    get name() {
        return this._root.name;
    }

    set name(name: string) {
        this._root.name = name;
    }

    update(deltaTime: number) {
        this.mixer.update(deltaTime);
    }

    async playAnimation(name: string, { loop = false } = {}) {
        this.throwIfDisposed();

        const clip = THREE.AnimationClip.findByName(this.animations, name);

        if (!clip) {
            throw new AppError(`Clip "${name}" does not exist within object animation pool.`);
        }

        this.stopAnimationInternal(AnimationStatus.Replaced);

        const action = this.mixer.clipAction(clip);
        action.reset();
        action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
        action.clampWhenFinished = !loop;

        const { promise, resolve } = Promise.withResolvers<AnimationStatus>();
        this.resolvePromise = resolve;

        this.activeAction = action;
        action.play();

        return promise;
    }

    stopAnimation() {
        this.throwIfDisposed();
        this.stopAnimationInternal(AnimationStatus.Stopped);
    }

    private stopAnimationInternal(status: AnimationStatus) {
        if (!this.activeAction) {
            return;
        }

        this.activeAction.stop();
        this.activeAction = null;
        this.resolvePromise?.(status);
    }

    private handleAnimationFinished = (event: any) => {
        if (event.action !== this.activeAction) {
            return;
        }

        this.resolvePromise?.(AnimationStatus.Finished);
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

        if (this.activeAction) {
            this.activeAction.stop();
            this.activeAction = null;
            this.resolvePromise?.(AnimationStatus.Stopped);
        }

        this.mixer?.removeEventListener("finished", this.handleAnimationFinished);
        this.mixer?.uncacheRoot(this._root);
    }
}
