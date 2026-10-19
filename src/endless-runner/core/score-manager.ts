import { Item } from "@game/item/item";
import { EventBus } from "./event-bus";
import { Ammunition } from "@game/item/ammunition";
import { Stimpak } from "@game/item/stimpak";
import { Enemy } from "@game/enemy/enemy";
import { Vertibird } from "@game/enemy/vertibird";
import { Synth } from "@game/enemy/synth";
import { Disposable, throwIfDisposed } from "../../core/disposable";

const storageKey = "pip-boy-app:score";
const stimpakBonus = 10;
const ammunitionBonus = 20;
const synthBonus = 30;
const vertibirdBonus = 50;

interface ScoreManagerContext {
    eventBus: EventBus;
}

interface ScoreContainer {
    score: number;
}

export class ScoreManager implements Disposable {
    public enabled = true;

    private ctx: ScoreManagerContext;
    private _multiplier = 1;
    private _score = 0;
    private _disposed = false;

    get disposed() {
        return this._disposed;
    }

    get score() {
        return this._score;
    }

    set score(value) {
        this.throwIfDisposed();

        if (this._score === value) {
            return;
        }

        this._score = value;
        this.eventBus.score.onChanged.invoke(this._score);
    }

    get multiplier() {
        return this._multiplier;
    }

    set multiplier(value) {
        this._multiplier = Math.max(0, value);
    }

    private get eventBus() {
        return this.ctx.eventBus;
    }

    constructor(ctx: ScoreManagerContext) {
        Object.assign(this, { throwIfDisposed });

        this.ctx = ctx;

        this.eventBus.item.onLimitReached.add(this.handleItemLimitReached);
        this.eventBus.enemy.onKilled.add(this.handleEnemyKilled);
        this.eventBus.vaultBoy.onKilled.add(this.saveScoreIfBeaten);
        this.eventBus.ui.onBackClicked.add(this.saveScoreIfBeaten);
    }

    declare private throwIfDisposed: typeof throwIfDisposed;

    update(deltaTime: number) {
        this.throwIfDisposed();

        if (!this.enabled) {
            return;
        }

        this.score += deltaTime * this.multiplier;
    }

    reset(emitEvent = true) {
        this.throwIfDisposed();

        this._score = 0;
        if (emitEvent) {
            this.ctx.eventBus.score.onChanged.invoke(this._score);
        }
    }

    save() {
        this.throwIfDisposed();

        const scoreContainer: ScoreContainer = { score: this.score };

        try {
            localStorage.setItem(storageKey, JSON.stringify(scoreContainer));
        } catch {
            console.warn("Could not save score to local storage.");
        }
    }

    load(): number {
        this.throwIfDisposed();

        const saved = localStorage.getItem(storageKey);
        if (!saved) {
            return 0;
        }

        let parsed = { score: 0 };
        try {
            parsed = JSON.parse(saved);
        } catch {}

        const isValid =
            parsed &&
            Object.hasOwn(parsed, "score") &&
            typeof parsed.score === "number" &&
            Number.isFinite(parsed.score) &&
            parsed.score >= 0;

        if (!isValid) {
            parsed = { score: 0 };
        }

        const scoreContainer: ScoreContainer = { ...{ score: 0 }, ...parsed };
        return scoreContainer.score;
    }

    private saveScoreIfBeaten = () => {
        const savedScore = this.load();
        if (this.score > savedScore) {
            this.save();
            this.eventBus.score.onBestChanged.invoke(this.score);
        }
    };

    private handleEnemyKilled = (enemy: Enemy) => {
        if (enemy instanceof Vertibird) {
            const bonus = vertibirdBonus * this.multiplier;
            this.score += bonus;
            this.eventBus.score.onBonus.invoke(bonus);
        } else if (enemy instanceof Synth) {
            const bonus = synthBonus * this.multiplier;
            this.score += bonus;
            this.eventBus.score.onBonus.invoke(bonus);
        }
    };

    private handleItemLimitReached = (item: Item) => {
        if (item instanceof Ammunition) {
            const bonus = ammunitionBonus * this.multiplier;
            this.score += bonus;
            this.eventBus.score.onBonus.invoke(bonus);
        } else if (item instanceof Stimpak) {
            const bonus = stimpakBonus * this.multiplier;
            this.score += bonus;
            this.eventBus.score.onBonus.invoke(bonus);
        }
    };

    dispose() {
        if (this.disposed) {
            return;
        }

        this._disposed = true;

        this.eventBus.item.onLimitReached.remove(this.handleItemLimitReached);
        this.eventBus.enemy.onKilled.remove(this.handleEnemyKilled);
        this.eventBus.vaultBoy.onKilled.remove(this.saveScoreIfBeaten);
        this.eventBus.ui.onBackClicked.remove(this.saveScoreIfBeaten);
    }
}
