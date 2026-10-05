import { Animation } from "../../../animation/animation";
import { Easing, Track } from "../../../animation/track";
import { createComponent } from "../../../core/ComponentRegistry";
import { DisplayContentRenderer } from "../../display-content-renderer";

export function createDisplayBlurAnimation(displayRenderer: DisplayContentRenderer) {
    const blurTrack = new Track<number>(
        (blurFactor) => displayRenderer.effects.requestBlurFactorChange(blurFactor),
        (a, b, t) => a * (1 - t) + b * t,
    );

    blurTrack.addKeyframe(0, 0.4, Easing.EaseInOutQuad);
    blurTrack.addKeyframe(0.5, 0, Easing.EaseInOutQuad);

    const animation = createComponent(Animation);
    animation.addTrack(blurTrack);

    return animation;
}
