import { AppError } from "../../../app-error";
import { Color } from "../../../core/Color";
import { Layout } from "./components/layout";
import { createPointerEvents } from "./components/pointer-events";
import { RectLike } from "./components/Rect";
import { ImageElement } from "./image-element";
import { RectElement } from "./rect-element";
import { TextAlignment } from "./text-element";
import { TextFrameElement } from "./text-frame-element";
import { VisualElement } from "./visual-element";

export interface TextFrameSettings {
    text: string;
    fontSize: number;
    fontFamily: string;
    fallbackFontFamily: string;
    color: Color;
    align: TextAlignment;
    lineSpacing: number;
    width: number;
    height: number;
    margin: number;
}

class TextFrameSettingsImpl implements TextFrameSettings {
    private textFrame: TextFrameElement;

    private _text = "Text";
    private _fontSize: number;
    private _fontFamily: string;
    private _fallbackFontFamily: string;
    private _color: Color;
    private _align: TextAlignment;
    private _lineSpacing: number;
    private _width: number;
    private _height: number;
    private _margin: number = 32;

    get text() {
        return this._text;
    }

    set text(value) {
        this._text = value;
        this.textFrame.text = value;
    }

    get fontSize() {
        return this._fontSize;
    }

    set fontSize(value) {
        this._fontSize = value;
        this.textFrame.fontSize = value;
    }

    get fontFamily() {
        return this._fontFamily;
    }

    set fontFamily(value) {
        this._fontFamily = value;
        this.textFrame.fontFamily = value;
    }

    get fallbackFontFamily() {
        return this._fallbackFontFamily;
    }

    set fallbackFontFamily(value) {
        this._fallbackFontFamily = value;
        this.textFrame.fallbackFontFamily = value;
    }

    get color() {
        return this._color;
    }

    set color(value) {
        this._color = value;
        this.textFrame.color = value;
    }

    get align() {
        return this._align;
    }

    set align(value) {
        this._align = value;
        this.textFrame.align = value;
    }

    get lineSpacing() {
        return this._lineSpacing;
    }

    set lineSpacing(value) {
        this._lineSpacing = value;
        this.textFrame.lineSpacing = value;
    }

    get width() {
        return this._width;
    }

    set width(value) {
        this._width = value;
        this.textFrame.layout.width = value;
    }

    get height() {
        return this._height;
    }

    set height(value) {
        this._height = value;
        this.textFrame.layout.height = value;
    }

    get margin() {
        return this._margin;
    }

    set margin(value) {
        this._margin = value;
    }

    constructor(textFrame: TextFrameElement) {
        this.textFrame = textFrame;

        this._text = textFrame.text;
        this._fontSize = textFrame.fontSize;
        this._fontFamily = textFrame.fontFamily;
        this._fallbackFontFamily = textFrame.fontFamily;
        this._color = textFrame.color;
        this._align = textFrame.align;
        this._lineSpacing = textFrame.lineSpacing;

        this.width = 704;
        this.height = 688;
        this._margin = 32;
    }
}

export interface BorderSettings {
    width: number;
    cornerWidth: number;
    color: Color;
    visible: boolean;
}

class BorderSettingsImpl implements BorderSettings {
    private borderElements: RectElement[];

    private _width = 6;
    private _cornerWidth = 16;
    private _color: Color;
    private _visible: boolean = true;

    get width() {
        return this._width;
    }

    set width(value) {
        this._width = value;
    }

    get cornerWidth() {
        return this._cornerWidth;
    }

    set cornerWidth(value) {
        this._cornerWidth = value;
    }

    get color() {
        return this._color;
    }

    set color(value) {
        this._color = value;

        for (const element of this.borderElements) {
            element.color = value;
        }
    }

    get visible() {
        return this._visible;
    }

    set visible(value) {
        this._visible = value;

        for (const element of this.borderElements) {
            element.visible = value;
        }
    }

    constructor(borderElements: RectElement[]) {
        if (borderElements.length === 0) {
            throw new AppError("Border elements array cannot be empty!");
        }

        this.borderElements = borderElements;
        this._width = 6;
        this._cornerWidth = 16;
        this.color = borderElements[0].color;
        this.visible = borderElements[0].visible;
    }
}

