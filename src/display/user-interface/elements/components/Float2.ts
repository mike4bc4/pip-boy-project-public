export interface Float2Like {
    x: number;
    y: number;
}

export class Float2 {
    public x = 0;
    public y = 0;

    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    clone() {
        return new Float2(this.x, this.y);
    }

    copy(float2: Float2Like) {
        this.x = float2.x;
        this.y = float2.y;
        return this;
    }

    lerp(value: Float2Like, t: number) {
        this.x = this.x * (1 - t) + value.x * t;
        this.y = this.y * (1 - t) + value.y * t;
        return this;
    }
}
