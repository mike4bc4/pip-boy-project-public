import { Animation } from "../../../animation/animation";
import { Action } from "../../../core/Action";
import { Color } from "../../../core/Color";
import { ButtonElement } from "./button-element";
import { Layout } from "./components/layout";
import { createPointerEvents } from "./components/pointer-events";
import { RectElement } from "./rect-element";
import { VisualElement } from "./visual-element";

export interface Button {
    buttonElement: ButtonElement;
    bottomBar: RectElement;
    background: RectElement;
    spacer: RectElement;
    selectAnimation: Animation | null;
}

class ButtonImpl implements Button {
    public buttonElement: ButtonElement;
    public bottomBar: RectElement;
    public background: RectElement;
    public spacer: RectElement;
    public selectAnimation: Animation | null = null;
    public selected = false;
}

export class ButtonBarElement implements VisualElement {
    public name = "button-bar-element";

    public buttonLabels: string[] = [];

    public readonly layout = new Layout();
    public readonly pointerEvents = createPointerEvents();
    public readonly onButtonsRebuilt = new Action();
    public readonly onButtonIndexChanged = new Action<[lastIndex: number]>();

    private _visible = true;
    private _buttons: ButtonImpl[] = [];
    private _selectAnimationLength = 0.25;
    private _buttonIndex = 0;
    private _buttonCount = 1;
    private _buttonWidth = 320;
    private _buttonHeight = 80;
    private _barHeight = 6;
    private _buttonSpacing = 64;
    private _spacerSize = 16;
    private _selectAnimationTriggerOffset = 64;
    private _scrollSpeed = 6;
    private _edgeGradientSize = 96;

    private offset = 0;
    private lastUpdateTime: number | null = null;
    private delta = 0;
    private rebuildQueued = false;
    private rebuildLocked = false;
    private edgeMask: RectElement;

    get visible() {
        return this._visible;
    }

    set visible(value) {
        this._visible = value;
        for (const element of this.childElements) {
            element.visible = value;
        }
    }

    get buttons() {
        return [...this._buttons] as Button[];
    }

    get selectAnimationLength() {
        return this._selectAnimationLength;
    }

    set selectAnimationLength(value) {
        this._selectAnimationLength = Math.max(0.01, value);
    }

    get buttonIndex() {
        return this._buttonIndex;
    }

    set buttonIndex(value) {
        const safeValue = Math.max(0, Math.min(this._buttons.length - 1, value));
        if (this._buttonIndex === safeValue) {
            return;
        }

        const lastButtonIndex = this._buttonIndex;
        this._buttonIndex = safeValue;
        this.handleButtonIndexChange(lastButtonIndex);
    }

    get buttonCount() {
        return this._buttonCount;
    }

    set buttonCount(value) {
        const safeValue = Math.max(0, value);

        if (this._buttonCount === safeValue) {
            return;
        }

        this._buttonCount = safeValue;
        this.rebuildQueued = true;
    }

    get buttonWidth() {
        return this._buttonWidth;
    }

    set buttonWidth(value) {
        if (value === this._buttonWidth) {
            return;
        }

        this._buttonWidth = value;
        this.rebuildQueued = true;
    }

    get buttonHeight() {
        return this._buttonHeight;
    }

    set buttonHeight(value) {
        if (this._buttonHeight === value) {
            return;
        }

        this._buttonHeight = value;
        this.rebuildQueued = true;
    }

    get barHeight() {
        return this._barHeight;
    }

    set barHeight(value) {
        if (this._barHeight === value) {
            return;
        }

        this._barHeight = value;
        this.rebuildQueued = true;
    }

    get buttonSpacing() {
        return this._buttonSpacing;
    }

    set buttonSpacing(value) {
        if (this._buttonSpacing === value) {
            return;
        }

        this._buttonSpacing = value;
        this.rebuildQueued = true;
    }

    get spacerSize() {
        return this._spacerSize;
    }

    set spacerSize(value) {
        if (this._spacerSize === value) {
            return;
        }

        this._spacerSize = value;
        this.rebuildQueued = true;
    }

