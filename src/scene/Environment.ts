import { EquirectangularReflectionMapping, LinearSRGBColorSpace, Scene, Texture } from "three/webgpu";

export class Environment {
    private scene: Scene;
    private texture: Texture;

    constructor(scene: Scene, environmentTexture: Texture) {
        this.scene = scene;
        this.texture = environmentTexture;

        this.texture.mapping = EquirectangularReflectionMapping;
        this.texture.colorSpace = LinearSRGBColorSpace;

        this.scene.environment = this.texture;
        this.scene.environmentRotation.y = this.degToRad(210);

        this.intensity = 0.5;
    }

    get rotationY() {
        return this.scene.environmentRotation.y;
    }

    set rotationY(deg: number) {
        this.scene.environmentRotation.y = this.degToRad(deg);
    }

    get intensity() {
        return this.scene.environmentIntensity;
    }

    set intensity(value) {
        this.scene.environmentIntensity = value;
    }

    private degToRad(deg: number) {
        return (Math.PI * deg) / 180;
    }
}
