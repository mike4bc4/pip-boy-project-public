import { Animation } from "../../../animation/animation";
import { Easing, Track } from "../../../animation/track";
import { Color } from "../../../core/Color";
import { createComponent } from "../../../core/ComponentRegistry";
import { ButtonElement } from "../elements/button-element";

export function createButtonHoverAnimation(button: ButtonElement) {
    const colorTrack = new Track<Color>(
        (color) => (button.color = color),
        (a, b, t) => a.clone().lerp(b, t),
    );
    colorTrack.addKeyframe(0, Color.black, Easing.EaseInOutQuad);
    colorTrack.addKeyframe(1, Color.white, Easing.EaseInOutQuad);

    const fontColorTrack = new Track<Color>(
        (color) => (button.fontColor = color),
        (a, b, t) => a.clone().lerp(b, t),
    );
    fontColorTrack.addKeyframe(0, Color.white, Easing.EaseInOutQuad);
    fontColorTrack.addKeyframe(1, Color.black, Easing.EaseInOutQuad);

    const animation = createComponent(Animation);
    animation.addTrack(colorTrack);
    animation.addTrack(fontColorTrack);

    return animation;
}
