import { attribute, mix, texture, uniform, vec3 } from "three/tsl";
import { MeshStandardNodeMaterial } from "three/webgpu";
import { AssetDatabase, TextureAsset } from "../../assets/asset-database";

interface Float3Like {
    x: number;
    y: number;
    z: number;
}

export interface PipBoyMainMaterial {
    labelColor: Float3Like;
    labelRoughness: number;
    labelMetalness: number;
}

export function createPipBoyMainMaterial(assetDatabase: AssetDatabase) {
    const [diffuseTexture, normalTexture, ormTexture, labelMaskTexture] = [
        assetDatabase.getAsset<TextureAsset>("/textures/pip_boy_main_d").texture,
        assetDatabase.getAsset<TextureAsset>("/textures/pip_boy_main_ngl").texture,
        assetDatabase.getAsset<TextureAsset>("/textures/pip_boy_main_orm").texture,
        assetDatabase.getAsset<TextureAsset>("/textures/pip_boy_labels_m").texture,
    ];

    const material = new MeshStandardNodeMaterial({
        map: diffuseTexture,
        normalMap: normalTexture,
        aoMap: ormTexture,
        roughnessMap: ormTexture,
        metalnessMap: ormTexture,
        roughness: 1.0,
        metalness: 1.0,
    });

    material.normalScale.set(1.0, -1.0);

    const labelColor = uniform(vec3(0.74, 0.58, 0.32));
    const labelRoughness = uniform(0.4);
    const labelMetalness = uniform(0.0);

    const uv2 = attribute("uv1");
    const maskTextureNode = texture(labelMaskTexture, uv2);

    const uv = attribute("uv");
    const diffuseTextureNode = texture(diffuseTexture, uv);
    const finalColor = mix(diffuseTextureNode, labelColor, maskTextureNode.r);

    const ormTextureNode = texture(ormTexture, uv);
    const finalORM = mix(ormTextureNode, vec3(ormTextureNode.r, labelRoughness, labelMetalness), maskTextureNode.r);

    material.colorNode = finalColor;
    material.aoNode = finalORM.r;
    material.roughnessNode = finalORM.g;
    material.metalnessNode = finalORM.b;

    Object.defineProperties(material, {
        labelColor: {
            get: () => labelColor.value,
            set: (value: Float3Like) => labelColor.value.set(value.x, value.y, value.z),
        },
        labelRoughness: {
            get: () => labelRoughness.value,
            set: (value) => (labelRoughness.value = value),
        },
        labelMetalness: {
            get: () => labelMetalness.value,
            set: (value) => (labelMetalness.value = value),
        },
    });

    return material as MeshStandardNodeMaterial & PipBoyMainMaterial;
}
