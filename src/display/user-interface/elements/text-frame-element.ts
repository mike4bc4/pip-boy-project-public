import { Color } from "../../../core/Color";
import { createPointerEvents } from "./components/pointer-events";
import { Layout } from "./components/layout";
import { TextAlignment, TextElement } from "./text-element";
import { VisualElement } from "./visual-element";
import { ButtonElement } from "./button-element";
import { BorderPosition, RectElement } from "./rect-element";

type Margin = { left: number; top: number; right: number; bottom: number };

export interface ControlSettings {
    buttonHeight: number;
    buttonWidth: number;
    buttonFontSize: number;
    buttonColor: Color;
    buttonFontColor: Color;
    buttonBorderColor: Color;
    buttonBorderWidth: number;
    buttonBorderPosition: BorderPosition;
    interactive: boolean;

    counterWidth: number;
    counterHeight: number;

    buttonMargin: Margin;
    counterPadding: number;
}

class ControlSettingsImpl implements ControlSettings {
    private leftButton: ButtonElement;
    private rightButton: ButtonElement;
    private counterLabel: TextElement;
    private background: RectElement;

    private _buttonHeight = 80;
    private _buttonWidth = 80;
    private _buttonFontSize = 42;
    private _buttonColor = Color.transparent;
    private _buttonFontColor = Color.black;
    private _buttonBorderColor = Color.black;
    private _buttonBorderWidth = 0;
    private _buttonBorderPosition = BorderPosition.Inside;
    private _interactive = true;

    private _counterHeight = 80;
    private _counterWidth = 128;

    private _buttonMargin = { left: 16, top: 16, right: 16, bottom: 0 };
    private _counterPadding = 16;

    get buttonHeight() {
        return this._buttonHeight;
    }

    set buttonHeight(value) {
        this._buttonHeight = value;
        this.leftButton.layout.height = value;
        this.rightButton.layout.height = value;
    }

    get buttonWidth() {
        return this._buttonWidth;
    }

    set buttonWidth(value) {
        this._buttonWidth = value;
        this.leftButton.layout.width = value;
        this.rightButton.layout.width = value;
    }

    get buttonFontSize() {
        return this._buttonFontSize;
    }

    set buttonFontSize(value) {
        this._buttonFontSize = value;
        this.leftButton.fontSize = value;
        this.rightButton.fontSize = value;
    }

    get buttonColor() {
        return this._buttonColor;
    }

    set buttonColor(value) {
        this._buttonColor = value;
        this.leftButton.color = value;
        this.rightButton.color = value;
    }

    get buttonFontColor() {
        return this._buttonFontColor;
    }

    set buttonFontColor(value) {
        this._buttonFontColor = value;
        this.leftButton.fontColor = value;
        this.rightButton.fontColor = value;
    }

    get buttonBorderColor() {
        return this._buttonBorderColor;
    }

    set buttonBorderColor(value) {
        this._buttonBorderColor = value;
        this.leftButton.borderColor = value;
        this.rightButton.borderColor = value;
    }

    get buttonBorderWidth() {
        return this._buttonBorderWidth;
    }

    set buttonBorderWidth(value) {
        this._buttonBorderWidth = value;
        this.leftButton.borderWidth = value;
        this.rightButton.borderWidth = value;
    }

    get buttonBorderPosition() {
        return this._buttonBorderPosition;
    }

    set buttonBorderPosition(value) {
        this._buttonBorderPosition = value;
        this.leftButton.borderPosition = value;
        this.rightButton.borderPosition = value;
    }

    get interactive() {
        return this._interactive;
    }

    set interactive(value) {
        this._interactive = value;
        this.leftButton.pointerEvents.interactive = value;
        this.rightButton.pointerEvents.interactive = value;
    }

    get counterHeight() {
        return this._counterHeight;
    }

    set counterHeight(value) {
        this._counterHeight = value;
        this.background.layout.height = value;
        this.counterLabel.layout.height = value - this.counterPadding * 2;
    }

    get counterWidth() {
        return this._counterWidth;
    }

    set counterWidth(value) {
        this._counterWidth = value;
        this.background.layout.width = value;
        this.counterLabel.layout.width = value - this.counterPadding * 2;
    }

    get counterPadding() {
        return this._counterPadding;
    }

    set counterPadding(value) {
        this._counterPadding = value;
        this.counterLabel.layout.width = this.counterWidth - this.counterPadding * 2;
        this.counterLabel.layout.height = this.counterHeight - this.counterPadding * 2;
    }

    get buttonMargin(): Margin {
        return this._buttonMargin;
    }

    set buttonMargin(value) {
        this._buttonMargin = value;
    }

