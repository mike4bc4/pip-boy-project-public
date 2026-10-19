import { MeshStandardNodeMaterial } from "three/webgpu";
import { AssetDatabase, TextureAsset } from "../../assets/asset-database";
import { float, normalMap, texture } from "three/tsl";

export function createHandMaterial(assetDatabase: AssetDatabase) {
    const diffuse = assetDatabase.getAsset<TextureAsset>("/textures/arm_d").texture;
    const normal = assetDatabase.getAsset<TextureAsset>("/textures/arm_ngl").texture;
    const orm = assetDatabase.getAsset<TextureAsset>("/textures/arm_orm").texture;

    const material = new MeshStandardNodeMaterial();
    material.map = diffuse;

    material.normalNode = normalMap(texture(normal), float(0.25));

    const ormNode = texture(orm);
    material.aoNode = ormNode.r;
    material.roughnessNode = ormNode.g;
    material.metalnessNode = ormNode.b;

    return material;
}
