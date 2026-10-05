import {
    attribute,
    cameraPosition,
    equirectUV,
    positionWorld,
    uniform,
    vec3,
    normalWorld,
    pow,
    mix,
    texture,
    clamp,
    dot,
    sub,
    reflect,
    negate,
    maxMipLevel,
} from "three/tsl";
import { FrontSide, MeshBasicNodeMaterial, Texture } from "three/webgpu";
import { AssetDatabase } from "../../assets/asset-database";

interface Float3Like {
    x: number;
    y: number;
    z: number;
}

export interface PipBoyGlassMaterial {
    baseColor: Float3Like;
    dirtColor: Float3Like;
    dirtAlpha: number;
    reflectionBias: number;
    reflectionValue: number;
    reflectionRoughness: number;
    fresnelPower: number;
    baseAlpha: number;
    baseAlphaFactor: number;
}

export function createPipBoyGlassMaterial(assetDatabase: AssetDatabase) {
    const [reflectionTexture, dirtMask] = [
        assetDatabase.getAsset<Texture>("/textures/background"),
        assetDatabase.getAsset<Texture>("/textures/glass_m"),
    ];

    const baseColor = uniform(vec3(0.15, 0.18, 0.2));
    const dirtColor = uniform(vec3(0.04, 0.03, 0.02));
    const dirtAlpha = uniform(1.0);
    const reflectionBias = uniform(0.5);
    const reflectionValue = uniform(0.4);
    const reflectionRoughness = uniform(0.2);
    const fresnelPower = uniform(3.0);
    const baseAlpha = uniform(0.3);
    const baseAlphaFactor = uniform(0.5);

    const material = new MeshBasicNodeMaterial();
    material.transparent = true;
    material.depthWrite = false;
    material.side = FrontSide;

    const viewDir = cameraPosition.sub(positionWorld).normalize();
    const normalWS = normalWorld.normalize();
    const reflectionDir = reflect(negate(viewDir), normalWS);
    const uv = equirectUV(reflectionDir);

    const reflectionTextureNode = texture(reflectionTexture, uv);
    const reflectionMip = reflectionRoughness.mul(maxMipLevel(reflectionTextureNode as unknown as Texture));
    const reflectionColor = reflectionTextureNode.level(reflectionMip).mul(reflectionValue);

    const normalWSDotViewDir = clamp(dot(normalWS, viewDir), 0.0, 1.0);
    const fresnel = sub(1.0, pow(normalWSDotViewDir, fresnelPower));

    const reflected = mix(baseColor, reflectionColor, reflectionBias);
    const preMaskAlpha = mix(fresnel, baseAlpha, baseAlphaFactor);

    const dirtMaskTextureNode = texture(dirtMask, attribute("uv")).r;
    material.colorNode = mix(reflected, dirtColor, dirtMaskTextureNode);
    material.opacityNode = mix(preMaskAlpha, dirtAlpha, dirtMaskTextureNode);

    Object.defineProperties(material, {
        baseColor: {
            get: () => baseColor.value,
            set: (value: Float3Like) => baseColor.value.set(value.x, value.y, value.z),
        },
        dirtColor: {
            get: () => dirtColor.value,
            set: (value: Float3Like) => dirtColor.value.set(value.x, value.y, value.z),
        },
        dirtAlpha: {
            get: () => dirtAlpha.value,
            set: (value) => (dirtAlpha.value = value),
        },
        reflectionBias: {
            get: () => reflectionBias.value,
            set: (value) => (reflectionBias.value = value),
        },
        reflectionValue: {
            get: () => reflectionValue.value,
            set: (value) => (reflectionValue.value = value),
        },
        reflectionRoughness: {
            get: () => reflectionRoughness.value,
            set: (value) => (reflectionRoughness.value = value),
        },
        fresnelPower: {
            get: () => fresnelPower.value,
            set: (value) => (fresnelPower.value = value),
        },
        baseAlpha: {
            get: () => baseAlpha.value,
            set: (value) => (baseAlpha.value = value),
        },
        baseAlphaFactor: {
            get: () => baseAlphaFactor.value,
            set: (value) => (baseAlphaFactor.value = value),
        },
    });

    return material as MeshBasicNodeMaterial & PipBoyGlassMaterial;
}
