import { Animation } from "../animation/animation";
import { Easing, Track } from "../animation/track";
import { Component, createComponent } from "../core/ComponentRegistry";
import { Settings } from "../core/settings";
import { Key, Localization } from "../localization/localization";
import { cls } from "./cls";
import { createOpacityAnimation } from "./create-opacity-animation";
import { handleOpacityAnimationHide, handleOpacityAnimationShow } from "./handle-opacity-animation";

const rootClass = cls("continue-screen");
const labelClass = cls(rootClass.name + "_label");

interface ContinuePanelContext {
    settings: Settings;
    localization: Localization;
}

export class ContinuePanel implements Component {
    public enabled = true;

    private ctx: ContinuePanelContext;

    private root: HTMLDivElement;
    private label: HTMLParagraphElement;

    private rootOpacityAnimation: Animation;
    private labelOpacityAnimation: Animation;
    private labelPulseAnimation: Animation;

    constructor(ctx: ContinuePanelContext) {
        this.ctx = ctx;

        this.root = document.querySelector(rootClass.selector) as HTMLDivElement;
        this.label = this.root.querySelector(labelClass.selector) as HTMLParagraphElement;

        this.rootOpacityAnimation = createOpacityAnimation(this.root);
        this.labelOpacityAnimation = createOpacityAnimation(this.label);
        this.labelPulseAnimation = this.createPulseAnimation(this.label);

        this.localizeLabel();
        ctx.settings.onLocaleChanged.add(() => this.localizeLabel());
    }

    private localizeLabel() {
        this.label.innerText = this.ctx.localization.translate(Key.PressAnyContinue);
    }

    show(animated = false) {
        return handleOpacityAnimationShow(this.root, this.rootOpacityAnimation, animated);
    }

    hide(animated = false) {
        return handleOpacityAnimationHide(this.root, this.rootOpacityAnimation, animated);
    }

    async showLabel(animated = false) {
        await handleOpacityAnimationShow(this.label, this.labelOpacityAnimation, animated);
        this.labelPulseAnimation.time = 0;
        this.labelPulseAnimation.play({ loop: true });
    }

    async hideLabel(animated = false) {
        this.labelPulseAnimation.stop();
        await handleOpacityAnimationHide(this.label, this.labelOpacityAnimation, animated);
        this.labelOpacityAnimation.time = 0;
    }

    private createPulseAnimation(element: HTMLElement) {
        const track = new Track<number>(
            (opacity) => (element.style.opacity = opacity.toString()),
            (a, b, t) => a * (1 - t) + b * t,
        );

        track.addKeyframe(0, 1, Easing.EaseInOutQuad);
        track.addKeyframe(1, 0.4, Easing.EaseInOutQuad);
        track.addKeyframe(2, 1, Easing.EaseInOutQuad);

        const animation = createComponent(Animation);
        animation.addTrack(track);

        return animation;
    }
}
