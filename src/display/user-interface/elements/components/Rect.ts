export interface RectLike {
    x: number;
    y: number;
    width: number;
    height: number;
}

export class Rect {
    public x = 0;
    public y = 0;
    public width = 100;
    public height = 100;

    constructor(x = 0, y = 0, width = 100, height = 100) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    set(options: { x?: number; y?: number; width?: number; height?: number } = {}) {
        const { x = this.x, y = this.y, width = this.width, height = this.height } = options;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        return this;
    }

    copy(rect: RectLike) {
        this.x = rect.x;
        this.y = rect.y;
        this.width = rect.width;
        this.height = rect.height;
        return this;
    }

    clone() {
        return new Rect(this.x, this.y, this.width, this.height);
    }

    containsPoint(x: number, y: number) {
        return x >= this.x && x <= this.x + this.width && y >= this.y && y <= this.y + this.height;
    }

    overlaps(rect: RectLike): boolean {
        return (
            this.x < rect.x + rect.width &&
            this.x + this.width > rect.x &&
            this.y < rect.y + rect.height &&
            this.y + this.height > rect.y
        );
    }
}
