import { PointerEvents } from "./components/pointer-events";
import { Layout } from "./components/layout";

export interface DrawContext {
    element: VisualElement;
    draw: () => void;
}

export interface VisualElement {
    name: string;
    visible: boolean;

    readonly childElements?: VisualElement[];
    readonly disposed?: boolean;

    readonly pointerEvents: PointerEvents;
    readonly layout: Layout;

    prepare: (context: CanvasRenderingContext2D) => DrawContext;
    dispose?(): void;
}
