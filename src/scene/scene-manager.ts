import { AssetDatabase } from "../assets/asset-database";
import * as THREE from "three/webgpu";
import { GameObject } from "../core/game-object";
import { AppError, ObjectDisposedError } from "../app-error";
import { Disposable } from "../core/disposable";

export interface Scene extends Disposable {
    root: THREE.Scene;
    getObjectByName(name: string): GameObject;
}

export interface SceneType {
    create(assetDatabase: AssetDatabase): Scene | Promise<Scene>;
}

export class SceneManager implements Disposable {
    private _initialSceneType: SceneType;
    private assetDatabase: AssetDatabase;
    private _currentScene: Scene | null = null;

    private _disposed = false;

    get disposed() {
        return this._disposed;
    }

    get currentScene() {
        return this._currentScene;
    }

    get initialSceneType() {
        return this._initialSceneType;
    }

    set initialSceneType(type: SceneType) {
        this.throwIfDisposed();

        if (type === null || !(typeof type.create === "function")) {
            throw new AppError("Invalid scene type");
        }

        this._initialSceneType = type;
    }

    private constructor() {}

    private init(assetDatabase: AssetDatabase, initialSceneType: SceneType) {
        this.assetDatabase = assetDatabase;
        this._initialSceneType = initialSceneType;
        return this;
    }

    static create(assetDatabase: AssetDatabase, initialSceneType: SceneType) {
        return new SceneManager().init(assetDatabase, initialSceneType);
    }

    async loadInitialScene() {
        this.throwIfDisposed();

        // Yeah, dispose of current scene should be here, but this app is meant to be simple...
        this._currentScene = await this._initialSceneType.create(this.assetDatabase);
    }

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

        if (this._currentScene && !this._currentScene.disposed) {
            this._currentScene.dispose();
            this._currentScene = null;
        }

        this._initialSceneType = undefined!;
        this.assetDatabase = undefined!;
    }
}