export interface ImageSettings {
    width: number;
    height: number;
    visible: boolean;
    cutout: RectLike;
}

class ImageSettingsImpl implements ImageSettings {
    private _width: number;
    private _height: number;
    private _visible: boolean = true;
    private _cutout: RectLike = { x: 0, y: 0, width: 100, height: 100 };

    private imageElement: ImageElement;
    private imageOverlay: RectElement;

    get width() {
        return this._width;
    }

    set width(value) {
        this._width = value;
        this.imageElement.layout.width = value;
        this.imageOverlay.layout.width = value;
    }

    get height() {
        return this._height;
    }

    set height(value) {
        this._height = value;
        this.imageElement.layout.height = value;
        this.imageOverlay.layout.height = value;
    }

    get visible() {
        return this._visible;
    }

    set visible(value) {
        this._visible = value;
        this.imageElement.visible = value;
        this.imageOverlay.visible = value;
    }

    get cutout(): Readonly<RectLike> {
        return this._cutout;
    }

    set cutout(value) {
        this._cutout = value;
        this.imageElement.cutout.copy(value);
    }

    constructor(imageElement: ImageElement, imageOverlay: RectElement) {
        this.imageElement = imageElement;
        this.imageOverlay = imageOverlay;

        this.width = 352;
        this.height = 352;
    }
}

export class PageElement implements VisualElement {
    public name = "page-element";

    public readonly layout = new Layout();
    public readonly pointerEvents = createPointerEvents();

    private _visible = true;
    private _textFrame: TextFrameElement;
    private _image: ImageElement;
    private _imageOverlay: RectElement;
    private leftBorder: RectElement;
    private upperLeftBorder: RectElement;
    private lowerLeftBorder: RectElement;
    private rightBorder: RectElement;
    private upperRightBorder: RectElement;
    private lowerRightBorder: RectElement;

    private _textFrameSettings: TextFrameSettingsImpl;
    private _borderSettings: BorderSettingsImpl;
    private _imageSettings: ImageSettingsImpl;

    get visible() {
        return this._visible;
    }

    set visible(value) {
        this._visible = value;
        for (const element of this.childElements) {
            element.visible = value;
        }
    }

    get textFrame() {
        return this._textFrame;
    }

    get image() {
        return this._image;
    }

    get imageOverlay() {
        return this._imageOverlay;
    }

    get borderElements() {
        return [
            this.leftBorder,
            this.upperLeftBorder,
            this.lowerLeftBorder,
            this.rightBorder,
            this.upperRightBorder,
            this.lowerRightBorder,
        ];
    }

    get textFrameSettings(): TextFrameSettings {
        return this._textFrameSettings;
    }

    get borderSettings(): BorderSettings {
        return this._borderSettings;
    }

    get imageSettings(): ImageSettings {
        return this._imageSettings;
    }

    get textFrameControlsSettings() {
        return this._textFrame.controlSettings;
    }

    get childElements() {
        return [
            this._textFrame,
            this._image,
            this._imageOverlay,
            this.leftBorder,
            this.upperLeftBorder,
            this.lowerLeftBorder,
            this.rightBorder,
            this.upperRightBorder,
            this.lowerRightBorder,
        ];
    }

    constructor() {
        this.layout.x = 64;
        this.layout.y = 208;
        this.layout.z = 10;
        this.layout.width = 1152;
        this.layout.height = 752;

        this.createChildElements();
    }

