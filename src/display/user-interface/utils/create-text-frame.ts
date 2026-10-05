import { AudioService } from "../../../core/audio-service";
import { Color } from "../../../core/Color";
import { BorderPosition } from "../elements/rect-element";
import { TextAlignment } from "../elements/text-element";
import { TextFrameElement } from "../elements/text-frame-element";
import { assignButtonSounds } from "./assign-button-sounds";
import { createButtonHoverAnimation } from "./create-button-hover-animation";
import { createButtonPressAnimation } from "./create-button-press-animation";

export function createTextFrame(
    options: {
        x?: number;
        y?: number;
        z?: number;
        width?: number;
        height?: number;
        fontSize?: number;
        buttonFontSize?: number;
        buttonBorderWidth?: number;
        align?: TextAlignment;
        controlsHeight?: number;
        pageCounterWidth?: number;
        audioService?: AudioService;
    } = {},
) {
    const {
        x = 0,
        y = 0,
        z = 0,
        width = 600,
        height = 400,
        fontSize = 42,
        buttonFontSize = 42,
        buttonBorderWidth = 6,
        controlsHeight = 80,
        align = "left",
        pageCounterWidth = 128,
        audioService = undefined,
    } = options;

    const textFrame = new TextFrameElement();
    textFrame.name = "text-frame";
    textFrame.color = Color.white;
    textFrame.fontSize = fontSize;
    textFrame.align = align;

    textFrame.controlSettings.buttonHeight = controlsHeight;
    textFrame.controlSettings.counterHeight = controlsHeight;
    textFrame.controlSettings.counterWidth = pageCounterWidth;

    textFrame.layout.set({ x, y, z, width, height });

    const pageCounter = textFrame.counterLabel;
    pageCounter.color = Color.white;

    const leftButton = textFrame.leftButton;
    leftButton.color = Color.black;
    leftButton.borderColor = Color.white;
    leftButton.borderWidth = buttonBorderWidth;
    leftButton.borderPosition = BorderPosition.Inside;
    leftButton.fontSize = buttonFontSize;
    leftButton.fontColor = Color.white;

    leftButton.pressAnimation = createButtonPressAnimation(leftButton);
    leftButton.hoverAnimation = createButtonHoverAnimation(leftButton);

    if (audioService) {
        assignButtonSounds(audioService, leftButton);
    }

    const rightButton = textFrame.rightButton;
    rightButton.copyStyle(leftButton);

    rightButton.pressAnimation = createButtonPressAnimation(rightButton);
    rightButton.hoverAnimation = createButtonHoverAnimation(rightButton);

    if (audioService) {
        assignButtonSounds(audioService, rightButton);
    }

    return textFrame;
}
