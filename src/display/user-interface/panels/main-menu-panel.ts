import { Animation } from "../../../animation/animation";
import { Easing, Track } from "../../../animation/track";
import { Color } from "../../../core/Color";
import { createComponent } from "../../../core/ComponentRegistry";
import { DisplayContent } from "../display-content";
import { ImageElement } from "../elements/image-element";
import { RectElement } from "../elements/rect-element";
import { TextElement } from "../elements/text-element";
import { RectLike } from "../elements/components/Rect";
import { createNavigationEvents } from "./components/navigation-events";
import { AssetDatabase } from "../../../assets/asset-database";
import { Settings } from "../../../core/settings";
import { Key, Localization } from "../../../localization/localization";
import { AudioService } from "../../../core/audio-service";
import { DisplayContentRenderer } from "../../display-content-renderer";
import { createLabel } from "../utils/create-label";
import { createButton } from "../utils/create-button";
import { ButtonElement } from "../elements/button-element";
import { SettingsPanel } from "./settings-panel";
import { createDisplayScrollAnimation } from "../utils/create-display-scroll-animation";
import { createDisplayBlurAnimation } from "../utils/create-display-blur-animation";
import { CVPanel } from "./cv-panel";
import { AboutPanel } from "./about-panel";
import { UIEventBus } from "../../../user-interface/ui-event-bus";
import { AppError } from "../../../app-error";
import { linkTable } from '../../../secretRegistry';

const scrollProbability = 0.33;

interface MainMenuPanelContext {
    assetDatabase: AssetDatabase;
    settings: Settings;
    localization: Localization;
    audioService: AudioService;
    displayRenderer: DisplayContentRenderer;
    uiEventBus: UIEventBus;
}

export class MainMenuPanel {
    public readonly navigationEvents = createNavigationEvents();
    public readonly displayContent = new DisplayContent({ width: 1280, height: 1024 });

    private ctx: MainMenuPanelContext;

    private header: TextElement;
    private image: ImageElement;
    private imageAnimation: Animation;
    private settingsButton: ButtonElement;
    private aboutButton: ButtonElement;

    private scrollAnimation: Animation;
    private blurAnimation: Animation;

    private firstEntry = true;

    constructor(ctx: MainMenuPanelContext) {
        this.ctx = ctx;

        this.createElements();
        this.imageAnimation = this.createImageAnimation();
        this.localize();

        this.scrollAnimation = createDisplayScrollAnimation(this.ctx.displayRenderer);
        this.blurAnimation = createDisplayBlurAnimation(this.ctx.displayRenderer);

        this.ctx.settings.onLocaleChanged.add(() => this.localize());
    }

    async enter() {
        this.imageAnimation.play({ loop: true });

        this.blurAnimation.time = 0;
        this.blurAnimation.play();

        this.scrollAnimation.time = 0;
        if (Math.random() < scrollProbability || this.firstEntry) {
            this.ctx.displayRenderer.effects.renderSynced = false;
            await this.scrollAnimation.play();
            this.ctx.displayRenderer.effects.renderSynced = true;
        }

        this.firstEntry = false;
    }

    async exit() {
        this.imageAnimation.stop();
        this.imageAnimation.time = 0;

        this.scrollAnimation.stop();
        this.blurAnimation.stop();
    }

    private localize() {
        this.header.text = this.ctx.localization.translate(Key.MainMenu);
        this.settingsButton.text = this.ctx.localization.translate(Key.Settings);
        this.aboutButton.text = this.ctx.localization.translate(Key.About);
    }

    private createBar(name: string, x: number, y: number, width: number) {
        const bar = new RectElement();
        bar.name = name;
        bar.color = Color.white;
        bar.layout.set({ x, y, z: 8, width: width, height: 4 });
        return bar;
    }

