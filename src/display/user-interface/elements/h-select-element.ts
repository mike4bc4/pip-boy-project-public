import { Action } from "../../../core/Action";
import { Color } from "../../../core/Color";
import { ButtonElement } from "./button-element";
import { Layout } from "./components/layout";
import { createPointerEvents } from "./components/pointer-events";
import { RectElement } from "./rect-element";
import { TextElement } from "./text-element";
import { VisualElement } from "./visual-element";

export interface Option {
    text: string;
    data?: any;
}

export class HSelectElement implements VisualElement {
    public name = "h-select-element";

    public readonly pointerEvents = createPointerEvents();
    public readonly layout = new Layout();

    public spacing = 16;
    public buttonAspect = 1.0;
    public buttonGrow = 0.9;
    public options: Option[] = [{ text: "Default" }];

    public readonly onOptionIndexChanged = new Action<[previousIndex: number]>();

    private _visible = true;
    private _leftButton: ButtonElement;
    private _rightButton: ButtonElement;
    private _optionRect: RectElement;
    private _optionText: TextElement;

    private _optionIndex = 0;

    get visible() {
        return this._visible;
    }

    set visible(value) {
        this._visible = value;
        this._leftButton.visible = value;
        this._rightButton.visible = value;
        this._optionRect.visible = value;
        this._optionText.visible = value;
    }

    get optionIndex() {
        return this._optionIndex;
    }

    get leftButton() {
        return this._leftButton;
    }

    get rightButton() {
        return this._rightButton;
    }

    get optionElement() {
        return { rect: this._optionRect, text: this._optionText };
    }

    get currentOption() {
        return this.options.length > 0 ? this.options[this.optionIndex] : null;
    }

    get childElements() {
        return [this._leftButton, this.rightButton, this._optionRect, this._optionText];
    }

    constructor() {
        this.createChildElements();
        this.updateChildElements();
    }

    public setOptionIndex(value: number, emitEvent = true) {
        const clampedIndex = Math.max(0, Math.min(value, this.options.length - 1));
        if (this._optionIndex === clampedIndex) {
            return;
        }

        const previousIndex = this._optionIndex;
        this._optionIndex = clampedIndex;
        if (emitEvent) {
            this.onOptionIndexChanged.invoke(previousIndex);
        }
    }

    private createChildElements() {
        const leftButton = new ButtonElement();
        leftButton.name = this.name + "_left-button";
        leftButton.text = "<";
        leftButton.fontSize = 42;

        leftButton.pointerEvents.interactive = true;
        leftButton.pointerEvents.addEventListener("onclick", this.handleLeftButtonClick);

        this._leftButton = leftButton;

        const rightButton = new ButtonElement();
        rightButton.name = this.name + "_right-button";
        rightButton.text = ">";
        rightButton.fontSize = 42;

        rightButton.pointerEvents.interactive = true;
        rightButton.pointerEvents.addEventListener("onclick", this.handleRightButtonClick);

        this._rightButton = rightButton;

        const optionRect = new RectElement();
        optionRect.name = this.name + "_option-rect";
        optionRect.color = Color.create({ r: 0.25, g: 0.25, b: 0.25, a: 1 });
        this._optionRect = optionRect;

        const optionText = new TextElement();
        optionText.name = this.name + "_option-label";
        optionText.text = this.options[this._optionIndex].text;
        optionText.align = "center";
        optionText.baseline = "middle";
        optionText.fontSize = 42;

        this._optionText = optionText;
        optionText.clip = true;
    }

    private updateChildElements() {
        const buttonHeight = this.layout.height * this.buttonGrow;
        const buttonWidth = buttonHeight * this.buttonAspect;
        const buttonOffsetY = ((1 - this.buttonGrow) / 2) * this.layout.height;

        const { x, y, z, width, height } = this.layout;
        const rawLayout = { x, y, z, width, height };

        this._leftButton.layout.copy(rawLayout);
        this._leftButton.layout.height = buttonHeight;
        this._leftButton.layout.width = buttonWidth;
        this._leftButton.layout.y += buttonOffsetY;
        this._leftButton.layout.z += 1;

        this._rightButton.layout.copy(rawLayout);
        this._rightButton.layout.height = buttonHeight;
        this._rightButton.layout.y += buttonOffsetY;
        this._rightButton.layout.width = buttonWidth;
        this._rightButton.layout.x = this.layout.x + this.layout.width - this._rightButton.layout.width;
        this.rightButton.layout.z += 1;

        this._optionRect.layout.set({
            x: this.layout.x + this._leftButton.layout.width + this.spacing,
            y: this.layout.y,
            z: this.layout.z,
            width: this.layout.width - buttonWidth * 2 - this.spacing * 2,
            height: this.layout.height,
        });

        this._optionText.layout.copy(this._optionRect.layout);
        this._optionText.layout.z += 1;

        this._optionIndex = Math.max(0, Math.min(this._optionIndex, this.options.length - 1));
        this._optionText.text = this.options.length > 0 ? this.options[this._optionIndex].text : "[ERR]";
    }

    private handleRightButtonClick = () => {
        const nextOptionIndex = this._optionIndex + 1;
        if (nextOptionIndex >= this.options.length) {
            this.setOptionIndex(0);
        } else {
            this.setOptionIndex(nextOptionIndex);
        }
    };

    private handleLeftButtonClick = () => {
        const nextOptionIndex = this._optionIndex - 1;
        if (nextOptionIndex < 0) {
            this.setOptionIndex(this.options.length);
        } else {
            this.setOptionIndex(nextOptionIndex);
        }
    };

    prepare(context: CanvasRenderingContext2D) {
        this.updateChildElements();
        return {
            element: this,
            draw: () => {},
        };
    }
}
