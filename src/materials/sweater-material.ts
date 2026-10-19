import { Color, type MeshPhysicalMaterial, type Texture } from "three";
import { MeshPhysicalNodeMaterial } from "three/webgpu";
import {
  exp,
  Fn,
  inverseSqrt,
  luminance,
  materialColor,
  max,
  output,
  saturate,
  texture,
  uniform,
  vec3,
  vec4,
} from "three/tsl";

// The GLB ships every material with an IOR of 1000, which turns the surface
// into a near-mirror and suppresses the diffuse color. Use a typical value.
const EXPORT_IOR_FIX = 1.5;

export type ZoneColors = {
  body: string;
  sleeves: string; // mask red
  hood: string; // mask green
  trim: string; // mask blue
};

// Tints the neutral base color texture per zone, and lifts unlit areas so dark
// fabric doesn't crush to black on the side facing away from the lights. The
// lift is stronger for darker colors, so light colors stay close to physically
// lit. Built on a copy so the cached GLTF material stays untouched. Returns
// the zone color uniforms too, so colors can change without a recompile.
export function createSweaterMaterial(
  source: MeshPhysicalMaterial,
  zoneMask: Texture,
  colors: ZoneColors,
  shadowLift: number,
) {
  // Same property copy three uses to convert classic materials to node
  // materials (NodeLibrary.fromMaterial), done on a clone for a fresh uuid.
  const material = Object.assign(
    new MeshPhysicalNodeMaterial(),
    source.clone(),
  );

  material.ior = EXPORT_IOR_FIX;
  // Soft fiber sheen keeps folds readable on dark colors.
  material.sheen = 1;
  material.sheenRoughness = 0.6;
  material.sheenColor = new Color("#5a5a5a");

  // Each mask channel marks a zone; pixels outside all three are the body.
  const zone = texture(zoneMask).rgb;
  const bodyWeight = saturate(zone.r.add(zone.g).add(zone.b).oneMinus());
  const zoneColors = {
    body: uniform(new Color(colors.body)),
    sleeves: uniform(new Color(colors.sleeves)),
    hood: uniform(new Color(colors.hood)),
    trim: uniform(new Color(colors.trim)),
  };
  const tint = zoneColors.body
    .mul(bodyWeight)
    .add(zoneColors.sleeves.mul(zone.r))
    .add(zoneColors.hood.mul(zone.g))
    .add(zoneColors.trim.mul(zone.b));
  material.colorNode = materialColor.mul(tint);

  // Soft floor applied to the lit color before tone mapping: near zero light
  // it approaches shadowFloor, in lit areas it fades out, and it never
  // reverses shading order.
  const albedo = materialColor.rgb.mul(tint);
  material.outputNode = Fn(() => {
    const albedoLuminance = max(luminance(albedo), 1e-3);
    const shadowFloor = max(
      albedo.mul(uniform(shadowLift)).mul(inverseSqrt(albedoLuminance)),
      vec3(1e-4),
    );
    const lit = output.rgb;
    return vec4(
      lit.add(shadowFloor.mul(exp(lit.negate().div(shadowFloor)))),
      output.a,
    );
  })();

  return { material, zoneColors };
}

// The zipper pull keeps its own textures and isn't tinted; only the export's
// IOR is fixed, on a copy so the cached GLTF material stays untouched.
export function createZipperPullMaterial(source: MeshPhysicalMaterial) {
  const material = source.clone();
  material.ior = EXPORT_IOR_FIX;
  return material;
}
