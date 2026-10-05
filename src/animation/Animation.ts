import { Component } from "../core/ComponentRegistry";
import { Track } from "./track";

export type AnimationStatus = "stopped" | "finished";

type ResolveCallback = (status: AnimationStatus) => void;

export class Animation implements Component {
    public _enabled = false;

    private _time = 0;
    private tracks = new Set<Track<any>>();
    private timeMultiplier = 1;
    private resolve: ResolveCallback | null = null;
    private completionPromise: Promise<AnimationStatus> | null = null;
    private loop = false;

    get enabled() {
        return this._enabled;
    }

    set time(value) {
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

    update(deltaTime: number) {
        if (!this._enabled) {
            return;
        }

        this._time += deltaTime * this.timeMultiplier;

        const reachedEnd = this.timeMultiplier > 0 ? this._time >= this.length : this._time <= 0;

        if (reachedEnd && !this.loop) {
            this._time = this.timeMultiplier > 0 ? this.length : 0;
            this.evaluateTracks();
            this._enabled = false;
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
        this.tracks.add(track);
    }

    removeTrack<T>(track: Track<T>) {
        this.tracks.delete(track);
    }

    stop() {
        this._enabled = false;
        this.resolve?.("stopped");
    }

    pause() {
        this._enabled = false;
    }

    async play({ timeMultiplier = 1, loop = false } = {}) {
        if (timeMultiplier === 0 || this.tracks.size === 0) {
            return Promise.resolve("finished" as AnimationStatus);
        }

        this.timeMultiplier = timeMultiplier;
        this.loop = loop;

        this._enabled = timeMultiplier != 0;
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
}
