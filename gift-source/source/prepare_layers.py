#!/usr/bin/env python3
"""Create a first-pass, lossless pixel partition of the supplied gift PNG.

This deliberately does not invent hidden surfaces. Every source pixel is assigned
to exactly one transparent layer, so the closed reconstruction can be compared
against the original before any animation-specific repainting is attempted.
"""
from pathlib import Path
import base64, json
import numpy as np
from PIL import Image
import cv2

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / ".working"
SRC = WORK / "original.png.b64"
OUT = ROOT / "layers"
PREVIEW = ROOT / "preview"
OUT.mkdir(parents=True, exist_ok=True)
PREVIEW.mkdir(parents=True, exist_ok=True)

raw = base64.b64decode("".join(SRC.read_text().split()))
(WORK / "original.png").write_bytes(raw)
im = Image.open(WORK / "original.png").convert("RGBA")
a = np.array(im)
rgb = a[:, :, :3]
alpha = a[:, :, 3]
hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
h, s, v = cv2.split(hsv)
H, W = alpha.shape
yy, xx = np.mgrid[:H, :W]
visible = alpha > 0

# Broad hue classes; pixels outside these classes are retained in a residual
# layer, never discarded.
gold = visible & (h >= 8) & (h <= 48) & (s >= 65) & (v >= 90)
blue = visible & ((h >= 85) & (h <= 145)) & (s >= 45) & (v >= 45)

# Masks are intentionally mutually exclusive. Their union plus residual is
# the complete source alpha, preserving an exact closed-state reconstruction.
spec = {
    "sparkles": gold & (((xx < 255) | (xx > 980)) | (yy < 130) | (yy > 900)),
    "bow-left": gold & (yy < 440) & (xx < 640) & (xx > 250),
    "bow-right": gold & (yy < 445) & (xx >= 640) & (xx < 960),
    "bow-tails": gold & (yy >= 360) & (yy < 590) & (xx >= 250) & (xx < 980),
    "gold-ribbon-lid": gold & (yy >= 440) & (yy < 690) & (xx >= 250) & (xx < 980),
    "gold-ribbon-body": gold & (yy >= 650) & (xx >= 250) & (xx < 980),
    "lid-shell": blue & (yy < 700) & (xx >= 210) & (xx < 1020),
    "box-body": blue & (yy >= 620) & (xx >= 210) & (xx < 1020),
}
# Priority order ensures a pixel belongs to only one named layer.
assigned = np.zeros((H, W), bool)
layers = {}
for name, candidate in spec.items():
    mask = candidate & ~assigned
    assigned |= mask
    layers[name] = mask
residual = visible & ~assigned
layers["detail-residual"] = residual

for name, mask in layers.items():
    layer = np.zeros_like(a)
    layer[mask] = a[mask]
    Image.fromarray(layer, "RGBA").save(OUT / f"{name}.png", optimize=True)

# Lossless composite check: because source pixels are partitioned, this must
# reproduce every RGBA channel exactly.
merged = np.zeros_like(a)
for name in layers:
    part = np.array(Image.open(OUT / f"{name}.png").convert("RGBA"))
    take = part[:, :, 3] > 0
    merged[take] = part[take]
diff = np.abs(merged.astype(np.int16) - a.astype(np.int16))
max_diff = int(diff.max())
changed_pixels = int(np.any(diff != 0, axis=2).sum())
Image.fromarray(merged, "RGBA").save(PREVIEW / "closed-reconstruction.png", optimize=True)
Image.fromarray(a, "RGBA").save(PREVIEW / "original.png", optimize=True)
Image.fromarray(np.clip(diff[:, :, :3].max(axis=2) * 16, 0, 255).astype(np.uint8), "L").save(PREVIEW / "difference-amplified.png")
report = {
    "source": "Glossy Blue Gift with Golden Bow.png",
    "dimensions": [W, H],
    "source_sha_expected": "da2a0b1ccaadd33b7b3fc77d90c64c1090836d30",
    "layer_pixel_counts": {k: int(v.sum()) for k, v in layers.items()},
    "max_channel_difference": max_diff,
    "changed_pixels": changed_pixels,
    "note": "First-pass segmentation only. Hidden surfaces are not yet reconstructed; inspect masks before animation use."
}
(PREVIEW / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
print(json.dumps(report, indent=2))
if max_diff != 0 or changed_pixels != 0:
    raise SystemExit("Closed reconstruction is not pixel-identical")
