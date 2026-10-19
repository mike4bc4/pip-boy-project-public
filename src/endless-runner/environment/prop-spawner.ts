import { DisplayContent } from "../../display/user-interface/display-content";
import { ImageElement } from "../../display/user-interface/elements/image-element";
import { EnvironmentManagerContext } from "./environment-manager";
import { EnvironmentElement } from "./environment-element";
import { Disposable, throwIfDisposed } from "../../core/disposable";

const zOffset = 50;

export class PropSpawner implements Disposable {
    public propPositionLow = 120;
    public propPositionHigh = 200;
    public movementSpeed = 520;

    private ctx: EnvironmentManagerContext;
    private spawnDistance: number;
    private props = new Set<EnvironmentElement>();
    private propIndexPool = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    private lastPropIndex: number | undefined = undefined;

    private _spawnSpacing = 768;
    private _spawnSpacingRandom = 0.6;
    private _speedMultiplier = 1;
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

    get spawnSpacing() {
        return this._spawnSpacing;
    }

    set spawnSpacing(value: number) {
        this.spawnSpacing = Math.max(0.01, value);
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
        this.updateProps(deltaTime);
    }

    scatterProps(count = 2) {
        this.throwIfDisposed();

        const safeCount = Math.max(1, count);
        const space = this.ctx.displayContent.width / safeCount;

        for (let i = 0; i < safeCount; i++) {
            const prop = this.spawnProp();
            prop.position.x = space + space * i;
        }
    }

    reset() {
        this.throwIfDisposed();

        for (const prop of this.props) {
            this.ctx.displayContent.remove(prop.imageElement);
        }

        this.props.clear();

        this.lastPropIndex = undefined;
        this.spawnDistance = this.spawnSpacing;
    }

    private updateProps(deltaTime: number) {
        for (const prop of this.props) {
            prop.position.x -= this.movementSpeed * this.speedMultiplier * deltaTime;
            prop.updateSpriteLayout();

            if (prop.position.x + prop.size.x < 0) {
                this.ctx.displayContent.remove(prop.imageElement);
                this.props.delete(prop);
            }
        }
    }

    private updateSpawnDistance(deltaTime: number) {
        this.spawnDistance -= deltaTime * this.movementSpeed * this.speedMultiplier;
        if (this.spawnDistance > 0) {
            return;
        }

        const random = (Math.random() * 2 - 1) * this.spawnSpacingRandom;
        this.spawnDistance = this.spawnSpacing * (1 + random);
        this.spawnProp();
    }

    private spawnProp() {
        const propPool = [...this.propIndexPool];
        if (this.lastPropIndex !== undefined) {
            propPool.splice(this.lastPropIndex, 1);
        }

        const propIndex = propPool[Math.floor(Math.random() * propPool.length)];
        this.lastPropIndex = propIndex;

        const prop = createProp(propIndex, this.ctx.displayContent, this.ctx.spriteSheet);
        this.props.add(prop);

        const propPosition = this.propPositionLow + (this.propPositionHigh - this.propPositionLow) * Math.random();
        prop.position.x = this.ctx.displayContent.width;
        prop.position.y = propPosition;

        prop.updateSpriteLayout();
        return prop;
    }

    dispose(): void {
        if (this.disposed) {
            return;
        }

        this._disposed = true;
        this.reset();
    }
}

