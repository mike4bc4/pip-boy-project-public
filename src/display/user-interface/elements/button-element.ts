import { Animation } from "../../../animation/animation";
import { Action } from "../../../core/Action";
import { Color } from "../../../core/Color";
import { deleteComponent } from "../../../core/ComponentRegistry";
import { Layout } from "./components/layout";
import { createPointerEvents } from "./components/pointer-events";
import { Rect } from "./components/Rect";
import { BorderPosition, RectElement } from "./rect-element";
import { TextAlignment, TextBaseline, TextElement } from "./text-element";
import { VisualElement } from "./visual-element";

export interface ButtonStyle {
    color: Color;
    borderWidth: number;
    borderColor: Color;
    borderPosition: BorderPosition;
    fontSize: number;
    fontFamily: string;
    fallbackFontFamily: string;
    fontColor: Color;
    align: TextAlignment;
    baseline: TextBaseline;
    clip: boolean;
}

export class ButtonElement implements VisualElement {
    public name = "button";
    public hoverAnimation: Animation | null = null;
    public hoverAnimationEnterTime = 0.05;
    public hoverAnimationLeaveTime = 0.15;

    public pressAnimation: Animation | null = null;
    public pressAnimationEnterTime = 0.05;
    public pressAnimationLeaveTime = 0.15;

    public readonly onPressedChanged = new Action();
    public readonly onHoveredChanged = new Action();
    public readonly layout = new Layout();
    public readonly pointerEvents = createPointerEvents();

    private _rect: RectElement;
    private _label: TextElement;
    private _pressed = false;
    private _hovered = false;
    private _mask: Rect | null = null;
    private _visible = true;

    private _disposed = false;

    get visible() {
        return this._visible;
    }

    set visible(value) {
        this._visible = value;
        this._label.visible = value;
        this._rect.visible = value;
    }

    get mask() {
        return this._mask;
    }

    set mask(value) {
        this._rect.mask = value;
        this._label.mask = value;
    }

    get pressed() {
        return this._pressed;
    }

    private set pressed(value) {
        if (this.pressed !== value) {
            this._pressed = value;
            this.onPressedChanged.invoke();
        }
    }

    get hovered() {
        return this._hovered;
    }

    private set hovered(value) {
        if (this._hovered !== value) {
            this._hovered = value;
            this.onHoveredChanged.invoke();
        }
    }

    get color() {
        return this._rect.color;
    }

    set color(value) {
        this._rect.color = value;
    }

    get borderWidth() {
        return this._rect.borderWidth;
    }

    set borderWidth(value) {
        this._rect.borderWidth = value;
    }

    get borderColor() {
        return this._rect.borderColor;
    }

    set borderColor(value) {
        this._rect.borderColor = value;
    }

    get borderPosition() {
        return this._rect.borderPosition;
    }

    set borderPosition(value) {
        this._rect.borderPosition = value;
    }

    get text() {
        return this._label.text;
    }

    set text(value) {
        this._label.text = value;
    }

    get fontSize() {
        return this._label.fontSize;
    }

    set fontSize(value) {
        this._label.fontSize = value;
    }

    get fontFamily() {
        return this._label.fontFamily;
    }

    set fontFamily(value) {
        this._label.fontFamily = value;
    }

    get fallbackFontFamily() {
        return this._label.fallbackFontFamily;
    }

    set fallbackFontFamily(value) {
        this._label.fallbackFontFamily = value;
    }

    get fontColor() {
        return this._label.color;
    }

    set fontColor(value) {
        this._label.color = value;
    }

    get align() {
        return this._label.align;
    }

    set align(value) {
        this._label.align = value;
    }

    get baseline() {
        return this._label.baseline;
    }

    set baseline(value) {
        this._label.baseline = value;
    }

    get clip() {
        return this._label.clip;
    }

    set clip(value) {
        this._label.clip = value;
    }

    get rect() {
        return this._rect;
    }

    get label() {
        return this._label;
    }

    get childElements() {
        return [this._rect, this._label];
    }

    get disposed() {
        return this._disposed;
    }

    constructor() {
        this.pointerEvents.interactive = true;
        this.pointerEvents.addEventListener("onpointerdown", () => (this.pressed = true));
        this.pointerEvents.addEventListener("onpointerup", () => (this.pressed = false));
        this.pointerEvents.addEventListener("onpointerenter", () => (this.hovered = true));
        this.pointerEvents.addEventListener("onpointerleave", () => (this.hovered = false));
        this.pointerEvents.addEventListener("onpointercancel", () => (this.pressed = false));

        this.onHoveredChanged.add(this.handlePressedOrHoveredChanged);
        this.onPressedChanged.add(this.handlePressedOrHoveredChanged);

        this._rect = new RectElement();
        this._rect.name = this.name + "_rect";
        this._rect.borderPosition = BorderPosition.Inside;

        this._label = new TextElement();
        this._label.name = this.name + "_label";
        this._label.align = "center";
        this._label.baseline = "middle";
        this._label.clip = true;

        this.updateElements();
    }

    copyStyle(style: ButtonStyle) {
        this.color = style.color.clone();
        this.borderWidth = style.borderWidth;
        this.borderColor = style.borderColor.clone();
        this.borderPosition = style.borderPosition;
        this.fontSize = style.fontSize;
        this.fontFamily = style.fontFamily;
        this.fallbackFontFamily = style.fallbackFontFamily;
        this.fontColor = style.fontColor.clone();
        this.align = style.align;
        this.baseline = style.baseline;
        this.clip = style.clip;
    }

    private handlePressedOrHoveredChanged = () => {
        const active = this.pressed || this.hovered;
        if (active) {
            const safeEnterMultiplier = 1 / Math.max(0.001, this.hoverAnimationEnterTime);
            this.hoverAnimation?.play({ timeMultiplier: safeEnterMultiplier });
        } else {
            const safeLeaveMultiplier = -1 / Math.max(0.001, this.hoverAnimationLeaveTime);
            this.hoverAnimation?.play({ timeMultiplier: safeLeaveMultiplier });
        }

        if (this.pressed) {
            const safeEnterMultiplier = 1 / Math.max(0.001, this.pressAnimationEnterTime);
            this.pressAnimation?.play({ timeMultiplier: safeEnterMultiplier });
        } else {
            const safeLeaveMultiplier = -1 / Math.max(0.001, this.pressAnimationLeaveTime);
            this.pressAnimation?.play({ timeMultiplier: safeLeaveMultiplier });
        }
    };

    private updateElements() {
        this._rect.layout.copy(this.layout);
        this._label.layout.copy(this.layout);
    }

    prepare(context: CanvasRenderingContext2D) {
        this.updateElements();

        return { element: this, draw: () => {} };
    }

    dispose(): void {
        if (this.disposed) {
            return;
        }

        this.onHoveredChanged.dispose();
        this.onPressedChanged.dispose();

        this.pointerEvents.dispose();

        if (this.pressAnimation) {
            this.pressAnimation.stop();
            deleteComponent(this.pressAnimation);
        }

        if (this.hoverAnimation) {
            this.hoverAnimation.stop();
            deleteComponent(this.hoverAnimation);
        }

        this._disposed = true;
    }
}
