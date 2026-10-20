import { use, useEffect, useMemo, useState, type CSSProperties } from "react";
import { addAfterEffect, Canvas, useThree } from "@react-three/fiber";
import {
  MathUtils,
  NeutralToneMapping,
  type PerspectiveCamera,
  type Mesh,
  type MeshPhysicalMaterial,
} from "three";
import { WebGPURenderer } from "three/webgpu";
import { OrbitControls } from "@react-three/drei";
import signature from "@/assets/my-signature.svg";
import { Studio } from "@/components/studio";
import { ConfiguratorPanel } from "@/components/configurator-panel";
import { InstallPrompt } from "@/components/install-prompt";
import { LoadingOverlay } from "@/components/loading-overlay";
import {
  setSweaterRenderer,
  sweaterMask,
  sweaterModel,
} from "@/lib/sweater-assets";
import { firstFrameRendered, shadersProgress } from "@/lib/load-stages";
import type { Zone } from "@/lib/parts";
import {
  createSweaterMaterial,
  createZipperPullMaterial,
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
  trim: "#000000",
};

function Sweater({ colors }: { colors: ZoneColors }) {
  const { nodes, materials } = use(sweaterModel);
  const mask = use(sweaterMask);
  const invalidate = useThree((state) => state.invalidate);

  // Built once with the defaults; color changes only update its uniforms.
  const { material, zoneColors } = useMemo(
    () =>
      createSweaterMaterial(
        materials.Sweater as MeshPhysicalMaterial,
        mask,
        DEFAULT_COLORS,
        SHADOW_LIFT,
      ),
    [materials, mask],
  );
  useEffect(() => {
    for (const zone of Object.keys(zoneColors) as Zone[]) {
      zoneColors[zone].value.set(colors[zone]);
    }
    // Uniforms change outside React's props, so request the frame.
    invalidate();
  }, [zoneColors, colors, invalidate]);
  const zipperPullMaterial = useMemo(
    () =>
      createZipperPullMaterial(materials.ZipperPull as MeshPhysicalMaterial),
    [materials],
  );
  const zipperPull = nodes.ZipperPull as Mesh;

  return (
    <group>
      <mesh
        geometry={(nodes.Sweater as Mesh).geometry}
        material={material}
        castShadow
      />
      <mesh
        geometry={zipperPull.geometry}
        material={zipperPullMaterial}
        position={zipperPull.position}
        quaternion={zipperPull.quaternion}
        scale={zipperPull.scale}
        castShadow
      />
    </group>
  );
}

// Mounted beside the model, so it runs once the model is in the scene:
// compiles every shader up front, reporting progress, then marks the first
// frame drawn after that, when the model is actually on screen.
function ReportSceneReady() {
  const gl = useThree((state) => state.gl) as unknown as WebGPURenderer;
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    let cancelled = false;
    let removeAfterEffect: (() => void) | undefined;
    void gl
      .compileAsync(scene, camera, null, (event) =>
        shadersProgress(event.loaded, event.total),
      )
      .then(() => {
        if (cancelled) return;
        removeAfterEffect = addAfterEffect(() => {
          firstFrameRendered();
          removeAfterEffect?.();
        });
        invalidate();
      });
    return () => {
      cancelled = true;
      removeAfterEffect?.();
    };
  }, [gl, scene, camera, invalidate]);

  return null;
}

// The garment is wide (arms out), so on a portrait view the camera's distance
// is set by width rather than height. Keeps the orbit direction.
const CAMERA_DISTANCE = 4.5;
const GARMENT_HALF_WIDTH = 1.75;

function FitCamera() {
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  const aspect = useThree((state) => state.size.width / state.size.height);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    const halfFov = MathUtils.degToRad(camera.fov / 2);
    const widthDistance = GARMENT_HALF_WIDTH / (Math.tan(halfFov) * aspect);
    camera.position.setLength(Math.max(CAMERA_DISTANCE, widthDistance));
    invalidate();
  }, [camera, aspect, invalidate]);

  return null;
}

function App() {
  const [colors, setColors] = useState(DEFAULT_COLORS);
  const [selectedZone, setSelectedZone] = useState<Zone>("body");
  // Collapsed height of the mobile sheet, kept clear below the viewport.
  const [sheetPeek, setSheetPeek] = useState(0);

  return (
    <div
      className="flex h-dvh w-full flex-col overflow-hidden bg-[radial-gradient(ellipse_at_center,#ffffff_0%,#f3f3f3_55%,#e2e2e2_100%)] pb-(--sheet-peek) md:flex-row md:pb-0"
      style={{ "--sheet-peek": `${sheetPeek}px` } as CSSProperties}
    >
      <main className="relative min-h-0 flex-1">
        <header className="pointer-events-none absolute top-0 left-0 z-10 flex flex-col gap-1.5 pt-[max(env(safe-area-inset-top),1.25rem)] pl-[max(env(safe-area-inset-left),1.25rem)] md:pt-8 md:pl-8">
          <p className="pl-[0.3em] text-[0.625rem] font-medium tracking-[0.25em] text-muted-foreground uppercase md:text-[0.6875rem]">
            Made by
          </p>
          {/* The signature is a mask over the text color, so it follows the
              theme and stays sharp at any size. Its width follows the
              viewport, and the height too, so it stays small on phones held
              sideways. */}
          <span
            role="img"
            aria-label="Muhammad Maher"
            className="aspect-[2504/520] w-[clamp(7rem,min(12vw,28vh),11.5rem)] bg-foreground/80 mask-contain mask-center mask-no-repeat"
            style={{ maskImage: `url(${signature})` }}
          />
        </header>
        <div className="absolute top-0 right-0 z-10 pt-[max(env(safe-area-inset-top),1.25rem)] pr-[max(env(safe-area-inset-right),1.25rem)] md:pt-8 md:pr-8">
          <InstallPrompt />
        </div>
        <Canvas
          camera={{ position: [0, 0.3, CAMERA_DISTANCE], fov: 45 }}
          // The scene only changes on orbit, color or resize, so frames render
          // on demand rather than 60 times a second.
          frameloop="demand"
          // Variance shadow maps, so the floor shadow can be blurred.
          shadows="variance"
          // WebGPU where available, otherwise its WebGL 2 backend; both run TSL.
          gl={async (props) => {
            const renderer = new WebGPURenderer(
              props as ConstructorParameters<typeof WebGPURenderer>[0],
            );
            await renderer.init();
            setSweaterRenderer(renderer);
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
            <Sweater colors={colors} />
            <ReportSceneReady />
          </Studio>
          <OrbitControls makeDefault target={[0, 0, 0]} />
          <FitCamera />
        </Canvas>
      </main>
      <ConfiguratorPanel
        colors={colors}
        selected={selectedZone}
        onSelect={setSelectedZone}
        onColorChange={(zone, color) =>
          setColors((current) => ({ ...current, [zone]: color }))
        }
        onReset={() => setColors(DEFAULT_COLORS)}
        onPeekChange={setSheetPeek}
      />
      <LoadingOverlay />
    </div>
  );
}

export default App;
