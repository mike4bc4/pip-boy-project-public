import { Animation } from "../../../animation/animation";
import { Easing, Track } from "../../../animation/track";
import { AssetDatabase, TextureAsset } from "../../../assets/asset-database";
import { AudioService } from "../../../core/audio-service";
import { createComponent } from "../../../core/ComponentRegistry";
import { Settings } from "../../../core/settings";
import { Key, Localization } from "../../../localization/localization";
import { UIEventBus } from "../../../user-interface/ui-event-bus";
import { DisplayContentRenderer } from "../../display-content-renderer";
import { DisplayContent } from "../display-content";
import { Panel } from "../display-manager";
import { ButtonBarElement } from "../elements/button-bar-element";
import { ButtonElement } from "../elements/button-element";
import { Rect, RectLike } from "../elements/components/Rect";
import { ImageElement } from "../elements/image-element";
import { PageElement } from "../elements/page-element";
import { createButton } from "../utils/create-button";
import { createButtonBar } from "../utils/create-button-bar";
import { createDisplayBlurAnimation } from "../utils/create-display-blur-animation";
import { createDisplayScrollAnimation } from "../utils/create-display-scroll-animation";
import { createPageElement } from "../utils/create-page-element";
import { createNavigationEvents } from "./components/navigation-events";

const scrollProbability = 0.33;

interface CVPanelContext {
    audioService: AudioService;
    assetDatabase: AssetDatabase;
    localization: Localization;
    settings: Settings;
    displayRenderer: DisplayContentRenderer;
    uiEventBus: UIEventBus;
}

export class CVPanel implements Panel {
    public readonly displayContent = new DisplayContent({ width: 1280, height: 1024 });
    public readonly navigationEvents = createNavigationEvents();

    private ctx: CVPanelContext;
    private buttonBar: ButtonBarElement;
    private aboutPage: PageElement;
    private contactPage: PageElement;
    private educationPage: PageElement;
    private careerPage: PageElement;
    private skillsPage: PageElement;
    private backButton: ButtonElement;

    private aboutPageImageAnimation: Animation;
    private contactPageImageAnimation: Animation;
    private educationPageImageAnimation: Animation;
    private careerPageImageAnimation: Animation;
    private skillsPageImageAnimation: Animation;

    private displayBlurAnimation: Animation;
    private displayScrollAnimation: Animation;

    private get imageAnimations() {
        return [
            this.aboutPageImageAnimation,
            this.contactPageImageAnimation,
            this.careerPageImageAnimation,
            this.educationPageImageAnimation,
            this.skillsPageImageAnimation,
        ];
    }

    get pageElements() {
        return [this.aboutPage, this.contactPage, this.careerPage, this.educationPage, this.skillsPage];
    }

    constructor(ctx: CVPanelContext) {
        this.ctx = ctx;

        this.createElements();
        this.createAnimations();
        this.localizeElements();

        this.ctx.settings.onLocaleChanged.add(() => this.localizeElements());
        this.buttonBar.onButtonIndexChanged.add(this.handleButtonBarIndexChanged);
        this.backButton.pointerEvents.addEventListener("onclick", () => this.navigationEvents.requestBack());
    }

    async enter() {
        this.ctx.uiEventBus.requestHint(Key.CVPanelHint);

        this.displayBlurAnimation.time = 0;
        this.displayBlurAnimation.play();

        const currentPage = this.pageElements[this.buttonBar.buttonIndex];
        currentPage.textFrame.controlSettings.interactive = true;
        currentPage.visible = true;

        const currentAnimation = this.imageAnimations[this.buttonBar.buttonIndex];
        currentAnimation.time = 0;
        currentAnimation.play({ loop: true });

        this.displayScrollAnimation.time = 0;
        if (Math.random() < scrollProbability) {
            this.ctx.displayRenderer.effects.renderSynced = false;
            await this.displayScrollAnimation.play();
            this.ctx.displayRenderer.effects.renderSynced = true;
        }
    }

    exit() {
        const currentPage = this.pageElements[this.buttonBar.buttonIndex];
        currentPage.textFrame.controlSettings.interactive = false;
        currentPage.visible = false;

        const currentAnimation = this.imageAnimations[this.buttonBar.buttonIndex];
        currentAnimation.stop();

        this.displayBlurAnimation.time = this.displayBlurAnimation.length;
        this.displayBlurAnimation.stop();
    }

