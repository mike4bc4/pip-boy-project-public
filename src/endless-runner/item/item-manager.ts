import { AppError } from "../../app-error";
import { DisplayContent } from "../../display/user-interface/display-content";
import { ImageElement } from "../../display/user-interface/elements/image-element";
import { VaultBoy } from "@game/core/vault-boy";
import { Stimpak } from "./stimpak";
import { Ammunition } from "./ammunition";
import { createCollectAnimation, Item, ItemConstructor } from "./item";
import { EventBus } from "@game/core/event-bus";
import { deleteComponent } from "../../core/ComponentRegistry";
import { Enemy } from "@game/enemy/enemy";
import { Animation } from "../../animation/animation";
import { Disposable, throwIfDisposed } from "../../core/disposable";

const zOffset = 50;
const itemToEnemyMargin = 128;

interface ItemManagerContext {
    displayContent: DisplayContent;
    spriteSheet: HTMLImageElement;
    vaultBoy: VaultBoy;
    eventBus: EventBus;
}

export class ItemManager implements Disposable {
    public spawnEnabled = true;

    public defaultItemSpawnHeight = 256;
    public speed = 520;
    public spawnHeights = [300, 460, 620];

    private _spawnInterval = 4;
    private _spawnRandom = 0.2;
    private _ammunitionSpawnProbability = 0.8;

