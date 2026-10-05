import {
    abs,
    attribute,
    bool,
    clamp,
    cos,
    dFdx,
    dFdy,
    float,
    fract,
    fwidth,
    int,
    log2,
    max,
    maxMipLevel,
    mix,
    select,
    sin,
    smoothstep,
    texture,
    textureLevel,
    textureSize,
    time,
    uniform,
    vec2,
    vec3,
} from "three/tsl";
import * as THREE from "three/webgpu";
import { DisplayContentRenderer } from "../../display/display-content-renderer";
import { AssetDatabase } from "../../assets/asset-database";

export interface PipBoyMainDisplayMaterial {
    texture: THREE.Texture;
    blurFactor: number;
    uvOffset: { x: number; y: number };
    textureRepeat: boolean;
    placeholderTexture: THREE.DataTexture;
}

const HALF_PI = Math.PI / 2;

function createHorizontalWaveNode(
    uv: THREE.Node<"vec2">,
    { speed = 0.5, riseRatio = 0.8, waveWidth = 0.4, spacing = 2.0, powerFactor = 4.0 } = {},
) {
    const dist = uv.y.sub(time.mul(speed));
    const cellDist = fract(dist.div(spacing)).mul(spacing);
    const phase = cellDist.div(max(waveWidth, 0.0001));

    const r = float(riseRatio).saturate();
    const f = float(1.0).sub(r);

    const rise = sin(phase.div(r).mul(HALF_PI));
    const fall = cos(phase.sub(r).div(f).mul(HALF_PI));

    const lt = phase.lessThan(r).toFloat();
    const gt = float(1).sub(lt);
    const lto = phase.lessThan(1).toFloat();

    return rise.mul(lt).add(fall.mul(gt).mul(lto)).pow(powerFactor);
}

function createEmissiveNode(
    uv1: THREE.Node<"vec2">,
    blurFactor: THREE.UniformNode<"float", number>,
    uvOffset: THREE.UniformNode<"vec2", THREE.Vector2>,
    textureRepeat: THREE.UniformNode<"bool", boolean>,
) {
    const shiftedUv = uv1.add(uvOffset);
    const offsetUv1 = select(textureRepeat, fract(shiftedUv), shiftedUv);

    const data = new Uint8Array([0, 0, 0, 0]);
    const tex = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);

    // Placeholder texture has to use exactly the same settings
    // as actual canvas texture, otherwise mip generation and wrapping fails.
    DisplayContentRenderer.applyCanvasTextureSettings(tex);

    const displayTextureNode = texture(tex, offsetUv1);

    const textureSizeNode = textureSize(displayTextureNode, int(0)) as unknown as THREE.Node<"vec2">;
    const uvDDX = dFdx(uv1).mul(textureSizeNode);
    const uvDDY = dFdy(uv1).mul(textureSizeNode);

    const currentMip = log2(max(uvDDX.length(), uvDDY.length()));
    const maximumMip = maxMipLevel(displayTextureNode as unknown as THREE.Texture);
    const clampedCurrentMip = clamp(currentMip, 0, maximumMip);
    const targetMip = mix(clampedCurrentMip, maximumMip, blurFactor);

    const emissiveNode = textureLevel(displayTextureNode, offsetUv1, targetMip);

    return {
        displayTextureNode,
        emissiveNode,
        placeholderTexture: tex,
    };
}

function createStipesNode(uv1: THREE.Node<"vec2">, { count = 80, width = 0.5 } = {}) {
    const pattern = fract(uv1.y.mul(count)).sub(0.5);
    const aa = fwidth(uv1.y.mul(count));

    const halfWidth = float(width).mul(0.5);
    const dist = abs(pattern);

    return float(1.0).sub(smoothstep(halfWidth.sub(aa), halfWidth.add(aa), dist));
}

function postProcessEmissiveNode(
    emissiveNode: THREE.Node<"vec4">,
    uv1: THREE.Node<"vec2">,
    { stripeMultiplier = 0.8, waveOpacity = 0.02, stripeOpacity = 0.02 } = {},
) {
    const stripes = createStipesNode(uv1);
    const stripeFactor = mix(stripeMultiplier, 1, stripes);
    const wave = createHorizontalWaveNode(uv1);
    const darkenedEmissive = emissiveNode.mul(stripeFactor);
    const stripeBoostedEmissive = darkenedEmissive.add(stripes.mul(stripeOpacity));
    return stripeBoostedEmissive.add(wave.mul(waveOpacity));
}

export function createPipBoyMainDisplayMaterial(
    assetDatabase: AssetDatabase,
    { roughnessPower = 0.75, emissiveColor = { r: 0.1, g: 1.0, b: 0.05 } } = {},
) {
    const material = new THREE.MeshStandardNodeMaterial({ name: "main_display" });

    const blurFactor = uniform(0);
    const uvOffset = uniform(vec2(0, 0));
    const textureRepeat = uniform(bool(true));

    const uv0 = attribute<"vec2">("uv");
    const uv1 = attribute<"vec2">("uv1");

    const { displayTextureNode, emissiveNode, placeholderTexture } = createEmissiveNode(
        uv1,
        blurFactor,
        uvOffset,
        textureRepeat,
    );
    const { r, g, b } = emissiveColor;
    material.emissiveNode = postProcessEmissiveNode(emissiveNode, uv1).mul(vec3(r, g, b));

    material.colorNode = texture(assetDatabase.getAsset("/textures/pip_boy_display_d"), uv0);
    material.normalMap = assetDatabase.getAsset("/textures/pip_boy_display_ngl") as THREE.Texture;

    const ormNode = texture(assetDatabase.getAsset("/textures/pip_boy_display_orm"), uv0);
    material.aoNode = ormNode.r;
    material.roughnessNode = ormNode.g.pow(roughnessPower);
    material.metalnessNode = ormNode.b;

    Object.defineProperties(material, {
        texture: {
            get: (): THREE.Texture => displayTextureNode.value,
            set: (v: THREE.Texture) => (displayTextureNode.value = v),
            enumerable: true,
        },
        blurFactor: {
            get: (): number => blurFactor.value,
            set: (v: number) => (blurFactor.value = v),
            enumerable: true,
        },
        uvOffset: {
            get: (): { x: number; y: number } => ({ x: uvOffset.value.x, y: uvOffset.value.y }),
            set: (v: { x: number; y: number }) => uvOffset.value.set(v.x, v.y),
            enumerable: true,
        },
        textureRepeat: {
            get: () => textureRepeat.value,
            set: (v: boolean) => (textureRepeat.value = v),
            enumerable: true,
        },
        placeholderTexture: {
            get: () => placeholderTexture,
        },
    });

    return material as THREE.MeshStandardNodeMaterial & PipBoyMainDisplayMaterial;
}
