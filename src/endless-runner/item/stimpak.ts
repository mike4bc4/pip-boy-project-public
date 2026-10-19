import { copyHitBoxFromSprite, copyLayoutFromSprite, overlaps, updateSpriteLayout } from "@game/core/utils";
import { Animation } from "../../animation/animation";
import { Track, Easing } from "../../animation/track";
import { deleteComponent, createComponent } from "../../core/ComponentRegistry";
import { DisplayContent } from "../../display/user-interface/display-content";
import { Float2Like } from "../../display/user-interface/elements/components/Float2";
import { Rect } from "../../display/user-interface/elements/components/Rect";
import { ImageElement } from "../../display/user-interface/elements/image-element";
import { Item } from "./item";
import { AppError } from "../../app-error";

export class Stimpak implements Item {
    public collectable = true;
    public position: Float2Like = { x: 0, y: 0 };
    public visualPositionOffset: Float2Like = { x: 0, y: 0 };
    public size: Float2Like = { x: 0, y: 0 };
    public hitBox: Rect = new Rect();

    public readonly displaySize: Float2Like;
    public readonly imageElement: ImageElement;
    public readonly floatAnimation: Animation;

    private displayContent: DisplayContent;
    private _disposed = false;

    get disposed() {
        return this._disposed;
    }

    constructor(imageElement: ImageElement, displayContent: DisplayContent) {
        Object.assign(this, { copyLayoutFromSprite, copyHitBoxFromSprite, overlaps, updateSpriteLayout });

        this.imageElement = imageElement;
        this.displayContent = displayContent;
        this.displaySize = { x: this.displayContent.width, y: this.displayContent.height };

        this.copyLayoutFromSprite();
        this.copyHitBoxFromSprite();

        this.floatAnimation = createFloatAnimation(this);
        this.floatAnimation.play({ loop: true }).catch((error) => {
            throw new AppError("Failed to play animation", { cause: error });
        });
    }

    declare copyLayoutFromSprite: typeof copyLayoutFromSprite;
    declare copyHitBoxFromSprite: typeof copyHitBoxFromSprite;
    declare overlaps: typeof overlaps;
    declare updateSpriteLayout: typeof updateSpriteLayout;

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
