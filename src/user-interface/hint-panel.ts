import { Animation } from "../animation/animation";
import { Easing, Track } from "../animation/track";
import { cls } from "../app-shell-ui/cls";
import { createOpacityAnimation } from "../app-shell-ui/create-opacity-animation";
import { handleOpacityAnimationHide, handleOpacityAnimationShow } from "../app-shell-ui/handle-opacity-animation";
import { createComponent } from "../core/ComponentRegistry";
import { Settings } from "../core/settings";
import { Key, Localization } from "../localization/localization";
import { UIPanel } from "./ui-manager";
import { UIEventBus, UIEventBusHandler } from "./ui-event-bus";
import { Timer, TimerService } from "../core/timer-service";
import { AppError } from "../app-error";

const rootClass = cls("hint-panel");
const hintBoxClass = cls("hint-box");
const hintBoxTextClass = cls(hintBoxClass.name + "_text");
const hintBoxImageClass = cls(hintBoxClass.name + "_image");
const hiddenClass = cls("hidden");

const hintTimeout = 3;

interface HintPanelContext {
    uiEventBus: UIEventBus;
    localization: Localization;
    settings: Settings;
    timerService: TimerService;
}

enum RequestStatus {
    Running = "running",
    Stopped = "stopped",
    Cancelled = "cancelled",
}

class RequestState {
    public status = RequestStatus.Stopped;
    public localizationKey: Key | null = null;

    get isCancelled() {
        return this.status === RequestStatus.Cancelled;
    }
}

export class HintPanel implements UIPanel {
    public enabled = true;

    private ctx: HintPanelContext;

    private root: HTMLDivElement;
    private hintBox: HTMLDivElement;
    private hintBoxImage: HTMLImageElement;
    private hintBoxText: HTMLDivElement;

    private hintBoxImageAnimation: Animation;
    private rootOpacityAnimation: Animation;
    private hintBoxOpacityAnimation: Animation;

    private requestState = new RequestState();
    private hintLocalizationKey: Key | null = null;
    private hintTimer: Timer | null = null;

    constructor(ctx: HintPanelContext) {
        this.ctx = ctx;

        this.root = document.querySelector(rootClass.selector) as HTMLDivElement;
        this.hintBox = document.querySelector(hintBoxClass.selector) as HTMLDivElement;
        this.hintBoxImage = document.querySelector(hintBoxImageClass.selector) as HTMLImageElement;
        this.hintBoxText = document.querySelector(hintBoxTextClass.selector) as HTMLDivElement;

        this.hintBoxImageAnimation = this.createImageAnimation();
        this.rootOpacityAnimation = createOpacityAnimation(this.root);
        this.hintBoxOpacityAnimation = createOpacityAnimation(this.hintBox);

        this.ctx.settings.onLocaleChanged.add(() => {
            if (this.hintLocalizationKey) {
                this.hintText = this.ctx.localization.translate(this.hintLocalizationKey);
            }
        });

        this.ctx.settings.onShowHintsChanged.add(() => {
            if (!this.ctx.settings.showHints) {
                this.requestState.status = RequestStatus.Cancelled;
                this.hideHintBox(true);
            }
        });

        const handler = this.ctx.uiEventBus as UIEventBusHandler;
        handler.onRequestHint.add(this.handleHintRequest);
    }

    set hintText(text: string) {
        this.hintBoxText.innerText = text;
    }

    get hintText() {
        return this.hintBoxText.innerText;
    }

    show(animated = false) {
        return handleOpacityAnimationShow(this.root, this.rootOpacityAnimation, animated);
    }

    async hide(animated = false) {
        await handleOpacityAnimationHide(this.root, this.rootOpacityAnimation, animated);

        // If there is hint request running, just cancel it and hide
        // hint box immediately
        this.requestState.status = RequestStatus.Cancelled;
        this.hideHintBox(animated);
    }

    showHintBox(animated = false) {
        this.hintBoxImageAnimation.play({ loop: true, timeMultiplier: 4 });

        return handleOpacityAnimationShow(this.hintBox, this.hintBoxOpacityAnimation, animated);
    }

    async hideHintBox(animated = false) {
        await handleOpacityAnimationHide(this.hintBox, this.hintBoxOpacityAnimation, animated);

        this.hintBoxImageAnimation.stop();
        this.hintBoxImageAnimation.time = 0;
    }

    private createImageAnimation() {
        const track = new Track<{ x: number; y: number }>(
            (p) => {
                this.hintBoxImage.style.setProperty("--offset-x", p.x.toString());
                this.hintBoxImage.style.setProperty("--offset-y", p.y.toString());
            },
            (a, b, t) => a,
        );

        track.addKeyframe(0, { x: 0, y: 0 }, Easing.Step);
        track.addKeyframe(1, { x: 1 / 3, y: 0 }, Easing.Step);
        track.addKeyframe(2, { x: 2 / 3, y: 0 }, Easing.Step);
        track.addKeyframe(3, { x: 0, y: 1 / 3 }, Easing.Step);
        track.addKeyframe(4, { x: 1 / 3, y: 1 / 3 }, Easing.Step);
        track.addKeyframe(5, { x: 2 / 3, y: 1 / 3 }, Easing.Step);
        track.addKeyframe(6, { x: 0, y: 0 }, Easing.Step);

        const animation = createComponent(Animation);
        animation.addTrack(track);
        animation.addTrack(track);

        return animation;
    }

    private handleHintRequest = (localizationKey: Key) => {
        // Don't do anything if hidden or hints disabled
        if (this.root.classList.contains(hiddenClass.name) || !this.ctx.settings.showHints) {
            return;
        }

        // Don't do anything if the same hint has been requested and previous is still running
        if (
            this.requestState.localizationKey === localizationKey &&
            this.requestState.status === RequestStatus.Running
        ) {
            return;
        }

        // New hint requested, first cancel previous one
        const previousRequestState = this.requestState;
        previousRequestState.status = RequestStatus.Cancelled;

        this.requestState = new RequestState();
        this.requestState.status = RequestStatus.Running;
        this.requestState.localizationKey = localizationKey;

        this.startNewHintSequence(this.requestState).catch((reason) => {
            throw new AppError("Failed to start new hint sequence.", { cause: reason });
        });
    };

    private async startNewHintSequence(requestState: RequestState) {
        this.hintTimer?.cancel();
        await this.hideHintBox(true);

        if (requestState.isCancelled) {
            return;
        }

        // We are swapping the key only if managed to hide the hint box
        this.hintLocalizationKey = requestState.localizationKey;
        if (this.hintLocalizationKey) {
            this.hintText = this.ctx.localization.translate(this.hintLocalizationKey);
        }

        await this.showHintBox(true);
        if (requestState.isCancelled) {
            return;
        }

        const { promise, resolve } = Promise.withResolvers<void>();
        this.hintTimer = this.ctx.timerService.timeout(() => resolve(), hintTimeout, true);
        await promise;

        if (requestState.isCancelled) {
            return;
        }

        await this.hideHintBox(true);
        if (requestState.isCancelled) {
            return;
        }

        // Unless another request have been made, at this stage local request state should
        // represent exactly the same reference as the one cached in panel
        requestState.status = RequestStatus.Stopped;
    }
}
