import { EventBus } from "@game/core/event-bus";
import { AppError } from "../../app-error";
import { AudioService } from "../../core/audio-service";
import { Color } from "../../core/Color";
import { DisplayContent } from "../../display/user-interface/display-content";
import { ButtonElement } from "../../display/user-interface/elements/button-element";
import { ImageElement } from "../../display/user-interface/elements/image-element";
import { BorderPosition, RectElement } from "../../display/user-interface/elements/rect-element";
import { TextElement } from "../../display/user-interface/elements/text-element";
import { createButton } from "../../display/user-interface/utils/create-button";
import { Settings } from "../../core/settings";
import { Key, Localization } from "../../localization/localization";
import { Timer, TimerService } from "../../core/timer-service";
import { HelpDialog } from "./help-dialog";
import { GameOverDialog } from "./game-over-dialog";
import { JumpToStartDialog } from "./jump-to-start-dialog";
import { Easing, Track } from "../../animation/track";
import { Float2, Float2Like } from "../../display/user-interface/elements/components/Float2";
import { createComponent, deleteComponent } from "../../core/ComponentRegistry";
import { Animation } from "../../animation/animation";
import { ResetMode } from "@game/core/utils";
import { LoadingOverlay } from "./loading-overlay";
import { DisplayContentRenderer } from "../../display/display-content-renderer";
import { createDisplayBlurAnimation } from "../../display/user-interface/utils/create-display-blur-animation";
import { PointerType } from "../../input/input-system";
import { Disposable, throwIfDisposed } from "../../core/disposable";

const zOffset = 100;
const scoreLabelLength = 4;
const swapButtonTimeout = 0.25;
const subsequentLoadingSpeed = 4;

interface UIManagerContext {
    displayContent: DisplayContent;
    spriteSheet: HTMLImageElement;
    audioService: AudioService;
    eventBus: EventBus;
    settings: Settings;
    localization: Localization;
    timerService: TimerService;
    displayRenderer: DisplayContentRenderer;
}

export class UIManager implements Disposable {
    private ctx: UIManagerContext;

    private scoreBackground: RectElement;
    private scoreLabel: TextElement;
    private scoreValueLabel: TextElement;

    private stimpakBackground: RectElement;
    private stimpakLabel: TextElement;

    private ammunitionBackground: RectElement;
    private ammunitionLabel: TextElement;

    private backButton: ButtonElement;
    private helpButton: ButtonElement;
    private playButton: ButtonElement;

    private bonusLabel: TextElement;
    private bonusLabelAnimation: Animation;
    private blurAnimation: Animation;

    private helpDialog: HelpDialog;
    private gameOverDialog: GameOverDialog;
    private jumpToStartDialog: JumpToStartDialog;
    private loadingOverlay: LoadingOverlay;

    private _enabled = false;
    private _disposed = false;
    private _bestScore = -1;
    private swapButtonTimer: Timer | undefined = undefined;
    private currentDialog: DialogBox | undefined = undefined;
    private firstLoad = true;
    private _pointerType: PointerType = "none";

    get disposed() {
        return this._disposed;
    }

    get enabled() {
        return this._enabled;
    }

    set enabled(value) {
        this.throwIfDisposed();

        if (this._enabled === value) {
            return;
        }

        this._enabled = value;
        if (this.enabled) {
            this.attachListeners();
        } else {
            this.detachListeners();
            this.loadingOverlay.pulseAnimation.stop();
            this.loadingOverlay.progressBarAnimation.stop();
            this.blurAnimation.stop();
        }
    }

    get bestScore() {
        return this._bestScore;
    }

    set bestScore(value) {
        this.throwIfDisposed();

        this._bestScore = value;
        this.helpDialog.localizeBestScoreLabel(value);
    }

    private get pointerType() {
        return this._pointerType;
    }

    private set pointerType(value) {
        this._pointerType = value;
        this.helpDialog.localizeInputLabels(this.pointerType);
    }

