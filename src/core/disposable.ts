import { ObjectDisposedError } from "../app-error";

export interface Disposable {
    readonly disposed: boolean;
    dispose(): void;
}

export function throwIfDisposed(this: Disposable) {
    if (this.disposed) {
        throw new ObjectDisposedError();
    }
}
