import { DisplayContent } from "../../display/user-interface/display-content";
import { ImageElement } from "../../display/user-interface/elements/image-element";
import { EnvironmentManagerContext } from "./environment-manager";
import { EnvironmentElement } from "./environment-element";
import { Disposable, throwIfDisposed } from "../../core/disposable";

const zOffset = 50;

export class CloudSpawner implements Disposable {
    public cloudPositionLow = 560;
    public cloudPositionHigh = 880;

    private ctx: EnvironmentManagerContext;
    private spawnDistance: number;
    private clouds = new Set<EnvironmentElement>();
    private cloudIndexPool = [0, 1, 2];
    private lastCloudIndex: number | undefined = undefined;

    private _movementSpeed = 50;
    private _speedMultiplier = 1;
    private _spawnSpacing = 256;
    private _spawnSpacingRandom = 0.2;
    private _disposed = false;

    get disposed() {
        return this._disposed;
    }

    get speedMultiplier() {
        return this._speedMultiplier;
    }

    set speedMultiplier(value) {
        this._speedMultiplier = Math.max(0, value);
    }

    get movementSpeed() {
        return this._movementSpeed;
    }

    set movementSpeed(value: number) {
        this._movementSpeed = Math.max(0, value);
    }

    get spawnSpacing() {
        return this._spawnSpacing;
    }

    set spawnSpacing(value: number) {
        this._spawnSpacing = Math.max(0.01, value);
    }

    get spawnSpacingRandom() {
        return this._spawnSpacingRandom;
    }

    set spawnSpacingRandom(value: number) {
        this._spawnSpacingRandom = Math.max(0, Math.min(1), value);
    }

    constructor(ctx: EnvironmentManagerContext) {
        Object.assign(this, { throwIfDisposed });

        this.ctx = ctx;

        this.spawnDistance = this.spawnSpacing;
    }

    declare private throwIfDisposed: typeof throwIfDisposed;

    update(deltaTime: number) {
        this.throwIfDisposed();

        this.updateSpawnDistance(deltaTime);
        this.updateClouds(deltaTime);
    }

    scatterClouds(count = 5) {
        this.throwIfDisposed();

        const safeCount = Math.max(1, count);
        const space = this.ctx.displayContent.width / safeCount;

        for (let i = 0; i < safeCount; i++) {
            const cloud = this.spawnCloud();
            cloud.position.x = space + space * i;
        }
    }

    reset() {
        this.throwIfDisposed();

        for (const cloud of this.clouds) {
            this.ctx.displayContent.remove(cloud.imageElement);
        }

        this.clouds.clear();

        this.lastCloudIndex = undefined;
        this.spawnDistance = this.spawnSpacing;
    }

    private updateClouds(deltaTime: number) {
        for (const cloud of this.clouds) {
            cloud.position.x -= this.movementSpeed * this.speedMultiplier * deltaTime;
            cloud.updateSpriteLayout();

            if (cloud.position.x + cloud.size.x < 0) {
                this.ctx.displayContent.remove(cloud.imageElement);
                this.clouds.delete(cloud);
            }
        }
    }

    private updateSpawnDistance(deltaTime: number) {
        this.spawnDistance -= this.movementSpeed * this.speedMultiplier * deltaTime;
        if (this.spawnDistance > 0) {
            return;
        }

        const random = (Math.random() * 2 - 1) * this.spawnSpacingRandom;
        this.spawnDistance = this.spawnSpacing * (1 + random);
        this.spawnCloud();
    }

    private spawnCloud() {
        const indexPool = [...this.cloudIndexPool];
        if (this.lastCloudIndex !== undefined) {
            indexPool.splice(this.lastCloudIndex, 1);
        }

        const cloudIndex = indexPool[Math.floor(Math.random() * indexPool.length)];
        this.lastCloudIndex = cloudIndex;

        const cloud = createCloud(cloudIndex, this.ctx.displayContent, this.ctx.spriteSheet);
        this.clouds.add(cloud);

        const cloudPosition = this.cloudPositionLow + (this.cloudPositionHigh - this.cloudPositionLow) * Math.random();
        cloud.position.x = this.ctx.displayContent.width;
        cloud.position.y = cloudPosition;

        cloud.updateSpriteLayout();
        return cloud;
    }

    dispose(): void {
        if (this.disposed) {
            return;
        }

        this._disposed = true;
        this.reset();
    }
}

function createCloud(cloudIndex: number, displayContent: DisplayContent, spriteSheet: HTMLImageElement) {
    const imageElement = new ImageElement();
    displayContent.add(imageElement);

    imageElement.image = spriteSheet;

    imageElement.compositeOperation = "screen";

    switch (cloudIndex) {
        case 0:
            const s = 0.75;
            imageElement.cutout.set({ x: 8, y: 230, width: 334, height: 112 });
            imageElement.layout.set({ z: zOffset, width: 334 * s, height: 112 * s });
            break;
        case 1:
            imageElement.cutout.set({ x: 350, y: 230, width: 129, height: 40 });
            imageElement.layout.set({ z: zOffset, width: 129, height: 40 });
            break;
        case 2:
        default:
            imageElement.cutout.set({ x: 350, y: 278, width: 141, height: 69 });
            imageElement.layout.set({ z: zOffset, width: 141, height: 69 });
            break;
    }

    const cloud = new EnvironmentElement(imageElement, { x: displayContent.width, y: displayContent.height });
    return cloud;
}