    private get eventBus() {
        return this.ctx.eventBus;
    }

    private get displayContent() {
        return this.ctx.displayContent;
    }

    private get localization() {
        return this.ctx.localization;
    }

    constructor(ctx: UIManagerContext) {
        Object.assign(this, { throwIfDisposed });

        this.ctx = ctx;

        this.blurAnimation = createDisplayBlurAnimation(this.ctx.displayRenderer);

        this.createElements();
        this.localizeElements();

        this.ctx.settings.onLocaleChanged.add(this.localizeElements);

        this.helpDialog.visible = false;
        this.gameOverDialog.visible = false;
        this.jumpToStartDialog.visible = true;

        this.playButton.visible = false;
        this.helpButton.visible = true;
        this.backButton.visible = true;

        this.playButton.pointerEvents.interactive = false;
        this.helpButton.pointerEvents.interactive = true;
        this.backButton.pointerEvents.interactive = true;
    }

    declare private throwIfDisposed: typeof throwIfDisposed;

    setAmmunition(value: number) {
        this.throwIfDisposed();

        this.ammunitionLabel.text = value.toString();
    }

    setStimpakCount(value: number) {
        this.throwIfDisposed();

        this.stimpakLabel.text = value.toString();
    }

    setScore(score: number) {
        this.throwIfDisposed();

        const roundedScore = Math.round(score);

        const maxPlainScore = 10 ** scoreLabelLength - 1;
        if (Number.isInteger(roundedScore) && roundedScore >= 0 && roundedScore <= maxPlainScore) {
            this.scoreValueLabel.text = roundedScore.toString();
            return;
        }

        const maxMantissa = maxPlainScore;
        const maxScore = maxMantissa * 1_000_000;
        const boundedScore = Math.min(roundedScore, maxScore);
        let divisor = boundedScore >= 1_000_000 ? 1_000_000 : 1_000;
        let suffix = divisor === 1_000_000 ? "M" : "K";

        const formatMantissa = (value: number) => {
            const integerLength = Math.floor(value).toString().length;
            const decimalPlaces = Math.max(0, scoreLabelLength - integerLength - 1);
            const formatted = value.toFixed(decimalPlaces);
            return formatted.includes(".") ? formatted.replace(/0+$/, "").replace(/\.$/, "") : formatted;
        };

        let mantissa = formatMantissa(boundedScore / divisor);
        if (suffix === "K" && Number(mantissa) >= 1_000) {
            divisor = 1_000_000;
            suffix = "M";
            mantissa = formatMantissa(boundedScore / divisor);
        }

        if (mantissa.length > scoreLabelLength) {
            if (suffix === "K") {
                const millionMantissa = formatMantissa(boundedScore / 1_000_000);
                if (Number(millionMantissa) >= 1 && millionMantissa.length <= scoreLabelLength) {
                    suffix = "M";
                    mantissa = millionMantissa;
                } else {
                    mantissa = maxMantissa.toString();
                }
            } else {
                mantissa = maxMantissa.toString();
            }
        }

        this.scoreValueLabel.text = `${mantissa}${suffix}`;
    }

    private attachListeners() {
        this.backButton.pointerEvents.addEventListener("onclick", this.handleBackButtonClicked);
        this.helpButton.pointerEvents.addEventListener("onclick", this.handleHelpButtonClicked);
        this.playButton.pointerEvents.addEventListener("onclick", this.handlePlayButtonClicked);

        this.eventBus.vaultBoy.onStimpakCountChanged.add(this.handleStimpakCountChanged);
        this.eventBus.vaultBoy.onKilled.add(this.handleVaultBoyKilled);

        this.eventBus.onAmmunitionChanged.add(this.handleAmmunitionChanged);

        this.eventBus.score.onChanged.add(this.handleScoreChanged);
        this.eventBus.score.onBestChanged.add(this.handleBestScoreChanged);
        this.eventBus.score.onBonus.add(this.handleScoreBonus);

        this.eventBus.game.onStarted.add(this.handleGameStarted);
        this.eventBus.game.onReset.add(this.handleGameReset);
        this.eventBus.ui.onPointerChanged.add(this.handlePlatformTypeChanged);
    }

