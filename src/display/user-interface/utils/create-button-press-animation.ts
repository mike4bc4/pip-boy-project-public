import { Animation } from "../../../animation/animation";
import { Track, Easing } from "../../../animation/track";
import { createComponent } from "../../../core/ComponentRegistry";
import { ButtonElement } from "../elements/button-element";
import { Float2Like, Float2 } from "../elements/components/Float2";

export function createButtonPressAnimation(button: ButtonElement, scale = 0.9) {
    const transformTrack = new Track<Float2Like>(
        (scale) => button.layout.scale.copy(scale),
        (a, b, t) => new Float2().copy(a).lerp(b, t),
    );

    transformTrack.addKeyframe(0, { x: 1, y: 1 }, Easing.EaseInOutQuad);
    transformTrack.addKeyframe(1, { x: scale, y: scale }, Easing.EaseInOutQuad);

    const animation = createComponent(Animation);
    animation.addTrack(transformTrack);

    return animation;
}
