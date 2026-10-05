import { Animation } from "../../../animation/animation";
import { AudioService } from "../../../core/audio-service";
import { Color } from "../../../core/Color";
import { Settings } from "../../../core/settings";
import { Key, Localization } from "../../../localization/localization";
import { linkTable } from '../../../secretRegistry';
import { UIEventBus } from "../../../user-interface/ui-event-bus";
import { DisplayContentRenderer } from "../../display-content-renderer";
import { DisplayContent } from "../display-content";
import { Panel } from "../display-manager";
import { ButtonElement } from "../elements/button-element";
import { RectElement } from "../elements/rect-element";
import { TextElement } from "../elements/text-element";
import { TextFrameElement } from "../elements/text-frame-element";
import { createButton } from "../utils/create-button";
import { createDisplayBlurAnimation } from "../utils/create-display-blur-animation";
import { createDisplayScrollAnimation } from "../utils/create-display-scroll-animation";
import { createLabel } from "../utils/create-label";
import { createTextFrame } from "../utils/create-text-frame";
import { createNavigationEvents } from "./components/navigation-events";

const scrollProbability = 0.33;

interface AboutPanelContext {
    audioService: AudioService;
    localization: Localization;
    settings: Settings;
    displayRenderer: DisplayContentRenderer;
    uiEventBus: UIEventBus;
}

export class AboutPanel implements Panel {
    public readonly displayContent = new DisplayContent({ width: 1280, height: 1024 });
    public readonly navigationEvents = createNavigationEvents();

    private ctx: AboutPanelContext;

    private header: TextElement;
    private headerBar: RectElement;
    private textFrame: TextFrameElement;
    private leftBorder: RectElement;
    private upperLeftBorder: RectElement;
    private lowerLeftBorder: RectElement;
    private rightBorder: RectElement;
    private upperRightBorder: RectElement;
    private lowerRightBorder: RectElement;
    private backButton: ButtonElement;
    private githubButton: ButtonElement;

    private displayScrollAnimation: Animation;
    private displayBlurAnimation: Animation;

    constructor(ctx: AboutPanelContext) {
        this.ctx = ctx;

        this.createElements();
        this.createAnimations();
        this.localizeElements();

        this.ctx.settings.onLocaleChanged.add(() => this.localizeElements());
        this.backButton.pointerEvents.addEventListener("onclick", () => this.navigationEvents.requestBack());
        this.githubButton.pointerEvents.addEventListener("onpointerenter", () =>
            this.ctx.uiEventBus.requestHint(Key.GitHubHint),
        );

        this.githubButton.pointerEvents.addEventListener("onclick", () => {
            window.open(linkTable.gitHub, "_blank");
        });
    }

    async enter() {
        this.displayBlurAnimation.time = 0;
        this.displayBlurAnimation.play();

        this.displayScrollAnimation.time = 0;
        if (Math.random() < scrollProbability) {
            this.ctx.displayRenderer.effects.renderSynced = false;
            await this.displayScrollAnimation.play();
            this.ctx.displayRenderer.effects.renderSynced = true;
        }
    }

    exit() {
        this.ctx.displayRenderer.effects.requestBlurFactorChange(0);
        this.displayBlurAnimation.stop();

        this.ctx.displayRenderer.effects.requestUVOffsetChange({ x: 0, y: 0 });
        this.displayScrollAnimation.stop();
        this.ctx.displayRenderer.effects.renderSynced = true;
    }

    private createAnimations() {
        this.displayScrollAnimation = createDisplayScrollAnimation(this.ctx.displayRenderer);
        this.displayBlurAnimation = createDisplayBlurAnimation(this.ctx.displayRenderer);
    }

    private localizeElements() {
        this.header.text = this.ctx.localization.translate(Key.About);
        this.textFrame.text = this.ctx.localization.translate(Key.AboutText);
        this.backButton.text = this.ctx.localization.translate(Key.Back);
    }

