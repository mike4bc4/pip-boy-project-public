import { Animation } from "../animation/animation";
import { Easing, Track } from "../animation/track";
import { createComponent } from "../core/ComponentRegistry";

export function createOpacityAnimation(htmlElement: HTMLElement, length = 0.5) {
    const track = new Track<number>(
        (opacity) => htmlElement.style.opacity = opacity.toString(),
        (a, b, t) => a * (1 - t) + b * t,
    );

    track.addKeyframe(0, 0, Easing.EaseInOutQuad);
    track.addKeyframe(length, 1, Easing.EaseInOutQuad);

    const animation = createComponent(Animation);
    animation.addTrack(track);

    return animation;
}