    private detachListeners() {
        this.backButton.pointerEvents.removeEventListener("onclick", this.handleBackButtonClicked);
        this.helpButton.pointerEvents.removeEventListener("onclick", this.handleHelpButtonClicked);
        this.playButton.pointerEvents.removeEventListener("onclick", this.handlePlayButtonClicked);

        this.eventBus.vaultBoy.onStimpakCountChanged.remove(this.handleStimpakCountChanged);
        this.eventBus.vaultBoy.onKilled.remove(this.handleVaultBoyKilled);

        this.eventBus.onAmmunitionChanged.remove(this.handleAmmunitionChanged);

        this.eventBus.score.onChanged.remove(this.handleScoreChanged);
        this.eventBus.score.onBestChanged.remove(this.handleBestScoreChanged);
        this.eventBus.score.onBonus.remove(this.handleScoreBonus);

        this.eventBus.game.onStarted.remove(this.handleGameStarted);
        this.eventBus.game.onReset.remove(this.handleGameReset);
        this.eventBus.ui.onPointerChanged.remove(this.handlePlatformTypeChanged);
    }

    private swapButtons(buttonA: ButtonElement, buttonB: ButtonElement) {
        this.swapButtonTimer?.cancel();

        if (!buttonA.visible && buttonB.visible) {
            return;
        }

        buttonA.visible = false;
        buttonA.pointerEvents.interactive = false;

        this.swapButtonTimer = this.ctx.timerService.timeout(
            () => {
                buttonB.visible = true;
                buttonB.pointerEvents.interactive = true;
            },
            swapButtonTimeout,
            false,
        );
    }

    private localizeElements = () => {
        this.helpDialog.localizeElements(this.bestScore, this.pointerType);
        this.gameOverDialog.localizeElements();
        this.jumpToStartDialog.localizeElements();
        this.loadingOverlay.localizeElements();

        this.scoreLabel.text = `${this.localization.translate(Key.Score)}:`;
        this.backButton.text = this.localization.translate(Key.Quit);
        this.helpButton.text = this.localization.translate(Key.Help);
        this.playButton.text = this.localization.translate(Key.Play);
    };

    private createElements() {
        this.createScoreElement();
        this.createStimpakCounter();
        this.createAmmunitionCounter();
        this.createButtons();

        this.bonusLabel = this.createBonusLabel();
        this.bonusLabelAnimation = this.createBonusLabelAnimation();

        this.helpDialog = new HelpDialog(this.ctx);
        this.gameOverDialog = new GameOverDialog(this.ctx);
        this.jumpToStartDialog = new JumpToStartDialog(this.ctx);
        this.loadingOverlay = new LoadingOverlay(this.ctx);
    }

    private createBonusLabel() {
        const bonusLabel = new TextElement();
        this.displayContent.add(bonusLabel);
        bonusLabel.name = "bonus-template";

        const margin = 32;
        bonusLabel.layout.set({
            x: margin,
            y: this.scoreBackground.layout.y + this.scoreBackground.layout.height + margin,
            z: zOffset,
            width: 96,
            height: this.scoreBackground.layout.height,
        });

        bonusLabel.color = Color.white;
        bonusLabel.fontSize = 48;
        bonusLabel.align = "center";
        bonusLabel.baseline = "middle";
        bonusLabel.clip = true;
        bonusLabel.color.a = 0;

        bonusLabel.text = "+99";

        return bonusLabel;
    }

