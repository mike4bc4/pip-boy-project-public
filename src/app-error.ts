export class AppError extends Error {
    constructor(message?: string, options?: ErrorOptions) {
        super(message, options);
    }
}

export class ObjectDisposedError extends AppError {
    constructor(message = "Object has been disposed.") {
        super(message);
    }
}
