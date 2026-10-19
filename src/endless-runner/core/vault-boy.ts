import { Weapon } from "@game/weapon/weapon";
import { DisplayContent } from "../../display/user-interface/display-content";
import { Rect, RectLike } from "../../display/user-interface/elements/components/Rect";
import { ImageElement } from "../../display/user-interface/elements/image-element";
import { RectElement } from "../../display/user-interface/elements/rect-element";
import { EventBus } from "./event-bus";
import { Sprite } from "./sprite";
import {
    copyHitBoxFromSprite,
    copyLayoutFromSprite,
    createHitBoxElement,
    HasHitBox,
    HasHitBoxElement,
    overlaps,
    setHitBoxInset,
    updateHitBoxLayout,
    updateSpriteLayout,
} from "./utils";
import { Item } from "@game/item/item";
import { Stimpak } from "@game/item/stimpak";
import { Ammunition } from "@game/item/ammunition";
import { AppError } from "../../app-error";
import { createComponent, deleteComponent } from "../../core/ComponentRegistry";
import { Easing, Track } from "../../animation/track";
import { Animation } from "../../animation/animation";
import { Disposable, throwIfDisposed } from "../../core/disposable";
import { Enemy } from "@game/enemy/enemy";
import { Float2Like } from "../../display/user-interface/elements/components/Float2";

const zOffset = 50;
const maxStimpakCount = 3;

interface VaulBoyContext {
    displayContent: DisplayContent;
    eventBus: EventBus;
    groundLevel: number;
    gravity: number;
    jumpImpulse: number;
    spriteSheet: HTMLImageElement;
}

export class VaultBoy implements Sprite, HasHitBox, HasHitBoxElement, Disposable {
    public velocity = { x: 0, y: 0 };
    public position = { x: 0, y: 0 };
    public visualPositionOffset = { x: 0, y: 0 };
    public size = { x: 0, y: 0 };
    public hitBox = new Rect();

    public readonly imageElement: ImageElement;
    public readonly hitBoxElement: RectElement;
    public readonly weapon: Weapon;
    public readonly runAnimation: Animation;
    public readonly jumpAnimation: Animation;
    public readonly shrugAnimation: Animation;

    private ctx: VaulBoyContext;

    private currentAnimation: Animation | undefined = undefined;
    private _animationState: "unknown" | "shrugging" | "running" | "frozen" | "jumping" = "unknown";

    private _drawHitBoxElement = true;
    private _disposed = false;
    private _stimpakCount = 1;
    private scale = 0.8;
    private _grounded = true;
    private lastGrounded = true;

