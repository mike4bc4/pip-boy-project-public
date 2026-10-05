import { MaterialBinder } from "./material-binder";
import { Object3D } from "three/webgpu";

export class MeshObject {
    readonly root: Object3D;
    readonly materialBinder: MaterialBinder;

    constructor(root: Object3D) {
        this.root = root;
        this.materialBinder = new MaterialBinder(this.root);
    }

    get name() {
        return this.root.name;
    }

    set name(name: string) {
        this.root.name = name;
    }
}
