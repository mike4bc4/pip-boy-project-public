import { Animation } from "../../../animation/animation";
import { Easing, Track } from "../../../animation/track";
import { AppError } from "../../../app-error";
import { Color } from "../../../core/Color";
import { createComponent } from "../../../core/ComponentRegistry";
import { AudioService, AudioTrackName } from "../../../core/audio-service";
import { Timer, TimerService } from "../../../core/timer-service";
import { DisplayContentRenderer } from "../../display-content-renderer";
import { DisplayContent } from "../display-content";
import { Panel } from "../display-manager";
import { Float2Like } from "../elements/components/Float2";
import { TextElement } from "../elements/text-element";
import { TextFrameElement } from "../elements/text-frame-element";
import { createNavigationEvents } from "./components/navigation-events";
import { InitPanel } from "./init-panel";

const headerText = "*************** PIP-OS(R) V7.2.0.0 ***************";
const frameText = `COPYRIGHT 2075 ROBCO(R)
    LOADER V1.1
    EXEC VERSION 41.12
    64k RAM SYSTEM
    19036 BYTES FREE
    HOLOTAPE FOUND: RUNNING BOY V1.7.3
    LOAD ROM(1) MIKE 319`;

const animationTextSpeed = 60;
const cursorBlinkTimeout = 2;
const scrollAnimationSteps = 20;
const scrollAnimationSpeed = 1;

interface TextElementLike {
    text: string;
}

interface BootPanelContext {
    displayRenderer: DisplayContentRenderer;
    audioService: AudioService;
    timerService: TimerService;
}

export class BootPanel implements Panel {
    public readonly navigationEvents = createNavigationEvents();
    public readonly displayContent = new DisplayContent({ width: 1280, height: 1024 });

    private ctx: BootPanelContext;

    private headerTextAnimation: Animation;
    private frameTextAnimation: Animation;
    private cursorBlinkAnimation: Animation;
    private scrollAnimation: Animation;

    private header: TextElement;
    private textFrame: TextFrameElement;
    private cursorBlinkTimer: Timer | null = null;

    constructor(ctx: BootPanelContext) {
        this.ctx = ctx;

        this.createElements();
        this.scrollAnimation = this.createScrollAnimation(scrollAnimationSteps);
    }

    enter() {
        this.headerTextAnimation.time = 0;
        this.frameTextAnimation.time = 0;
        this.cursorBlinkAnimation.time = 0;
        this.scrollAnimation.time = 0;

        this.header.text = "";
        this.textFrame.text = "";

        const audioTrack = this.ctx.audioService.createAudioTrack(AudioTrackName.TerminalHighFrequency);
        audioTrack.loop = true;
        audioTrack.play();

        // We are running navigation all the animations and navigation request in "fire and forget"
        // mode, as making navigation requests when entering or exiting panel is forbidden,
        // and there is no other way to switch the panel.
        (async () => {
            await this.headerTextAnimation.play({ timeMultiplier: animationTextSpeed });

            await this.frameTextAnimation.play({ timeMultiplier: animationTextSpeed });

            audioTrack.stop(0.1);

            this.cursorBlinkAnimation.play({ timeMultiplier: 2, loop: true });

            const { promise, resolve } = Promise.withResolvers<void>();
            this.cursorBlinkTimer = this.ctx.timerService.timeout(() => resolve(), cursorBlinkTimeout, true);
            await promise;

            this.navigationEvents.requestNavigation(InitPanel);
        })().catch((reason) => {
            throw new AppError("Boot panel enter failed.", { cause: reason });
        });
    }

    async exit() {
        this.ctx.audioService.createAudioTrack(AudioTrackName.TerminalScroll).play();

        this.ctx.displayRenderer.effects.requestTextureRepeatChange(false);
        await this.scrollAnimation.play({ timeMultiplier: scrollAnimationSpeed });

        this.scrollAnimation.stop();
        this.headerTextAnimation.stop();
        this.frameTextAnimation.stop();
        this.cursorBlinkAnimation.stop();

        this.ctx.displayRenderer.effects.requestTextureRepeatChange(true);
        this.ctx.displayRenderer.effects.requestUVOffsetChange({ x: 0, y: 0 });
        this.cursorBlinkTimer?.cancel();
    }

    private createElements() {
        const header = new TextElement();
        this.header = header;
        header.text = "";
        header.color = Color.white;
        header.fontSize = 36;
        header.align = "left";
        header.baseline = "middle";
        header.layout.set({ x: 152, y: 32, width: 976, height: 48 });

        this.headerTextAnimation = this.createTextAnimation(headerText, header);

        const textFrame = new TextFrameElement();
        this.textFrame = textFrame;
        textFrame.text = "";
        textFrame.color = Color.white;
        textFrame.fontSize = 36;
        textFrame.overflow = true;
        textFrame.layout.set({ x: 48, y: 160, width: 768, height: 336 });

        this.frameTextAnimation = this.createTextAnimation(frameText, textFrame);
        this.cursorBlinkAnimation = this.createCursorBlinkAnimation(frameText, textFrame);

        this.displayContent.add(header, textFrame, ...textFrame.childElements);
    }

    private createTextAnimation(text: string, textElement: TextElementLike, size = 1) {
        const track = new Track<string>(
            (text) => (textElement.text = text),
            (a, b, t) => a,
        );

        let idx = 0;

        for (let i = 0; i < text.length; i += size) {
            const chunk = text.slice(0, i + size);
            track.addKeyframe(idx, chunk + "\u2588", Easing.Step);
            idx += 1;
        }

        track.addKeyframe(idx, text, Easing.Step);

        const animation = createComponent(Animation);
        animation.addTrack(track);
        return animation;
    }

    private createCursorBlinkAnimation(text: string, textElement: TextElementLike) {
        const track = new Track<string>(
            (text) => (textElement.text = text),
            (a, b, t) => a,
        );

        track.addKeyframe(0, text, Easing.Step);
        track.addKeyframe(1, text + " \u2588", Easing.Step);
        track.addKeyframe(2, text + " \u2588", Easing.Step);

        const animation = createComponent(Animation);
        animation.addTrack(track);
        return animation;
    }

    private createScrollAnimation(steps: number) {
        const track = new Track<Float2Like>(
            (float2) => {
                this.ctx.displayRenderer.effects.requestUVOffsetChange(float2);
            },
            (a, b, t) => a,
        );

        for (let i = 0; i <= steps; i++) {
            track.addKeyframe(i / steps, { x: 0, y: i * (1 / steps) }, Easing.Step);
        }

        const animation = createComponent(Animation);
        animation.addTrack(track);
        return animation;
    }
}
