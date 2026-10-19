import { EventBus } from "@game/core/event-bus";
import { DisplayContent } from "../../display/user-interface/display-content";
import { ImageElement } from "../../display/user-interface/elements/image-element";
import { Enemy } from "./enemy";
import { Synth } from "./synth";
import { Vertibird } from "./vertibird";
import { Projectile } from "@game/weapon/projectile";
import { VaultBoy } from "@game/core/vault-boy";
import { Item } from "@game/item/item";
import { Disposable, throwIfDisposed } from "../../core/disposable";

const zOffset = 50;
const enemyToItemMargin = 128;

interface EnemyManagerContext {
    spriteSheet: HTMLImageElement;
    displayContent: DisplayContent;
    vaultBoy: VaultBoy;
    eventBus: EventBus;
}

export class EnemyManager implements Disposable {
    public spawnEnabled = true;

    public groundLevel = 256;
    public aerialLevel = { low: 430, high: 540 };

    private ctx: EnemyManagerContext;
    private enemies = new Set<Enemy>();
    private collidedEnemies = new Set<Enemy>();

    private _spawnInterval = 3;
    private _spawnRandom = 0.5;
    private spawnTimer: number;

    private _vertibirdSpawnProbability = 0.33;
    private _vertibirdHighLevelProbability = 0.5;
    private _vertibirdMovementSpeedRandom = 0.3;
    private _enabled = true;
    private _disposed = false;