    private createBonusLabelAnimation() {
        const scaleTrack = new Track<Float2Like>(
            (scale) => this.bonusLabel.layout.scale.copy(scale),
            (a, b, t) => new Float2().copy(a).lerp(b, t),
        );

        scaleTrack.addKeyframe(0, { x: 1, y: 1 }, Easing.EaseInOutQuad);
        scaleTrack.addKeyframe(0.2, { x: 1.3, y: 1.3 }, Easing.EaseInOutQuad);
        scaleTrack.addKeyframe(0.6, { x: 1, y: 1 }, Easing.EaseInOutQuad);

        const alphaTrack = new Track<number>(
            (alpha) => (this.bonusLabel.color.a = alpha),
            (a, b, t) => a * (1 - t) + b * t,
        );

        alphaTrack.addKeyframe(0, 1, Easing.Linear);
        alphaTrack.addKeyframe(1, 1, Easing.Linear);
        alphaTrack.addKeyframe(2, 0, Easing.Linear);

        const animation = createComponent(Animation);
        animation.addTrack(scaleTrack);
        animation.addTrack(alphaTrack);

        return animation;
    }

    private createButtons() {
        const margin = 32;
        const height = 80;

        this.backButton = createButton({
            x: margin,
            y: this.displayContent.height - margin - height,
            audioService: this.ctx.audioService,
            z: zOffset,
        });

        this.backButton.name = "back-button";
        this.displayContent.add(this.backButton);

        this.backButton.text = "Back";

        this.helpButton = createButton({
            x: this.displayContent.width - margin - this.backButton.layout.width,
            y: this.displayContent.height - margin - height,
            audioService: this.ctx.audioService,
            z: zOffset,
        });

        this.helpButton.name = "help-button";
        this.displayContent.add(this.helpButton);

        this.helpButton.text = "Help";

        this.playButton = createButton({ audioService: this.ctx.audioService });
        this.displayContent.add(this.playButton);

        this.playButton.name = "play-button";
        this.playButton.layout.copy(this.helpButton.layout);
        this.playButton.layout.z = zOffset + 1;
        this.playButton.text = "Play";
    }

    private createAmmunitionCounter() {
        const background = new RectElement();
        this.ammunitionBackground = background;
        background.name = "ammunition-background";
        this.ctx.displayContent.add(background);

        background.layout.copy(this.stimpakBackground.layout);
        background.layout.x += this.stimpakBackground.layout.width + 16;
        background.layout.width = 130;

        background.color = Color.black;
        background.borderWidth = 4;
        background.borderPosition = BorderPosition.Inside;
        background.borderColor = Color.white;

        const label = new TextElement();
        this.ammunitionLabel = label;
        label.name = "ammunition-label";
        this.ctx.displayContent.add(label);

        label.layout.copy(background.layout);

        const margin = 8;
        label.layout.x += margin;
        label.layout.y += margin;
        label.layout.z += 1;
        label.layout.height -= margin * 2;
        label.layout.width -= margin * 2;

        label.color = Color.white;
        label.fontSize = 48;
        label.align = "right";
        label.baseline = "middle";
        label.clip = true;

        label.text = "9";

        const icon = new ImageElement();
        icon.name = "ammunition-icon";
        this.ctx.displayContent.add(icon);

        icon.image = this.ctx.spriteSheet;

        const iconMargin = 12;
        const width = 115;
        const height = 128;
        icon.layout.copy(background.layout);
        icon.layout.x += iconMargin;
        icon.layout.y += iconMargin;
        icon.layout.z += 1;
        icon.layout.height -= 2 * iconMargin;
        icon.layout.width = icon.layout.height * (width / height);

        icon.cutout.set({ x: 1376, y: 230, width: width, height: height });
    }

