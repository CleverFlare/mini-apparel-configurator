import {
  NoColorSpace,
  type CompressedTexture,
  type Material,
  type Mesh,
  type Object3D,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";
import type { WebGPURenderer } from "three/webgpu";
import sweaterUrl from "@/assets/sweater.glb?url";
import maskUrl from "@/assets/sweater_mask.ktx2?url";
import { loadAsset } from "@/lib/asset-loader";

// Downloads start when this module is first imported, before React mounts.
// Both promises are stable, so components can suspend on them with `use`.

// The KTX2 textures are transcoded to whichever compressed format the GPU
// supports, which needs the initialized renderer; the canvas hands it over.
let provideRenderer!: (renderer: WebGPURenderer) => void;
const ktx2Loader = new Promise<WebGPURenderer>(
  (resolve) => (provideRenderer = resolve),
).then((renderer) =>
  new KTX2Loader()
    // Served from public/, so the loader can find both files by name.
    .setTranscoderPath(`${import.meta.env.BASE_URL}libs/basis/`)
    .detectSupport(renderer),
);

// Call once the renderer has finished `init()`.
export function setSweaterRenderer(renderer: WebGPURenderer) {
  provideRenderer(renderer);
}

// The sweater model's objects and materials, keyed by name.
export const sweaterModel = Promise.all([
  loadAsset(sweaterUrl, "sweater.glb").then((blob) => blob.arrayBuffer()),
  ktx2Loader,
])
  .then(([buffer, ktx2]) =>
    new GLTFLoader().setKTX2Loader(ktx2).parseAsync(buffer, ""),
  )
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

// Zone mask: each channel marks a zone of the sweater's UV layout. Encoded
// linear, and like the model's textures it keeps glTF's UV orientation.
export const sweaterMask = Promise.all([
  loadAsset(maskUrl, "sweater_mask.ktx2").then((blob) => blob.arrayBuffer()),
  ktx2Loader,
]).then(
  ([buffer, ktx2]) =>
    new Promise<CompressedTexture>((resolve, reject) =>
      ktx2.parse(
        buffer,
        (texture) => {
          // Raw data, not a color.
          texture.colorSpace = NoColorSpace;
          resolve(texture as CompressedTexture);
        },
        reject,
      ),
    ),
);
