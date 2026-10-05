import { equirectUV, maxMipLevel, texture, uniform, vec2 } from "three/tsl";
import { Component, createComponent, deleteComponent } from "../core/ComponentRegistry";
import { Easing, Track } from "../animation/track";
import { Animation } from "../animation/animation";
import { Scene, Texture } from "three/webgpu";
import { Disposable } from "../core/disposable";

export class Background implements Component, Disposable {
    public enabled = true;

    /** Width of the background HDRI texture. */
    private backgroundWidth = 2048;
    /** Width of the periodic gutter on both sides of the texture. */
    private gutterWidth = 32;

    private _blurFactor = uniform(0);
    private blurAnimation: Animation;

    private _disposed = false;

    get disposed() {
        return this._disposed;
    }

    get blurFactor() {
        return this._blurFactor.value;
    }

    constructor(scene: Scene, backgroundTexture: Texture) {
        this.blurAnimation = this.createBlurAnimation();

        /**
         * To avoid the non-periodic mismatch of the texture with higher mip levels used
         * in blur animation. We need to make sure the image itself is already 'periodic'.
         * Yet instead simply making three tiles of the image horizontally, we shrink the
         * base image to background width - gutter * 2, and then place it's copies on the
         * left and right to just add a small periodic margin. This solves the problem for
         * low mip levels. The higher mip level for blur required, the larger gutter is
         * needed. For 2048 x 1024 px texture, gutter of 32 px with defocus blur of 0.5,
         * seems to be working just fine.
         */
        const panoramaWidth = this.backgroundWidth - this.gutterWidth * 2;
        const uvScale = panoramaWidth / this.backgroundWidth;
        const uvOffset = this.gutterWidth / this.backgroundWidth;

        const uv = equirectUV();
        const periodicUV = vec2(uv.x.mul(uvScale).add(uvOffset), uv.y);

        const backgroundNode = texture(backgroundTexture, periodicUV);
        const blurLevel = this._blurFactor.mul(maxMipLevel(backgroundNode as unknown as Texture));
        scene.backgroundNode = backgroundNode.level(blurLevel);
    }

    async focus(duration = 1) {
        const timeMultiplier = -1 / Math.max(0.01, duration);
        await this.blurAnimation.play({ timeMultiplier });
    }

    async blur(duration = 1) {
        const timeMultiplier = 1 / Math.max(0.01, duration);
        await this.blurAnimation.play({ timeMultiplier });
    }

    private createBlurAnimation() {
        const track = new Track<number>(
            (blur) => (this._blurFactor.value = blur),
            (a, b, t) => a * (1 - t) + b * t,
        );

        track.addKeyframe(0, 0, Easing.EaseInOutQuad);
        track.addKeyframe(1, 0.4, Easing.EaseInOutQuad);

        const animation = createComponent(Animation);
        animation.addTrack(track);

        return animation;
    }

    dispose(): void {
        if (this.disposed) {
            return;
        }

        this._disposed = true;

        this.blurAnimation?.stop();
        deleteComponent(this.blurAnimation);
    }
}
