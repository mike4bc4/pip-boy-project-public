import { attribute, Fn, texture, uniform, vec3 } from "three/tsl";
import { AssetDatabase } from "../../assets/asset-database";
import { MeshStandardNodeMaterial, Node, Texture } from "three/webgpu";

export interface PipBoyPartsMaterial {
    emissiveIntensity: number;
    powerButtonIntensity: number;
    spotButtonIntensity: number;
}

const vertexColorWithFallback = Fn(({ geometry }) => {
    return geometry?.hasAttribute("color") ? (attribute("color", "vec3") as Node<"vec3">) : vec3(1.0, 1.0, 1.0);
});

export function createPipBoyPartsMaterial(assetDatabase: AssetDatabase) {
    const [diffuse, normal, orm, emissive] = [
        assetDatabase.getAsset<Texture>("/textures/pip_boy_parts_d"),
        assetDatabase.getAsset<Texture>("/textures/pip_boy_parts_ngl"),
        assetDatabase.getAsset<Texture>("/textures/pip_boy_parts_orm"),
        assetDatabase.getAsset<Texture>("/textures/pip_boy_parts_e"),
    ];

    const powerButton = uniform(1.0);
    const spotButton = uniform(1.0);
    const emissiveIntensity = uniform(5.0);

    const material = new MeshStandardNodeMaterial({
        map: diffuse,
        normalMap: normal,
        aoMap: orm,
        roughnessMap: orm,
        metalnessMap: orm,
        roughness: 1.0,
        metalness: 1.0,
    });

    material.normalScale.set(1.0, -1.0);

    const vertexColor = vertexColorWithFallback();
    const emissiveSample = texture(emissive);

    const powerMask = vertexColor.r.mul(powerButton);
    const spotMask = vertexColor.g.mul(spotButton);

    const emissiveMask = powerMask.add(spotMask).mul(emissiveIntensity);

    material.emissiveNode = emissiveSample.rgb.mul(emissiveMask);

    Object.defineProperties(material, {
        emissiveIntensity: {
            get: () => emissiveIntensity.value,
            set: (value) => (emissiveIntensity.value = value),
        },
        powerButtonIntensity: {
            get: () => powerButton.value,
            set: (value) => (powerButton.value = value),
        },
        spotButtonIntensity: {
            get: () => powerButton.value,
            set: (value) => (powerButton.value = value),
        },
    });

    return material as MeshStandardNodeMaterial & PipBoyPartsMaterial;
}
