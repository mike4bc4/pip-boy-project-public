import { texture } from "three/tsl";
import { AssetDatabase, TextureAsset } from "../../assets/asset-database";
import { MeshStandardNodeMaterial } from "three/webgpu";

export function createArmMaterial(assetDatabase: AssetDatabase) {
    const [diffuseTexture, normalTexture, ormTexture] = [
        assetDatabase.getAsset<TextureAsset>("/textures/arm_d").texture,
        assetDatabase.getAsset<TextureAsset>("/textures/arm_ngl").texture,
        assetDatabase.getAsset<TextureAsset>("/textures/arm_orm").texture,
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
