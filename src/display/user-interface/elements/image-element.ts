import { AssetRecord } from "../../../assets/AssetRecord";
import { createPointerEvents } from "./components/pointer-events";
import { Layout } from "./components/layout";
import { Rect } from "./components/Rect";
import { VisualElement } from "./visual-element";

export class ImageElement implements VisualElement {
    public visible = true;
    public name = "";

    public readonly layout = new Layout();
    public readonly pointerEvents = createPointerEvents();
    public readonly cutout = new Rect();

    private image = new Image();
    private _assetRecord: AssetRecord | null = null;

    get assetRecord() {
        return this._assetRecord;
    }

    async load(assetRecord: AssetRecord) {
        this._assetRecord = assetRecord;
        this.image.src = assetRecord.url;

        await new Promise((resolve, reject) => {
            this.image.onload = resolve;
            this.image.onerror = reject;
        });
    }

    private draw(context: CanvasRenderingContext2D) {
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
    }

    prepare(context: CanvasRenderingContext2D) {
        return { element: this, draw: () => this.draw(context) };
    }
}
