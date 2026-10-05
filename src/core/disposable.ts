export interface Disposable {
    readonly disposed: boolean;
    dispose(): void;
}
