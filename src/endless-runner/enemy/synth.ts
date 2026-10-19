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

export class Synth implements Enemy {
    public position = { x: 0, y: 0 };
    public visualPositionOffset = { x: 0, y: 0 };
    public size = { x: 0, y: 0 };
    public hitBox = new Rect();
    public movementSpeed = 520;

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
            copyHitBoxFromSprite,
            updateSpriteLayout,
            updateHitBoxLayout,
            overlaps,
            handleAnimationStateChanged,
            throwIfDisposed,
        });

        this.imageElement = imageElement;
        this.displayContent = displayContent;

        this._hitBoxElement = createHitBoxElement();
        this.displayContent.add(this._hitBoxElement);

        this.deathAnimation = createDeathAnimation(this.imageElement);

        this.copyLayoutFromSprite();
        this.copyHitBoxFromSprite({ top: 16, right: 8, bottom: 16, left: 8 });

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
    const track = new Track<RectLike>(
        (cutout) => imageElement.cutout.set(cutout),
        (a, b, t) => a,
    );

    let t = 0;
    const o = 0.1;

    track.addKeyframe(t, { x: 1499, y: 230, width: 127, height: 240 }, Easing.Step);
    track.addKeyframe((t += o), { x: 1634, y: 230, width: 127, height: 240 }, Easing.Step);
    track.addKeyframe((t += o), { x: 1770, y: 230, width: 127, height: 240 }, Easing.Step);
    track.addKeyframe((t += o), { x: 1905, y: 230, width: 127, height: 240 }, Easing.Step);
    track.addKeyframe((t += o), { x: 1305, y: 517, width: 127, height: 240 }, Easing.Step);

    const animation = createComponent(Animation);
    animation.addTrack(track);
    return animation;
}
