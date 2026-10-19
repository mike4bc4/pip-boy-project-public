import { Color } from "../../../core/Color";
import { createPointerEvents } from "./components/pointer-events";
import { Layout } from "./components/layout";
import { VisualElement } from "./visual-element";
import { Rect } from "./components/Rect";
import { Action } from "../../../core/Action";

export enum BorderPosition {
    Middle = "MIDDLE",
    Inside = "INSIDE",
    Outside = "OUTSIDE",
}

export interface RectElementStyle {
    color: Color;
    borderWidth: number;
    borderColor: Color;
    borderPosition: BorderPosition;
}

export class RectElement implements VisualElement {
    public visible = true;
    public name = "";

    public color = Color.black;
    public gradientFactory: ((context: CanvasRenderingContext2D) => CanvasGradient) | null = null;
    public borderWidth = 0;
    public borderColor = Color.transparent;
    public borderPosition = BorderPosition.Middle;
    public mask: Rect | null = null;
    public compositeOperation: GlobalCompositeOperation = "source-over";

    public readonly onPrepare = new Action<[context: CanvasRenderingContext2D]>();
    public readonly layout = new Layout();
    public readonly pointerEvents = createPointerEvents();

    copyStyle(style: RectElementStyle) {
        this.color = style.color.clone();
        this.borderWidth = style.borderWidth;
        this.borderColor = style.borderColor.clone();
        this.borderPosition = style.borderPosition;
    }

    private draw(context: CanvasRenderingContext2D) {
        const pivotX = this.layout.x + this.layout.pivot.x * this.layout.width;
        const pivotY = this.layout.y + this.layout.pivot.y * this.layout.height;

        context.save();

        context.globalCompositeOperation = this.compositeOperation;
        context.translate(this.layout.offset.x, this.layout.offset.y);
        context.translate(pivotX, pivotY);
        context.scale(this.layout.scale.x, this.layout.scale.y);
        context.translate(-pivotX, -pivotY);

        if (this.mask) {
            context.beginPath();
            context.rect(this.mask.x, this.mask.y, this.mask.width, this.mask.height);
            context.clip();
        }

        context.fillStyle = this.gradientFactory ? this.gradientFactory(context) : this.color.toHexString();
        context.fillRect(this.layout.x, this.layout.y, this.layout.width, this.layout.height);

        if (this.borderWidth > 0) {
            let x = this.layout.x;
            let y = this.layout.y;
            let width = this.layout.width;
            let height = this.layout.height;

            if (this.borderPosition === BorderPosition.Inside) {
                const halfOffset = this.borderWidth / 2;
                x += halfOffset;
                y += halfOffset;
                width -= this.borderWidth;
                height -= this.borderWidth;
            } else if (this.borderPosition === BorderPosition.Outside) {
                const halfOffset = this.borderWidth / 2;
                x -= halfOffset;
                y -= halfOffset;
                width += this.borderWidth;
                height += this.borderWidth;
            }

            context.strokeStyle = this.borderColor.toHexString();
            context.lineWidth = this.borderWidth;
            context.strokeRect(x, y, width, height);
        }

        context.restore();
    }

    prepare(context: CanvasRenderingContext2D) {
        this.onPrepare.invoke(context);
        return { element: this, draw: () => this.draw(context) };
    }
}
