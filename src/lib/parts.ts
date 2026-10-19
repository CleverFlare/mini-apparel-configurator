import type { ZoneColors } from "@/materials/sweater-material";
import angleHighShade from "@/assets/layers/angle-high_shade.png";
import angleRightShade from "@/assets/layers/angle-right_shade.png";
import frontShade from "@/assets/layers/front_shade.png";
import angleHighHoodMask from "@/assets/layers/masks/angle-high_hood.png";
import angleRightSleevesMask from "@/assets/layers/masks/angle-right_sleeves.png";
import frontBodyMask from "@/assets/layers/masks/front_body.png";

export type Zone = keyof ZoneColors;

// The customizable parts, each shown from the angle that shows it best. Masks
// are generated from the *_region.png layers by scripts/build-zone-masks.py.
export const PARTS: {
  zone: Zone;
  label: string;
  shade: string;
  mask: string;
}[] = [
  { zone: "body", label: "Body", shade: frontShade, mask: frontBodyMask },
  {
    zone: "sleeves",
    label: "Sleeves",
    shade: angleRightShade,
    mask: angleRightSleevesMask,
  },
  {
    zone: "hood",
    label: "Hood",
    shade: angleHighShade,
    mask: angleHighHoodMask,
  },
];