    private handleButtonBarIndexChanged = (lastIndex: number) => {
        const lastPage = this.pageElements[lastIndex];
        const currentPage = this.pageElements[this.buttonBar.buttonIndex];

        lastPage.textFrame.controlSettings.interactive = false;
        lastPage.visible = false;

        currentPage.textFrame.controlSettings.interactive = true;
        currentPage.visible = true;

        const lastAnimation = this.imageAnimations[lastIndex];
        const currentAnimation = this.imageAnimations[this.buttonBar.buttonIndex];

        lastAnimation.stop();

        currentAnimation.time = 0;
        currentAnimation.play({ loop: true });

        this.displayBlurAnimation.time = 0;
        this.displayBlurAnimation.play();
    };

    private createElements() {
        this.buttonBar = createButtonBar({
            x: 96,
            y: 96,
            z: 8,
            width: 1088,
            height: 80,
            audioService: this.ctx.audioService,
            buttonCount: 5,
        });
        this.displayContent.add(this.buttonBar);

        const pageElementOptions = {
            x: 64,
            y: 208,
            z: 10,
            width: 1152,
            height: 752,
            audioService: this.ctx.audioService,
        };

        this.aboutPage = createPageElement(pageElementOptions);
        this.displayContent.add(this.aboutPage);

        this.aboutPage.image.image = this.ctx.assetDatabase.getAsset<TextureAsset>("/textures/minutemen-anim").image;
        this.aboutPage.image.cutout.set({ x: 0, y: 0, width: 256, height: 256 });

        this.contactPage = createPageElement(pageElementOptions);
        this.displayContent.add(this.contactPage);

        this.contactPage.image.image = this.ctx.assetDatabase.getAsset<TextureAsset>("/textures/patrol-anim").image;
        this.contactPage.image.cutout.set({ x: 0, y: 0, width: 256, height: 256 });

        this.educationPage = createPageElement(pageElementOptions);
        this.displayContent.add(this.educationPage);

        this.educationPage.image.image = this.ctx.assetDatabase.getAsset<TextureAsset>("/textures/minds-anim").image;
        this.educationPage.image.cutout.set({ x: 0, y: 0, width: 256, height: 256 });

        this.careerPage = createPageElement(pageElementOptions);
        this.displayContent.add(this.careerPage);

        this.careerPage.image.image = this.ctx.assetDatabase.getAsset<TextureAsset>("/textures/support-anim").image;
        this.careerPage.image.cutout.set({ x: 0, y: 0, width: 256, height: 256 });

        this.skillsPage = createPageElement(pageElementOptions);
        this.displayContent.add(this.skillsPage);

        this.skillsPage.image.image = this.ctx.assetDatabase.getAsset<TextureAsset>("/textures/wire-anim").image;
        this.skillsPage.image.cutout.set({ x: 0, y: 0, width: 256, height: 256 });

        // Initially all pages are hidden as their visibility will be toggled by button bar.
        this.aboutPage.visible = false;
        this.contactPage.visible = false;
        this.careerPage.visible = false;
        this.educationPage.visible = false;
        this.skillsPage.visible = false;

        // Initially we are disabling all text frame controls even when they are visible,
        // to prevent them being clickable when entire page element is hidden.
        this.aboutPage.textFrame.controlSettings.interactive = false;
        this.contactPage.textFrame.controlSettings.interactive = false;
        this.careerPage.textFrame.controlSettings.interactive = false;
        this.educationPage.textFrame.controlSettings.interactive = false;
        this.skillsPage.textFrame.controlSettings.interactive = false;

        this.backButton = createButton({
            x: 64,
            y: 880,
            z: 100,
            width: 352,
            height: 80,
            audioService: this.ctx.audioService,
        });
        this.displayContent.add(this.backButton);
    }

    private createAnimations() {
        this.aboutPageImageAnimation = this.createMinutemenAnimation(this.aboutPage.image);
        this.contactPageImageAnimation = this.createPatrolAnimation(this.contactPage.image);
        this.careerPageImageAnimation = this.createSupportAnimation(this.careerPage.image);
        this.educationPageImageAnimation = this.createMindsAnimation(this.educationPage.image);
        this.skillsPageImageAnimation = this.createWireAnimation(this.skillsPage.image);

        this.displayBlurAnimation = createDisplayBlurAnimation(this.ctx.displayRenderer);
        this.displayScrollAnimation = createDisplayScrollAnimation(this.ctx.displayRenderer);
    }