    private createChildElements() {
        const textFrame = new TextFrameElement();
        textFrame.name = this.name + "_text-frame";
        this._textFrame = textFrame;

        this._textFrameSettings = new TextFrameSettingsImpl(textFrame);

        const image = new ImageElement();
        image.name = this.name + "_image";
        this._image = image;

        const imageOverlay = new RectElement();
        imageOverlay.name = this.name + "image-overlay";
        imageOverlay.color = Color.transparent;
        this._imageOverlay = imageOverlay;

        this._imageSettings = new ImageSettingsImpl(image, imageOverlay);

        const leftBorder = new RectElement();
        leftBorder.name = this.name + "_left-border";
        this.leftBorder = leftBorder;

        const upperLeftBorder = new RectElement();
        upperLeftBorder.name = this.name + "_upper-left-border";
        this.upperLeftBorder = upperLeftBorder;

        const lowerLeftBorder = new RectElement();
        lowerLeftBorder.name = this.name + "_lower-left-border";
        this.lowerLeftBorder = lowerLeftBorder;

        const rightBorder = new RectElement();
        rightBorder.name = this.name + "_right-border";
        this.rightBorder = rightBorder;

        const upperRightBorder = new RectElement();
        upperRightBorder.name = this.name + "_upper-right-border";
        this.upperRightBorder = upperRightBorder;

        const lowerRightBorder = new RectElement();
        lowerRightBorder.name = this.name + "_lower-right-border";
        this.lowerRightBorder = lowerRightBorder;

        this._borderSettings = new BorderSettingsImpl(this.borderElements);
    }

    private formatDate(date: Date): string {
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();

        return `${day}.${month}.${year}`;
    }

    private updateChildElements() {
        const textFrameWidth = this._textFrameSettings.width;
        const textFrameHeight = this._textFrameSettings.height;
        const textFrameMargin = this._textFrameSettings.margin;

        const textFrame = this._textFrame;
        textFrame.layout.x = this.layout.x + this.layout.width - textFrameWidth - textFrameMargin;
        textFrame.layout.y = this.layout.y + textFrameMargin;
        textFrame.layout.z = this.layout.z + 20;

        const image = this._image;
        image.layout.x = this.layout.x;
        image.layout.y = this.layout.y;
        image.layout.z = this.layout.z + 10;

        const imageOverlay = this._imageOverlay;
        imageOverlay.layout.x = this.layout.x;
        imageOverlay.layout.y = this.layout.y;
        imageOverlay.layout.z = this.layout.z + 20;

        const borderWidth = this._borderSettings.width;
        const borderCornerWidth = this._borderSettings.cornerWidth;

        const leftBorder = this.leftBorder;
        leftBorder.layout.x = this.layout.x + this.layout.width - textFrameWidth - 2 * textFrameMargin;
        leftBorder.layout.y = this.layout.y;
        leftBorder.layout.z = this.layout.z + 10;
        leftBorder.layout.width = borderWidth;
        leftBorder.layout.height = textFrameHeight + 2 * textFrameMargin;

        const upperLeftBorder = this.upperLeftBorder;
        upperLeftBorder.layout.copy(leftBorder.layout);
        upperLeftBorder.layout.width = borderCornerWidth;
        upperLeftBorder.layout.height = borderWidth;

        const lowerLeftBorder = this.lowerLeftBorder;
        lowerLeftBorder.layout.copy(upperLeftBorder.layout);
        lowerLeftBorder.layout.y += textFrameHeight + 2 * textFrameMargin - borderWidth;

        const rightBorder = this.rightBorder;
        rightBorder.layout.x = this.layout.x + this.layout.width - borderWidth;
        rightBorder.layout.y = this.layout.y;
        rightBorder.layout.z = this.layout.z + 10;
        rightBorder.layout.width = borderWidth;
        rightBorder.layout.height = leftBorder.layout.height;

        const upperRightBorder = this.upperRightBorder;
        upperRightBorder.layout.copy(rightBorder.layout);
        upperRightBorder.layout.x -= borderCornerWidth - borderWidth;
        upperRightBorder.layout.width = borderCornerWidth;
        upperRightBorder.layout.height = borderWidth;

        const lowerRightBorder = this.lowerRightBorder;
        lowerRightBorder.layout.copy(upperRightBorder.layout);
        lowerRightBorder.layout.y = lowerLeftBorder.layout.y;
    }

    prepare(context: CanvasRenderingContext2D) {
        this.updateChildElements();
        return {
            element: this,
            draw: () => {},
        };
    }
}
