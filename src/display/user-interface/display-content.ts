import { DrawContext, VisualElement } from "./elements/visual-element";

export class DisplayContent {
    public width = 100;
    public height = 200;

    private rootElements = new Set<VisualElement>();

    constructor({ width = 100, height = 200 } = {}) {
        this.width = width;
        this.height = height;
    }

    getElementsByName(name: string) {
        let match: VisualElement[] = [];

        const elements = this.getElements();
        for (const element of elements) {
            if (element.name === name) {
                match.push(element);
            }
        }

        return match;
    }

    add(...elements: VisualElement[]) {
        for (const element of elements) {
            this.rootElements.add(element);
        }
    }

    remove(...elements: VisualElement[]) {
        for (const element of elements) {
            this.rootElements.delete(element);
        }
    }

    draw(context: CanvasRenderingContext2D) {
        context.fillStyle = "#000000FF";
        context.fillRect(0, 0, this.width, this.height);

        const drawContexts: DrawContext[] = [];
        for (const element of this.getElements()) {
            if (element.visible) {
                drawContexts.push(element.prepare(context));
            }
        }

        drawContexts.sort((a, b) => a.element.layout.z - b.element.layout.z);
        for (const ctx of drawContexts) {
            ctx.draw();
        }
    }

    getElements() {
        const elements = new Set<VisualElement>();
        const getElementsRecursive = (elementArray: VisualElement[]) => {
            for (const element of elementArray) {
                elements.add(element);
                if (element.childElements) {
                    getElementsRecursive(element.childElements);
                }
            }
        };

        getElementsRecursive([...this.rootElements]);

        return [...elements.values()];
    }

    getInteractiveElementAt(x: number, y: number) {
        let sortedElements = this.getElements()
            .filter((element) => element.pointerEvents.interactive)
            .sort((a, b) => b.layout.z - a.layout.z);

        for (const element of sortedElements) {
            if (element.layout.rect.containsPoint(x, y)) {
                return element;
            }
        }

        return null;
    }
}
