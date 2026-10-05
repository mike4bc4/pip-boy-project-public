import { Color } from "../../../core/Color";
import { createPointerEvents } from "./components/pointer-events";
import { Layout } from "./components/layout";
import { VisualElement } from "./visual-element";
import { Rect } from "./components/Rect";

export type TextAlignment = "left" | "right" | "center";
export type TextBaseline = "top" | "middle" | "bottom";

export interface TextElementStyle {
    fontSize: number;
    fontFamily: string;
    fallbackFontFamily: string;
    color: Color;
    align: TextAlignment;
    baseline: TextBaseline;
    clip: boolean;
}

export class TextElement implements VisualElement {
    public visible = true;
    public name = "";

    public text = "Text";
    public fontSize = 24;
    public fontFamily = "Share Tech Mono";
    public fallbackFontFamily = "Overpass Mono";
    public color = Color.black;
    public align: TextAlignment = "left";
    public baseline: TextBaseline = "top";
    public clip = false;
    public mask: Rect | null = null;

    public readonly layout = new Layout();
    public readonly pointerEvents = createPointerEvents();

    public copyStyle(style: TextElementStyle) {
        this.fontSize = style.fontSize;
        this.fontFamily = style.fontFamily;
        this.fallbackFontFamily = style.fallbackFontFamily;
        this.color = style.color;
        this.align = style.align;
        this.baseline = style.baseline;
        this.clip = style.clip;
    }

    private draw(context: CanvasRenderingContext2D) {
        const pivotX = this.layout.x + this.layout.pivot.x * this.layout.width;
        const pivotY = this.layout.y + this.layout.pivot.y * this.layout.height;

        context.save();
        context.translate(this.layout.offset.x, this.layout.offset.y);
        context.translate(pivotX, pivotY);
        context.scale(this.layout.scale.x, this.layout.scale.y);
        context.translate(-pivotX, -pivotY);

        if (this.clip) {
            context.beginPath();
            context.rect(this.layout.x, this.layout.y, this.layout.width, this.layout.height);
            context.clip();
        }

        if (this.mask) {
            context.beginPath();
            context.rect(this.mask.x, this.mask.y, this.mask.width, this.mask.height);
            context.clip();
        }

        context.font = `${this.fontSize}px ${this.fontFamily}, ${this.fallbackFontFamily}`;
        context.fillStyle = this.color.toHexString();
        context.textAlign = this.align;
        context.textBaseline = this.baseline;

        let x = this.layout.x;

        switch (this.align) {
            case "center":
                x += this.layout.width / 2;
                break;

            case "right":
                x += this.layout.width;
                break;
        }

        let y = this.layout.y;

        switch (this.baseline) {
            case "middle":
                y += this.layout.height / 2;
                break;

            case "bottom":
                y += this.layout.height;
                break;
        }

        context.fillText(this.text, x, y);
        context.restore();
    }

    prepare(context: CanvasRenderingContext2D) {
        return { element: this, draw: () => this.draw(context) };
    }
}