function createProp(propIndex: number, displayContent: DisplayContent, spriteSheet: HTMLImageElement) {
    const imageElement = new ImageElement();
    displayContent.add(imageElement);

    imageElement.image = spriteSheet;

    imageElement.compositeOperation = "screen";
    imageElement.alpha = 0.66;

    switch (propIndex) {
        case 0: {
            const s = 1;
            imageElement.cutout.set({ x: 487, y: 230, width: 48, height: 29 });
            imageElement.layout.set({
                z: zOffset,
                width: imageElement.cutout.width * s,
                height: imageElement.cutout.height * s,
            });
            break;
        }
        case 1: {
            const s = 1;
            imageElement.cutout.set({ x: 499, y: 267, width: 72, height: 56 });
            imageElement.layout.set({
                z: zOffset,
                width: imageElement.cutout.width * s,
                height: imageElement.cutout.height * s,
            });
            break;
        }
        case 2: {
            // bone
            const s = 0.7;
            imageElement.cutout.set({ x: 543, y: 230, width: 116, height: 31 });
            imageElement.layout.set({
                z: zOffset,
                width: imageElement.cutout.width * s,
                height: imageElement.cutout.height * s,
            });
            break;
        }
        case 3: {
            const s = 1;
            imageElement.cutout.set({ x: 579, y: 269, width: 96, height: 23 });
            imageElement.layout.set({
                z: zOffset,
                width: imageElement.cutout.width * s,
                height: imageElement.cutout.height * s,
            });
            break;
        }
        case 4: {
            const s = 1;
            imageElement.cutout.set({ x: 579, y: 300, width: 145, height: 22 });
            imageElement.layout.set({
                z: zOffset,
                width: imageElement.cutout.width * s,
                height: imageElement.cutout.height * s,
            });
            break;
        }
        case 5: {
            // wide grass
            const s = 0.8;
            imageElement.cutout.set({ x: 683, y: 231, width: 198, height: 47 });
            imageElement.layout.set({
                z: zOffset,
                width: imageElement.cutout.width * s,
                height: imageElement.cutout.height * s,
            });
            break;
        }
        case 6: {
            // trash
            const s = 0.3;
            imageElement.cutout.set({ x: 732, y: 286, width: 313, height: 52 });
            imageElement.layout.set({
                z: zOffset,
                width: imageElement.cutout.width * s,
                height: imageElement.cutout.height * s,
            });
            break;
        }
        case 7: {
            // tall grass
            const s = 0.8;
            imageElement.cutout.set({ x: 1053, y: 230, width: 95, height: 79 });
            imageElement.layout.set({
                z: zOffset,
                width: imageElement.cutout.width * s,
                height: imageElement.cutout.height * s,
            });
            break;
        }
        case 8: {
            const s = 1;
            imageElement.cutout.set({ x: 1156, y: 230, width: 76, height: 90 });
            imageElement.layout.set({
                z: zOffset,
                width: imageElement.cutout.width * s,
                height: imageElement.cutout.height * s,
            });
            break;
        }
        case 9: {
            // skull
            const s = 0.4;
            imageElement.cutout.set({ x: 784, y: 346, width: 135, height: 101 });
            imageElement.layout.set({
                z: zOffset,
                width: imageElement.cutout.width * s,
                height: imageElement.cutout.height * s,
            });
            break;
        }
        case 10: {
            // plant
            const s = 0.6;
            imageElement.cutout.set({ x: 927, y: 346, width: 67, height: 115 });
            imageElement.layout.set({
                z: zOffset,
                width: imageElement.cutout.width * s,
                height: imageElement.cutout.height * s,
            });
            break;
        }
        case 11: {
            // grass with two stones
            const s = 0.6;
            imageElement.cutout.set({ x: 1002, y: 346, width: 204, height: 108 });
            imageElement.layout.set({
                z: zOffset,
                width: imageElement.cutout.width * s,
                height: imageElement.cutout.height * s,
            });
            break;
        }
        case 12: {
            // ribcage
            const s = 0.6;
            imageElement.cutout.set({ x: 784, y: 469, width: 212, height: 102 });
            imageElement.layout.set({
                z: zOffset,
                width: imageElement.cutout.width * s,
                height: imageElement.cutout.height * s,
            });
            break;
        }
        case 13:
        default: {
            // transmitter
            const s = 0.4;
            imageElement.cutout.set({ x: 1004, y: 462, width: 195, height: 119 });
            imageElement.layout.set({
                z: zOffset,
                width: imageElement.cutout.width * s,
                height: imageElement.cutout.height * s,
            });
            break;
        }
    }

    const prop = new EnvironmentElement(imageElement, { x: displayContent.width, y: displayContent.height });
    return prop;
}
