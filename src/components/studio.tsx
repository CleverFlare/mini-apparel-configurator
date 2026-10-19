import { Suspense, useEffect, useMemo, type ReactNode } from "react";
import { useThree } from "@react-three/fiber";
import { Center } from "@react-three/drei";
import {
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Scene,
  type Vector3Tuple,
} from "three";
import {
  PMREMGenerator,
  ShadowNodeMaterial,
  type WebGPURenderer,
} from "three/webgpu";

// Softbox panels as [position, [width, height], intensity], each facing the
// origin: a large overhead key, a softer front fill, rim lights for edge
// separation, then a back fill and floor bounce.
const SOFTBOXES: [Vector3Tuple, [number, number], number][] = [
  [[0, 5, 1], [8, 6], 5],
  [[0, 1, 6], [8, 3], 1.2],
  [[-5, 2, -3], [2, 6], 1.5],
  [[5, 2, -3], [2, 6], 1.5],
  [[0, 1, -6], [8, 4], 1.2],
  [[0, -4, 0], [8, 8], 0.6],
];

// Prefilters the softbox scene into the environment map. drei's Environment
// renders into a WebGL-only cube target, which WebGPURenderer ignores.
function StudioEnvironment() {
  const gl = useThree((state) => state.gl) as unknown as WebGPURenderer;
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    const geometry = new PlaneGeometry();
    const softboxes = new Scene();
    for (const [position, [width, height], intensity] of SOFTBOXES) {
      const material = new MeshBasicMaterial({
        side: DoubleSide,
        toneMapped: false,
      });
      material.color.multiplyScalar(intensity);
      const panel = new Mesh(geometry, material);
      panel.position.set(...position);
      panel.scale.set(width, height, 1);
      panel.lookAt(0, 0, 0);
      softboxes.add(panel);
    }

    const pmrem = new PMREMGenerator(gl);
    const target = pmrem.fromScene(softboxes);
    scene.environment = target.texture;

    return () => {
      scene.environment = null;
      target.dispose();
      pmrem.dispose();
      geometry.dispose();
      softboxes.traverse((object) => {
        if (object instanceof Mesh) object.material.dispose();
      });
    };
  }, [gl, scene]);

  return null;
}

// Studio built locally, so nothing is fetched from a CDN. The hemisphere
// light and the softbox back fill and floor bounce lift shadowed areas so dark
// colors keep their shape from every angle. Children are centered above a
// floor that only shows their shadow; meshes need castShadow.
export function Studio({ children }: { children: ReactNode }) {
  // drei's ContactShadows relies on ShaderMaterial, which WebGPURenderer
  // can't compile, so the floor is a transparent shadow catcher instead.
  const shadowCatcher = useMemo(
    () => new ShadowNodeMaterial({ opacity: 0.5 }),
    [],
  );

  return (
    <>
      <hemisphereLight args={["#ffffff", "#d8d8d8", 0.6]} />
      <directionalLight position={[2, 5, 4]} intensity={1.5} />
      {/* Shadow only: straight down and adding no light, so the floor gets a
          soft contact shadow under the model. */}
      <directionalLight
        position={[0, 5, 0]}
        intensity={0}
        castShadow
        shadow-mapSize={[512, 512]}
        shadow-radius={20}
        shadow-blurSamples={25}
        shadow-bias={-0.001}
      />
      <StudioEnvironment />
      <Suspense fallback={null}>
        <Center>{children}</Center>
        <mesh
          position={[0, -1.15, 0]}
          rotation-x={-Math.PI / 2}
          receiveShadow
          material={shadowCatcher}
        >
          <planeGeometry args={[10, 10]} />
        </mesh>
      </Suspense>
    </>
  );
}
