import { Animation } from "../../../animation/animation";
import { Easing, Track } from "../../../animation/track";
import { AssetDatabase, TextureAsset } from "../../../assets/asset-database";
import { Color, ColorLike } from "../../../core/Color";
import { createComponent } from "../../../core/ComponentRegistry";
import { DisplayContent } from "../display-content";
import { Panel } from "../display-manager";
import { RectLike } from "../elements/components/Rect";
import { ImageElement } from "../elements/image-element";
import { TextElement } from "../elements/text-element";
import { VisualElement } from "../elements/visual-element";
import { createNavigationEvents } from "./components/navigation-events";
import { AudioService, AudioTrack, AudioTrackName } from "../../../core/audio-service";
import { DisplayContentRenderer } from "../../display-content-renderer";
import { MainMenuPanel } from "./main-menu-panel";
import { Timer, TimerService } from "../../../core/timer-service";
import { AppError } from "../../../app-error";
const pulseAnimationSpeed = 1;
const navigateTimeout = 2;

interface ColorElement extends VisualElement {
    color: Color;
}

export class InitPanelContext {
    assetDatabase: AssetDatabase;
    audioService: AudioService;
    displayRenderer: DisplayContentRenderer;
    timerService: TimerService;
}

export class InitPanel implements Panel {
    public readonly navigationEvents = createNavigationEvents();
    public readonly displayContent = new DisplayContent({ width: 1280, height: 1024 });

    private ctx: InitPanelContext;

    private pulseAnimation: Animation;
    private imageAnimation: Animation;
    private terminalLowFrequencyAudioTrack: AudioTrack | null = null;
    private navigateTimer: Timer | null = null;

    constructor(ctx: InitPanelContext) {
        this.ctx = ctx;

        this.createElements();
    }

    enter() {
        this.pulseAnimation.time = 0;
        this.imageAnimation.time = 0;

        this.ctx.audioService.createAudioTrack(AudioTrackName.Tweet).play();
        this.terminalLowFrequencyAudioTrack = this.ctx.audioService.createAudioTrack(
            AudioTrackName.TerminalLowFrequency,
        );
        this.terminalLowFrequencyAudioTrack.loop = true;
        this.terminalLowFrequencyAudioTrack.play();

        this.pulseAnimation.play({ timeMultiplier: pulseAnimationSpeed, loop: true });

        // We are running navigation all the animations and navigation request in "fire and forget"
        // mode, as making navigation requests when entering or exiting panel is forbidden,
        // and there is no other way to switch the panel.
        (async () => {
            await this.imageAnimation.play();
            const { promise, resolve } = Promise.withResolvers<void>();
            this.navigateTimer = this.ctx.timerService.timeout(() => resolve(), navigateTimeout, true);
            await promise;

            this.navigationEvents.requestNavigation(MainMenuPanel);
        })().catch((reason) => {
            throw new AppError("Init panel enter failed.", { cause: reason });
        });
    }

    async exit() {
        this.terminalLowFrequencyAudioTrack?.stop(0.5);
        this.ctx.audioService.createAudioTrack(AudioTrackName.Twoot).play();

        this.pulseAnimation.stop();
        this.imageAnimation.stop();

        this.navigateTimer?.cancel();
    }

    private createElements() {
        const imageElement = new ImageElement();
        imageElement.image = this.ctx.assetDatabase.getAsset<TextureAsset>("/textures/thumb-up-anim").image;
        imageElement.cutout.set({ x: 0, y: 0, width: 256, height: 256 });
        imageElement.layout.set({ x: 416, y: 272, width: 400, height: 400 });

        this.imageAnimation = this.createImageAnimation(imageElement);

        const textElement = new TextElement();
        textElement.text = "INITIATING";
        textElement.align = "center";
        textElement.baseline = "middle";
        textElement.fontSize = 32;
        textElement.color = Color.white;
        textElement.layout.set({ x: 512, y: 704, width: 256, height: 40 });

        this.pulseAnimation = this.createPulseAnimation(textElement);

        this.displayContent.add(imageElement, textElement);
    }

    private createImageAnimation(imageElement: ImageElement) {
        const track = new Track<RectLike>(
            (cutout) => imageElement.cutout.copy(cutout),
            (a, b, t) => a,
        );

        const s = 256;
        const o = 0.1;
        let t = 0;

        track.addKeyframe((t += 0), { x: 0 * s, y: 0 * s, width: s, height: s }, Easing.Step);

        track.addKeyframe((t += 0.5), { x: 0 * s, y: 0 * s, width: s, height: s }, Easing.Step);
        track.addKeyframe((t += o), { x: 1 * s, y: 0 * s, width: s, height: s }, Easing.Step);
        track.addKeyframe((t += o), { x: 2 * s, y: 0 * s, width: s, height: s }, Easing.Step);
        track.addKeyframe((t += o), { x: 1 * s, y: 0 * s, width: s, height: s }, Easing.Step);
        track.addKeyframe((t += o), { x: 0 * s, y: 0 * s, width: s, height: s }, Easing.Step);

        track.addKeyframe((t += 0.5), { x: 0 * s, y: 0 * s, width: s, height: s }, Easing.Step);

        track.addKeyframe((t += o), { x: 0 * s, y: 1 * s, width: s, height: s }, Easing.Step);
        track.addKeyframe((t += o), { x: 1 * s, y: 1 * s, width: s, height: s }, Easing.Step);
        track.addKeyframe((t += o), { x: 2 * s, y: 1 * s, width: s, height: s }, Easing.Step);
        track.addKeyframe((t += o), { x: 0 * s, y: 2 * s, width: s, height: s }, Easing.Step);
        track.addKeyframe((t += o), { x: 1 * s, y: 2 * s, width: s, height: s }, Easing.Step);

        const animation = createComponent(Animation);
        animation.addTrack(track);
        return animation;
    }

    private createPulseAnimation(visualElement: ColorElement) {
        const track = new Track<ColorLike>(
            (color) => visualElement.color.copy(color),
            (a, b, t) => Color.white.copy(a).lerp(b, t),
        );

        track.addKeyframe(0 / 2, Color.white, Easing.EaseInOutQuad);
        track.addKeyframe(1 / 2, new Color(0.25, 0.25, 0.25, 1), Easing.EaseInOutQuad);
        track.addKeyframe(2 / 2, Color.white, Easing.EaseInOutQuad);

        const animation = createComponent(Animation);
        animation.addTrack(track);
        return animation;
    }
}
