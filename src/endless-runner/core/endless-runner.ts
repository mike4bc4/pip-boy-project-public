import { EnvironmentManager } from "@game/environment/environment-manager";
import { AssetDatabase, TextureAsset } from "../../assets/asset-database";
import { AudioService } from "../../core/audio-service";
import { Component } from "../../core/ComponentRegistry";
import { DisplayContent } from "../../display/user-interface/display-content";
import { InputSystem, PointerInfo, PointerType } from "../../input/input-system";
import { EventBus } from "./event-bus";
import { VaultBoy } from "./vault-boy";
import { ItemManager } from "@game/item/item-manager";
import { UIManager } from "@game/ui/ui-manager";
import { EnemyManager } from "@game/enemy/enemy-manager";
import { ScoreManager } from "./score-manager";
import { Settings } from "../../core/settings";
import { Localization } from "../../localization/localization";
import { TimerService } from "../../core/timer-service";
import { AudioManager } from "@game/audio/audio-manager";
import { DisplayInteraction } from "../../input/display-interaction";
import { ResetMode } from "./utils";
import { NavigationEvents } from "../../display/user-interface/panels/components/navigation-events";
import { DisplayContentRenderer } from "../../display/display-content-renderer";
import { throwIfDisposed } from "../../core/disposable";

const forceMultiplier = 1500;
const gravity = -1.75;
const jumpImpulse = 1;
const groundLevel = 256;
const vaultBoyPositionX = 64;

interface EndlessRunnerContext {
    assetDatabase: AssetDatabase;
    inputSystem: InputSystem;
    displayContent: DisplayContent;
    audioService: AudioService;
    settings: Settings;
    localization: Localization;
    timerService: TimerService;
    displayInteraction: DisplayInteraction;
    navigationEvents: NavigationEvents;
    displayRenderer: DisplayContentRenderer;
}

interface GameContext extends EndlessRunnerContext {
    spriteSheet: HTMLImageElement;
    vaultBoy: VaultBoy;
    eventBus: EventBus;
}

interface GameState {
    cloudSpeedMultiplier: number;
    groundSpeedMultiplier: number;
    propSpeedMultiplier: number;
    enemyManagerEnabled: boolean;
    itemManagerEnabled: boolean;
    scoreManagerEnabled: boolean;
    enemyManagerSpawnEnabled: boolean;
    itemManagerSpawnEnabled: boolean;
    vaultBoyAnimationState: typeof VaultBoy.prototype.animationState;
}

export class EndlessRunner implements Component {
    private ctx: EndlessRunnerContext;

    private vaultBoy: VaultBoy;
    private environmentManager: EnvironmentManager;
    private itemManager: ItemManager;
    private uiManager: UIManager;
    private enemyManager: EnemyManager;
    private eventBus = new EventBus();
    private gameContext: GameContext;
    private scoreManager: ScoreManager;
    private audioManager: AudioManager;

    private _pointerType: PointerType = "none";
    private _enabled = false;
    private _disposed = false;

