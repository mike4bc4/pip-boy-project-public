export enum Easing {
    EaseInOutQuad = "EASE_IN_OUT_QUAD",
    Step = "STEP",
    Linear = "LINEAR",
    EaseInOutSine = "EASE_IN_OUT_SINE",
}

type Keyframe<T> = { value: T; easing: Easing };
export type TrackSetter<T> = (value: T) => void;
export type TrackInterpolator<T> = (a: T, b: T, t: number) => T;

export class Track<T> {
    private setter: TrackSetter<T>;
    private interpolator: TrackInterpolator<T>;
    private keyframes = new Map<number, Keyframe<T>>();
    private _failed = false;

    constructor(setter: TrackSetter<T>, interpolator: TrackInterpolator<T>) {
        this.setter = setter;
        this.interpolator = interpolator;
    }

    get length() {
        const keyframes = [...this.keyframes.entries()];
        if (keyframes.length < 2) {
            return 0;
        }

        return keyframes[keyframes.length - 1][0];
    }

    get failed() {
        return this._failed;
    }

    clearFailedFlag() {
        this._failed = false;
    }

    addKeyframe(time: number, value: T, easing: Easing) {
        this.keyframes.set(Math.max(0, time), { value, easing });
        this.sortKeyframes();
    }

    removeKeyframe(time: number) {
        this.keyframes.delete(time);
        this.sortKeyframes();
    }

    evaluate(time: number) {
        if (this._failed) {
            return false;
        }

        const keyframes = [...this.keyframes.entries()];
        if (keyframes.length === 0) {
            return false;
        }

        if (keyframes.length === 1) {
            this.setter(keyframes[0][1].value);
            return false;
        }

        let index = 0;
        while (index + 1 < keyframes.length && keyframes[index + 1][0] <= time) {
            index += 1;
        }

        const leftKeyframe = keyframes[index];
        const rightKeyframe = index + 1 < keyframes.length ? keyframes[index + 1] : null;

        if (!rightKeyframe) {
            this.setter(leftKeyframe[1].value);
            return false;
        }

        const t0 = leftKeyframe[0];
        const t1 = rightKeyframe[0];
        const normalizedTime = (time - t0) / (t1 - t0);

        const easing = leftKeyframe[1].easing ?? "linear";
        if (easing === Easing.EaseInOutQuad) {
            this.invokeSetter(
                this.invokeInterpolator(
                    leftKeyframe[1].value,
                    rightKeyframe[1].value,
                    this.easeInOutQuad(normalizedTime),
                ),
            );
        } else if (easing === Easing.Step) {
            this.invokeSetter(
                this.invokeInterpolator(leftKeyframe[1].value, rightKeyframe[1].value, normalizedTime < 1 ? 0 : 1),
            );
        } else if (easing === Easing.EaseInOutSine) {
            this.invokeSetter(
                this.invokeInterpolator(
                    leftKeyframe[1].value,
                    rightKeyframe[1].value,
                    this.easeInOutSine(normalizedTime),
                ),
            );
        } else {
            this.invokeSetter(this.invokeInterpolator(leftKeyframe[1].value, rightKeyframe[1].value, normalizedTime));
        }
    }

    private invokeSetter(v: T) {
        try {
            this.setter(v);
        } catch (error) {
            console.error("Failed to invoke setter.", error);
            this._failed = true;
        }
    }

    private invokeInterpolator(a: T, b: T, t: number): T {
        try {
            return this.interpolator(a, b, t);
        } catch (error) {
            console.error("Failed to invoke interpolator.", error);
            this._failed = true;
            return a;
        }
    }

    private easeInOutQuad(value: number) {
        return value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2;
    }

    private easeInOutSine(value: number) {
        return -(Math.cos(Math.PI * value) - 1) / 2;
    }

    private sortKeyframes() {
        const keyframes = [...this.keyframes.entries()].sort((a, b) => a[0] - b[0]);
        this.keyframes.clear();
        for (const [key, value] of keyframes) {
            this.keyframes.set(key, value);
        }
    }
}