    get grounded() {
        return this._grounded;
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

    get stimpakCount() {
        return this._stimpakCount;
    }

    set stimpakCount(value) {
        this.throwIfDisposed();

        if (value === this._stimpakCount) {
            return;
        }

        const lastStimpakCount = this._stimpakCount;
        this._stimpakCount = value;
        this.eventBus.vaultBoy.onStimpakCountChanged.invoke(lastStimpakCount, this._stimpakCount);
    }

    get disposed() {
        return this._disposed;
    }

    get drawHitBoxElement() {
        return this._drawHitBoxElement;
    }

    set drawHitBoxElement(value) {
        this.throwIfDisposed();

        if (value) {
            this.ctx.displayContent.add(this.hitBoxElement);
        } else {
            this.ctx.displayContent.remove(this.hitBoxElement);
        }

        this._drawHitBoxElement = value;
    }

    get displaySize() {
        return { x: this.ctx.displayContent.width, y: this.ctx.displayContent.height };
    }

    private get groundLevel() {
        return this.ctx.groundLevel;
    }

    private get eventBus() {
        return this.ctx.eventBus;
    }

    private get gravity() {
        return this.ctx.gravity;
    }

    constructor(ctx: VaulBoyContext) {
        Object.assign(this, {
            copyLayoutFromSprite,
            updateSpriteLayout,
            overlaps,
            updateHitBoxLayout,
            setHitBoxInset,
            copyHitBoxFromSprite,
            throwIfDisposed,
        });

        this.ctx = ctx;

        this.imageElement = this.createImageElement(this.ctx.spriteSheet);
        this.ctx.displayContent.add(this.imageElement);

        this.hitBoxElement = createHitBoxElement();
        this.ctx.displayContent.add(this.hitBoxElement);

        this.weapon = new Weapon({ ...this.ctx, vaultBoy: this });

        this.copyLayoutFromSprite();
        this.copyHitBoxFromSprite({ top: 16, right: 32, bottom: 16, left: 64 });

        this.eventBus.item.onCollected.add(this.handleItemCollected);
        this.eventBus.enemy.onCollided.add(this.handleEnemyCollided);

        this.runAnimation = createRunAnimation(this);
        this.jumpAnimation = createJumpAnimation(this);
        this.shrugAnimation = createShrugAnimation(this);

        this.position.y = this.ctx.groundLevel;
        this.drawHitBoxElement = false;
    }

    declare updateSpriteLayout: typeof updateSpriteLayout;
    declare overlaps: typeof overlaps;
    declare updateHitBoxLayout: typeof updateHitBoxLayout;
    declare setHitBoxInset: typeof setHitBoxInset;

    declare private throwIfDisposed: typeof throwIfDisposed;
    declare private copyLayoutFromSprite: typeof copyLayoutFromSprite;
    declare private copyHitBoxFromSprite: typeof copyHitBoxFromSprite;

    update(deltaTime: number) {
        this.throwIfDisposed();

        this.applyGravity(deltaTime);
        this.updateSpriteLayout();
        this.updateHitBoxLayout();
    }

    reset() {
        this.throwIfDisposed();

        this.runAnimation.time = 0;
        this.jumpAnimation.time = 0;
        this.shrugAnimation.time = 0;
        this.animationState = "unknown";

        this.velocity.y = 0;

        this.position.y = this.ctx.groundLevel;
        this._grounded = true;
        this.lastGrounded = true;

        this._stimpakCount = 1;
        this.weapon.ammunition = 1;
    }

    /** Jump is only successful if vault boy is grounded and not frozen, of course. */
    tryJump() {
        this.throwIfDisposed();

        if (this._grounded && this.animationState !== "frozen") {
            this.velocity.y = this.ctx.jumpImpulse;

            // Move slightly above the ground level
            this.position.y = this.groundLevel + 1;
            this._grounded = false;

            this.animationState = "jumping";

            this.eventBus.vaultBoy.onJump.invoke();

            return true;
        }

        return false;
    }

    private createImageElement(spriteSheet: HTMLImageElement) {
        const imageElement = new ImageElement();
        imageElement.image = spriteSheet;

        imageElement.compositeOperation = "screen";

        const width = 240;
        const height = 214;
        imageElement.cutout.set({ x: 8, y: 8, width, height });
        imageElement.layout.set({ z: zOffset, width: width * this.scale, height: height * this.scale });

        return imageElement;
    }

    private applyGravity(deltaTime: number) {
        if (this.animationState === "frozen") {
            return;
        }

        this._grounded = this.position.y <= this.groundLevel;
        if (this.lastGrounded !== this._grounded && this._grounded) {
            this.animationState = "running";
            this.eventBus.vaultBoy.onGrounded.invoke();
        }

        this.lastGrounded = this._grounded;

        if (!this._grounded) {
            this.velocity.y += this.gravity * deltaTime;
        } else {
            this.velocity.y = 0;
        }

        this.position.y += this.velocity.y * deltaTime;
    }

    private playAnimation(animation: Animation, loop = true) {
        this.currentAnimation?.stop();
        this.currentAnimation = animation;
        animation.play({ loop: loop }).catch((reason) => {
            throw new AppError("Failed to start animation.", { cause: reason });
        });
    }

    private handleEnemyCollided = (enemy: Enemy) => {
        if (this.stimpakCount > 0) {
            this.stimpakCount -= 1;
            return;
        }

        this.eventBus.vaultBoy.onKilled.invoke();
    };

    private handleItemCollected = (item: Item) => {
        if (item instanceof Stimpak) {
            if (this.stimpakCount + 1 <= maxStimpakCount) {
                this.stimpakCount += 1;
            } else {
                this.eventBus.item.onLimitReached.invoke(item);
            }
        } else if (item instanceof Ammunition) {
            if (this.weapon.ammunition + 1 <= this.weapon.maxAmmunition) {
                this.weapon.ammunition += 1;
            } else {
                this.eventBus.item.onLimitReached.invoke(item);
            }
        }
    };

    private handleAnimationStateChanged() {
        const isFrozen = this.animationState === "frozen";

        this.weapon.animationState = isFrozen ? "frozen" : "default";

        if (isFrozen) {
            this.currentAnimation?.stop();
            return;
        }

        if (this.animationState === "jumping" && !this.jumpAnimation.enabled) {
            this.playAnimation(this.jumpAnimation);
        } else if (this.animationState === "shrugging" && !this.shrugAnimation.enabled) {
            this.playAnimation(this.shrugAnimation);
        } else if (this.animationState === "running" && !this.runAnimation.enabled) {
            // Jump to the middle of run animation for better jump to run transition.
            this.runAnimation.time = this.runAnimation.length / 2;

            this.playAnimation(this.runAnimation);
        }
    }

    dispose(): void {
        if (this.disposed) {
            return;
        }

        this._disposed = true;

        deleteComponent(this.runAnimation);
        deleteComponent(this.jumpAnimation);
        deleteComponent(this.shrugAnimation);

        this.ctx.displayContent.remove(this.hitBoxElement, this.imageElement);

        this.eventBus.item.onCollected.remove(this.handleItemCollected);
        this.eventBus.enemy.onCollided.remove(this.handleEnemyCollided);

        this.weapon.dispose();
    }
}

function createJumpAnimation(sprite: Sprite) {
    const track = new Track<RectLike>(
        (cutout) => sprite.imageElement.cutout.copy(cutout),
        (a) => a,
    );

    let t = 0;
    const width = 240;
    const height = 214;
    track.addKeyframe(t, { x: 752, y: 8, width, height }, Easing.Step);
    track.addKeyframe((t += 1), { x: 752, y: 8, width, height }, Easing.Step);

    const sizeTrack = new Track<Float2Like>(
        (size) => (sprite.size = size),
        (a) => a,
    );

    const scale = 0.8;
    sizeTrack.addKeyframe(0, { x: width * scale, y: height * scale }, Easing.Step);

    const visualOffsetTrack = new Track<Float2Like>(
        (offset) => (sprite.visualPositionOffset = offset),
        (a) => a,
    );

    visualOffsetTrack.addKeyframe(0, { x: 0, y: 0 }, Easing.Step);

    const animation = createComponent(Animation);
    animation.addTrack(track);
    animation.addTrack(sizeTrack);
    animation.addTrack(visualOffsetTrack);

    return animation;
}

function createRunAnimation(sprite: Sprite) {
    const track = new Track<RectLike>(
        (cutout) => sprite.imageElement.cutout.copy(cutout),
        (a) => a,
    );

    let t = 0;
    const o = 0.1;
    const width = 240;
    const height = 214;
    track.addKeyframe(t, { x: 8, y: 8, width, height }, Easing.Step);
    track.addKeyframe((t += o), { x: 256, y: 8, width, height }, Easing.Step);
    track.addKeyframe((t += o), { x: 504, y: 8, width, height }, Easing.Step);
    track.addKeyframe((t += o), { x: 752, y: 8, width, height }, Easing.Step);
    track.addKeyframe((t += o), { x: 1000, y: 8, width, height }, Easing.Step);
    track.addKeyframe((t += o), { x: 1248, y: 8, width, height }, Easing.Step);
    track.addKeyframe((t += o), { x: 1496, y: 8, width, height }, Easing.Step);
    track.addKeyframe((t += o), { x: 1744, y: 8, width, height }, Easing.Step);

    track.addKeyframe((t += o), { x: 1744, y: 291, width, height }, Easing.Step);

    const sizeTrack = new Track<Float2Like>(
        (size) => (sprite.size = size),
        (a) => a,
    );

    const scale = 0.8;
    sizeTrack.addKeyframe(0, { x: width * scale, y: height * scale }, Easing.Step);

    const visualOffsetTrack = new Track<Float2Like>(
        (offset) => (sprite.visualPositionOffset = offset),
        (a) => a,
    );

    visualOffsetTrack.addKeyframe(0, { x: 0, y: 0 }, Easing.Step);

    const animation = createComponent(Animation);
    animation.addTrack(track);
    animation.addTrack(sizeTrack);
    animation.addTrack(visualOffsetTrack);

    return animation;
}

function createShrugAnimation(sprite: Sprite) {
    const cutoutTrack = new Track<RectLike>(
        (cutout) => sprite.imageElement.cutout.copy(cutout),
        (a) => a,
    );

    let t = 0;
    const o = 0.1;
    const width = 205;
    const height = 240;
    cutoutTrack.addKeyframe((t += 0), { x: 8, y: 886, width, height }, Easing.Step);
    cutoutTrack.addKeyframe((t += 1), { x: 221, y: 886, width, height }, Easing.Step);
    cutoutTrack.addKeyframe((t += o), { x: 434, y: 886, width, height }, Easing.Step);
    cutoutTrack.addKeyframe((t += o), { x: 647, y: 1013, width, height }, Easing.Step);
    cutoutTrack.addKeyframe((t += 1), { x: 860, y: 1013, width, height }, Easing.Step);
    cutoutTrack.addKeyframe((t += 1), { x: 647, y: 1013, width, height }, Easing.Step);
    cutoutTrack.addKeyframe((t += 1), { x: 434, y: 886, width, height }, Easing.Step);
    cutoutTrack.addKeyframe((t += o), { x: 221, y: 886, width, height }, Easing.Step);
    cutoutTrack.addKeyframe((t += o), { x: 8, y: 886, width, height }, Easing.Step);
    cutoutTrack.addKeyframe((t += 1), { x: 8, y: 886, width, height }, Easing.Step);

    const sizeTrack = new Track<Float2Like>(
        (size) => (sprite.size = size),
        (a) => a,
    );

    const scale = 0.8;
    sizeTrack.addKeyframe(0, { x: width * scale, y: height * scale }, Easing.Step);

    const visualOffsetTrack = new Track<Float2Like>(
        (offset) => (sprite.visualPositionOffset = offset),
        (a) => a,
    );

    visualOffsetTrack.addKeyframe(0, { x: 24, y: 0 }, Easing.Step);

    const animation = createComponent(Animation);
    animation.addTrack(cutoutTrack);
    animation.addTrack(sizeTrack);
    animation.addTrack(visualOffsetTrack);

    return animation;
}
