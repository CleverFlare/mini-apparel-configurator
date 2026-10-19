import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Center,
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
  useGLTF,
} from "@react-three/drei";
import sweaterUrl from "@/assets/sweater.glb?url";

function Sweater() {
  const { scene } = useGLTF(sweaterUrl);
  return <primitive object={scene} />;
}

useGLTF.preload(sweaterUrl);

// Studio-style lighting built locally, so nothing is fetched from a CDN.
function Lighting() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 4, 5]} intensity={1.5} />
      <directionalLight position={[-4, 2, -3]} intensity={0.6} />
      <Environment resolution={256}>
        <Lightformer
          form="rect"
          intensity={2}
          position={[0, 3, 4]}
          scale={[6, 3, 1]}
        />
        <Lightformer
          form="rect"
          intensity={1}
          position={[-5, 1, 0]}
          rotation-y={Math.PI / 2}
          scale={[4, 4, 1]}
        />
        <Lightformer
          form="rect"
          intensity={1}
          position={[5, 1, 0]}
          rotation-y={-Math.PI / 2}
          scale={[4, 4, 1]}
        />
        <Lightformer
          form="ring"
          intensity={0.5}
          position={[0, 2, -5]}
          scale={3}
        />
      </Environment>
    </>
  );
}

function App() {
  return (
    <div className="relative h-dvh w-full bg-muted">
      <Canvas camera={{ position: [0, 0.3, 4.5], fov: 45 }}>
        <Lighting />
        <Suspense fallback={null}>
          <Center>
            <Sweater />
          </Center>
          <ContactShadows
            position={[0, -1.05, 0]}
            opacity={0.4}
            scale={6}
            blur={2.5}
            far={2}
          />
        </Suspense>
        <OrbitControls makeDefault target={[0, 0, 0]} />
      </Canvas>
    </div>
  );
}

export default App;
