import { Color } from "../../core/Color";
import { Rect } from "../../display/user-interface/elements/components/Rect";
import { BorderPosition, RectElement } from "../../display/user-interface/elements/rect-element";
import { Sprite } from "./sprite";

export type PlatformType = "unknown" | "desktop" | "mobile";
export type ResetMode = "soft" | "hard";

export interface HasHitBox {
    hitBox: Rect;
}

export interface HasHitBoxElement {
    hitBoxElement: RectElement;
    drawHitBoxElement: boolean;
}

export function setHitBoxInset(this: Sprite & HasHitBox, top: number, right: number, bottom: number, left: number) {
    this.hitBox.width = this.size.x - left - right;
    this.hitBox.height = this.size.y - top - bottom;
    this.hitBox.x = left;
    this.hitBox.y = bottom;
}

export function overlaps(this: Sprite & HasHitBox, target: Sprite & HasHitBox) {
    const localHitBox = this.hitBox.clone();
    localHitBox.x += this.position.x;
    localHitBox.y += this.position.y;

    const hitBox = target.hitBox.clone();
    hitBox.x += target.position.x;
    hitBox.y += target.position.y;

    return localHitBox.overlaps(hitBox);
}

export function copyLayoutFromSprite(this: Sprite) {
    this.size.x = this.imageElement.layout.width;
    this.size.y = this.imageElement.layout.height;

    this.position.x = this.imageElement.layout.x;
    this.position.y = this.displaySize.y - this.imageElement.layout.y - this.size.y;
}

export function updateSpriteLayout(this: Sprite) {
    const x = this.position.x + this.visualPositionOffset.x;
    const y = this.position.y + this.visualPositionOffset.y;

    this.imageElement.layout.x = x;
    this.imageElement.layout.y = this.displaySize.y - y - this.size.y;
    this.imageElement.layout.width = this.size.x;
    this.imageElement.layout.height = this.size.y;
}

export function updateHitBoxLayout(this: Sprite & HasHitBox & HasHitBoxElement) {
    this.hitBoxElement.layout.x = this.position.x + this.hitBox.x;
    this.hitBoxElement.layout.y = this.displaySize.y - (this.position.y + this.hitBox.y + this.hitBox.height);
    this.hitBoxElement.layout.height = this.hitBox.height;
    this.hitBoxElement.layout.width = this.hitBox.width;
}

export function copyHitBoxFromSprite(this: Sprite & HasHitBox, inset = { top: 0, right: 0, bottom: 0, left: 0 }) {
    this.hitBox.width = this.imageElement.layout.width;
    this.hitBox.height = this.imageElement.layout.height;

    this.hitBox.x = inset.left;
    this.hitBox.y = inset.bottom;
    this.hitBox.width -= inset.left + inset.right;
    this.hitBox.height -= inset.top + inset.bottom;
}

export function createHitBoxElement() {
    const rectElement = new RectElement();
    rectElement.name = "hit-box-element";

    rectElement.compositeOperation = "screen";

    rectElement.color = Color.black;
    rectElement.borderWidth = 2;
    rectElement.borderPosition = BorderPosition.Inside;
    rectElement.borderColor = Color.white;

    return rectElement;
}
