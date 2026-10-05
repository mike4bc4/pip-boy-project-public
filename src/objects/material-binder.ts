import * as THREE from "three/webgpu";
import { AppError } from '../app-error';

export class MaterialBinder {
    private root: THREE.Object3D;
    private bindings = new Map<string, THREE.Material>();

    constructor(root: THREE.Object3D) {
        this.root = root;
    }

    getByName(name: string) {
        const materials = [...this.bindings.values()];
        return materials.find((material) => material.name === name);
    }

    setMaterial(meshName: string, material: THREE.Material) {
        this.bindings.set(meshName, material);
        this.applyBinding(meshName, material);
    }

    applyAll() {
        for (const [meshName, material] of this.bindings) {
            this.applyBinding(meshName, material);
        }
    }

    private applyBinding(meshName: string, material: THREE.Material) {
        let found = false;

        this.root.traverse((object) => {
            if (!(object instanceof THREE.Mesh) || object.name !== meshName) {
                return;
            }

            object.material = material;
            found = true;
        });

        if (!found) {
            throw new AppError(`Unable to assign material to mesh named "${meshName}". Mesh not found.`);
        }
    }
}