    get selectAnimationTriggerOffset() {
        return this._selectAnimationTriggerOffset;
    }

    set selectAnimationTriggerOffset(value) {
        if (this._selectAnimationTriggerOffset === value) {
            return;
        }

        this._selectAnimationTriggerOffset = value;
        this.rebuildQueued = true;
    }

    get scrollSpeed() {
        return this._scrollSpeed;
    }

    set scrollSpeed(value) {
        this._scrollSpeed = Math.max(0.1, value);
    }

    get edgeGradientSize() {
        return this._edgeGradientSize;
    }

    set edgeGradientSize(value) {
        if (this._edgeGradientSize === value) {
            return;
        }

        this._edgeGradientSize = value;
        this.handleEdgeGradientSizeChange();
    }

    get childElements() {
        const elements: VisualElement[] = [this.edgeMask];
        for (const button of this._buttons) {
            elements.push(button.buttonElement, button.bottomBar, button.spacer, button.background);
        }

        return elements;
    }

    constructor() {
        this.edgeMask = new RectElement();
        this.handleEdgeGradientSizeChange();
    }

    private handleEdgeGradientSizeChange() {
        if (this._edgeGradientSize <= 0) {
            this.edgeMask.gradientFactory = null;
            return;
        }

        const normalizedGradientStop = Math.min(1, this._edgeGradientSize / Math.max(0.001, this.layout.width));

        this.edgeMask.gradientFactory = (ctx) => {
            const gradient = ctx.createLinearGradient(
                this.layout.x,
                this.layout.y,
                this.layout.x + this.layout.width,
                this.layout.y,
            );

            gradient.addColorStop(0, Color.black.toHexString());
            gradient.addColorStop(normalizedGradientStop, Color.transparent.toHexString());
            gradient.addColorStop(1 - normalizedGradientStop, Color.transparent.toHexString());
            gradient.addColorStop(1, Color.black.toHexString());

            return gradient;
        };
    }

    private handleButtonIndexChange(lastIndex: number) {
        const lastButton = this._buttons[lastIndex];
        lastButton.buttonElement.pointerEvents.interactive = true;
        lastButton.selected = false;

        lastButton.selectAnimation?.play({ timeMultiplier: -(1 / this._selectAnimationLength) });

        const button = this._buttons[this.buttonIndex];
        button.buttonElement.pointerEvents.interactive = false;
        this.onButtonIndexChanged.invoke(lastIndex);
    }

    private createButton(index: number): ButtonImpl {
        const button = new ButtonImpl();

        const baseName = this.name + `_button${index}`;

        const buttonElement = new ButtonElement();
        buttonElement.name = baseName;
        buttonElement.layout.z = this.layout.z + 10;
        buttonElement.layout.width = this._buttonWidth;
        buttonElement.layout.height = this._buttonHeight;

        buttonElement.pointerEvents.addEventListener("onclick", () => (this.buttonIndex = index));

        const background = new RectElement();
        background.name = baseName + "_background";
        background.layout.copy(buttonElement.layout);

        const bottomBar = new RectElement();
        bottomBar.name = baseName + "_bottom-bar";
        bottomBar.layout.y = this.buttonHeight - this.barHeight;
        bottomBar.layout.z = this.layout.z + 20;
        bottomBar.layout.width = this._buttonWidth;
        bottomBar.layout.height = this._barHeight;
        bottomBar.layout.snapPivotTo(buttonElement.layout);

        const spacer = new RectElement();
        spacer.name = baseName + "_spacer";
        spacer.layout.z = this.layout.z;
        spacer.layout.width = this._spacerSize;
        spacer.layout.height = this._spacerSize;

        button.buttonElement = buttonElement;
        button.background = background;
        button.bottomBar = bottomBar;
        button.spacer = spacer;

        return button;
    }