    constructor(
        leftButton: ButtonElement,
        rightButton: ButtonElement,
        counterLabel: TextElement,
        background: RectElement,
    ) {
        this.leftButton = leftButton;
        this.rightButton = rightButton;
        this.counterLabel = counterLabel;
        this.background = background;

        this.buttonHeight = 80;
        this.buttonWidth = 80;
        this.buttonFontSize = 42;

        this.counterHeight = 80;
        this.counterWidth = 128;
        this.counterLabel.clip = true;

        this.background.color = new Color(0.25, 0.25, 0.25);
    }
}

export class TextFrameElement implements VisualElement {
    public name = "text-frame";

    public text = "Text";
    public fontSize = 24;
    public fontFamily = "Share Tech Mono";
    public fallbackFontFamily = "Overpass Mono";
    public color = Color.black;
    public align: TextAlignment = "left";
    public lineSpacing = 0.5;

    public readonly layout = new Layout();
    public readonly pointerEvents = createPointerEvents();

    private pageCount = 1;

    private _visible = true;
    private _controlSettings: ControlSettingsImpl;
    private _leftButton: ButtonElement;
    private _rightButton: ButtonElement;
    private _counterLabel: TextElement;
    private _background: RectElement;

    private _overflow = false;

    private _currentPageIndex = 0;

    get visible() {
        return this._visible;
    }

    set visible(value) {
        this._visible = value;
        this._leftButton.visible = value;
        this._rightButton.visible = value;
        this._counterLabel.visible = value;
        this._background.visible = value;
    }

    get controlSettings(): ControlSettings {
        return this._controlSettings;
    }

    get currentPageIndex() {
        return this._currentPageIndex;
    }

    set currentPageIndex(index: number) {
        this._currentPageIndex = index;
        this.clampCurrentPageIndex();
    }

    get leftButton() {
        return this._leftButton;
    }

    get rightButton() {
        return this._rightButton;
    }

    get counterLabel() {
        return this._counterLabel;
    }

    get background() {
        return this._background;
    }

    get overflow() {
        return this._overflow;
    }

    set overflow(value) {
        this._overflow = value;
    }

    get childElements() {
        return [this._leftButton, this._rightButton, this._counterLabel, this._background];
    }

    constructor() {
        this.layout.width = 500;
        this.layout.height = 500;

        this.createControls();
        this.updateControlsLayout();
    }

    private createControls() {
        this._background = new RectElement();
        this._background.name = this.name + "_counter-rect";

        this._counterLabel = new TextElement();
        this._counterLabel.name = this.name + "_page-counter";
        this._counterLabel.text = "1/1";
        this._counterLabel.align = "center";
        this._counterLabel.baseline = "middle";

        this._leftButton = new ButtonElement();
        this._leftButton.name = this.name + "_left-button";
        this._leftButton.text = "<";

        this._leftButton.pointerEvents.addEventListener("onclick", this.handleLeftButtonClick);

        this._rightButton = new ButtonElement();
        this._rightButton.name = this.name + "_right-button";
        this._rightButton.text = ">";

        this._rightButton.pointerEvents.addEventListener("onclick", this.handleRightButtonClick);

        this._controlSettings = new ControlSettingsImpl(
            this._leftButton,
            this._rightButton,
            this._counterLabel,
            this._background,
        );
    }

    private updateControlsLayout() {
        const cs = this.controlSettings;
        const controlsHeight = Math.max(cs.buttonHeight, cs.counterHeight);
        const controlsY = this.layout.y + this.layout.height - controlsHeight - cs.buttonMargin.bottom;
        const backgroundOffsetY = Math.max(0, (cs.buttonHeight - cs.counterHeight) / 2);

        this.background.layout.x = this.layout.x + this.layout.width / 2 - cs.counterWidth / 2;
        this.background.layout.y = controlsY + backgroundOffsetY;
        this.background.layout.z = this.layout.z + 10;

        this.counterLabel.layout.x = this.background.layout.x + cs.counterPadding;
        this.counterLabel.layout.y = this.background.layout.y + cs.counterPadding;
        this.counterLabel.layout.z = this.layout.z + 20;

        const buttonOffsetY = Math.max(0, (cs.counterHeight - cs.buttonHeight) / 2);

        this._leftButton.layout.x = this._background.layout.x - cs.buttonWidth - cs.buttonMargin.right;
        this._leftButton.layout.y = controlsY + buttonOffsetY;
        this._leftButton.layout.z = this.layout.z + 10;

        this._rightButton.layout.x = this._background.layout.x + this.background.layout.width + cs.buttonMargin.left;
        this._rightButton.layout.y = controlsY + buttonOffsetY;
        this._rightButton.layout.z = this.layout.z + 10;
    }

