import { Disposable, throwIfDisposed } from "../../core/disposable";
import { DisplayContent } from "../../display/user-interface/display-content";
import { CloudSpawner } from "./cloud-spawner";
import { GroundSpawner } from "./ground-spawner";
import { PropSpawner } from "./prop-spawner";

export interface EnvironmentManagerContext {
    displayContent: DisplayContent;
    spriteSheet: HTMLImageElement;
}

export class EnvironmentManager implements Disposable {
    public readonly cloudSpawner: CloudSpawner;
    public readonly groundSpawner: GroundSpawner;
    public readonly propSpawner: PropSpawner;

    private ctx: EnvironmentManagerContext;
    private _disposed = false;

    get disposed() {
        return this._disposed;
    }

    constructor(ctx: EnvironmentManagerContext) {
        Object.assign(this, { throwIfDisposed });

        this.ctx = ctx;

        this.cloudSpawner = new CloudSpawner(this.ctx);
        this.groundSpawner = new GroundSpawner(this.ctx);
        this.propSpawner = new PropSpawner(this.ctx);
    }

    declare private throwIfDisposed: typeof throwIfDisposed;

    update(deltaTime: number) {
        this.throwIfDisposed();

        this.cloudSpawner.update(deltaTime);
        this.groundSpawner.update(deltaTime);
        this.propSpawner.update(deltaTime);
    }

    reset() {
        this.throwIfDisposed();

        this.cloudSpawner.reset();
        this.groundSpawner.reset();
        this.propSpawner.reset();
    }

    dispose(): void {
        if (this.disposed) {
            return;
        }

        this._disposed = true;

        this.cloudSpawner.dispose();
        this.groundSpawner.dispose();
        this.propSpawner.dispose();
    }
}
