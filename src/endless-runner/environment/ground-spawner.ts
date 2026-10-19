import { DisplayContent } from "../../display/user-interface/display-content";
import { ImageElement } from "../../display/user-interface/elements/image-element";
import { EnvironmentManagerContext } from "./environment-manager";
import { EnvironmentElement } from "./environment-element";
import { Disposable, throwIfDisposed } from "../../core/disposable";

const zOffset = 50;

export class GroundSpawner implements Disposable {
    public groundLevel = 460;
    public movementSpeed = 80;
    public spawnMargin = 32;

    private ctx: EnvironmentManagerContext;
    private groundFragments = new Set<EnvironmentElement>();
    private groundFragmentIndexes = [0, 1, 2, 3];
    private lastGroundFragmentIndex: number | undefined = undefined;
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

    constructor(ctx: EnvironmentManagerContext) {
        Object.assign(this, { throwIfDisposed });

        this.ctx = ctx;
    }

    declare private throwIfDisposed: typeof throwIfDisposed;

    update(deltaTime: number) {
        this.throwIfDisposed();

        this.updateGroundFragments(deltaTime);
    }

    generateGround() {
        this.throwIfDisposed();

        let startPosition = 0;
        while (startPosition < this.ctx.displayContent.width + this.spawnMargin) {
            const groundFragment = this.spawnGroundFragment();
            groundFragment.position.x = startPosition;
            groundFragment.updateSpriteLayout();

            startPosition += groundFragment.size.x;
        }
    }

    reset() {
        this.throwIfDisposed();

        for (const groundFragment of this.groundFragments) {
            this.ctx.displayContent.remove(groundFragment.imageElement);
        }

        this.groundFragments.clear();
        this.lastGroundFragmentIndex = undefined;
    }

    private updateGroundFragments(deltaTime: number) {
        for (const groundFragment of this.groundFragments) {
            groundFragment.position.x -= this.movementSpeed * this.speedMultiplier * deltaTime;
            groundFragment.updateSpriteLayout();

            if (groundFragment.position.x + groundFragment.size.x < 0) {
                this.ctx.displayContent.remove(groundFragment.imageElement);
                this.groundFragments.delete(groundFragment);
            }
        }

        const groundFragments = [...this.groundFragments];

        if (groundFragments.length === 0) {
            return;
        }

        const lastGroundFragment = groundFragments[groundFragments.length - 1];

        const endPosition = lastGroundFragment.position.x + lastGroundFragment.size.x;
        if (endPosition < this.ctx.displayContent.width + this.spawnMargin) {
            const newGroundFragment = this.spawnGroundFragment();
            newGroundFragment.position.x = endPosition;
            newGroundFragment.updateSpriteLayout();
        }
    }

    private spawnGroundFragment() {
        const indexPool = [...this.groundFragmentIndexes];
        if (this.lastGroundFragmentIndex !== undefined) {
            indexPool.splice(this.lastGroundFragmentIndex, 1);
        }

        const randomIndex = indexPool[Math.floor(Math.random() * indexPool.length)];
        this.lastGroundFragmentIndex = randomIndex;

        const ground = createGround(randomIndex, this.groundLevel, this.ctx.displayContent, this.ctx.spriteSheet);
        this.groundFragments.add(ground);
        ground.updateSpriteLayout();

        return ground;
    }

    dispose(): void {
        if (this.disposed) {
            return;
        }

        this._disposed = true;
        this.reset();
    }
}

function createGround(
    groundIndex: number,
    groundLevel: number,
    displayContent: DisplayContent,
    spriteSheet: HTMLImageElement,
) {
    const imageElement = new ImageElement();
    displayContent.add(imageElement);

    imageElement.image = spriteSheet;

    imageElement.compositeOperation = "screen";

    const scale = 1.33;
    let groundPosition = groundLevel;

    switch (groundIndex) {
        case 0:
            imageElement.cutout.set({ x: 8, y: 355, width: 768, height: 143 });
            imageElement.layout.set({ z: zOffset, width: 768, height: 143 });
            groundPosition -= 38 * scale; // Custom offset for ground level lining up.
            break;
        case 1:
            imageElement.cutout.set({ x: 8, y: 505, width: 768, height: 121 });
            imageElement.layout.set({ z: zOffset, width: 768, height: 121 });
            groundPosition -= 39 * scale;
            break;
        case 2:
            imageElement.cutout.set({ x: 8, y: 634, width: 768, height: 104 });
            imageElement.layout.set({ z: zOffset, width: 768, height: 104 });
            groundPosition -= 42 * scale;
            break;
        case 3:
        default:
            imageElement.cutout.set({ x: 8, y: 746, width: 768, height: 132 });
            imageElement.layout.set({ z: zOffset, width: 768, height: 132 });
            groundPosition -= 28 * scale;
            break;
    }

    const ground = new EnvironmentElement(imageElement, { x: displayContent.width, y: displayContent.height });
    ground.position.y = groundPosition;

    ground.size.x *= scale;
    ground.size.y *= scale;

    ground.updateSpriteLayout();

    return ground;
}
