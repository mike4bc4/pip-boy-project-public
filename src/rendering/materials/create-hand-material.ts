import { MeshStandardNodeMaterial, Texture } from "three/webgpu";
import { AssetDatabase } from "../../assets/asset-database";
import { float, normalMap, texture } from "three/tsl";

export function createHandMaterial(assetDatabase: AssetDatabase) {
    const diffuse = assetDatabase.getAsset<Texture>("/textures/arm_d");
    const normal = assetDatabase.getAsset<Texture>("/textures/arm_ngl");
    const orm = assetDatabase.getAsset<Texture>("/textures/arm_orm");

    const material = new MeshStandardNodeMaterial();
    material.map = diffuse;

    material.normalNode = normalMap(texture(normal), float(0.25));

    const ormNode = texture(orm);
    material.aoNode = ormNode.r;
    material.roughnessNode = ormNode.g;
    material.metalnessNode = ormNode.b;

    return material;
}
