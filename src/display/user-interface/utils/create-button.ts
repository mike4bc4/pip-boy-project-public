import { AudioService } from "../../../core/audio-service";
import { Color } from "../../../core/Color";
import { ButtonElement } from "../elements/button-element";
import { BorderPosition } from "../elements/rect-element";
import { assignButtonSounds } from "./assign-button-sounds";
import { createButtonHoverAnimation } from "./create-button-hover-animation";
import { createButtonPressAnimation } from "./create-button-press-animation";

export function createButton(
    options: {
        x?: number;
        y?: number;
        z?: number;
        width?: number;
        height?: number;
        borderWidth?: number;
        fontSize?: number;
        audioService?: AudioService;
    } = {},
) {
    const {
        x = 0,
        y = 0,
        z = 0,
        width = 320,
        height = 80,
        borderWidth = 6,
        fontSize = 48,
        audioService = undefined,
    } = options;

    const button = new ButtonElement();
    button.name = "button";
    button.color = Color.black;
    button.borderColor = Color.white;
    button.borderWidth = borderWidth;
    button.borderPosition = BorderPosition.Inside;

    button.fontSize = fontSize;
    button.fontColor = Color.white;
    button.align = "center";
    button.baseline = "middle";
    button.clip = true;

    button.layout.set({ x, y, z, width, height });

    button.pressAnimation = createButtonPressAnimation(button);
    button.hoverAnimation = createButtonHoverAnimation(button);

    if (audioService) {
        assignButtonSounds(audioService, button);
    }

    return button;
}
