import { Mesh } from "three/webgpu";
import { AssetDatabase } from "../assets/asset-database";
import { createArmMaterial } from "../rendering/materials/create-arm-material";
import { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { createComponent } from "../core/ComponentRegistry";
import { SkinnedMeshObject } from "./skinned-mesh-object";
import { createHandMaterial } from "../rendering/materials/create-hand-material";

export function createRightArm(assetDatabase: AssetDatabase) {
    const gltf = assetDatabase.getAsset<GLTF>("/models/right-arm");

    gltf.scene.traverse((object) => {
        if (object instanceof Mesh) {
            object.frustumCulled = false;
        }
    });

    const skinnedMesh = createComponent(SkinnedMeshObject, gltf.scene, gltf.animations);

    const armMaterial = createArmMaterial(assetDatabase);
    skinnedMesh.materialBinder.setMaterial("right-arm", armMaterial);

    const handMaterial = createHandMaterial(assetDatabase);
    skinnedMesh.materialBinder.setMaterial("right-hand", handMaterial);

    return skinnedMesh;
}
