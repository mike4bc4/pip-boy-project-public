import { Color } from "../../../core/Color";
import { TextAlignment, TextBaseline, TextElement } from "../elements/text-element";

export function createLabel(
    options: {
        x?: number;
        y?: number;
        z?: number;
        width?: number;
        height?: number;
        fontSize?: number;
        align?: TextAlignment;
        baseline?: TextBaseline;
    } = {},
) {
    const {
        fontSize = 48,
        x = 0,
        y = 0,
        z = 0,
        width = 480,
        height = 48,
        align = "center",
        baseline = "middle",
    } = options;

    const label = new TextElement();
    label.fontSize = fontSize;
    label.color = Color.white;
    label.align = align;
    label.baseline = baseline;
    label.layout.set({ x: x, y: y, width: width, height: height });

    return label;
}