    private lastItem: Item | null = null;

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
        this.handleEnabledChanged();
    }

    get vertibirdMovementSpeedRandom() {
        return this._vertibirdMovementSpeedRandom;
    }

    set vertibirdMovementSpeedRandom(value) {
        this._vertibirdMovementSpeedRandom = Math.max(0, Math.min(1, value));
    }

    get vertibirdHighLevelProbability() {
        return this._vertibirdHighLevelProbability;
    }

    set vertibirdHighLevelProbability(value) {
        this._vertibirdHighLevelProbability = Math.max(0, Math.min(1, value));
    }

    get vertibirdSpawnProbability() {
        return this._vertibirdSpawnProbability;
    }

    set vertibirdSpawnProbability(value) {
        this._vertibirdSpawnProbability = Math.max(0, Math.min(1, value));
    }

    get spawnRandom() {
        return this._spawnRandom;
    }

    set spawnRandom(value) {
        this._spawnRandom = Math.max(0, Math.min(1, value));
    }

    get spawnInterval() {
        return this._spawnInterval;
    }

    set spawnInterval(value) {
        this._spawnInterval = Math.max(1, value);
        this.spawnTimer = this._spawnInterval;
    }

    get vaultBoy() {
        return this.ctx.vaultBoy;
    }

    get displayContent() {
        return this.ctx.displayContent;
    }

    constructor(ctx: EnemyManagerContext) {
        Object.assign(this, { throwIfDisposed });

        this.ctx = ctx;

        this.spawnTimer = this._spawnInterval;

        this.ctx.eventBus.onWeaponFired.add(this.handleWeaponFired);
        this.ctx.eventBus.item.onSpawned.add(this.handleItemSpawned);
    }

    declare private throwIfDisposed: typeof throwIfDisposed;

    update(deltaTime: number) {
        this.throwIfDisposed();

        if (!this.enabled) {
            return;
        }

        this.spawnEnemies(deltaTime);
        this.updateEnemies(deltaTime);
    }

    resetSpawnTimer() {
        this.throwIfDisposed();

        this.spawnTimer = (1 + (Math.random() * 2 - 1) * this._spawnRandom) * this._spawnInterval;
    }

    reset() {
        this.throwIfDisposed();

        for (const enemy of this.enemies) {
            enemy.dispose();
        }

        this.enemies.clear();
        this.collidedEnemies.clear();
        this.spawnTimer = this.spawnInterval;
        this.lastItem = null;
    }

    private handleEnabledChanged() {
        for (const enemy of this.enemies) {
            enemy.animationState = this.enabled ? "default" : "frozen";
        }
    }

    private handleWeaponFired = (projectile: Projectile) => {
        let enemyHit: Enemy | undefined = undefined;
        for (const enemy of this.enemies) {
            if (
                projectile.hasHitEnemy(enemy) &&
                (enemyHit === undefined || (enemyHit as Enemy).position.x > enemy.position.x)
            ) {
                enemyHit = enemy;
            }
        }

        if (enemyHit) {
            enemyHit.kill();
            this.ctx.eventBus.enemy.onKilled.invoke(enemyHit);
        }
    };

    private updateEnemies(deltaTime: number) {
        for (const enemy of this.enemies) {
            enemy.position.x -= enemy.movementSpeed * deltaTime;
            enemy.updateHitBoxLayout();
            enemy.updateSpriteLayout();

            const enemyWasCollided = this.collidedEnemies.has(enemy);
            if (enemy.alive && !enemyWasCollided && enemy.overlaps(this.vaultBoy)) {
                this.collidedEnemies.add(enemy);
                this.ctx.eventBus.enemy.onCollided.invoke(enemy);
            }

            if (enemy.position.x + enemy.size.x < 0) {
                this.collidedEnemies.delete(enemy);
                this.enemies.delete(enemy);
                enemy.dispose();
            }
        }
    }

    private spawnEnemies(deltaTime: number) {
        if (!this.spawnEnabled) {
            return;
        }

        this.spawnTimer -= deltaTime;
        if (this.spawnTimer > 0) {
            return;
        }

        this.resetSpawnTimer();

        let enemy: Enemy;
        const spawnVertibird = Math.random() < this.vertibirdSpawnProbability;
        if (spawnVertibird) {
            enemy = this.createVertibird();

            const spawnHigh = Math.random() < this.vertibirdHighLevelProbability;
            enemy.position.y = spawnHigh ? this.aerialLevel.high : this.aerialLevel.low;
        } else {
            enemy = this.createSynth();
        }

        // Move enemy away if it would overlap with the recently spawned item.
        if (this.lastItem && this.lastItem.overlaps(enemy)) {
            enemy.position.x = this.lastItem.position.x + this.lastItem.size.x + enemyToItemMargin;
        }

        this.ctx.eventBus.enemy.onSpawned.invoke(enemy);
    }

    private createVertibird() {
        const imageElement = new ImageElement();
        this.displayContent.add(imageElement);

        imageElement.compositeOperation = "screen";
        imageElement.image = this.ctx.spriteSheet;

        const width = 240;
        const height = 144;
        const scale = 0.8;
        imageElement.cutout.set({ x: 1214, y: 366, width, height });
        imageElement.layout.set({ z: zOffset, width: width * scale, height: height * scale });

        const vertibird = new Vertibird(imageElement, this.displayContent);
        this.enemies.add(vertibird);

        vertibird.position.x = this.displayContent.width;

        vertibird.movementSpeed *= 1 + (Math.random() * 2 - 1) * this.vertibirdMovementSpeedRandom;

        vertibird.updateSpriteLayout();
        vertibird.updateHitBoxLayout();

        return vertibird;
    }

    private createSynth() {
        const imageElement = new ImageElement();
        this.displayContent.add(imageElement);

        imageElement.compositeOperation = "screen";
        imageElement.image = this.ctx.spriteSheet;

        const width = 127;
        const height = 240;
        const scale = 0.8;
        imageElement.cutout.set({ x: 1499, y: 230, width, height });
        imageElement.layout.set({ z: zOffset, width: width * scale, height: height * scale });

        const synth = new Synth(imageElement, this.displayContent);
        this.enemies.add(synth);

        synth.position.y = this.groundLevel;
        synth.position.x = this.displayContent.width;

        synth.updateSpriteLayout();
        synth.updateHitBoxLayout();

        return synth;
    }

    private handleItemSpawned = (item: Item) => {
        this.lastItem = item;
    };

    dispose(): void {
        if (this.disposed) {
            return;
        }

        this._disposed = true;

        for (const enemy of this.enemies) {
            enemy.dispose();
        }

        this.enemies.clear();
        this.collidedEnemies.clear();

        this.ctx.eventBus.onWeaponFired.remove(this.handleWeaponFired);
        this.ctx.eventBus.item.onSpawned.remove(this.handleItemSpawned);
    }
}
