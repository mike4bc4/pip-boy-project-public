import { AppError, ObjectDisposedError } from "../app-error";
import { Disposable } from "./disposable";

type AnyCallable = (...args: any[]) => any;

export class Action<TArgs extends any[] = any[]> implements Disposable {
    private listeners = new Set<AnyCallable>();
    private _disposed = false;

    get disposed() {
        return this._disposed;
    }

    add(callback: (...args: TArgs) => void): () => void {
        if (this._disposed) {
            throw new ObjectDisposedError();
        }

        this.listeners.add(callback);
        return () => this.remove(callback);
    }

    remove(callback: AnyCallable): void {
        if (this._disposed) {
            return;
        }

        this.listeners.delete(callback);
    }

    invoke(...args: TArgs): void {
        if (this._disposed) {
            throw new ObjectDisposedError();
        }

        const listenersSnapshot = [...this.listeners];
        for (const callback of listenersSnapshot) {
            try {
                const result = callback(...args);
                if (result instanceof Promise) {
                    result.catch((reason) => {
                        throw new AppError("Failed to execute asynchronous action.", { cause: reason });
                    });
                }
            } catch (error) {
                throw new AppError("Failed to execute action.", { cause: error });
            }
        }
    }

    dispose() {
        if (this._disposed) {
            return;
        }

        this._disposed = true;
        this.listeners.clear();
    }
}
