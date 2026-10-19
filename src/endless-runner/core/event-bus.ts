import { Projectile } from "@game/weapon/projectile";
import { Action } from "../../core/Action";
import { Enemy } from "@game/enemy/enemy";
import { Item } from "@game/item/item";
import { ResetMode } from "./utils";
import { PointerType } from "../../input/input-system";
import { Disposable } from "../../core/disposable";

export class EventBus implements Disposable {
    public readonly onWeaponFired = new Action<[projectile: Projectile]>();
    public readonly onAmmunitionChanged = new Action<[ammunition: number]>();

    public readonly ui: {
        onHelpClicked: Readonly<Action>;
        onBackClicked: Readonly<Action>;
        onResumeClicked: Readonly<Action>;
        onRestartClicked: Readonly<Action>;
        onLoadingFinished: Readonly<Action>;
        onPointerChanged: Readonly<Action<[lastType: PointerType, type: PointerType]>>;
    } = {
        onHelpClicked: new Action(),
        onBackClicked: new Action(),
        onResumeClicked: new Action(),
        onRestartClicked: new Action(),
        onLoadingFinished: new Action(),
        onPointerChanged: new Action<[lastType: PointerType, type: PointerType]>(),
    };

    public readonly item: {
        onCollected: Readonly<Action<[item: Item]>>;
        onLimitReached: Readonly<Action<[item: Item]>>;
        onSpawned: Readonly<Action<[item: Item]>>;
    } = {
        onCollected: new Action<[item: Item]>(),
        onLimitReached: new Action<[item: Item]>(),
        onSpawned: new Action<[item: Item]>(),
    };

    public readonly score: {
        onChanged: Readonly<Action<[score: number]>>;
        onBestChanged: Readonly<Action<[score: number]>>;
        onBonus: Readonly<Action<[bonus: number]>>;
    } = {
        onChanged: new Action<[score: number]>(),
        onBestChanged: new Action<[score: number]>(),
        onBonus: new Action<[bonus: number]>(),
    };

    public readonly enemy: {
        onCollided: Readonly<Action<[enemy: Enemy]>>;
        onKilled: Readonly<Action<[enemy: Enemy]>>;
        onSpawned: Readonly<Action<[enemy: Enemy]>>;
    } = {
        onCollided: new Action<[enemy: Enemy]>(),
        onKilled: new Action<[enemy: Enemy]>(),
        onSpawned: new Action<[enemy: Enemy]>(),
    };

    public readonly game: {
        onStarted: Readonly<Action>;
        onPaused: Readonly<Action>;
        onResumed: Readonly<Action>;
        onReset: Readonly<Action<[resetMode: ResetMode]>>;
    } = {
        onStarted: new Action(),
        onPaused: new Action(),
        onResumed: new Action(),
        onReset: new Action<[resetMode: ResetMode]>(),
    };

    public readonly vaultBoy: {
        onKilled: Readonly<Action>;
        onGrounded: Readonly<Action>;
        onJump: Readonly<Action>;
        onStimpakCountChanged: Readonly<Action<[lastCount: number, count: number]>>;
    } = {
        onKilled: new Action(),
        onGrounded: new Action(),
        onJump: new Action(),
        onStimpakCountChanged: new Action<[lastCount: number, count: number]>(),
    };

    private _disposed = false;

    get disposed() {
        return this._disposed;
    }

    dispose(): void {
        if (this.disposed) {
            return;
        }

        this._disposed = true;

        this.onWeaponFired.dispose();
        this.onAmmunitionChanged.dispose();

        this.ui.onHelpClicked.dispose();
        this.ui.onBackClicked.dispose();
        this.ui.onResumeClicked.dispose();
        this.ui.onRestartClicked.dispose();
        this.ui.onLoadingFinished.dispose();
        this.ui.onPointerChanged.dispose();

        this.item.onCollected.dispose();
        this.item.onLimitReached.dispose();
        this.item.onSpawned.dispose();

        this.score.onChanged.dispose();
        this.score.onBestChanged.dispose();
        this.score.onBonus.dispose();

        this.enemy.onCollided.dispose();
        this.enemy.onKilled.dispose();
        this.enemy.onSpawned.dispose();

        this.game.onStarted.dispose();
        this.game.onPaused.dispose();
        this.game.onResumed.dispose();
        this.game.onReset.dispose();

        this.vaultBoy.onKilled.dispose();
        this.vaultBoy.onGrounded.dispose();
        this.vaultBoy.onJump.dispose();
        this.vaultBoy.onStimpakCountChanged.dispose();
    }
}
