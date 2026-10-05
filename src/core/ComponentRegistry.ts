import { AppError } from "../app-error";

export interface Component {
    enabled: boolean;
    readonly disposed?: boolean;
    update?(deltaTime: number): void;
    dispose?(): void;
}

export function isComponent(obj: unknown): obj is Component {
    if (typeof obj !== "object" || obj === null) {
        return false;
    }

    const candidate = obj as Record<string, unknown>;

    return (
        typeof candidate.enabled === "boolean" &&
        (candidate.update === undefined || typeof candidate.update === "function") &&
        (candidate.dispose === undefined || typeof candidate.dispose === "function")
    );
}

type Constructor<T, Args extends unknown[] = any[]> = new (...args: Args) => T;

const componentRegistry = {
    components: new Set<Component>(),
};

export function createComponent<T, Args extends unknown[]>(Component: Constructor<T, Args>, ...args: Args): T {
    const component = new Component(...args);
    if (!isComponent(component)) {
        throw new AppError("Given type does not implement Component interface.");
    }

    componentRegistry.components.add(component as Component);
    return component;
}

export function deleteComponent(component: Component) {
    if (componentRegistry.components.has(component)) {
        componentRegistry.components.delete(component);
        component.dispose?.();
        return true;
    }

    return false;
}

export function updateComponents(deltaTime: number) {
    for (const component of componentRegistry.components) {
        if (component.enabled && !component.disposed) {
            component.update?.(deltaTime);
        }
    }
}

export function resetComponentRegistry() {
    const components = [...componentRegistry.components];
    componentRegistry.components.clear();

    for (const component of components) {
        try {
            component.dispose?.();
        } catch (error) {
            console.error("Failed to dispose component.", error);
        }
    }
}
