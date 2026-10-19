import { copyLayoutFromSprite, updateSpriteLayout } from "@game/core/utils";
import { Float2Like } from "../../display/user-interface/elements/components/Float2";
import { ImageElement } from "../../display/user-interface/elements/image-element";
import { Sprite } from "@game/core/sprite";

export class EnvironmentElement implements Sprite {
    public position = { x: 0, y: 0 };
    public visualPositionOffset = { x: 0, y: 0 };
    public size = { x: 0, y: 0 };

    public readonly displaySize = { x: 0, y: 0 };
    public readonly imageElement: ImageElement;

    constructor(imageElement: ImageElement, displaySize: Float2Like) {
        Object.assign(this, { updateSpriteLayout, copyLayoutFromSprite });

        this.imageElement = imageElement;
        this.displaySize = displaySize;

        this.copyLayoutFromSprite();
    }

    declare updateSpriteLayout: typeof updateSpriteLayout;
    declare copyLayoutFromSprite: typeof copyLayoutFromSprite;
}