    private createElements() {
        const header = createLabel({ x: 64, y: 64, z: 8, width: 1152, height: 48 });
        header.name = "header";
        this.displayContent.add(header);
        this.header = header;

        const headerBar = this.createBar("header-bar", 64, 126, 1152);
        this.displayContent.add(headerBar);

        const image = new ImageElement();
        image.name = "image";
        image.layout.set({ x: 448, y: 160, z: 8, width: 352, height: 352 });
        image.cutout.set({ x: 0, y: 0, width: 256, height: 256 });
        image.load(this.ctx.assetDatabase.getAssetMetadata("/textures/valentine-anim")!).catch((reason) => {
            throw new AppError("Failed to load image", { cause: reason });
        });
        this.displayContent.add(image);
        this.image = image;

        const buttonOptions = {
            z: 8,
            width: 320,
            height: 80,
            audioService: this.ctx.audioService,
        };

        const cvButton = createButton({ x: 480, y: 544, ...buttonOptions });
        cvButton.name = "cv-button";
        cvButton.text = "CV";
        this.displayContent.add(cvButton);

        cvButton.pointerEvents.addEventListener("onclick", () => this.navigationEvents.requestNavigation(CVPanel));

        const cvButtonBarLeft = this.createBar("cv-button-bar-left", 384, 582, 64);
        const cvButtonBarRight = this.createBar("cv-button-bar-right", 832, 582, 64);
        this.displayContent.add(cvButtonBarLeft, cvButtonBarRight);

        const portfolioButton = createButton({ x: 480, y: 656, ...buttonOptions });
        portfolioButton.name = "portfolio-button";
        portfolioButton.text = "Portfolio";
        this.displayContent.add(portfolioButton);

        portfolioButton.pointerEvents.addEventListener("onpointerenter", () =>
            this.ctx.uiEventBus.requestHint(Key.PortfolioHint),
        );

        portfolioButton.pointerEvents.addEventListener("onclick", () => {
            window.open(linkTable.artStation, "_blank");
        });

        const portfolioButtonBarLeft = this.createBar("portfolio-button-bar-left", 384, 694, 64);
        const portfolioButtonBarRight = this.createBar("portfolio-button-bar-right", 832, 694, 64);
        this.displayContent.add(portfolioButtonBarLeft, portfolioButtonBarRight);

        const settingsButton = createButton({ x: 480, y: 768, ...buttonOptions });
        settingsButton.name = "settings-button";
        this.displayContent.add(settingsButton);
        this.settingsButton = settingsButton;

        settingsButton.pointerEvents.addEventListener("onclick", () =>
            this.navigationEvents.requestNavigation(SettingsPanel),
        );

        const settingsButtonBarLeft = this.createBar("settings-button-bar-left", 384, 806, 64);
        const settingsButtonBarRight = this.createBar("settings-button-bar-right", 832, 806, 64);
        this.displayContent.add(settingsButtonBarLeft, settingsButtonBarRight);

        const aboutButton = createButton({ x: 480, y: 880, ...buttonOptions });
        aboutButton.name = "about-button";
        this.displayContent.add(aboutButton);
        this.aboutButton = aboutButton;

        aboutButton.pointerEvents.addEventListener("onclick", () =>
            this.navigationEvents.requestNavigation(AboutPanel),
        );

        const aboutButtonBarLeft = this.createBar("about-button-bar-left", 384, 918, 64);
        const aboutButtonBarRight = this.createBar("about-button-bar-right", 832, 918, 64);
        this.displayContent.add(aboutButtonBarLeft, aboutButtonBarRight);
    }

    private createImageAnimation() {
        const cutoutTrack = new Track<RectLike>(
            (rect) => this.image.cutout.copy(rect),
            (a, b, t) => a,
        );

        const size = 256;
        for (let i = 0; i < 16; i++) {
            const x = (i % 4) * size;
            const y = Math.floor(i / 4) * size;
            cutoutTrack.addKeyframe(i / 16, { x, y, width: size, height: size }, Easing.Step);
        }

        cutoutTrack.addKeyframe(16 / 16, { x: 0, y: 0, width: size, height: size }, Easing.Step);

        const animation = createComponent(Animation);
        animation.addTrack(cutoutTrack);
        return animation;
    }
}
