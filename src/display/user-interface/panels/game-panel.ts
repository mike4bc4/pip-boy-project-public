import { Animation } from "../../../animation/animation";
import { AppError } from "../../../app-error";
import { AssetDatabase } from "../../../assets/asset-database";
import { AudioService } from "../../../core/audio-service";
import { createComponent } from "../../../core/ComponentRegistry";
import { Settings } from "../../../core/settings";
import { TimerService } from "../../../core/timer-service";
import { EndlessRunner } from "../../../endless-runner/core/endless-runner";
import { DisplayInteraction } from "../../../input/display-interaction";
import { InputSystem } from "../../../input/input-system";
import { Localization } from "../../../localization/localization";
import { DisplayContentRenderer } from "../../display-content-renderer";
import { DisplayContent } from "../display-content";
import { Panel } from "../display-manager";
import { createDisplayBlurAnimation } from "../utils/create-display-blur-animation";
import { createNavigationEvents } from "./components/navigation-events";

interface GamePanelContext {
    assetDatabase: AssetDatabase;
    inputSystem: InputSystem;
    audioService: AudioService;
    localization: Localization;
    settings: Settings;
    timerService: TimerService;
    displayInteraction: DisplayInteraction;
    displayRenderer: DisplayContentRenderer;
}

export class GamePanel implements Panel {
    public readonly displayContent = new DisplayContent({ width: 1280, height: 1024 });
    public readonly navigationEvents = createNavigationEvents();

    private ctx: GamePanelContext;

    private blurAnimation: Animation;

    private endlessRunner: EndlessRunner;

    constructor(ctx: GamePanelContext) {
        this.ctx = ctx;

        this.blurAnimation = createDisplayBlurAnimation(this.ctx.displayRenderer);

        this.endlessRunner = createComponent(EndlessRunner, {
            ...this.ctx,
            displayContent: this.displayContent,
            navigationEvents: this.navigationEvents,
        });
    }

    async enter() {
        this.blurAnimation.time = 0;
        this.blurAnimation.play().catch((error) => {
            throw new AppError("Failed to play animation.", { cause: error });
        });

        this.endlessRunner.enabled = true;
        this.endlessRunner.reset("hard");

        // Scroll animation is not being fired here as usual, since hard reset opens up
        // a loading screen, and scrolling only few lines of text looks bad.
    }

    exit() {
        this.blurAnimation.stop();
        this.endlessRunner.enabled = false;
    }
}
