import { Float2, Float2Like } from "./Float2";
import { Rect } from "./Rect";

export interface LayoutLike {
    x?: number;
    y?: number;
    z?: number;
    width?: number;
    height?: number;
    pivot?: Float2Like;
    scale?: Float2Like;
    offset?: Float2Like;
}

export class Layout {
    public x = 0;
    public y = 0;
    public z = 0;
    public width = 100;
    public height = 100;

    public readonly pivot = new Float2(0.5, 0.5);
    public readonly scale = new Float2(1, 1);
    public readonly offset = new Float2();

    get rect() {
        return new Rect(this.x, this.y, this.width, this.height);
    }

    get visualRect() {
        const pivotX = this.x + this.width * this.pivot.x;
        const pivotY = this.y + this.height * this.pivot.y;

        const x = pivotX + (this.x - pivotX) * this.scale.x + this.offset.x;
        const y = pivotY + (this.y - pivotY) * this.scale.y + this.offset.y;

        const width = this.width * this.scale.x;
        const height = this.height * this.scale.y;

        return new Rect(x, y, width, height);
    }

    snapPivotTo(layout: Layout) {
        const targetPivotX = layout.x + layout.width * layout.pivot.x;
        const targetPivotY = layout.y + layout.height * layout.pivot.y;

        const pivotX = this.x + this.width * this.pivot.x;
        const pivotY = this.y + this.height * this.pivot.y;

        if (this.width !== 0) {
            this.pivot.x += (targetPivotX - pivotX) / this.width;
        }

        if (this.height !== 0) {
            this.pivot.y += (targetPivotY - pivotY) / this.height;
        }

        return this;
    }

    lerp(layout: Layout, t: number) {
        this.x = this.lerpFloat(this.x, layout.x, t);
        this.y = this.lerpFloat(this.y, layout.y, t);
        this.z = this.lerpFloat(this.z, layout.z, t);
        this.width = this.lerpFloat(this.width, layout.width, t);
        this.height = this.lerpFloat(this.height, layout.height, t);
        return this;
    }

    copy(layout: LayoutLike) {
        const {
            x = this.x,
            y = this.y,
            z = this.z,
            width = this.width,
            height = this.height,
            scale = this.scale,
            pivot = this.pivot,
            offset = this.offset,
        } = layout;

        this.x = x;
        this.y = y;
        this.z = z;
        this.width = width;
        this.height = height;
        this.scale.copy(scale);
        this.pivot.copy(pivot);
        this.offset.copy(offset);

        return this;
    }

    clone() {
        const transform = new Layout();
        transform.copy(this);
        return transform;
    }

    rescale(scale = { x: 1, y: 1 }, origin = { x: 0, y: 0 }) {
        this.x = origin.x + (this.x - origin.x) * scale.x;
        this.y = origin.y + (this.y - origin.y) * scale.y;
        this.width *= scale.x;
        this.height *= scale.y;

        return this;
    }

    set(options: LayoutLike = {}) {
        const {
            x = this.x,
            y = this.y,
            z = this.z,
            width = this.width,
            height = this.height,
            pivot = this.pivot,
            scale = this.scale,
            offset = this.offset,
        } = options;

        this.x = x;
        this.y = y;
        this.z = z;
        this.width = width;
        this.height = height;
        this.pivot.copy(pivot);
        this.scale.copy(scale);
        this.offset.copy(offset);

        return this;
    }

    private lerpFloat(a: number, b: number, t: number) {
        return a * (1 - t) + b * t;
    }
}