    private createStimpakCounter() {
        const background = new RectElement();
        this.stimpakBackground = background;
        background.name = "stimpak-background";
        this.ctx.displayContent.add(background);

        background.layout.copy(this.scoreBackground.layout);
        background.layout.x += this.scoreBackground.layout.width + 16;
        background.layout.width = 130;

        background.color = Color.black;
        background.borderWidth = 4;
        background.borderPosition = BorderPosition.Inside;
        background.borderColor = Color.white;

        const label = new TextElement();
        this.stimpakLabel = label;
        label.name = "stimpak-label";
        this.ctx.displayContent.add(label);

        label.layout.copy(background.layout);

        const margin = 8;
        label.layout.x += margin;
        label.layout.y += margin;
        label.layout.z += 1;
        label.layout.height -= margin * 2;
        label.layout.width -= margin * 2;

        label.color = Color.white;
        label.fontSize = 48;
        label.align = "right";
        label.baseline = "middle";
        label.clip = true;

        label.text = "9";

        const icon = new ImageElement();
        icon.name = "stimpak-icon";
        this.ctx.displayContent.add(icon);

        icon.image = this.ctx.spriteSheet;

        const iconMargin = 12;
        icon.layout.copy(background.layout);
        icon.layout.x += iconMargin;
        icon.layout.y += iconMargin;
        icon.layout.z += 1;
        icon.layout.height -= 2 * iconMargin;
        icon.layout.width = icon.layout.height;

        icon.cutout.set({ x: 1240, y: 230, width: 128, height: 128 });
    }

    private createScoreElement() {
        const background = new RectElement();
        this.scoreBackground = background;
        background.name = "score-background";
        this.ctx.displayContent.add(background);

        background.layout.set({ x: 32, y: 32, z: zOffset, width: 320, height: 80 });

        background.color = Color.black;
        background.borderWidth = 4;
        background.borderPosition = BorderPosition.Inside;
        background.borderColor = Color.white;

        const scoreLabel = new TextElement();
        this.scoreLabel = scoreLabel;
        scoreLabel.name = "score-label";
        this.ctx.displayContent.add(scoreLabel);

        scoreLabel.layout.copy(background.layout);

        const margin = 8;
        scoreLabel.layout.x += margin;
        scoreLabel.layout.y += margin;
        scoreLabel.layout.z += 1;
        scoreLabel.layout.height -= margin * 2;
        scoreLabel.layout.width -= margin * 2;
        scoreLabel.layout.width /= 2;

        scoreLabel.color = Color.white;
        scoreLabel.fontSize = 48;
        scoreLabel.align = "left";
        scoreLabel.baseline = "middle";
        scoreLabel.clip = true;

        scoreLabel.text = "Score:";

        const valueLabel = new TextElement();
        this.scoreValueLabel = valueLabel;
        valueLabel.name = "score-value-label";
        this.ctx.displayContent.add(valueLabel);

        valueLabel.layout.copy(scoreLabel.layout);
        valueLabel.layout.x += valueLabel.layout.width;

        valueLabel.copyStyle(scoreLabel);
        valueLabel.align = "right";

        valueLabel.text = "1234";
    }

    private handlePlatformTypeChanged = (lastType: PointerType, type: PointerType) => {
        this.pointerType = type;
    };

    private handleScoreBonus = (bonus: number) => {
        const rounded = Math.round(bonus);
        this.bonusLabel.text = `+${rounded}`;

        this.bonusLabelAnimation.time = 0;
        this.bonusLabelAnimation.play().catch((reason) => {
            throw new AppError("Failed to play animation.", { cause: reason });
        });
    };

