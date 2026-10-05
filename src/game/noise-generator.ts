export class NoiseGenerator {
    private lerpFactor = 0;
    private currentRandom = 0;
    private nextRandom = Math.random();

    get value() {
        const t = this.easeInOutSine(this.lerpFactor);
        return this.currentRandom * (1 - t) + this.nextRandom * t;
    }

    constructor() {}

    step(deltaTime: number) {
        const safeDelta = Math.max(0, deltaTime);
        const currentNoise = this.value;

        this.lerpFactor += safeDelta;

        if (this.lerpFactor >= 1) {
            this.lerpFactor = 0;
            this.currentRandom = currentNoise;
            this.nextRandom = Math.random();
        }
    }

    private easeInOutSine(x: number): number {
        return -(Math.cos(Math.PI * x) - 1) / 2;
    }
}