    private localizeElements() {
        this.buttonBar.buttonLabels = [
            this.ctx.localization.translate(Key.AboutMe),
            this.ctx.localization.translate(Key.Contact),
            this.ctx.localization.translate(Key.Career),
            this.ctx.localization.translate(Key.Education),
            this.ctx.localization.translate(Key.Skills),
        ];

        this.aboutPage.textFrame.text = this.ctx.localization.translate(Key.AboutMePage);
        this.contactPage.textFrame.text = this.ctx.localization.translate(Key.ContactPage);
        this.careerPage.textFrame.text = this.ctx.localization.translate(Key.CareerPage);
        this.educationPage.textFrame.text = this.ctx.localization.translate(Key.EducationPage);
        this.skillsPage.textFrame.text = this.ctx.localization.translate(Key.SkillsPage);

        this.backButton.text = this.ctx.localization.translate(Key.Back);
    }

    private createWireAnimation(image: ImageElement) {
        const track = new Track<RectLike>(
            (cutout) => image.cutout.copy(cutout),
            (a, b, t) => a,
        );

        const s = 256;
        const o = 0.1;
        let t = 0;

        track.addKeyframe((t += 0), new Rect(0 * s, 0 * s, s, s), Easing.Step);
        track.addKeyframe((t += o), new Rect(1 * s, 0 * s, s, s), Easing.Step);

        for (let i = 0; i < 3; i++) {
            track.addKeyframe((t += o), new Rect(0 * s, 0 * s, s, s), Easing.Step);
            track.addKeyframe((t += o), new Rect(1 * s, 0 * s, s, s), Easing.Step);
        }

        for (let i = 0; i < 5; i++) {
            track.addKeyframe((t += o), new Rect(2 * s, 0 * s, s, s), Easing.Step);
            track.addKeyframe((t += o), new Rect(3 * s, 0 * s, s, s), Easing.Step);
        }

        for (let i = 0; i < 5; i++) {
            track.addKeyframe((t += o), new Rect(0 * s, 1 * s, s, s), Easing.Step);
            track.addKeyframe((t += o), new Rect(1 * s, 1 * s, s, s), Easing.Step);
        }

        for (let i = 0; i < 8; i++) {
            track.addKeyframe((t += o), new Rect(2 * s, 1 * s, s, s), Easing.Step);
            track.addKeyframe((t += o), new Rect(3 * s, 1 * s, s, s), Easing.Step);
            track.addKeyframe((t += o), new Rect(0 * s, 2 * s, s, s), Easing.Step);
            track.addKeyframe((t += o), new Rect(1 * s, 2 * s, s, s), Easing.Step);
        }

        const animation = createComponent(Animation);
        animation.addTrack(track);
        return animation;
    }

    private createSupportAnimation(image: ImageElement) {
        const track = new Track<RectLike>(
            (cutout) => image.cutout.copy(cutout),
            (a, b, t) => a,
        );

        const s = 256;
        const o = 0.1;
        let t = 0;

        track.addKeyframe((t += 0), new Rect(0 * s, 0 * s, s, s), Easing.Step);
        track.addKeyframe((t += o), new Rect(1 * s, 0 * s, s, s), Easing.Step);
        track.addKeyframe((t += o), new Rect(2 * s, 0 * s, s, s), Easing.Step);
        track.addKeyframe((t += o), new Rect(3 * s, 0 * s, s, s), Easing.Step);

        track.addKeyframe((t += o), new Rect(0 * s, 1 * s, s, s), Easing.Step);
        track.addKeyframe((t += 0.1), new Rect(0 * s, 1 * s, s, s), Easing.Step);

        track.addKeyframe((t += o), new Rect(1 * s, 1 * s, s, s), Easing.Step);
        track.addKeyframe((t += 0.2), new Rect(1 * s, 1 * s, s, s), Easing.Step);

        track.addKeyframe((t += o), new Rect(2 * s, 1 * s, s, s), Easing.Step);
        track.addKeyframe((t += o), new Rect(3 * s, 1 * s, s, s), Easing.Step);
        track.addKeyframe((t += o), new Rect(0 * s, 2 * s, s, s), Easing.Step);
        track.addKeyframe((t += o), new Rect(1 * s, 2 * s, s, s), Easing.Step);
        track.addKeyframe((t += o), new Rect(2 * s, 2 * s, s, s), Easing.Step);
        track.addKeyframe((t += o), new Rect(3 * s, 2 * s, s, s), Easing.Step);

        track.addKeyframe((t += o), new Rect(0 * s, 0 * s, s, s), Easing.Step);
        track.addKeyframe((t += 1), new Rect(0 * s, 0 * s, s, s), Easing.Step);

        const animation = createComponent(Animation);
        animation.addTrack(track);
        return animation;
    }

