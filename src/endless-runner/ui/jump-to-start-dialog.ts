import { Color } from "../../core/Color";
import { DisplayContent } from "../../display/user-interface/display-content";
import { BorderPosition, RectElement } from "../../display/user-interface/elements/rect-element";
import { TextElement } from "../../display/user-interface/elements/text-element";
import { VisualElement } from "../../display/user-interface/elements/visual-element";
import { Key, Localization } from "../../localization/localization";

const zOffset = 150;

interface JumpToStartDialogContext {
    displayContent: DisplayContent;
    localization: Localization;
}

export class JumpToStartDialog implements DialogBox {
    private ctx: JumpToStartDialogContext;
    private _visible = true;

    private background: RectElement;
    private label: TextElement;

    get visible() {
        return this._visible;
    }

    set visible(value) {
        this._visible = value;
        for (const element of this.elements) {
            element.visible = value;
        }
    }

    get elements(): VisualElement[] {
        return [this.background, this.label];
    }

    private get displayContent() {
        return this.ctx.displayContent;
    }

    private get localization() {
        return this.ctx.localization;
    }

    constructor(ctx: JumpToStartDialogContext) {
        this.ctx = ctx;

        this.createElements();
        this.localizeElements();
    }

    localizeElements() {
        this.label.text = this.localization.translate(Key.JumpToStart);
    }

    private createElements() {
        const background = new RectElement();
        this.displayContent.add(background);
        background.name = "jts-background";

        background.layout.set({ x: 288, y: 224, z: zOffset, width: 704, height: 80 });
        background.color = Color.black;
        background.borderPosition = BorderPosition.Inside;
        background.borderColor = Color.white;
        background.borderWidth = 4;

        this.background = background;

        const label = new TextElement();
        this.displayContent.add(label);
        label.name = "jts-label";

        label.layout.set({ x: 304, y: 240, z: zOffset + 1, width: 672, height: 48 });
        label.align = "center";
        label.baseline = "middle";
        label.color = Color.white;
        label.fontSize = 42;
        label.clip = true;

        this.label = label;
    }
}
