import * as THREE from "three/webgpu";
import { SkinnedMeshObject } from "../objects/skinned-mesh-object";
import { MeshObject } from "../objects/mesh-object";

export type GameObject = THREE.Object3D | SkinnedMeshObject | MeshObject;