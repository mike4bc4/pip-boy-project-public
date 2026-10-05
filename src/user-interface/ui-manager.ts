import { ObjectDisposedError } from "../app-error";
import { cls } from "../app-shell-ui/cls";
import { AudioService } from "../core/audio-service";
import { Component, createComponent } from "../core/ComponentRegistry";
import { Disposable } from "../core/disposable";
import { Settings } from "../core/settings";
import { Timer, TimerService } from "../core/timer-service";
import { Localization } from "../localization/localization";
import { HintPanel } from "./hint-panel";
import { OverlayPanel } from "./overlay-panel";
import { UIEventBus } from "./ui-event-bus";

const rootClass = cls("ui-container");
const audioContextStateUpdateInterval = 0.5;

export interface UIPanel extends Component {
    hide: (animated?: boolean) => Promise<void> | void;
    show: (animated?: boolean) => Promise<void> | void;
}

export type PanelConstructor<T extends UIPanel> = new (...args: any[]) => T;

interface UIManagerContext {
    settings: Settings;
    localization: Localization;
    audioService: AudioService;
    uiEventBus: UIEventBus;
    timerService: TimerService;
}

export class UIManager implements Component, Disposable {
    public enabled = true;

    private ctx: UIManagerContext;
    private root: HTMLDivElement;
    private panels: UIPanel[] = [];
    private audioContextUpdateTimer: Timer;
    private _disposed = false;

    get disposed() {
        return this._disposed;
    }

    constructor(ctx: UIManagerContext) {
        this.ctx = ctx;

        this.root = document.querySelector(rootClass.selector) as HTMLDivElement;

        this.panels.push(createComponent(HintPanel, this.ctx));
        this.panels.push(createComponent(OverlayPanel, this.ctx));

        this.setupMutedIconHandler();
    }

    getPanelByType<T extends UIPanel>(panelConstructor: PanelConstructor<T>) {
        return this.panels.find((panel) => panel instanceof panelConstructor) as T;
    }

    start() {
        if (this.disposed) {
            throw new ObjectDisposedError();
        }

        const overlayPanel = this.getPanelByType(OverlayPanel);
        overlayPanel.show();

        const hintPanel = this.getPanelByType(HintPanel);
        hintPanel.show();
    }

    private setupMutedIconHandler() {
        const overlayPanel = this.getPanelByType(OverlayPanel);
        let lastAudioContextState = this.ctx.audioService.contextState;
        if (lastAudioContextState !== "running") {
            overlayPanel.showMutedIcon(true);
        } else {
            overlayPanel.hideMutedIcon(true);
        }

        this.audioContextUpdateTimer = this.ctx.timerService.interval(
            () => {
                if (this.ctx.audioService.contextState === lastAudioContextState) {
                    return;
                }

                if (this.ctx.audioService.contextState !== "running") {
                    overlayPanel.showMutedIcon(true);
                } else {
                    overlayPanel.hideMutedIcon(true);
                }

                lastAudioContextState = this.ctx.audioService.contextState;
            },
            audioContextStateUpdateInterval,
            true,
        );
    }

    dispose(): void {
        if (this.disposed) {
            return;
        }

        this._disposed = true;

        for (const panel of this.panels) {
            panel?.dispose?.();
        }

        this.panels.length = 0;

        this.audioContextUpdateTimer?.cancel();
    }
}