    private rebuildButtons() {
        if (this.rebuildLocked) {
            return;
        }

        for (const button of this._buttons) {
            button.buttonElement.dispose();
        }

        this._buttons = [];

        for (let i = 0; i < this._buttonCount; i += 1) {
            this._buttons.push(this.createButton(i));
        }

        this._buttons[this._buttons.length - 1].spacer.visible = false;

        this.rebuildQueued = false;

        this.rebuildLocked = true;
        this.onButtonsRebuilt.invoke();
        this.rebuildLocked = false;
    }

    private updateDelta() {
        if (this.lastUpdateTime === null) {
            this.lastUpdateTime = Date.now();
        }

        const now = Date.now();
        this.delta = (now - this.lastUpdateTime) / 1000;
        this.lastUpdateTime = now;
    }

    private lerp(a: number, b: number, t: number) {
        return a * (1 - t) + b * t;
    }

    private getTargetOffset() {
        const centerOffset = this.layout.width / 2 - this.buttonWidth / 2;
        const buttonOffset = -(this.buttonIndex * this._buttonWidth + this.buttonIndex * this._buttonSpacing);
        return buttonOffset + centerOffset;
    }

    snap(buttonIndex: number) {
        if (this.rebuildQueued) {
            this.rebuildButtons();
        }

        this._buttonIndex = Math.max(0, Math.min(this._buttons.length - 1, buttonIndex));

        this.offset = this.getTargetOffset();

        for (const button of this._buttons) {
            button.selected = false;

            button.buttonElement.pointerEvents.interactive = true;

            if (button.selectAnimation) {
                button.selectAnimation.stop();
                button.selectAnimation.time = 0;
            }
        }

        const targetButton = this._buttons[this.buttonIndex];
        targetButton.selected = true;

        targetButton.buttonElement.pointerEvents.interactive = false;

        if (targetButton.selectAnimation) {
            targetButton.selectAnimation.stop();
            targetButton.selectAnimation.time = targetButton.selectAnimation.length;
        }
    }

    private updateChildElements() {
        if (this.rebuildQueued) {
            this.rebuildButtons();
        }

        this.edgeMask.visible = this._edgeGradientSize > 0;
        if (this.edgeMask.visible) {
            this.edgeMask.layout.copy(this.layout);
            this.edgeMask.layout.z += 30;
        }

        if (this._buttons.length === 0) {
            return;
        }

        this.updateDelta();

        const targetOffset = this.getTargetOffset();
        this.offset = this.lerp(this.offset, targetOffset, this.delta * this._scrollSpeed);

        let i = 0;
        for (const button of this._buttons) {
            button.buttonElement.layout.x = this.layout.x + i * this.buttonWidth + i * this.buttonSpacing + this.offset;
            button.buttonElement.layout.y = this.layout.y;
            button.buttonElement.mask = this.layout.rect;

            button.background.layout.copy({ ...button.buttonElement.layout, ...{ z: this.layout.z } });
            button.background.mask = this.layout.rect;

            button.bottomBar.layout.x = button.buttonElement.layout.x;
            button.bottomBar.layout.y = this.layout.y + this._buttonHeight - this._barHeight;
            button.bottomBar.mask = this.layout.rect;

            button.spacer.layout.x =
                button.buttonElement.layout.x + this.buttonWidth + this.buttonSpacing / 2 - this.spacerSize / 2;
            button.spacer.layout.y = this.layout.y + this._buttonHeight / 2 - this._spacerSize / 2;
            button.spacer.mask = this.layout.rect;

            if (this.buttonLabels.length > i) {
                button.buttonElement.text = this.buttonLabels[i];
            }

            i += 1;
        }

        const targetButton = this._buttons[this.buttonIndex];
        if (Math.abs(this.offset - targetOffset) < this._selectAnimationTriggerOffset && !targetButton.selected) {
            targetButton.selected = true;
            targetButton.selectAnimation?.play({ timeMultiplier: 1 / this.selectAnimationLength });
        }
    }

    prepare(context: CanvasRenderingContext2D) {
        this.updateChildElements();
        return { element: this, draw: () => {} };
    }
}
