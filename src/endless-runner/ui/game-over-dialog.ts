import { Color } from "../../core/Color";
import { DisplayContent } from "../../display/user-interface/display-content";
import { BorderPosition, RectElement } from "../../display/user-interface/elements/rect-element";
import { TextElement } from "../../display/user-interface/elements/text-element";
import { TextFrameElement } from "../../display/user-interface/elements/text-frame-element";
import { VisualElement } from "../../display/user-interface/elements/visual-element";
import { Key, Localization } from "../../localization/localization";

const zOffset = 200;

interface GameOverDialogContext {
    displayContent: DisplayContent;
    localization: Localization;
}

export class GameOverDialog implements DialogBox {
    private ctx: GameOverDialogContext;

    private background: RectElement;
    private header: TextElement;
    private headerBar: RectElement;
    private textFrame: TextFrameElement;

    private _visible = true;

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
        return [this.background, this.header, this.headerBar, this.textFrame];
    }

    private get localization() {
        return this.ctx.localization;
    }

    private get displayContent() {
        return this.ctx.displayContent;
    }

    constructor(ctx: GameOverDialogContext) {
        this.ctx = ctx;
        this.createElements();
    }

    localizeElements() {
        this.header.text = this.localization.translate(Key.GameOver);
        this.textFrame.text = this.localization.translate(Key.GameOverText);
    }

    private createElements() {
        const background = new RectElement();
        this.displayContent.add(background);
        background.name = "game-over-background";

        background.layout.set({ x: 224, y: 258, z: zOffset, width: 832, height: 414 });
        background.color = Color.black;
        background.borderWidth = 4;
        background.borderPosition = BorderPosition.Inside;
        background.borderColor = Color.white;

        const header = new TextElement();
        this.displayContent.add(header);
        header.name = "game-over-header";

        header.layout.set({ x: 256, y: 290, z: zOffset + 1, width: 768, height: 48 });
        header.color = Color.white;
        header.align = "center";
        header.baseline = "middle";
        header.fontSize = 48;

        const headerBar = new RectElement();
        this.displayContent.add(headerBar);
        headerBar.name = "game-over-bar";

        headerBar.layout.set({ x: 256, y: 352, z: zOffset + 1, width: 768, height: 4 });
        headerBar.color = Color.white;

        const textFrame = new TextFrameElement();
        this.displayContent.add(textFrame);
        textFrame.name = "game-over-text-frame";

        textFrame.layout.set({ x: 256, y: 384, z: zOffset + 1, width: 768, height: 256 });
        textFrame.color = Color.white;
        textFrame.fontSize = 42;
        textFrame.align = "center";
        textFrame.overflow = true;

        this.background = background;
        this.header = header;
        this.headerBar = headerBar;
        this.textFrame = textFrame;
    }
}
