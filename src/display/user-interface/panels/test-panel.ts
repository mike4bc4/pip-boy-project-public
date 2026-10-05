import { AudioService } from "../../../core/audio-service";
import { Color } from "../../../core/Color";
import { Settings } from "../../../core/settings";
import { Key, Localization } from "../../../localization/localization";
import { DisplayContent } from "../display-content";
import { BorderPosition, RectElement } from "../elements/rect-element";
import { TextElement } from "../elements/text-element";
import { createTextFrame } from "../utils/create-text-frame";
import { createNavigationEvents } from "./components/navigation-events";

interface TestPanelContext {
    settings: Settings;
    localization: Localization;
    audioService: AudioService;
}

export class TestPanel {
    public readonly navigationEvents = createNavigationEvents();
    public readonly displayContent = new DisplayContent({ width: 1280, height: 1024 });

    private ctx: TestPanelContext;

    private button1: RectElement;
    private button1Text: TextElement;

    constructor(ctx: TestPanelContext) {
        this.ctx = ctx;

        this.initializeDisplayContent();
    }

    enter() {}

    exit() {}

    private initializeDisplayContent() {
        const background = new RectElement();
        background.layout.set({ width: 1280, height: 1024 });

        this.button1 = new RectElement();
        this.button1.borderWidth = 8;
        this.button1.borderColor = Color.white;
        this.button1.borderPosition = BorderPosition.Inside;

        this.button1.layout.set({ x: 0, y: 472, z: 10, width: 320, height: 80 });
        this.button1.pointerEvents.interactive = true;
        this.button1.pointerEvents.addEventListener("onclick", this.onButton1Click);

        this.button1Text = new TextElement();
        this.button1Text.text = this.ctx.localization.translate(Key.Back);
        this.button1Text.color = Color.white;
        this.button1Text.align = "center";
        this.button1Text.baseline = "middle";
        this.button1Text.fontSize = 60;

        this.button1Text.layout.set({ x: 0, y: 472, z: 20, width: 320, height: 80 });
        this.displayContent.add(background, this.button1, this.button1Text);

        const textFrame = createTextFrame({
            x: 320,
            y: 200,
            z: 20,
            width: 600,
            height: 400,
            audioService: this.ctx.audioService,
        });

        textFrame.text = this.ctx.localization.translate(Key.LongText);

        this.displayContent.add(textFrame);

        const rectElement = new RectElement();
        rectElement.borderColor = new Color(1, 1, 1);
        rectElement.borderWidth = 2;
        rectElement.layout.copy(textFrame.layout);
        rectElement.layout.z = 10;

        this.displayContent.add(rectElement);

        this.ctx.settings.onLocaleChanged.add(() => {
            this.button1Text.text = this.ctx.localization.translate(Key.Back);
            textFrame.text = this.ctx.localization.translate(Key.LongText);
        });
    }

    private onButton1Click = () => {
        this.navigationEvents.requestBack();
    };
}