    private gameState = {} as GameState;
    private gameStatus = {
        started: false,
        paused: false,
    };

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
            this.registerInput();
        } else {
            this.unregisterInput();
        }

        this.uiManager.enabled = value;
    }

    private get pointerType() {
        return this._pointerType;
    }

    private set pointerType(value) {
        if (this.pointerType === value) {
            return;
        }

        const lastPointerType = this.pointerType;
        this._pointerType = value;
        this.eventBus.ui.onPointerChanged.invoke(lastPointerType, this.pointerType);
    }

    constructor(ctx: EndlessRunnerContext) {
        Object.assign(this, { throwIfDisposed });

        this.ctx = ctx;

        this.gameContext = {
            ...this.ctx,
            spriteSheet: this.ctx.assetDatabase.getAsset<TextureAsset>("/textures/game-anim").image!,
            vaultBoy: undefined!,
            eventBus: this.eventBus,
        };

        this.vaultBoy = this.createVaultBoy();
        this.gameContext.vaultBoy = this.vaultBoy;

        this.uiManager = new UIManager(this.gameContext);
        this.uiManager.setAmmunition(this.vaultBoy.weapon.ammunition);
        this.uiManager.setStimpakCount(this.vaultBoy.stimpakCount);

        this.environmentManager = new EnvironmentManager(this.gameContext);
        this.environmentManager.cloudSpawner.scatterClouds();
        this.environmentManager.groundSpawner.generateGround();
        this.environmentManager.propSpawner.scatterProps();

        this.itemManager = new ItemManager(this.gameContext);
        this.enemyManager = new EnemyManager(this.gameContext);

        this.scoreManager = new ScoreManager(this.gameContext);

        this.audioManager = new AudioManager(this.gameContext);

        this.uiManager.bestScore = this.scoreManager.load();

        this.eventBus.ui.onHelpClicked.add(this.handleHelpClicked);
        this.eventBus.ui.onResumeClicked.add(this.handleResumeClicked);
        this.eventBus.ui.onLoadingFinished.add(this.handleLoadingFinished);
        this.eventBus.vaultBoy.onKilled.add(this.handleVaultBoyKilled);
        this.eventBus.ui.onRestartClicked.add(this.handleRestartClicked);
        this.eventBus.ui.onBackClicked.add(this.handleBackClicked);

        this.stop();
        this.vaultBoy.animationState = "shrugging";
        this.saveGameState();
    }

    declare private throwIfDisposed: typeof throwIfDisposed;

    update(deltaTime: number): void {
        this.throwIfDisposed();

        this.vaultBoy.update(deltaTime);
        this.environmentManager.update(deltaTime);
        this.itemManager.update(deltaTime);
        this.enemyManager.update(deltaTime);
        this.scoreManager.update(deltaTime);
    }

    reset(resetMode: ResetMode) {
        this.throwIfDisposed();

        this.vaultBoy.reset();
        this.eventBus.vaultBoy.onGrounded.remove(this.handleVaultBoyGrounded);

        this.uiManager.setAmmunition(this.vaultBoy.weapon.ammunition);
        this.uiManager.setStimpakCount(this.vaultBoy.stimpakCount);

        this.environmentManager.reset();
        this.environmentManager.cloudSpawner.scatterClouds();
        this.environmentManager.groundSpawner.generateGround();
        this.environmentManager.propSpawner.scatterProps();

        this.itemManager.reset();
        this.enemyManager.reset();

        this.scoreManager.reset();

        this.audioManager.reset();

        this.uiManager.bestScore = this.scoreManager.load();

        this.stop();
        this.vaultBoy.animationState = "shrugging";
        this.saveGameState();

        this.gameStatus.started = false;
        this.gameStatus.paused = false;

        if (resetMode === "hard") {
            this.gameStatus.paused = true;

            this.saveGameState();

            // Resetting with hard mode enabled, will cause loading screen to pop up,
            // thus loading flag will be cleared and game state will bre restored through
            // registered event listener when UI is done.
            this.vaultBoy.animationState = "frozen";
            this.freeze();
        }

        this.eventBus.game.onReset.invoke(resetMode);
    }

    private isPointerOverUIElement() {
        return this.ctx.displayInteraction.getDisplayElementAt(this.ctx.inputSystem.position) !== null;
    }

    private saveGameState() {
        this.gameState.cloudSpeedMultiplier = this.environmentManager.cloudSpawner.speedMultiplier;
        this.gameState.enemyManagerEnabled = this.enemyManager.enabled;
        this.gameState.enemyManagerSpawnEnabled = this.enemyManager.spawnEnabled;
        this.gameState.groundSpeedMultiplier = this.environmentManager.groundSpawner.speedMultiplier;
        this.gameState.itemManagerEnabled = this.itemManager.enabled;
        this.gameState.itemManagerSpawnEnabled = this.itemManager.spawnEnabled;
        this.gameState.propSpeedMultiplier = this.environmentManager.propSpawner.speedMultiplier;
        this.gameState.scoreManagerEnabled = this.scoreManager.enabled;
        this.gameState.vaultBoyAnimationState = this.vaultBoy.animationState;
    }

    private restoreGameState() {
        this.environmentManager.cloudSpawner.speedMultiplier = this.gameState.cloudSpeedMultiplier;
        this.enemyManager.enabled = this.gameState.enemyManagerEnabled;
        this.enemyManager.spawnEnabled = this.gameState.enemyManagerSpawnEnabled;
        this.environmentManager.groundSpawner.speedMultiplier = this.gameState.groundSpeedMultiplier;
        this.itemManager.enabled = this.gameState.itemManagerEnabled;
        this.itemManager.spawnEnabled = this.gameState.itemManagerSpawnEnabled;
        this.environmentManager.propSpawner.speedMultiplier = this.gameState.propSpeedMultiplier;
        this.scoreManager.enabled = this.gameState.scoreManagerEnabled;
        this.vaultBoy.animationState = this.gameState.vaultBoyAnimationState;
    }

    private freeze() {
        this.environmentManager.cloudSpawner.speedMultiplier = 0;
        this.environmentManager.groundSpawner.speedMultiplier = 0;
        this.environmentManager.propSpawner.speedMultiplier = 0;

        this.enemyManager.enabled = false;
        this.itemManager.enabled = false;
        this.scoreManager.enabled = false;
    }

    private stop() {
        this.environmentManager.cloudSpawner.speedMultiplier = 0.5;
        this.environmentManager.groundSpawner.speedMultiplier = 0;
        this.environmentManager.propSpawner.speedMultiplier = 0;

        this.enemyManager.spawnEnabled = false;
        this.itemManager.spawnEnabled = false;
        this.scoreManager.enabled = false;
    }

    private resume() {
        this.environmentManager.cloudSpawner.speedMultiplier = 1;
        this.environmentManager.groundSpawner.speedMultiplier = 1;
        this.environmentManager.propSpawner.speedMultiplier = 1;

        this.enemyManager.enabled = true;
        this.enemyManager.spawnEnabled = true;

        this.itemManager.enabled = true;
        this.itemManager.spawnEnabled = true;

        this.scoreManager.enabled = true;
    }

    private createVaultBoy() {
        const vaultBoy = new VaultBoy({
            ...this.gameContext,
            groundLevel: groundLevel,
            gravity: gravity * forceMultiplier,
            jumpImpulse: jumpImpulse * forceMultiplier,
        });

        vaultBoy.position.x = vaultBoyPositionX;
        vaultBoy.position.y = groundLevel;

        vaultBoy.updateSpriteLayout();
        vaultBoy.updateHitBoxLayout();

        return vaultBoy;
    }

    private registerInput() {
        this.ctx.inputSystem.onKeyDown.add(this.handleKeyDown);
        this.ctx.inputSystem.onPointerDown.add(this.handlePointerDown);
    }

    private unregisterInput() {
        this.ctx.inputSystem.onKeyDown.remove(this.handleKeyDown);
        this.ctx.inputSystem.onPointerDown.remove(this.handlePointerDown);
    }

    private handleBackClicked = () => {
        // We are essentially quitting the game here, not using hard reset,
        // since it would trigger loading screen.
        this.reset("soft");
        this.ctx.navigationEvents.requestBack();
    };

    private handleRestartClicked = () => {
        this.reset("soft");
    };

    private handleVaultBoyKilled = () => {
        this.freeze();
        this.vaultBoy.animationState = "frozen";
        this.gameStatus.paused = true;
    };

    private handleHelpClicked = () => {
        // We want to keep the state from before vault boy and the world being frozen,
        // so apply this before animation state change and "freeze()" call.
        this.saveGameState();

        this.freeze();
        this.vaultBoy.animationState = "frozen";
        this.gameStatus.paused = true;

        this.eventBus.game.onPaused.invoke();
    };

    private handleResumeClicked = () => {
        this.restoreGameState();
        this.gameStatus.paused = false;

        this.eventBus.game.onResumed.invoke();
    };

    private handleLoadingFinished = () => {
        this.restoreGameState();
        this.gameStatus.paused = false;
    };

    private handleJumpAction() {
        if (this.gameStatus.paused) {
            return;
        }

        if (!this.gameStatus.started) {
            this.gameStatus.started = true;
            this.vaultBoy.animationState = "running";

            this.eventBus.game.onStarted.invoke();

            // Save vault boy animation state "running".
            this.saveGameState();
            this.eventBus.vaultBoy.onGrounded.add(this.handleVaultBoyGrounded);
        }

        this.vaultBoy.tryJump();
    }

    private handleVaultBoyGrounded = () => {
        this.eventBus.vaultBoy.onGrounded.remove(this.handleVaultBoyGrounded);
        this.resume();

        // Vault boy landed and the world started moving, save this state.
        this.saveGameState();
    };

    private handleShootAction() {
        if (this.gameStatus.paused || !this.gameStatus.started) {
            return;
        }

        this.vaultBoy.weapon.fire();
    }

    private handlePointerDown = (pointerInfo: PointerInfo) => {
        this.pointerType = pointerInfo.pointerType;

        if (this.pointerType !== "touch" || this.isPointerOverUIElement()) {
            return;
        }

        if (this.ctx.inputSystem.position.x < window.innerWidth / 2) {
            this.handleJumpAction();
        } else {
            this.handleShootAction();
        }
    };

    private handleKeyDown = (keyCode: string) => {
        if (keyCode === "Space") {
            this.handleJumpAction();
        }
        if (keyCode === "ControlLeft") {
            this.handleShootAction();
        }
    };

    dispose() {
        if (this.disposed) {
            return;
        }

        this._disposed = true;

        this._enabled = false;
        this.unregisterInput();

        this.eventBus.ui.onHelpClicked.remove(this.handleHelpClicked);
        this.eventBus.ui.onResumeClicked.remove(this.handleResumeClicked);
        this.eventBus.ui.onLoadingFinished.remove(this.handleLoadingFinished);
        this.eventBus.ui.onRestartClicked.remove(this.handleRestartClicked);
        this.eventBus.ui.onBackClicked.remove(this.handleBackClicked);

        this.eventBus.vaultBoy.onKilled.remove(this.handleVaultBoyKilled);
        this.eventBus.vaultBoy.onGrounded.remove(this.handleVaultBoyGrounded);

        this.uiManager.dispose();
        this.vaultBoy.dispose();

        this.itemManager.dispose();
        this.enemyManager.dispose();
        this.environmentManager.dispose();
        this.scoreManager.dispose();
        this.environmentManager.dispose();
        this.audioManager.dispose();
        this.eventBus.dispose();
    }
}
