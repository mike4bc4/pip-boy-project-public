import { Animation } from "../../../animation/animation";
import { Easing, Track } from "../../../animation/track";
import { Color } from "../../../core/Color";
import { createComponent } from "../../../core/ComponentRegistry";
import { DisplayContent } from "../display-content";
import { ImageElement } from "../elements/image-element";
import { BorderPosition, RectElement } from "../elements/rect-element";
import { TextElement } from "../elements/text-element";
import { RectLike } from "../elements/components/Rect";
import { createNavigationEvents } from "./components/navigation-events";
import { AssetDatabase, TextureAsset } from "../../../assets/asset-database";
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
import { linkTable } from "../../../secretRegistry";
import { assignButtonSounds } from "../utils/assign-button-sounds";
import { Float2, Float2Like } from "../elements/components/Float2";
import { GamePanel } from "./game-panel";

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

    private holotapeButton: ButtonElement;
    private holotapeButtonIcon: ImageElement;
    private holotapeButtonBorder: RectElement;

    private scrollAnimation: Animation;
    private blurAnimation: Animation;

    private firstEntry = true;

    constructor(ctx: MainMenuPanelContext) {
        this.ctx = ctx;

        this.createElements();
        this.createHolotapeButton();

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
        image.image = this.ctx.assetDatabase.getAsset<TextureAsset>("/textures/valentine-anim").image;

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

    private createHolotapeButton() {
        const holotapeButton = new ButtonElement();
        this.displayContent.add(holotapeButton);
        holotapeButton.name = "holotape-button";
        this.holotapeButton = holotapeButton;

        holotapeButton.layout.set({ x: 64, y: 860, z: 8, width: 100, height: 100 });
        assignButtonSounds(this.ctx.audioService, holotapeButton);

        holotapeButton.hoverAnimation = this.createHolotapeButtonHoverAnimation();
        holotapeButton.pressAnimation = this.createHolotapeButtonPressAnimation();

        holotapeButton.pointerEvents.addEventListener("onclick", () => {
            this.navigationEvents.requestNavigation(GamePanel);
        });

        holotapeButton.pointerEvents.addEventListener("onpointerenter", () =>
            this.ctx.uiEventBus.requestHint(Key.HolotapeHint),
        );

        // Actual button remains hidden, we only want button behavior, other UI
        // elements handle visual effects.
        holotapeButton.visible = false;

        const holotapeButtonIcon = new ImageElement();
        this.displayContent.add(holotapeButtonIcon);
        holotapeButtonIcon.name = "holotape-button-icon";
        this.holotapeButtonIcon = holotapeButtonIcon;

        holotapeButtonIcon.image = this.ctx.assetDatabase.getAsset<TextureAsset>("/textures/holotape-icon").image;
        holotapeButtonIcon.layout.copy(holotapeButton.layout);
        holotapeButtonIcon.cutout.set({ x: 104, y: 8, width: 80, height: 80 });

        const holotapeButtonBorder = new RectElement();
        this.displayContent.add(holotapeButtonBorder);
        holotapeButtonBorder.name = "holotape-button-border";
        this.holotapeButtonBorder = holotapeButtonBorder;

        holotapeButtonBorder.layout.copy(holotapeButton.layout);

        holotapeButtonBorder.color = Color.transparent;
        holotapeButtonBorder.borderColor = Color.white;
        holotapeButtonBorder.borderPosition = BorderPosition.Inside;
        holotapeButtonBorder.borderWidth = 6;
    }

    private createHolotapeButtonHoverAnimation() {
        const cutoutTrack = new Track<RectLike>(
            (cutout) => this.holotapeButtonIcon.cutout.copy(cutout),
            (a) => a,
        );

        cutoutTrack.addKeyframe(0, { x: 104, y: 8, width: 80, height: 80 }, Easing.Step);
        cutoutTrack.addKeyframe(1, { x: 14, y: 14, width: 68, height: 68 }, Easing.Step);

        const animation = createComponent(Animation);
        animation.addTrack(cutoutTrack);
        return animation;
    }

    private createHolotapeButtonPressAnimation() {
        const transformTrack = new Track<Float2Like>(
            (scale) => {
                this.holotapeButtonBorder.layout.scale.copy(scale);
                this.holotapeButtonIcon.layout.scale.copy(scale);
            },
            (a, b, t) => new Float2().copy(a).lerp(b, t),
        );

        transformTrack.addKeyframe(0, { x: 1, y: 1 }, Easing.EaseInOutQuad);
        transformTrack.addKeyframe(1, { x: 0.9, y: 0.9 }, Easing.EaseInOutQuad);

        const animation = createComponent(Animation);
        animation.addTrack(transformTrack);

        return animation;
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
