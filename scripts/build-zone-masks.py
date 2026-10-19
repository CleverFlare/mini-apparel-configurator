"""Splits each *_region.png in src/assets/layers into one alpha mask per zone.

Region images use the zone mask's channel coding (red sleeves, green hood,
blue trim, black body; white is the zipper, which belongs to no zone). CSS
mask-image can't select a color, so each zone gets its own white image whose
alpha is that zone's coverage, antialiased edges included.

Usage: python3 scripts/build-zone-masks.py
"""

from pathlib import Path

import numpy as np
from PIL import Image

LAYERS = Path(__file__).resolve().parent.parent / "src" / "assets" / "layers"
OUT = LAYERS / "masks"


def zone_weights(rgba: np.ndarray) -> dict[str, np.ndarray]:
    r, g, b, a = (rgba[..., i].astype(np.float32) / 255 for i in range(4))
    weights = {
        "body": 1 - np.maximum(np.maximum(r, g), b),
        "sleeves": r - np.maximum(g, b),
        "hood": g - np.maximum(r, b),
        "trim": b - np.maximum(r, g),
    }
    return {zone: np.clip(w, 0, 1) * a for zone, w in weights.items()}


def main() -> None:
    OUT.mkdir(exist_ok=True)
    for region in sorted(LAYERS.glob("*_region.png")):
        angle = region.name.removesuffix("_region.png")
        rgba = np.asarray(Image.open(region).convert("RGBA"))
        for zone, weight in zone_weights(rgba).items():
            mask = np.zeros(rgba.shape, dtype=np.uint8)
            mask[..., :3] = 255
            mask[..., 3] = np.round(weight * 255).astype(np.uint8)
            path = OUT / f"{angle}_{zone}.png"
            Image.fromarray(mask, "RGBA").save(path, optimize=True)
            print(path.relative_to(LAYERS.parent.parent.parent))


if __name__ == "__main__":
    main()
