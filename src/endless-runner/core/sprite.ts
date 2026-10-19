import { Float2Like } from "../../display/user-interface/elements/components/Float2";
import { ImageElement } from "../../display/user-interface/elements/image-element";

export interface Sprite {
    position: Float2Like;
    visualPositionOffset: Float2Like;
    size: Float2Like;
    readonly displaySize: Float2Like;
    readonly imageElement: ImageElement;
}
