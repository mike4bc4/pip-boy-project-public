import { texture } from "three/tsl";
import { AssetDatabase } from "../../assets/asset-database";
import { MeshStandardNodeMaterial, Texture } from "three/webgpu";

export function createArmMaterial(assetDatabase: AssetDatabase) {
    const [diffuseTexture, normalTexture, ormTexture] = [
        assetDatabase.getAsset<Texture>("/textures/arm_d"),
        assetDatabase.getAsset<Texture>("/textures/arm_ngl"),
        assetDatabase.getAsset<Texture>("/textures/arm_orm"),
    ];

    const material = new MeshStandardNodeMaterial();
    material.map = diffuseTexture;
    material.normalMap = normalTexture;

    const ormTextureNode = texture(ormTexture);
    material.aoNode = ormTextureNode.r;
    material.roughnessNode = ormTextureNode.g;
    material.metalnessNode = ormTextureNode.b;

    return material;
}
