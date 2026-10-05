import { Animation } from "../../../animation/animation";
import { Easing, Track } from "../../../animation/track";
import { createComponent } from "../../../core/ComponentRegistry";
import { DisplayContentRenderer } from "../../display-content-renderer";
import { Float2, Float2Like } from "../elements/components/Float2";

export function createDisplayScrollAnimation(displayRenderer: DisplayContentRenderer) {
    const track = new Track<Float2Like>(
        (offset) => displayRenderer.effects.requestUVOffsetChange(offset),
        (a, b, t) => new Float2().copy(a).lerp(b, t),
    );

    track.addKeyframe(0, { x: 0, y: 0 }, Easing.Linear);
    track.addKeyframe(0.3, { x: 0, y: -2.1 }, Easing.EaseInOutSine);
    track.addKeyframe(0.4, { x: 0, y: -1.9 }, Easing.EaseInOutSine);
    track.addKeyframe(0.5, { x: 0, y: -2.05 }, Easing.EaseInOutSine);
    track.addKeyframe(0.6, { x: 0, y: -1.95 }, Easing.EaseInOutSine);
    track.addKeyframe(0.7, { x: 0, y: -2 }, Easing.EaseInOutSine);

    const animation = createComponent(Animation);
    animation.addTrack(track);

    return animation;
}
