import { AppError } from "../../app-error";
import { AssetDatabase } from "../../assets/asset-database";
import { AudioService } from "../../core/audio-service";
import { Component } from "../../core/ComponentRegistry";
import { Settings } from "../../core/settings";
import { TimerService } from "../../core/timer-service";
import { DisplayInteraction } from "../../input/display-interaction";
import { InputSystem } from "../../input/input-system";
import { Localization } from "../../localization/localization";
import { UIEventBus } from "../../user-interface/ui-event-bus";
import { DisplayContentRenderer } from "../display-content-renderer";
import { DisplayContent } from "./display-content";
import { AboutPanel } from "./panels/about-panel";
import { BootPanel } from "./panels/boot-panel";
import { NavigationEvents, NavigationEventsInternal } from "./panels/components/navigation-events";
import { CVPanel } from "./panels/cv-panel";
import { GamePanel } from "./panels/game-panel";
import { InitPanel } from "./panels/init-panel";
import { MainMenuPanel } from "./panels/main-menu-panel";
import { SettingsPanel } from "./panels/settings-panel";
import { TestPanel } from "./panels/test-panel";

const SCREEN_FPS = 20;
const SCREEN_UPDATE_INTERVAL = 1 / SCREEN_FPS;

enum NavigationState {
    Idle = "Idle",
    ExitingPanel = "ExitingPanel",
    EnteringPanel = "EnteringPanel",
}

export type PanelType = new (...args: any[]) => Panel;

export interface Panel {
    displayContent: DisplayContent;
    navigationEvents: NavigationEvents;
    enter?(): Promise<void> | void;
    exit?(): Promise<void> | void;
}

interface DisplayManagerContext {
    timerService: TimerService;
    displayRenderer: DisplayContentRenderer;
    displayInteraction: DisplayInteraction;
    assetDatabase: AssetDatabase;
    localization: Localization;
    settings: Settings;
    audioService: AudioService;
    uiEventBus: UIEventBus;
    inputSystem: InputSystem;
}

export class DisplayManager implements Component {
    public enabled = true;

    private ctx: DisplayManagerContext;

    private renderer: DisplayContentRenderer;
    private interaction: DisplayInteraction;
    private panels: Panel[] = [];
    private panelStack: Panel[] = [];
    private updateTimer = 0;

    private targetPanel: Panel;
    private navigationState = NavigationState.Idle;

    constructor(ctx: DisplayManagerContext) {
        this.ctx = ctx;

        this.renderer = ctx.displayRenderer;
        this.interaction = ctx.displayInteraction;

        this.addPanel(new MainMenuPanel(ctx));
        this.addPanel(new TestPanel(ctx));
        this.addPanel(new BootPanel(ctx));
        this.addPanel(new InitPanel(ctx));
        this.addPanel(new SettingsPanel(ctx));
        this.addPanel(new CVPanel(ctx));
        this.addPanel(new AboutPanel(ctx));
        this.addPanel(new GamePanel(ctx));
    }

    get currentPanel() {
        const panel = this.panelStack.length > 0 ? this.panelStack.at(-1) : null;
        return panel ? panel : null;
    }

    update(deltaTime: number) {
        this.updateTimer += deltaTime;
        if (this.updateTimer < SCREEN_UPDATE_INTERVAL) {
            return;
        }

        const panel = this.currentPanel;
        if (panel) {
            this.renderer.render(panel.displayContent);
        }

        this.updateTimer %= SCREEN_UPDATE_INTERVAL;
    }

    getPanel(panelType: PanelType) {
        return this.panels.find((panel) => panel instanceof panelType);
    }

    private addPanel(panel: Panel) {
        this.panels.push(panel);
        (panel.navigationEvents as NavigationEventsInternal).onNavigateRequest?.add(this.handleNavigateRequest);
        (panel.navigationEvents as NavigationEventsInternal).onBackRequest?.add(this.handleBackRequest);
    }

    async navigate(panelType: PanelType) {
        if (this.navigationState === NavigationState.EnteringPanel) {
            console.warn("Cannot navigate to panel when entering one.");
            return;
        }

        const targetPanelCandidate = this.getPanel(panelType);
        if (!targetPanelCandidate) {
            throw new AppError(`Cannot navigate to ${panelType}.`);
        }

        this.targetPanel = targetPanelCandidate;

        if (this.navigationState === NavigationState.ExitingPanel) {
            console.warn("Cannot navigate to panel when exiting one. Target panel switched.");
            return;
        }

        const currentPanel = this.currentPanel;
        if (currentPanel) {
            this.navigationState = NavigationState.ExitingPanel;
            await this.currentPanel.exit?.();
        }

        this.navigationState = NavigationState.EnteringPanel;

        this.panelStack.push(this.targetPanel);

        this.interaction.displayContent = this.targetPanel.displayContent;
        await this.targetPanel.enter?.();

        this.navigationState = NavigationState.Idle;
    }

    async back() {
        if (this.panelStack.length <= 1) {
            console.warn("Cannot navigate back, no panels on stack.");
            return;
        }

        if (this.navigationState === NavigationState.ExitingPanel) {
            console.warn("Cannot navigate back when exiting panel.");
            return;
        }

        if (this.navigationState === NavigationState.EnteringPanel) {
            console.warn("Cannot navigate back when entering panel.");
            return;
        }

        const currentPanel = this.panelStack.pop();
        if (currentPanel) {
            this.navigationState = NavigationState.ExitingPanel;
            await currentPanel.exit?.();
        }

        this.navigationState = NavigationState.EnteringPanel;

        this.interaction.displayContent = this.currentPanel!.displayContent;
        await this.currentPanel!.enter?.();

        this.navigationState = NavigationState.Idle;
    }

    private handleNavigateRequest = (panelType: PanelType) => {
        this.navigate(panelType).catch((reason) => {
            throw new AppError("Failed to navigate.", { cause: reason });
        });
    };

    private handleBackRequest = () => {
        this.back().catch((reason) => {
            throw new AppError("Failed to navigate back.", { cause: reason });
        });
    };
}
