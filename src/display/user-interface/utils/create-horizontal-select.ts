import { AudioService } from "../../../core/audio-service";
import { Color } from "../../../core/Color";
import { HSelectElement } from "../elements/h-select-element";
import { BorderPosition } from "../elements/rect-element";
import { assignButtonSounds } from "./assign-button-sounds";
import { createButtonHoverAnimation } from "./create-button-hover-animation";
import { createButtonPressAnimation } from "./create-button-press-animation";

export function createHorizontalSelect(
    options: {
        x?: number;
        y?: number;
        z?: number;
        width?: number;
        height?: number;
        audioService?: AudioService;
        fontSize?: number;
        borderWidth?: number;
        spacing?: number;
    } = {},
) {
    const {
        x = 0,
        y = 0,
        z = 0,
        width = 544,
        height = 80,
        audioService = undefined,
        fontSize = 42,
        borderWidth = 6,
        spacing = 16,
    } = options;

    const hSelectElement = new HSelectElement();
    hSelectElement.layout.set({ x: x, y: y, z: z, width: width, height: height });
    hSelectElement.spacing = spacing;

    const leftButton = hSelectElement.leftButton;
    leftButton.color = Color.black;
    leftButton.borderColor = Color.white;
    leftButton.borderWidth = borderWidth;
    leftButton.borderPosition = BorderPosition.Inside;
    leftButton.fontSize = fontSize;
    leftButton.fontColor = Color.white;

    leftButton.pressAnimation = createButtonPressAnimation(leftButton);
    leftButton.hoverAnimation = createButtonHoverAnimation(leftButton);

    if (audioService) {
        assignButtonSounds(audioService, leftButton);
    }

    const rightButton = hSelectElement.rightButton;
    rightButton.copyStyle(leftButton);

    rightButton.pressAnimation = createButtonPressAnimation(rightButton);
    rightButton.hoverAnimation = createButtonHoverAnimation(rightButton);

    if (audioService) {
        assignButtonSounds(audioService, rightButton);
    }

    hSelectElement.optionElement.text.color = Color.white;
    hSelectElement.optionElement.text.fontSize = fontSize;

    return hSelectElement;
}
