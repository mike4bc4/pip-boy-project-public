import { texture, uniform } from "three/tsl";
import { MeshStandardNodeMaterial, Texture } from "three/webgpu";
import { AssetDatabase } from "../../assets/asset-database";

export interface PipBoyDisplayMaterial {
    emissiveIntensity: number;
}

export function createPipBoyDisplayMaterial(assetDatabase: AssetDatabase) {
    const [diffuseTexture, normalTexture, ormTexture, emissiveTexture] = [
        assetDatabase.getAsset<Texture>("/textures/pip_boy_display_d"),
        assetDatabase.getAsset<Texture>("/textures/pip_boy_display_ngl"),
        assetDatabase.getAsset<Texture>("/textures/pip_boy_display_orm"),
        assetDatabase.getAsset<Texture>("/textures/pip_boy_display_e"),
    ];

    const material = new MeshStandardNodeMaterial();
    material.normalScale.set(1.0, -1.0);

    const emissiveIntensity = uniform(5.0);

    material.colorNode = texture(diffuseTexture);
    material.normalMap = normalTexture;

    const ormTextureNode = texture(ormTexture);
    material.aoNode = ormTextureNode.r;
    material.roughnessNode = ormTextureNode.g;
    material.metalnessNode = ormTextureNode.b;

    material.emissiveNode = texture(emissiveTexture).rgb.mul(emissiveIntensity);

    Object.defineProperties(material, {
        emissiveIntensity: {
            get: () => emissiveIntensity.value,
            set: (value) => (emissiveIntensity.value = value),
        },
    });

    return material as MeshStandardNodeMaterial & PipBoyDisplayMaterial;
}
