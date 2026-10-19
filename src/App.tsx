import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import {
  NeutralToneMapping,
  NoColorSpace,
  type Mesh,
  type MeshPhysicalMaterial,
} from "three";
import { WebGPURenderer } from "three/webgpu";
import { OrbitControls, useGLTF, useTexture } from "@react-three/drei";
import sweaterUrl from "@/assets/sweater.glb?url";
import maskUrl from "@/assets/sweater_mask.png";
import { Studio } from "@/components/studio";
import {
  createSweaterMaterial,
  type ZoneColors,
} from "@/materials/sweater-material";

// How much unlit areas are brightened. The lift is stronger for darker colors,
// so dark fabric doesn't crush to black on the side facing away from the
// lights, while light colors stay close to physically lit.
const SHADOW_LIFT = 0.35;

const DEFAULT_COLORS: ZoneColors = {
  body: "#323232",
  sleeves: "#838383",
  hood: "#919191",
  trim: "#616161",
};

function Sweater() {
  const { nodes, materials } = useGLTF(sweaterUrl);
  const mask = useTexture(maskUrl, (texture) => {
    // Match glTF UV conventions, and keep the mask as raw data.
    texture.flipY = false;
    texture.colorSpace = NoColorSpace;
  });

  const material = useMemo(
    () =>
      createSweaterMaterial(
        materials.Sweater as MeshPhysicalMaterial,
        mask,
        DEFAULT_COLORS,
        SHADOW_LIFT,
      ),
    [materials, mask],
  );

  return (
    <mesh
      geometry={(nodes.Sweater as Mesh).geometry}
      material={material}
      castShadow
    />
  );
}

useGLTF.preload(sweaterUrl);

function App() {
  return (
    <div className="relative h-dvh w-full bg-[radial-gradient(ellipse_at_center,#ffffff_0%,#f3f3f3_55%,#e2e2e2_100%)]">
      <Canvas
        camera={{ position: [0, 0.3, 4.5], fov: 45 }}
        // Variance shadow maps, so the floor shadow can be blurred.
        shadows="variance"
        // WebGPU where available, otherwise its WebGL 2 backend; both run TSL.
        gl={async (props) => {
          const renderer = new WebGPURenderer(
            props as ConstructorParameters<typeof WebGPURenderer>[0],
          );
          await renderer.init();
          return renderer;
        }}
        // Set after creation, since R3F applies its own tone mapping default
        // to renderers built by a factory.
        onCreated={({ gl }) => {
          gl.toneMapping = NeutralToneMapping;
          gl.toneMappingExposure = 1.2;
        }}
      >
        <Studio>
          <Sweater />
        </Studio>
        <OrbitControls makeDefault target={[0, 0, 0]} />
      </Canvas>
    </div>
  );
}

export default App;
