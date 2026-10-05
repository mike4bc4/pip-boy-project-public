import { AppError } from '../app-error';
import { Disposable } from "./disposable";

export interface Timer {
    readonly cancelled: boolean;
    cancel(): void;
}

class FrameSyncedTimer implements Timer {
    public callback: () => void;
    public time: number;
    public interval = -1;
    public onCancel: () => void;

    private _cancelled = false;

    get cancelled() {
        return this._cancelled;
    }

    cancel(): void {
        if (this._cancelled) {
            return;
        }

        this._cancelled = true;
        this.onCancel();
    }
}

export class TimerService implements Disposable {
    private frameSyncedTimers = new Set<FrameSyncedTimer>();
    private timers = new Set<number>();
    private _error: AppError | null = null;
    private _disposed = false;

    get disposed() {
        return this._disposed;
    }

    get error() {
        return this._error;
    }

    private constructor() {}

    static create() {
        return new TimerService();
    }

    timeout(callback: () => void, delay: number, frameSynced: boolean): Timer {
        if (this._disposed) {
            throw new AppError("Service was disposed, create new one.");
        }

        const safeDelay = Math.max(0.001, delay);

        if (frameSynced) {
            const timer = new FrameSyncedTimer();
            this.frameSyncedTimers.add(timer);

            timer.callback = callback;
            timer.time = safeDelay;
            timer.onCancel = () => this.frameSyncedTimers.delete(timer);

            return timer as Timer;
        }

        let timer: number | undefined = undefined;
        let cancelled = false;

        const onTimeout = () => {
            if (cancelled || this._disposed) {
                return;
            }

            try {
                callback();
            } catch (error) {
                this._error = new AppError("Timer callback failed.", { cause: error });
            } finally {
                // This is a one-shot timer, so no matter whether crashed or finished
                // successfully we want to remove it anyway.
                if (timer !== undefined) {
                    this.timers.delete(timer);
                }
            }
        };

        timer = setTimeout(onTimeout, safeDelay * 1000);
        this.timers.add(timer);

        return {
            get cancelled() {
                return cancelled;
            },
            cancel: () => {
                cancelled = true;
                clearTimeout(timer);
                this.timers.delete(timer);
            },
        };
    }

    interval(callback: () => void, delay: number, frameSynced: boolean): Timer {
        if (this._disposed) {
            throw new AppError("Service was disposed, create new one.");
        }

        const safeDelay = Math.max(0.001, delay);

        if (frameSynced) {
            const timer = new FrameSyncedTimer();
            this.frameSyncedTimers.add(timer);

            timer.callback = callback;
            timer.time = safeDelay;
            timer.interval = safeDelay;
            timer.onCancel = () => this.frameSyncedTimers.delete(timer);

            return timer as Timer;
        }

        let timer: number | undefined = undefined;
        let cancelled = false;

        const onTimeout = () => {
            if (cancelled || this._disposed) {
                return;
            }

            try {
                callback();

                if (timer !== undefined) {
                    this.timers.delete(timer);
                }

                // Don't know what happens in callback, so let's just guard
                // against cancellation and disposal.
                if (!cancelled && !this._disposed) {
                    timer = setTimeout(onTimeout, safeDelay * 1000);
                    this.timers.add(timer);
                }
            } catch (error) {
                if (timer !== undefined) {
                    this.timers.delete(timer);
                }

                this._error = new AppError("Timer callback failed.", { cause: error });
            }
        };

        timer = setTimeout(onTimeout, safeDelay * 1000);
        this.timers.add(timer);

        return {
            get cancelled() {
                return cancelled;
            },

            cancel: () => {
                cancelled = true;
                if (timer !== undefined) {
                    clearTimeout(timer);
                    this.timers.delete(timer);
                }
            },
        };
    }

    tick(deltaTime: number) {
        if (this._disposed) {
            return;
        }

        for (const timer of this.frameSyncedTimers) {
            timer.time -= deltaTime;

            if (timer.time > 0) {
                continue;
            }

            if (timer.interval < 0) {
                timer.cancel();
                timer.callback();
            } else {
                timer.callback();
                timer.time = timer.interval;
            }
        }
    }

    dispose() {
        if (this._disposed) {
            return;
        }

        this._disposed = true;

        for (const timer of this.frameSyncedTimers) {
            timer.cancel();
        }

        this.frameSyncedTimers.clear();

        for (const timer of this.timers) {
            clearTimeout(timer);
        }

        this.timers.clear();
    }
}