    private createElements() {
        this.header = createLabel({ x: 64, y: 64, z: 10, width: 1152, height: 48, fontSize: 48 });
        this.displayContent.add(this.header);
        this.header.name = "header";

        this.headerBar = new RectElement();
        this.displayContent.add(this.headerBar);
        this.headerBar.name = "header-bar";
        this.headerBar.layout.set({ x: 64, y: 126, width: 1152, height: 4 });
        this.headerBar.color = Color.white;

        this.textFrame = createTextFrame({
            x: 224,
            y: 192,
            z: 10,
            width: 832,
            height: 624,
            audioService: this.ctx.audioService,
            pageCounterWidth: 128,
        });
        this.displayContent.add(this.textFrame);
        this.textFrame.counterLabel.fontSize = 42;
        this.textFrame.controlSettings.buttonMargin.bottom = -32;

        const leftBorderPosition = { x: 192, y: 160 };
        const rightBorderPosition = { x: 1082, y: 160 };
        const borderWidth = 6;
        const borderHeight = 688;
        const borderCornerWidth = 16;

        this.leftBorder = new RectElement();
        this.displayContent.add(this.leftBorder);
        this.leftBorder.name = "left-border";
        this.leftBorder.layout.set({
            x: leftBorderPosition.x,
            y: leftBorderPosition.y,
            z: 10,
            width: borderWidth,
            height: borderHeight,
        });
        this.leftBorder.color = Color.white;

        this.upperLeftBorder = new RectElement();
        this.displayContent.add(this.upperLeftBorder);
        this.upperLeftBorder.name = "upper-left-border";
        this.upperLeftBorder.layout.copy(this.leftBorder.layout);
        this.upperLeftBorder.layout.set({ width: borderCornerWidth, height: borderWidth });
        this.upperLeftBorder.color = Color.white;

        this.lowerLeftBorder = new RectElement();
        this.displayContent.add(this.lowerLeftBorder);
        this.lowerLeftBorder.name = "lower-left-border";
        this.lowerLeftBorder.layout.copy(this.upperLeftBorder.layout);
        this.lowerLeftBorder.layout.y = leftBorderPosition.y + borderHeight - borderWidth;
        this.lowerLeftBorder.color = Color.white;

        this.rightBorder = new RectElement();
        this.displayContent.add(this.rightBorder);
        this.rightBorder.name = "right-border";
        this.rightBorder.layout.set({
            x: rightBorderPosition.x,
            y: rightBorderPosition.y,
            z: 10,
            width: borderWidth,
            height: borderHeight,
        });
        this.rightBorder.color = Color.white;

        this.upperRightBorder = new RectElement();
        this.displayContent.add(this.upperRightBorder);
        this.upperRightBorder.name = "upper-right-border";
        this.upperRightBorder.layout.set({
            x: rightBorderPosition.x - borderCornerWidth + borderWidth,
            y: 160,
            width: borderCornerWidth,
            height: borderWidth,
        });
        this.upperRightBorder.color = Color.white;

        this.lowerRightBorder = new RectElement();
        this.displayContent.add(this.lowerRightBorder);
        this.lowerRightBorder.name = "lower-right-border";
        this.lowerRightBorder.layout.copy(this.upperRightBorder.layout);
        this.lowerRightBorder.layout.y = leftBorderPosition.y + borderHeight - borderWidth;
        this.lowerRightBorder.color = Color.white;

        const buttonOptions = {
            z: 10,
            width: 320,
            height: 80,
            audioService: this.ctx.audioService,
        };

        this.backButton = createButton({ x: 64, y: 880, ...buttonOptions });
        this.displayContent.add(this.backButton);
        this.backButton.name = "back-button";

        this.githubButton = createButton({ x: 896, y: 880, ...buttonOptions });
        this.displayContent.add(this.githubButton);
        this.githubButton.name = "github-button";
        this.githubButton.text = "GitHub";
    }
}
