import { HasHitBox, overlaps, updateSpriteLayout } from "@game/core/utils";
import { Disposable } from "../../core/disposable";
import { DisplayContent } from "../../display/user-interface/display-content";
import { Float2, Float2Like } from "../../display/user-interface/elements/components/Float2";
import { ImageElement } from "../../display/user-interface/elements/image-element";
import { Sprite } from "@game/core/sprite";
import { Easing, Track } from "../../animation/track";
import { createComponent } from "../../core/ComponentRegistry";
import { Animation } from "../../animation/animation";

export type ItemConstructor<T extends Item> = new (imageElement: ImageElement, displayContent: DisplayContent) => T;

export interface ItemBase {
    collectable: boolean;
    visualPositionOffset: Float2Like;

    readonly floatAnimation: Animation;

    overlaps: typeof overlaps;
    updateSpriteLayout: typeof updateSpriteLayout;
}

export type Item = Sprite & HasHitBox & ItemBase & Disposable;

export function createCollectAnimation(sprite: Sprite) {
    const sizeTrack = new Track<Float2Like>(
        (size) => (sprite.size = size),
        (a, b, t) => new Float2().copy(a).lerp(b, t),
    );

    const t = 0.35;
    sizeTrack.addKeyframe(0, { ...sprite.size }, Easing.EaseInOutQuad);
    sizeTrack.addKeyframe(t, { x: 1, y: 1 }, Easing.EaseInOutQuad);

    const vpoTrack = new Track<Float2Like>(
        (vpo) => (sprite.visualPositionOffset = vpo),
        (a, b, t) => new Float2().copy(a).lerp(b, t),
    );

    // Shrinking towards the center, so the vpo offset is required.
    const baseSize = { ...sprite.size };
    vpoTrack.addKeyframe(0, { ...sprite.visualPositionOffset }, Easing.EaseInOutQuad);
    vpoTrack.addKeyframe(t, { x: baseSize.x / 2, y: baseSize.y / 2 }, Easing.EaseInOutQuad);

    const animation = createComponent(Animation);
    animation.addTrack(sizeTrack);
    animation.addTrack(vpoTrack);

    return animation;
}
