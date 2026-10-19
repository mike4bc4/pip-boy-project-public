import { copyHitBoxFromSprite, copyLayoutFromSprite, overlaps, updateSpriteLayout } from "@game/core/utils";
import { Animation } from "../../animation/animation";
import { Easing, Track } from "../../animation/track";
import { createComponent, deleteComponent } from "../../core/ComponentRegistry";
import { DisplayContent } from "../../display/user-interface/display-content";
import { Rect } from "../../display/user-interface/elements/components/Rect";
import { ImageElement } from "../../display/user-interface/elements/image-element";
import { Item } from "./item";
import { AppError } from "../../app-error";

export class Ammunition implements Item {
    public collectable = true;
    public position = { x: 0, y: 0 };
    public visualPositionOffset = { x: 0, y: 0 };
    public size = { x: 0, y: 0 };
    public hitBox = new Rect();

    public readonly imageElement: ImageElement;
    public readonly floatAnimation: Animation;

    private displayContent: DisplayContent;
    private _disposed = false;

    get displaySize() {
        return { x: this.displayContent.width, y: this.displayContent.height };
    }

    get disposed() {
        return this._disposed;
    }

    constructor(imageElement: ImageElement, displayContent: DisplayContent) {
        Object.assign(this, { copyLayoutFromSprite, copyHitBoxFromSprite, overlaps, updateSpriteLayout });

        this.imageElement = imageElement;
        this.displayContent = displayContent;

        this.copyLayoutFromSprite();
        this.copyHitBoxFromSprite();

        this.floatAnimation = createFloatAnimation(this);
        this.floatAnimation.play({ loop: true }).catch((error) => {
            throw new AppError("Failed to play animation.", { cause: error });
        });
    }

    declare overlaps: typeof overlaps;
    declare updateSpriteLayout: typeof updateSpriteLayout;

    declare private copyLayoutFromSprite: typeof copyLayoutFromSprite;
    declare private copyHitBoxFromSprite: typeof copyHitBoxFromSprite;

    dispose(): void {
        if (this.disposed) {
            return;
        }

        this._disposed = true;

        this.floatAnimation.stop();
        deleteComponent(this.floatAnimation);

        this.displayContent.remove(this.imageElement);
    }
}

function createFloatAnimation(item: Item) {
    const track = new Track<number>(
        (offset) => (item.visualPositionOffset.y = offset),
        (a, b, t) => a * (1 - t) + b * t,
    );

    const offset = 32;
    let t = 0;
    const o = 0.66;
    track.addKeyframe(t, -offset, Easing.EaseInOutSine);
    track.addKeyframe((t += o), offset, Easing.EaseInOutSine);
    track.addKeyframe((t += o), -offset, Easing.EaseInOutSine);

    const animation = createComponent(Animation);
    animation.addTrack(track);

    return animation;
}
