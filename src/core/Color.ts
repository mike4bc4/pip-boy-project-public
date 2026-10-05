import { AppError } from '../app-error';

export interface ColorMultiplyOptions {
    color?: Color;
    scalar?: number;
}

export interface ColorLike {
    r: number;
    g: number;
    b: number;
    a: number;
}

export class Color {
    private _r = 0;
    private _g = 0;
    private _b = 0;
    private _a = 1;

    constructor(r = 0, g = 0, b = 0, a = 1) {
        this.set({ r: r, g: g, b: b, a: a });
    }

    set r(value: number) {
        this._r = this.clamp(value);
    }

    get r() {
        return this._r;
    }

    set g(value: number) {
        this._g = this.clamp(value);
    }

    get g() {
        return this._g;
    }

    set b(value: number) {
        this._b = this.clamp(value);
    }

    get b() {
        return this._b;
    }

    set a(value: number) {
        this._a = this.clamp(value);
    }

    get a() {
        return this._a;
    }

    static get transparent() {
        return new Color(0, 0, 0, 0);
    }

    static get black() {
        return new Color(0, 0, 0);
    }

    static get white() {
        return new Color(1, 1, 1);
    }

    static createFromHexString(hexString: string) {
        const color = new Color();
        color.fromHexString(hexString);
        return color;
    }

    static create({ r = 0, g = 0, b = 0, a = 1 } = {}) {
        const color = new Color();
        color.set({ r: r, g: g, b: b, a: a });
        return color;
    }

    copy(color: ColorLike) {
        this.r = color.r;
        this.g = color.g;
        this.b = color.b;
        this.a = color.a;
        return this;
    }

    fromHexString(hexString: string) {
        let cleanHex = hexString.replace(/^#/, "");

        if (cleanHex.length === 6) {
            cleanHex += "ff";
        }

        if (cleanHex.length !== 8) {
            throw new AppError("Invalid HEX color format.");
        }

        const num = parseInt(cleanHex, 16);

        this.r = ((num >> 24) & 255) / 255;
        this.g = ((num >> 16) & 255) / 255;
        this.b = ((num >> 8) & 255) / 255;
        this.a = (num & 255) / 255;

        return this;
    }

    toHexString() {
        const toHex = (value: number) =>
            Math.round(value * 255)
                .toString(16)
                .padStart(2, "0");
        return `#${toHex(this.r)}${toHex(this.g)}${toHex(this.b)}${toHex(this.a)}`;
    }

    set({ r = 0, g = 0, b = 0, a = 1 } = {}) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;

        return this;
    }

    add(color: Color) {
        this.r += color.r;
        this.g += color.g;
        this.b += color.b;
        this.a += color.a;

        return this;
    }

    sub(color: Color) {
        this.r -= color.r;
        this.g -= color.g;
        this.b -= color.b;
        this.a -= color.a;

        return this;
    }

    mul(options: ColorMultiplyOptions = {}) {
        const { color, scalar } = options;
        if (color) {
            this.r *= color.r;
            this.g *= color.g;
            this.b *= color.b;
            this.a *= color.a;
        } else if (scalar !== undefined) {
            this.r *= scalar;
            this.g *= scalar;
            this.b *= scalar;
            this.a *= scalar;
        }

        return this;
    }

    clone() {
        return new Color(this.r, this.g, this.b, this.a);
    }

    lerp(value: ColorLike, t: number) {
        this.r = this.r * (1 - t) + value.r * t;
        this.g = this.g * (1 - t) + value.g * t;
        this.b = this.b * (1 - t) + value.b * t;
        this.a = this.a * (1 - t) + value.a * t;
        return this;
    }

    private clamp(value: number) {
        return Math.max(0, Math.min(1, value));
    }
}
