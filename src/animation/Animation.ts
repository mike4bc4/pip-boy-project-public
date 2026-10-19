import { Component } from "../core/ComponentRegistry";
import { throwIfDisposed } from "../core/disposable";
import { Track } from "./track";

export type AnimationStatus = "stopped" | "finished";

type ResolveCallback = (status: AnimationStatus) => void;

export class Animation implements Component {
    public enabled = false;

    private _time = 0;
    private tracks = new Set<Track<any>>();
    private timeMultiplier = 1;
    private resolve: ResolveCallback | null = null;
    private completionPromise: Promise<AnimationStatus> | null = null;
    private loop = false;
    private _disposed = false;

    get disposed() {
        return this._disposed;
    }

    set time(value) {
        this.throwIfDisposed();

        this._time = Math.min(Math.max(0, value), this.length);
        if (this.tracks.size > 0) {
            this.evaluateTracks();
        }
    }

    get time() {
        return this._time;
    }

    get length() {
        const tracks = [...this.tracks.values()];
        if (tracks.length === 0) {
            return 0;
        }

        let length = 0;
        for (const track of tracks) {
            const trackLength = track.length;
            if (trackLength > length) {
                length = trackLength;
            }
        }

        return length;
    }

    constructor() {
        Object.assign(this, { throwIfDisposed });
    }

    declare private throwIfDisposed: typeof throwIfDisposed;

    update(deltaTime: number) {
        if (!this.enabled) {
            return;
        }

        this._time += deltaTime * this.timeMultiplier;

        const reachedEnd = this.timeMultiplier > 0 ? this._time >= this.length : this._time <= 0;

        if (reachedEnd && !this.loop) {
            this._time = this.timeMultiplier > 0 ? this.length : 0;
            this.evaluateTracks();
            this.enabled = false;
            this.resolve?.("finished");
            return;
        }

        this.evaluateTracks();

        if (this.loop) {
            if (this.timeMultiplier > 0 && this._time >= this.length) {
                this.time = 0;
            } else if (this.timeMultiplier < 0 && this._time <= 0) {
                this.time = this.length;
            }
        }
    }

    addTrack<T>(track: Track<T>) {
        this.throwIfDisposed();

        this.tracks.add(track);
    }

    removeTrack<T>(track: Track<T>) {
        this.tracks.delete(track);
    }

    stop() {
        this.enabled = false;
        this.resolve?.("stopped");
    }

    pause() {
        this.enabled = false;
    }

    async play({ timeMultiplier = 1, loop = false } = {}) {
        this.throwIfDisposed();

        if (timeMultiplier === 0 || this.tracks.size === 0) {
            return Promise.resolve("finished" as AnimationStatus);
        }

        this.timeMultiplier = timeMultiplier;
        this.loop = loop;

        this.enabled = timeMultiplier != 0;
        if (this.completionPromise) {
            return this.completionPromise;
        }

        this.completionPromise = new Promise((resolve) => {
            this.resolve = (status) => {
                this.completionPromise = null;
                this.resolve = null;
                resolve(status);
            };
        });

        return this.completionPromise;
    }

    private evaluateTracks() {
        const tracks = [...this.tracks.values()];
        for (const track of tracks) {
            track.evaluate(this._time);
        }
    }

    dispose() {
        if (this.disposed) {
            return;
        }

        this._disposed = true;

        this.stop();
        this.tracks.clear();
    }
}
