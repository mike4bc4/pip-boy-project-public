import { HasHitBox, HasHitBoxElement, overlaps, updateHitBoxLayout, updateSpriteLayout } from "@game/core/utils";
import { Disposable } from "../../core/disposable";
import { Sprite } from "@game/core/sprite";
import { Animation } from "../../animation/animation";
import { AppError } from "../../app-error";

interface EnemyBase {
    animationState: "default" | "frozen";
    readonly alive: boolean;
    movementSpeed: number;
    readonly deathAnimation: Animation;

    updateSpriteLayout: typeof updateSpriteLayout;
    updateHitBoxLayout: typeof updateHitBoxLayout;
    overlaps: typeof overlaps;
    kill(): void;
}

export type Enemy = EnemyBase & Sprite & HasHitBox & HasHitBoxElement & Disposable;

export function handleAnimationStateChanged(this: Enemy) {
    if (this.animationState === "frozen") {
        this.deathAnimation.pause();
    } else if (!this.alive) {
        this.deathAnimation.play().catch((reason) => {
            throw new AppError("Failed to play animation.", { cause: reason });
        });
    }
}
