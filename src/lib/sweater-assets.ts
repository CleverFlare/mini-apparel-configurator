import {
  NoColorSpace,
  TextureLoader,
  type Material,
  type Mesh,
  type Object3D,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import sweaterUrl from "@/assets/sweater.glb?url";
import maskUrl from "@/assets/sweater_mask.png";
import { loadAsset } from "@/lib/asset-loader";

// Downloads start when this module is first imported, before React mounts.
// Both promises are stable, so components can suspend on them with `use`.

// The sweater model's objects and materials, keyed by name.
export const sweaterModel = loadAsset(sweaterUrl, "sweater.glb")
  .then((blob) => blob.arrayBuffer())
  .then((buffer) => new GLTFLoader().parseAsync(buffer, ""))
  .then((gltf) => {
    const nodes: Record<string, Object3D> = {};
    const materials: Record<string, Material> = {};
    gltf.scene.traverse((object) => {
      if (object.name) nodes[object.name] = object;
      const material = (object as Mesh).material;
      for (const entry of Array.isArray(material) ? material : [material]) {
        if (entry?.name) materials[entry.name] ??= entry;
      }
    });
    return { nodes, materials };
  });

// Zone mask: each channel marks a zone of the sweater's UV layout.
export const sweaterMask = loadAsset(maskUrl, "sweater_mask.png").then(
  async (blob) => {
    const url = URL.createObjectURL(blob);
    try {
      const texture = await new TextureLoader().loadAsync(url);
      // Match glTF UV conventions, and keep the mask as raw data.
      texture.flipY = false;
      texture.colorSpace = NoColorSpace;
      return texture;
    } finally {
      URL.revokeObjectURL(url);
    }
  },
);
