import { Animation } from "../../animation/animation";
import { Easing, Track } from "../../animation/track";
import { Color, ColorLike } from "../../core/Color";
import { createComponent } from "../../core/ComponentRegistry";
import { DisplayContent } from "../../display/user-interface/display-content";
import { RectElement } from "../../display/user-interface/elements/rect-element";
import { TextElement } from "../../display/user-interface/elements/text-element";
import { VisualElement } from "../../display/user-interface/elements/visual-element";
import { Key, Localization } from "../../localization/localization";

const zOffset = 300;
const name = "loading-overlay";

interface LoadingOverlayContext {
    localization: Localization;
    displayContent: DisplayContent;
}

export class LoadingOverlay {
    public readonly progressBarAnimation: Animation;
    public readonly pulseAnimation: Animation;

    private ctx: LoadingOverlayContext;

    private _visible = true;
    private background: RectElement;
    private label: TextElement;
    private progressBar: TextElement;

    get visible() {
        return this._visible;
    }

    set visible(value) {
        if (this._visible === value) {
            return;
        }

        this._visible = value;
        for (const element of this.elements) {
            element.visible = value;
        }
    }

    get elements(): VisualElement[] {
        return [this.background, this.label, this.progressBar];
    }

    private get displayContent() {
        return this.ctx.displayContent;
    }

    constructor(ctx: LoadingOverlayContext) {
        this.ctx = ctx;

        this.createElements();
        this.localizeElements();

        // Create the animation and evaluate it at T0, so the progress bar is reset.
        this.progressBarAnimation = this.createProgressBarAnimation();
        this.progressBarAnimation.time = 0;

        this.pulseAnimation = this.createPulseAnimation();
    }

    localizeElements() {
        this.label.text = this.ctx.localization.translate(Key.ReadingHolotape);
    }

    private createElements() {
        const background = new RectElement();
        this.displayContent.add(background);
        this.background = background;

        background.name = `${name}-background`;

        background.layout.set({
            x: 0,
            y: 0,
            z: zOffset,
            width: this.displayContent.width,
            height: this.displayContent.height,
        });

        background.color = Color.black;

        const label = new TextElement();
        this.displayContent.add(label);
        this.label = label;

        label.name = `${name}-label`;

        label.layout.set({ x: 320, y: 448, z: zOffset + 1, width: 640, height: 64 });

        label.color = Color.white;
        label.fontSize = 32;
        label.align = "center";
        label.baseline = "middle";
        label.clip = true;

        label.text = "READING HOLOTAPE";

        const progressBar = new TextElement();
        this.displayContent.add(progressBar);
        this.progressBar = progressBar;

        progressBar.name = `${name}-progress-bar`;

        progressBar.layout.set({ x: 320, y: 512, z: zOffset + 1, width: 640, height: 64 });

        progressBar.copyStyle(label);

        progressBar.text = "[##########....................]";
    }

    private createProgressBarAnimation() {
        const barLength = 30;

        const track = new Track<number>(
            (progress) => {
                const length = barLength;
                const hashCount = Math.round(progress * barLength);

                const hashString = "#".repeat(hashCount);
                const dotString = ".".repeat(length - hashCount);
                this.progressBar.text = `[${hashString}${dotString}]`;
            },
            (a, b, t) => a * (1 - t) + b * t,
        );

        let t = 0;
        track.addKeyframe((t += 0.0), 0.0, Easing.Linear);
        track.addKeyframe((t += 1.0), 0.0, Easing.Linear);
        track.addKeyframe((t += 0.6), 0.2, Easing.Linear);
        track.addKeyframe((t += 0.5), 0.2, Easing.Linear);
        track.addKeyframe((t += 0.1), 0.5, Easing.Linear);
        track.addKeyframe((t += 0.3), 0.5, Easing.Linear);
        track.addKeyframe((t += 1.0), 0.7, Easing.Linear);
        track.addKeyframe((t += 0.2), 0.9, Easing.Linear);
        track.addKeyframe((t += 0.5), 0.9, Easing.Linear);
        track.addKeyframe((t += 0.1), 1.0, Easing.Linear);
        track.addKeyframe((t += 1.0), 1.0, Easing.Linear);

        const animation = createComponent(Animation);
        animation.addTrack(track);
        return animation;
    }

    private createPulseAnimation() {
        const track = new Track<ColorLike>(
            (color) => this.label.color.copy(color),
            (a, b, t) => Color.white.copy(a).lerp(b, t),
        );

        let t = 0;
        const o = 0.5;
        track.addKeyframe((t += 0), Color.white, Easing.EaseInOutQuad);
        track.addKeyframe((t += o), new Color(0.5, 0.5, 0.5), Easing.EaseInOutQuad);
        track.addKeyframe((t += o), Color.white, Easing.EaseInOutQuad);

        const animation = createComponent(Animation);
        animation.addTrack(track);
        return animation;
    }
}
