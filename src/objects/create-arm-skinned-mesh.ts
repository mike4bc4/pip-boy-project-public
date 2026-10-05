import { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AssetDatabase } from "../assets/asset-database";
import { createComponent } from "../core/ComponentRegistry";
import { createArmMaterial } from "../rendering/materials/create-arm-material";
import { SkinnedMeshObject } from "./skinned-mesh-object";
import { Object3D } from "three/webgpu";

export function createArmSkinnedMesh(assetDatabase: AssetDatabase) {
    const gltf = assetDatabase.getAsset<GLTF>("/models/arm");
    const material = createArmMaterial(assetDatabase);

    gltf.scene.traverse((object) => {
        if (object instanceof Object3D) {
            object.frustumCulled = false;
        }
    });

    const skinnedMesh = createComponent(SkinnedMeshObject, gltf.scene, gltf.animations);
    skinnedMesh.materialBinder.setMaterial("arm", material);

    return skinnedMesh;
}