    private createPatrolAnimation(image: ImageElement) {
        const track = new Track<RectLike>(
            (cutout) => image.cutout.copy(cutout),
            (a, b, t) => a,
        );

        const s = 256;
        const o1 = 0.1;
        const o2 = 0.05;
        let t = 0;

        track.addKeyframe((t += 0), new Rect(0 * s, 0 * s, s, s), Easing.Step);
        track.addKeyframe((t += o1), new Rect(2 * s, 0 * s, s, s), Easing.Step);
        track.addKeyframe((t += o1), new Rect(3 * s, 0 * s, s, s), Easing.Step);
        track.addKeyframe((t += o1), new Rect(0 * s, 1 * s, s, s), Easing.Step);
        track.addKeyframe((t += o1), new Rect(1 * s, 1 * s, s, s), Easing.Step);
        track.addKeyframe((t += o1), new Rect(2 * s, 1 * s, s, s), Easing.Step);

        for (let i = 0; i < 4; i++) {
            track.addKeyframe((t += o2), new Rect(3 * s, 1 * s, s, s), Easing.Step);
            track.addKeyframe((t += o2), new Rect(0 * s, 2 * s, s, s), Easing.Step);
            track.addKeyframe((t += o2), new Rect(1 * s, 2 * s, s, s), Easing.Step);
            track.addKeyframe((t += o2), new Rect(2 * s, 2 * s, s, s), Easing.Step);
            track.addKeyframe((t += o2), new Rect(3 * s, 2 * s, s, s), Easing.Step);
            track.addKeyframe((t += o2), new Rect(0 * s, 3 * s, s, s), Easing.Step);
            track.addKeyframe((t += o2), new Rect(1 * s, 3 * s, s, s), Easing.Step);
        }

        track.addKeyframe((t += o1), new Rect(1 * s, 1 * s, s, s), Easing.Step);
        track.addKeyframe((t += o1), new Rect(0 * s, 1 * s, s, s), Easing.Step);
        track.addKeyframe((t += o1), new Rect(3 * s, 0 * s, s, s), Easing.Step);
        track.addKeyframe((t += o1), new Rect(2 * s, 3 * s, s, s), Easing.Step);
        track.addKeyframe((t += o1), new Rect(0 * s, 0 * s, s, s), Easing.Step);

        track.addKeyframe((t += 1), new Rect(1 * s, 0 * s, s, s), Easing.Step);

        const animation = createComponent(Animation);
        animation.addTrack(track);
        return animation;
    }

    private createMindsAnimation(image: ImageElement) {
        const track = new Track<RectLike>(
            (cutout) => image.cutout.copy(cutout),
            (a, b, t) => a,
        );

        const s = 256;
        const o1 = 0.1;
        const o2 = 0.05;
        let t = 0;

        track.addKeyframe((t += 0), new Rect(0 * s, 0 * s, s, s), Easing.Step);
        track.addKeyframe((t += o1), new Rect(1 * s, 0 * s, s, s), Easing.Step);
        track.addKeyframe((t += o1), new Rect(2 * s, 0 * s, s, s), Easing.Step);
        track.addKeyframe((t += o1), new Rect(3 * s, 0 * s, s, s), Easing.Step);

        for (let i = 0; i < 2; i++) {
            track.addKeyframe((t += o1), new Rect(0 * s, 0 * s, s, s), Easing.Step);
            track.addKeyframe((t += o1), new Rect(1 * s, 0 * s, s, s), Easing.Step);
            track.addKeyframe((t += o1), new Rect(2 * s, 0 * s, s, s), Easing.Step);
            track.addKeyframe((t += o1), new Rect(3 * s, 0 * s, s, s), Easing.Step);
        }

        track.addKeyframe((t += o1), new Rect(4 * s, 0 * s, s, s), Easing.Step);
        track.addKeyframe((t += o1), new Rect(0 * s, 1 * s, s, s), Easing.Step);
        track.addKeyframe((t += o1), new Rect(1 * s, 1 * s, s, s), Easing.Step);
        track.addKeyframe((t += o1), new Rect(2 * s, 1 * s, s, s), Easing.Step);

        for (let i = 0; i < 3; i++) {
            track.addKeyframe((t += o2), new Rect(3 * s, 1 * s, s, s), Easing.Step);
            track.addKeyframe((t += o2), new Rect(4 * s, 1 * s, s, s), Easing.Step);
            track.addKeyframe((t += o2), new Rect(0 * s, 2 * s, s, s), Easing.Step);
            track.addKeyframe((t += o2), new Rect(1 * s, 2 * s, s, s), Easing.Step);
            track.addKeyframe((t += o2), new Rect(2 * s, 2 * s, s, s), Easing.Step);
            track.addKeyframe((t += o2), new Rect(3 * s, 2 * s, s, s), Easing.Step);
            track.addKeyframe((t += o2), new Rect(4 * s, 2 * s, s, s), Easing.Step);
            track.addKeyframe((t += o2), new Rect(0 * s, 3 * s, s, s), Easing.Step);
            track.addKeyframe((t += o2), new Rect(1 * s, 3 * s, s, s), Easing.Step);
            track.addKeyframe((t += o2), new Rect(2 * s, 3 * s, s, s), Easing.Step);
            track.addKeyframe((t += o2), new Rect(3 * s, 3 * s, s, s), Easing.Step);
            track.addKeyframe((t += o2), new Rect(4 * s, 3 * s, s, s), Easing.Step);

            track.addKeyframe((t += 0.1), new Rect(4 * s, 3 * s, s, s), Easing.Step);
        }

        track.addKeyframe((t += o1), new Rect(0 * s, 4 * s, s, s), Easing.Step);
        track.addKeyframe((t += o1), new Rect(1 * s, 4 * s, s, s), Easing.Step);
        track.addKeyframe((t += o1), new Rect(2 * s, 4 * s, s, s), Easing.Step);
        track.addKeyframe((t += o1), new Rect(3 * s, 4 * s, s, s), Easing.Step);

        track.addKeyframe((t += 1), new Rect(0 * s, 0 * s, s, s), Easing.Step);

        const animation = createComponent(Animation);
        animation.addTrack(track);
        return animation;
    }