    private getTextLines(context: CanvasRenderingContext2D) {
        context.font = `${this.fontSize}px ${this.fontFamily}, ${this.fallbackFontFamily}`;

        const textLines = this.text.trim().split("\n");
        const newTextLines: string[] = [];

        for (const line of textLines) {
            if (line.trim() === "") {
                newTextLines.push("");
                continue;
            }

            const words = line.split(" ");
            let newLine = "";

            for (const word of words) {
                const testLine = newLine ? `${newLine} ${word}` : word;
                const metrics = context.measureText(testLine);

                if (newLine !== "" && metrics.width > this.layout.width) {
                    newTextLines.push(newLine);
                    newLine = word;
                } else {
                    newLine = testLine;
                }
            }

            if (newLine !== "") {
                newTextLines.push(newLine);
            }
        }

        return newTextLines;
    }

    private getTextLinesHeight(textLines: string[]) {
        if (textLines.length === 0) {
            return 0;
        }

        const spacing = this.lineSpacing * this.fontSize;
        return textLines.length * this.fontSize + (textLines.length - 1) * spacing;
    }

    private tryGetLinesPerPage() {
        const controlsHeight = Math.max(this.controlSettings.buttonHeight, this.controlSettings.counterHeight);

        const boxHeight =
            this.layout.height -
            controlsHeight -
            this.controlSettings.buttonMargin.top -
            this.controlSettings.buttonMargin.bottom;
        if (boxHeight < this.fontSize) {
            return { success: false, count: 0 };
        }

        const spacing = this.lineSpacing * this.fontSize;
        const count = Math.floor((boxHeight + spacing) / (this.fontSize + spacing));
        return { success: true, count };
    }

    private drawLines(context: CanvasRenderingContext2D, lines: string[]) {
        context.font = `${this.fontSize}px ${this.fontFamily}, ${this.fallbackFontFamily}`;
        context.fillStyle = this.color.toHexString();
        context.textAlign = this.align;
        context.textBaseline = "alphabetic";

        const spacing = this.lineSpacing * this.fontSize;

        for (let i = 0; i < lines.length; i++) {
            let x = this.layout.x;

            switch (this.align) {
                case "center":
                    x += this.layout.width / 2;
                    break;

                case "right":
                    x += this.layout.width;
                    break;
            }

            const y = this.layout.y + (i + 1) * this.fontSize + i * spacing;
            context.fillText(lines[i], x, y);
        }
    }

    private setControlsVisibility(visible: boolean) {
        this._leftButton.visible = visible && this._visible;
        this._rightButton.visible = visible && this._visible;
        this._background.visible = visible && this._visible;
        this._counterLabel.visible = visible && this._visible;
    }

    prepare(context: CanvasRenderingContext2D) {
        const textLines = this.getTextLines(context);
        const textLinesHeight = this.getTextLinesHeight(textLines);

        const drawContext = { element: this, draw: () => {} };

        if (textLinesHeight <= this.layout.height || this.overflow) {
            this.setControlsVisibility(false);

            this.leftButton.pointerEvents.interactive = false;
            this.rightButton.pointerEvents.interactive = false;

            this.pageCount = 1;
            this.clampCurrentPageIndex();

            drawContext.draw = () => this.drawLines(context, textLines);
        } else {
            this.updateControlsLayout();
            const linesPerPage = this.tryGetLinesPerPage();

            if (linesPerPage.success) {
                this.setControlsVisibility(true);

                this.leftButton.pointerEvents.interactive = true && this.controlSettings.interactive;
                this.rightButton.pointerEvents.interactive = true && this.controlSettings.interactive;

                this.pageCount = Math.ceil(textLines.length / linesPerPage.count);
                this.clampCurrentPageIndex();

                this._counterLabel.text = `${this._currentPageIndex + 1}/${this.pageCount}`;

                const startIndex = this._currentPageIndex * linesPerPage.count;
                const endIndex = startIndex + linesPerPage.count;

                const pageLines = textLines.slice(startIndex, endIndex);

                drawContext.draw = () => this.drawLines(context, pageLines);
            } else {
                // Text does not fit into box.
                console.warn("Unable to draw text content, container too small.");
            }
        }

        return drawContext;
    }

    private clampCurrentPageIndex() {
        this._currentPageIndex = Math.min(Math.max(0, this._currentPageIndex), this.pageCount - 1);
    }

    private handleLeftButtonClick = () => {
        this._currentPageIndex -= 1;
        this.clampCurrentPageIndex();
    };

    private handleRightButtonClick = () => {
        this._currentPageIndex += 1;
        this.clampCurrentPageIndex();
    };
}