    private ctx: ItemManagerContext;
    private _enabled = true;
    private _disposed = false;
    private items = new Set<Item>();
    private spawnTimer: number;
    private lastEnemy: Enemy | null = null;
    private collectAnimations = new Map<Item, Animation>();

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
        this.handleEnableChanged();
    }

    get ammunitionSpawnProbability() {
        return this._ammunitionSpawnProbability;
    }

    set ammunitionSpawnProbability(value) {
        this._ammunitionSpawnProbability = Math.max(0, Math.min(1, value));
    }

    get spawnRandom() {
        return this._spawnRandom;
    }

    set spawnRandom(value) {
        this.spawnRandom = Math.max(0, Math.min(1, value));
    }

    get spawnInterval() {
        return this._spawnInterval;
    }

    set spawnInterval(value) {
        this._spawnInterval = Math.max(1, value);
    }

    constructor(ctx: ItemManagerContext) {
        Object.assign(this, { throwIfDisposed });

        this.ctx = ctx;

        this.spawnTimer = this.spawnInterval;

        this.ctx.eventBus.enemy.onSpawned.add(this.handleEnemySpawned);
    }

    declare private throwIfDisposed: typeof throwIfDisposed;

    get displaySize() {
        return { x: this.ctx.displayContent.width, y: this.ctx.displayContent.height };
    }

    update(deltaTime: number) {
        this.throwIfDisposed();

        if (!this.enabled) {
            return;
        }

        this.updateItems(deltaTime);
        this.spawnItems(deltaTime);
    }

    resetSpawnTimer() {
        this.throwIfDisposed();

        this.spawnTimer = this.spawnInterval * (1 + (Math.random() * 2 - 1) * this.spawnRandom);
    }

    reset() {
        this.throwIfDisposed();

        for (const item of this.items) {
            this.destroyItem(item);
        }

        this.items.clear();
        this.spawnTimer = this.spawnInterval;
        this.lastEnemy = null;
        this.collectAnimations.clear();
    }

    private createItem<T extends Item>(constructor: ItemConstructor<T>, imageElement: ImageElement, aspect: number) {
        const item = new constructor(imageElement, this.ctx.displayContent);
        this.items.add(item);

        const size = 80;
        item.size.x = aspect * size;
        item.size.y = size;

        let positionY = this.defaultItemSpawnHeight;
        if (this.spawnHeights.length > 0) {
            const randomIndex = Math.floor(Math.random() * this.spawnHeights.length);
            positionY = this.spawnHeights[randomIndex];
        }

        item.position.x = this.displaySize.x;
        item.position.y = positionY;

        // Move the item away if it would overlap with the enemy
        if (this.lastEnemy && this.lastEnemy.overlaps(item)) {
            item.position.x = this.lastEnemy.position.x + this.lastEnemy.size.x + itemToEnemyMargin;
        }

        item.updateSpriteLayout();

        return item;
    }

    private createAmmunition() {
        const imageElement = new ImageElement();
        this.ctx.displayContent.add(imageElement);

        imageElement.compositeOperation = "screen";
        imageElement.image = this.ctx.spriteSheet;

        const width = 115;
        const height = 128;
        imageElement.layout.z = zOffset;
        imageElement.cutout.set({ x: 1305, y: 765, width, height });

        const ammunition = this.createItem(Ammunition, imageElement, width / height);
        return ammunition;
    }

    private createStimpak() {
        const imageElement = new ImageElement();
        this.ctx.displayContent.add(imageElement);

        imageElement.compositeOperation = "screen";
        imageElement.image = this.ctx.spriteSheet;

        imageElement.layout.z = zOffset;
        imageElement.cutout.set({ x: 1240, y: 230, width: 128, height: 128 });

        const stimpak = this.createItem(Stimpak, imageElement, 1);
        return stimpak;
    }

    private spawnItems(deltaTime: number) {
        if (!this.spawnEnabled) {
            return;
        }

        this.spawnTimer -= deltaTime;
        if (this.spawnTimer > 0) {
            return;
        }

        this.resetSpawnTimer();

        let item: Item;
        if (Math.random() < this.ammunitionSpawnProbability) {
            item = this.createAmmunition();
        } else {
            item = this.createStimpak();
        }

        this.ctx.eventBus.item.onSpawned.invoke(item);
    }

    private destroyItem(item: Item) {
        item.dispose();
        this.items.delete(item);

        const collectAnimation = this.collectAnimations.get(item);
        if (collectAnimation) {
            collectAnimation.stop();
            deleteComponent(collectAnimation);
            this.collectAnimations.delete(item);
        }
    }

    private updateItems(deltaTime: number) {
        for (const item of this.items) {
            item.position.x -= this.speed * deltaTime;
            item.updateSpriteLayout();

            if (item.collectable && item.overlaps(this.ctx.vaultBoy)) {
                item.collectable = false;

                this.ctx.eventBus.item.onCollected.invoke(item);

                item.floatAnimation.stop();

                // Since collect animation controls the visual position offset, that has been already
                // changed by float animation, it is necessary to create it when it's meant to be played,
                // so the initial VPO keyframe valu has actual position offset, instead of default value
                // from object creation state.
                const collectAnimation = createCollectAnimation(item);
                this.collectAnimations.set(item, collectAnimation);

                void (async () => {
                    try {
                        await collectAnimation.play();
                    } finally {
                        this.destroyItem(item);
                    }
                })().catch((error) => {
                    throw new AppError("Failed to handle collect animation", { cause: error });
                });
            }

            if (item.position.x + item.size.x < 0) {
                this.destroyItem(item);
            }
        }
    }

    private handleEnableChanged = () => {
        if (this.enabled) {
            for (const animation of this.collectAnimations.values()) {
                animation.play().catch((error) => {
                    throw new AppError("Failed to play animation.", { cause: error });
                });
            }
        } else {
            for (const animation of this.collectAnimations.values()) {
                animation.pause();
            }
        }
    };

    private handleEnemySpawned = (enemy: Enemy) => {
        this.lastEnemy = enemy;
    };

    dispose() {
        if (this.disposed) {
            return;
        }

        this._disposed = true;

        for (const item of this.items) {
            item.dispose();
        }

        this.items.clear();

        for (const animation of this.collectAnimations.values()) {
            deleteComponent(animation);
        }

        this.collectAnimations.clear();

        this.ctx.eventBus.enemy.onSpawned.remove(this.handleEnemySpawned);
    }
}
