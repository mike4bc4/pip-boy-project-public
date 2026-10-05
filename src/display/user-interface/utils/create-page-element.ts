import { AudioService } from "../../../core/audio-service";
import { Color } from "../../../core/Color";
import { PageElement } from "../elements/page-element";
import { BorderPosition } from "../elements/rect-element";
import { assignButtonSounds } from "./assign-button-sounds";
import { createButtonHoverAnimation } from "./create-button-hover-animation";
import { createButtonPressAnimation } from "./create-button-press-animation";

export function createPageElement(
    options: { x?: number; y?: number; z?: number; width?: number; height?: number; audioService?: AudioService } = {},
) {
    const { x = 64, y = 208, z = 10, width = 1152, height = 752, audioService = null } = options;

    const pageElement = new PageElement();
    pageElement.name = "page-element";

    pageElement.layout.x = x;
    pageElement.layout.y = y;
    pageElement.layout.z = z;
    pageElement.layout.width = width;
    pageElement.layout.height = height;

    pageElement.borderSettings.color = Color.white;
    pageElement.textFrameSettings.color = Color.white;
    pageElement.textFrameSettings.fontSize = 42;

    pageElement.textFrameControlsSettings.buttonMargin.bottom = -32;

    const leftButton = pageElement.textFrame.leftButton;
    leftButton.pressAnimation = createButtonPressAnimation(leftButton);
    leftButton.hoverAnimation = createButtonHoverAnimation(leftButton);

    const rightButton = pageElement.textFrame.rightButton;
    rightButton.pressAnimation = createButtonPressAnimation(rightButton);
    rightButton.hoverAnimation = createButtonHoverAnimation(rightButton);

    if (audioService) {
        assignButtonSounds(audioService, pageElement.textFrame.leftButton);
        assignButtonSounds(audioService, pageElement.textFrame.rightButton);
    }

    const textFrame = pageElement.textFrame;

    textFrame.controlSettings.buttonColor = Color.black;
    textFrame.controlSettings.buttonFontColor = Color.white;
    textFrame.controlSettings.buttonBorderColor = Color.white;
    textFrame.controlSettings.buttonBorderPosition = BorderPosition.Inside;
    textFrame.controlSettings.buttonBorderWidth = 6;

    textFrame.counterLabel.color = Color.white;
    textFrame.counterLabel.fontSize = 42;

    const imageOverlay = pageElement.imageOverlay;
    imageOverlay.borderColor = new Color(0.25, 0.25, 0.25);
    imageOverlay.borderPosition = BorderPosition.Inside;
    imageOverlay.borderWidth = 6;
    imageOverlay.color = new Color(1, 1, 1, 0.1);

    return pageElement;
}
