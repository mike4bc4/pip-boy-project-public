import { Enemy } from "@game/enemy/enemy";
import { Animation } from "../../animation/animation";
import { Track, Easing } from "../../animation/track";
import { deleteComponent, createComponent } from "../../core/ComponentRegistry";
import { Disposable, throwIfDisposed } from "../../core/disposable";
import { DisplayContent } from "../../display/user-interface/display-content";
import { RectLike } from "../../display/user-interface/elements/components/Rect";
import { ImageElement } from "../../display/user-interface/elements/image-element";
import { copyLayoutFromSprite, updateSpriteLayout } from "@game/core/utils";
import { Sprite } from "@game/core/sprite";

export class Projectile implements Sprite, Disposable {
    public position = { x: 0, y: 0 };
    public visualPositionOffset = { x: 0, y: 0 };
    public size = { x: 0, y: 0 };
    public rayWidth = 80;

    public readonly imageElement: ImageElement;
    public readonly animation: Animation;

    private _disposed = false;
    private displayContent: DisplayContent;

    get displaySize() {
        return { x: this.displayContent.width, y: this.displayContent.height };
    }

    get disposed() {
        return this._disposed;
    }

    constructor(imageElement: ImageElement, displayContent: DisplayContent) {
        Object.assign(this, { copyLayoutFromSprite, updateSpriteLayout, throwIfDisposed });

        this.imageElement = imageElement;
        this.displayContent = displayContent;

        this.animation = createProjectileAnimation(this.imageElement);

        this.copyLayoutFromSprite();
        this.updateSpriteLayout();
    }

    declare updateSpriteLayout: typeof updateSpriteLayout;

    declare private copyLayoutFromSprite: typeof copyLayoutFromSprite;
    declare private throwIfDisposed: typeof throwIfDisposed;

    hasHitEnemy(enemy: Enemy) {
        this.throwIfDisposed();

        if (!enemy.alive) {
            return false;
        }

        const rayY = this.position.y + this.size.y / 2;

        const enemyHitBoxBottom = enemy.position.y + enemy.hitBox.y - this.rayWidth / 2;
        const enemyHitBoxTop = enemyHitBoxBottom + enemy.hitBox.height + this.rayWidth / 2;

        const enemyHit = rayY > enemyHitBoxBottom && rayY < enemyHitBoxTop && enemy.position.x > this.position.x;

        return enemyHit;
    }

    dispose(): void {
        if (this.disposed) {
            return;
        }

        this._disposed = true;

        this.displayContent.remove(this.imageElement);

        deleteComponent(this.animation);
    }
}

function createProjectileAnimation(imageElement: ImageElement) {
    const cutoutTrack = new Track<RectLike>(
        (cutout) => imageElement.cutout.copy(cutout),
        (a, b, t) => a,
    );

    const t = [0, 0.1, 0.2, 0.3, 1];

    cutoutTrack.addKeyframe(t[0], { x: 784, y: 589, width: 512, height: 64 }, Easing.Step);
    cutoutTrack.addKeyframe(t[1], { x: 784, y: 661, width: 512, height: 64 }, Easing.Step);
    cutoutTrack.addKeyframe(t[2], { x: 784, y: 733, width: 512, height: 64 }, Easing.Step);
    cutoutTrack.addKeyframe(t[3], { x: 784, y: 805, width: 512, height: 64 }, Easing.Step);
    cutoutTrack.addKeyframe(t[4], { x: 784, y: 805, width: 512, height: 64 }, Easing.Step);

    const alphaTrack = new Track<number>(
        (alpha) => (imageElement.alpha = alpha),
        (a, b, t) => a * (1 - t) + b * t,
    );

    alphaTrack.addKeyframe(t[0], 1, Easing.Linear);
    alphaTrack.addKeyframe(t[1], 1, Easing.Linear);
    alphaTrack.addKeyframe(t[2], 1, Easing.Linear);
    alphaTrack.addKeyframe(t[3], 0.8, Easing.Linear);
    alphaTrack.addKeyframe(t[4], 0, Easing.Linear);

    const animation = createComponent(Animation);
    animation.addTrack(cutoutTrack);
    animation.addTrack(alphaTrack);
    return animation;
}
