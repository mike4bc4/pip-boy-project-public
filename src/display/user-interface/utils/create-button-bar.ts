import { Animation } from '../../../animation/animation';
import { Track, Easing } from '../../../animation/track';
import { AudioService } from '../../../core/audio-service';
import { Color } from '../../../core/Color';
import { createComponent } from '../../../core/ComponentRegistry';
import { Button, ButtonBarElement } from '../elements/button-bar-element';
import { Float2Like, Float2 } from '../elements/components/Float2';
import { assignButtonSounds } from './assign-button-sounds';


function createPressAnimation(button: Button) {
    const transformTrack = new Track<Float2Like>(
        (scale) => {
            button.background.layout.scale.copy(scale);
            button.buttonElement.layout.scale.copy(scale);
            button.bottomBar.layout.scale.copy(scale);
        },
        (a, b, t) => new Float2().copy(a).lerp(b, t)
    );

    transformTrack.addKeyframe(0, { x: 1, y: 1 }, Easing.EaseInOutQuad);
    transformTrack.addKeyframe(1, { x: 0.9, y: 0.9 }, Easing.EaseInOutQuad);

    const animation = createComponent(Animation);
    animation.addTrack(transformTrack);
    return animation;
}
function createHoverAnimation(button: Button) {
    const colorTrack = new Track<Color>(
        (color) => (button.buttonElement.color = color),
        (a, b, t) => a.clone().lerp(b, t)
    );
    colorTrack.addKeyframe(0, new Color(1, 1, 1, 0), Easing.EaseInOutQuad);
    colorTrack.addKeyframe(1, Color.white, Easing.EaseInOutQuad);

    const fontColorTrack = new Track<Color>(
        (color) => (button.buttonElement.fontColor = color),
        (a, b, t) => a.clone().lerp(b, t)
    );
    fontColorTrack.addKeyframe(0, Color.white, Easing.EaseInOutQuad);
    fontColorTrack.addKeyframe(1, Color.black, Easing.EaseInOutQuad);

    const animation = createComponent(Animation);
    animation.addTrack(colorTrack);
    animation.addTrack(fontColorTrack);

    return animation;
}
function createSelectAnimation(button: Button) {
    const alphaTrack = new Track<Color>(
        (color) => (button.background.color = color),
        (a, b, t) => a.clone().lerp(b, t)
    );

    alphaTrack.addKeyframe(0, Color.black, Easing.EaseInOutQuad);
    alphaTrack.addKeyframe(1, new Color(0.25, 0.25, 0.25), Easing.EaseInOutQuad);

    const animation = createComponent(Animation);
    animation.addTrack(alphaTrack);
    return animation;
}
export function createButtonBar(
    options: {
        x?: number;
        y?: number;
        z?: number;
        width?: number;
        height?: number;
        audioService?: AudioService;
        buttonCount?: number;
    } = {}) {
    const { x = 96, y = 96, z = 8, width = 1088, height = 80, audioService = null, buttonCount = 5 } = options;

    const buttonBar = new ButtonBarElement();
    buttonBar.name = "button-bar";
    buttonBar.buttonCount = buttonCount;
    buttonBar.layout.set({ x, y, z, width, height });

    buttonBar.onButtonsRebuilt.add(() => {
        for (const button of buttonBar.buttons) {
            button.buttonElement.fontColor = Color.white;
            button.buttonElement.fontSize = 48;
            button.buttonElement.color = Color.transparent;

            button.buttonElement.pressAnimation = createPressAnimation(button);
            button.buttonElement.hoverAnimation = createHoverAnimation(button);
            button.selectAnimation = createSelectAnimation(button);

            if (audioService) {
                assignButtonSounds(audioService, button.buttonElement);
            }

            button.background.color = Color.black;
            button.bottomBar.color = Color.white;
            button.spacer.color = Color.white;
        }
    });

    buttonBar.snap(0);

    return buttonBar;
}
