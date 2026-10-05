import { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { AssetDatabase } from "../assets/asset-database";
import { createPBRMaterial } from "../rendering/materials/create-pbr-material";
import { createPipBoyDisplayMaterial } from "../rendering/materials/create-pip-boy-display-material";
import { createPipBoyGlassMaterial } from "../rendering/materials/create-pip-boy-glass-material";
import { createPipBoyMainDisplayMaterial } from "../rendering/materials/createPipBoyMainDisplayMaterial";
import { createPipBoyMainMaterial } from "../rendering/materials/create-pip-boy-main-material";
import { createPipBoyPartsMaterial } from "../rendering/materials/create-pip-boy-parts-material";
import { MeshObject } from "./mesh-object";

export function createPipBoyMesh(assetDatabase: AssetDatabase) {
    const gltf = assetDatabase.getAsset<GLTF>("/models/pip_boy");
    const pipBoyMeshObject = new MeshObject(gltf.scene);

    // --- main material
    pipBoyMeshObject.materialBinder.setMaterial("main_body", createPipBoyMainMaterial(assetDatabase));

    // --- secondary material
    const secondaryMaterial = createPBRMaterial(
        assetDatabase,
        "/textures/pip_boy_secondary_d",
        "/textures/pip_boy_secondary_ngl",
        "/textures/pip_boy_secondary_orm",
    );

    const secondaryNames = ["main_body_interior", "main_body_radiator", "latch_piece"];

    for (const secondaryName of secondaryNames) {
        pipBoyMeshObject.materialBinder.setMaterial(secondaryName, secondaryMaterial);
    }

    // --- parts material
    const partsMaterial = createPipBoyPartsMaterial(assetDatabase);
    partsMaterial.name = "parts-material";

    const partNames = [
        "main_body_parts",
        "latch_piece_parts",
        "ap_hand",
        "corrugated_knob",
        "large_corrugated_knob",
        "octal_knob",
        "octal_knob2",
        "power_button",
        "rads_hand",
        "rear_button",
        "selection_knob",
        "spot_button",
        "top_button",
    ];

    for (const partName of partNames) {
        pipBoyMeshObject.materialBinder.setMaterial(partName, partsMaterial);
    }

    pipBoyMeshObject.materialBinder.setMaterial("glass", createPipBoyGlassMaterial(assetDatabase));
    pipBoyMeshObject.materialBinder.setMaterial("small_displays", createPipBoyDisplayMaterial(assetDatabase));
    pipBoyMeshObject.materialBinder.setMaterial("main_display", createPipBoyMainDisplayMaterial(assetDatabase));

    return pipBoyMeshObject;
}
