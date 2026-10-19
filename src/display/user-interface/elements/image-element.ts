import { createPointerEvents } from "./components/pointer-events";
import { Layout } from "./components/layout";
import { Rect } from "./components/Rect";
import { VisualElement } from "./visual-element";

export class ImageElement implements VisualElement {
    public visible = true;
    public name = "";
    public compositeOperation: GlobalCompositeOperation = "source-over";

    public readonly layout = new Layout();
    public readonly pointerEvents = createPointerEvents();
    public readonly cutout = new Rect();

    private _image: HTMLImageElement | undefined = undefined;
    private _alpha = 1;

    get image() {
        return this._image;
    }

    set image(value) {
        this._image = value;
    }

    get alpha() {
        return this._alpha;
    }

    set alpha(value) {
        this._alpha = Math.max(0, Math.min(1, value));
    }

    private draw(context: CanvasRenderingContext2D) {
        if (!this.image) {
            return;
        }

        context.save();

        context.globalCompositeOperation = this.compositeOperation;
        context.globalAlpha = this.alpha;

        const pivotX = this.layout.x + this.layout.pivot.x * this.layout.width;
        const pivotY = this.layout.y + this.layout.pivot.y * this.layout.height;

        context.translate(this.layout.offset.x, this.layout.offset.y);
        context.translate(pivotX, pivotY);
        context.scale(this.layout.scale.x, this.layout.scale.y);
        context.translate(-pivotX, -pivotY);

        context.drawImage(
            this.image,
            this.cutout.x,
            this.cutout.y,
            this.cutout.width,
            this.cutout.height,
            this.layout.x,
            this.layout.y,
            this.layout.width,
            this.layout.height,
        );

        context.restore();
    }

    prepare(context: CanvasRenderingContext2D) {
        return { element: this, draw: () => this.draw(context) };
    }
}
