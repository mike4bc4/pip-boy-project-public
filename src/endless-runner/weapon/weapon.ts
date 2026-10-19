import { EventBus } from "@game/core/event-bus";
import { AppError } from "../../app-error";
import { DisplayContent } from "../../display/user-interface/display-content";
import { ImageElement } from "../../display/user-interface/elements/image-element";
import { VaultBoy } from "@game/core/vault-boy";
import { Projectile } from "./projectile";
import { Disposable, throwIfDisposed } from "../../core/disposable";

const zOffset = 50;

export interface WeaponContext {
    spriteSheet: HTMLImageElement;
    displayContent: DisplayContent;
    vaultBoy: VaultBoy;
    eventBus: EventBus;
}

export class Weapon implements Disposable {
    public maxAmmunition = 9;

    private ctx: WeaponContext;
    private projectiles = new Set<Projectile>();

    private _animationState: "default" | "frozen" = "default";
    private _ammunition = 1;
    private _disposed = false;

    get disposed() {
        return this._disposed;
    }

    get animationState() {
        return this._animationState;
    }

    set animationState(value) {
        this.throwIfDisposed();

        if (this._animationState === value) {
            return;
        }

        this._animationState = value;
        this.handleAnimationStateChanged();
    }

    get ammunition() {
        return this._ammunition;
    }

    set ammunition(value) {
        this.throwIfDisposed();

        if (value === this._ammunition) {
            return;
        }

        this._ammunition = value;
        this.ctx.eventBus.onAmmunitionChanged.invoke(this._ammunition);
    }

    get displayContent() {
        return this.ctx.displayContent;
    }

    get vaultBoy() {
        return this.ctx.vaultBoy;
    }

    constructor(ctx: WeaponContext) {
        Object.assign(this, { throwIfDisposed });

        this.ctx = ctx;
    }

    declare private throwIfDisposed: typeof throwIfDisposed;

    fire() {
        this.throwIfDisposed();

        if (this.ammunition === 0) {
            return;
        }

        this.ammunition -= 1;

        const projectile = this.createProjectile();
        this.playProjectileAnimation(projectile);

        this.ctx.eventBus.onWeaponFired.invoke(projectile);
    }

    private playProjectileAnimation(projectile: Projectile) {
        void (async () => {
            try {
                await projectile.animation.play();
            } finally {
                this.projectiles.delete(projectile);
                projectile.dispose();
            }
        })().catch((error) => {
            throw new AppError("Failed to handle projectile animation.", { cause: error });
        });
    }

    private handleAnimationStateChanged() {
        if (this.animationState === "frozen") {
            for (const projectile of this.projectiles) {
                // We are pausing, not stopping, as stop would resolve the animation
                // and cause the projectile to be removed from set.
                projectile.animation.pause();
            }
        } else if (this.animationState === "default") {
            for (const projectile of this.projectiles) {
                this.playProjectileAnimation(projectile);
            }
        }
    }

    private createProjectile() {
        const imageElement = new ImageElement();
        imageElement.image = this.ctx.spriteSheet;

        this.displayContent.add(imageElement);

        imageElement.compositeOperation = "screen";

        const width = 512;
        const height = 64;
        const scale = 2;

        imageElement.cutout.set({ x: 784, y: 589, width, height });
        imageElement.layout.set({ z: zOffset, width: width * scale, height: height * scale });

        const projectile = new Projectile(imageElement, this.displayContent);
        this.projectiles.add(projectile);

        projectile.position.x = 200;
        projectile.position.y = this.vaultBoy.position.y + 40;

        projectile.updateSpriteLayout();

        return projectile;
    }

    dispose(): void {
        if (this.disposed) {
            return;
        }

        this._disposed = true;

        for (const projectile of this.projectiles) {
            projectile.dispose();
        }

        this.projectiles.clear();
    }
}
