import { MeshStandardNodeMaterial } from "three/webgpu";
import { AssetDatabase, TextureAsset } from "../../assets/asset-database";

export function createPBRMaterial(assetDatabase: AssetDatabase, diffuseID: string, normalID: string, ormID: string) {
    const [diffuse, normal, orm] = [
        assetDatabase.getAsset<TextureAsset>(diffuseID).texture,
        assetDatabase.getAsset<TextureAsset>(normalID).texture,
        assetDatabase.getAsset<TextureAsset>(ormID).texture,
    ];

    const material = new MeshStandardNodeMaterial({
        map: diffuse,
        normalMap: normal,
        aoMap: orm,
        roughnessMap: orm,
        metalnessMap: orm,
        roughness: 1.0,
        metalness: 1.0,
    });

    material.normalScale.set(1, -1);

    return material;
}
