import {
    copyHitBoxFromSprite,
    copyLayoutFromSprite,
    createHitBoxElement,
    overlaps,
    updateHitBoxLayout,
    updateSpriteLayout,
} from "@game/core/utils";
import { Animation } from "../../animation/animation";
import { Easing, Track } from "../../animation/track";
import { AppError } from "../../app-error";
import { createComponent, deleteComponent } from "../../core/ComponentRegistry";
import { DisplayContent } from "../../display/user-interface/display-content";
import { Rect, RectLike } from "../../display/user-interface/elements/components/Rect";
import { ImageElement } from "../../display/user-interface/elements/image-element";
import { RectElement } from "../../display/user-interface/elements/rect-element";
import { Enemy, handleAnimationStateChanged } from "./enemy";
import { throwIfDisposed } from "../../core/disposable";

export class Vertibird implements Enemy {
    public position = { x: 0, y: 0 };
    public visualPositionOffset = { x: 0, y: 0 };
    public size = { x: 0, y: 0 };
    public hitBox = new Rect();
    public movementSpeed = 600;

    public readonly imageElement: ImageElement;
    public readonly deathAnimation: Animation;

    private displayContent: DisplayContent;
    private _hitBoxElement: RectElement;
    private _disposed = false;
    private _drawHitBoxElement = true;
    private _alive = true;
    private _animationState: "default" | "frozen" = "default";

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

    get alive() {
        return this._alive;
    }

    get drawHitBoxElement() {
        return this._drawHitBoxElement;
    }

    set drawHitBoxElement(value) {
        this.throwIfDisposed();

        if (value) {
            this.displayContent.add(this.hitBoxElement);
        } else {
            this.displayContent.remove(this.hitBoxElement);
        }

        this._drawHitBoxElement = value;
    }

    get disposed() {
        return this._disposed;
    }

    get hitBoxElement() {
        return this._hitBoxElement;
    }

    get displaySize() {
        return { x: this.displayContent.width, y: this.displayContent.height };
    }

    constructor(imageElement: ImageElement, displayContent: DisplayContent) {
        Object.assign(this, {
            copyLayoutFromSprite,
            updateSpriteLayout,
            updateHitBoxLayout,
            copyHitBoxFromSprite,
            overlaps,
            handleAnimationStateChanged,
            throwIfDisposed,
        });

        this.imageElement = imageElement;
        this.displayContent = displayContent;

        this._hitBoxElement = createHitBoxElement();
        this.displayContent.add(this._hitBoxElement);

        this.deathAnimation = createDeathAnimation(imageElement);

        this.copyLayoutFromSprite();
        this.copyHitBoxFromSprite({ top: 16, right: 40, bottom: 16, left: 40 });

        this.drawHitBoxElement = false;
    }

    declare updateSpriteLayout: typeof updateSpriteLayout;
    declare updateHitBoxLayout: typeof updateHitBoxLayout;
    declare overlaps: typeof overlaps;

    declare private copyLayoutFromSprite: typeof copyLayoutFromSprite;
    declare private copyHitBoxFromSprite: typeof copyHitBoxFromSprite;
    declare private handleAnimationStateChanged: typeof handleAnimationStateChanged;
    declare private throwIfDisposed: typeof throwIfDisposed;

    kill() {
        this.throwIfDisposed();

        this._alive = false;

        // Scaling up just for bigger explosion animation.
        const scale = 1.5;
        const diffX = (scale - 1) * this.size.x;
        const diffY = (scale - 1) * this.size.y;

        this.size.x += diffX;
        this.size.y += diffY;

        // Adding some position offset to keep the explosion centered.
        this.visualPositionOffset.x -= diffX / 2;
        this.visualPositionOffset.y -= diffY / 2;

        // Force track evaluation so the first frame is already applied and
        // update sprite, so there is no pop-up effect.
        this.deathAnimation.time = 0;
        this.updateSpriteLayout();

        this.deathAnimation.play().catch((reason) => {
            throw new AppError("Failed to play animation.", { cause: reason });
        });
    }

    dispose() {
        if (this.disposed) {
            return;
        }

        this._disposed = true;

        this.displayContent.remove(this.imageElement, this.hitBoxElement);

        this.deathAnimation.stop();
        deleteComponent(this.deathAnimation);
    }
}

function createDeathAnimation(imageElement: ImageElement) {
    const cutoutTrack = new Track<RectLike>(
        (cutout) => imageElement.cutout.set(cutout),
        (a, b, t) => a,
    );

    let t = 0;
    const o = 0.075;

    const width = 192;
    const height = 114;
    cutoutTrack.addKeyframe((t += 0), { x: 1440, y: 517, width, height }, Easing.Step);
    cutoutTrack.addKeyframe((t += o), { x: 1640, y: 517, width, height }, Easing.Step);
    cutoutTrack.addKeyframe((t += o), { x: 1840, y: 517, width, height }, Easing.Step);
    cutoutTrack.addKeyframe((t += o), { x: 1440, y: 639, width, height }, Easing.Step);
    cutoutTrack.addKeyframe((t += o), { x: 1640, y: 639, width, height }, Easing.Step);
    cutoutTrack.addKeyframe((t += o), { x: 1840, y: 639, width, height }, Easing.Step);
    cutoutTrack.addKeyframe((t += o), { x: 1440, y: 761, width, height }, Easing.Step);
    cutoutTrack.addKeyframe((t += o), { x: 1640, y: 761, width, height }, Easing.Step);
    cutoutTrack.addKeyframe((t += o), { x: 1840, y: 761, width, height }, Easing.Step);
    cutoutTrack.addKeyframe((t += o), { x: 1440, y: 883, width, height }, Easing.Step);
    cutoutTrack.addKeyframe((t += o), { x: 1640, y: 883, width, height }, Easing.Step);
    cutoutTrack.addKeyframe((t += o), { x: 1840, y: 883, width, height }, Easing.Step);

    const alphaTrack = new Track<number>(
        (alpha) => (imageElement.alpha = alpha),
        (a, b, t) => a * (1 - t) + b * t,
    );

    alphaTrack.addKeyframe(0, 1, Easing.Linear);
    alphaTrack.addKeyframe(t, 1, Easing.Linear);
    alphaTrack.addKeyframe((t += 0.5), 0, Easing.Linear);

    const animation = createComponent(Animation);
    animation.addTrack(cutoutTrack);
    animation.addTrack(alphaTrack);
    return animation;
}