    private handleGameReset = (resetMode: ResetMode) => {
        this.helpDialog.visible = false;
        this.gameOverDialog.visible = false;
        this.jumpToStartDialog.visible = true;

        this.backButton.visible = true;
        this.backButton.pointerEvents.interactive = true;

        this.swapButtons(this.playButton, this.helpButton);

        if (resetMode === "hard") {
            this.swapButtonTimer?.cancel();

            this.playButton.pointerEvents.interactive = false;
            this.helpButton.pointerEvents.interactive = false;
            this.backButton.pointerEvents.interactive = false;

            this.loadingOverlay.pulseAnimation.time = 0;
            this.loadingOverlay.pulseAnimation.play({ loop: true }).catch((error) => {
                throw new AppError("Failed to play animation.", { cause: error });
            });

            this.loadingOverlay.visible = true;

            const setButtonsInteractive = () => {
                this.helpButton.pointerEvents.interactive = true;
                this.backButton.pointerEvents.interactive = true;
            };

            void (async () => {
                const timeMultiplier = this.firstLoad ? 1 : subsequentLoadingSpeed;

                this.loadingOverlay.progressBarAnimation.time = 0;
                let animationStatus = await this.loadingOverlay.progressBarAnimation.play({ timeMultiplier });

                this.loadingOverlay.pulseAnimation.stop();
                this.loadingOverlay.visible = false;

                if (animationStatus === "stopped") {
                    setButtonsInteractive();
                    return;
                }

                this.blurAnimation.time = 0;
                animationStatus = await this.blurAnimation.play();

                if (animationStatus === "stopped") {
                    setButtonsInteractive();
                    return;
                }

                setButtonsInteractive();
                this.eventBus.ui.onLoadingFinished.invoke();
            })().catch((error) => {
                throw new AppError("Game reset failed.", { cause: error });
            });

            this.firstLoad = false;
        }
    };

    private handleVaultBoyKilled = () => {
        if (this.currentDialog) {
            this.currentDialog.visible = false;
        }

        this.currentDialog = this.gameOverDialog;

        this.gameOverDialog.visible = true;

        this.swapButtons(this.helpButton, this.playButton);
    };

    private handleGameStarted = () => {
        this.jumpToStartDialog.visible = false;
    };

    private handleBackButtonClicked = () => {
        this.eventBus.ui.onBackClicked.invoke();
    };

    private handleHelpButtonClicked = () => {
        if (this.currentDialog) {
            this.currentDialog.visible = false;
        }

        this.currentDialog = this.helpDialog;

        this.helpDialog.visible = true;

        this.swapButtons(this.helpButton, this.playButton);
        this.eventBus.ui.onHelpClicked.invoke();
    };

    private handlePlayButtonClicked = () => {
        const lastDialog = this.currentDialog;

        if (this.currentDialog) {
            this.currentDialog.visible = false;
        }

        this.currentDialog = undefined;

        this.swapButtons(this.playButton, this.helpButton);

        if (lastDialog === this.helpDialog) {
            this.eventBus.ui.onResumeClicked.invoke();
        } else if (lastDialog === this.gameOverDialog) {
            this.eventBus.ui.onRestartClicked.invoke();
        }
    };

    private handleBestScoreChanged = (score: number) => {
        this.bestScore = score;
    };

    private handleScoreChanged = (score: number) => {
        this.setScore(score);
    };

    private handleAmmunitionChanged = (ammunition: number) => {
        this.setAmmunition(ammunition);
    };

    private handleStimpakCountChanged = (lastCount: number, stimpakCount: number) => {
        this.setStimpakCount(stimpakCount);
    };

    dispose() {
        if (this.disposed) {
            return;
        }

        this._disposed = true;

        this.detachListeners();
        this.ctx.settings.onLocaleChanged.remove(this.localizeElements);

        deleteComponent(this.blurAnimation);
        deleteComponent(this.bonusLabelAnimation);
        deleteComponent(this.loadingOverlay.progressBarAnimation);
        deleteComponent(this.loadingOverlay.pulseAnimation);

        this.swapButtonTimer?.cancel();

        this.displayContent.remove(
            this.scoreBackground,
            this.scoreLabel,
            this.scoreValueLabel,
            this.stimpakBackground,
            this.stimpakLabel,
            this.ammunitionBackground,
            this.ammunitionLabel,
            this.backButton,
            this.helpButton,
            this.playButton,
            this.bonusLabel,
            ...this.helpDialog.elements,
            ...this.gameOverDialog.elements,
            ...this.jumpToStartDialog.elements,
            ...this.loadingOverlay.elements,
        );
    }
}