    private createMinutemenAnimation(image: ImageElement) {
        const track = new Track<RectLike>(
            (cutout) => image.cutout.copy(cutout),
            (a, b, t) => a,
        );

        const s = 256;
        const o = 0.1;
        let t = 0;

        track.addKeyframe((t += 0), new Rect(0 * s, 0 * s, s, s), Easing.Step);

        for (let i = 0; i < 3; i++) {
            track.addKeyframe((t += o), new Rect(1 * s, 0 * s, s, s), Easing.Step);
            track.addKeyframe((t += o), new Rect(2 * s, 0 * s, s, s), Easing.Step);
            track.addKeyframe((t += o), new Rect(1 * s, 0 * s, s, s), Easing.Step);
            track.addKeyframe((t += o), new Rect(0 * s, 0 * s, s, s), Easing.Step);

            track.addKeyframe((t += 0.1), new Rect(0 * s, 0 * s, s, s), Easing.Step);

            track.addKeyframe((t += o), new Rect(3 * s, 0 * s, s, s), Easing.Step);
            track.addKeyframe((t += o), new Rect(0 * s, 1 * s, s, s), Easing.Step);
            track.addKeyframe((t += o), new Rect(3 * s, 0 * s, s, s), Easing.Step);
            track.addKeyframe((t += o), new Rect(0 * s, 0 * s, s, s), Easing.Step);

            track.addKeyframe((t += 0.1), new Rect(0 * s, 0 * s, s, s), Easing.Step);
        }

        track.addKeyframe((t += o), new Rect(1 * s, 1 * s, s, s), Easing.Step);
        track.addKeyframe((t += o), new Rect(2 * s, 1 * s, s, s), Easing.Step);
        track.addKeyframe((t += o), new Rect(3 * s, 1 * s, s, s), Easing.Step);
        track.addKeyframe((t += o), new Rect(0 * s, 2 * s, s, s), Easing.Step);
        track.addKeyframe((t += o), new Rect(1 * s, 2 * s, s, s), Easing.Step);

        track.addKeyframe((t += 1.0), new Rect(1 * s, 2 * s, s, s), Easing.Step);

        track.addKeyframe((t += o), new Rect(0 * s, 2 * s, s, s), Easing.Step);
        track.addKeyframe((t += o), new Rect(3 * s, 1 * s, s, s), Easing.Step);
        track.addKeyframe((t += o), new Rect(2 * s, 1 * s, s, s), Easing.Step);
        track.addKeyframe((t += o), new Rect(1 * s, 1 * s, s, s), Easing.Step);

        const animation = createComponent(Animation);
        animation.addTrack(track);
        return animation;
    }
}
