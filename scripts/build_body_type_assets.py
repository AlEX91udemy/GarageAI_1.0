"""Build project-local body-type cards from the user's blue/grey reference sheets."""

from pathlib import Path
import colorsys
import shutil

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/images/body-types"
OUT.mkdir(parents=True, exist_ok=True)

SHEETS = {
    "black": Path(r"C:/Users/user/AppData/Local/Temp/codex-clipboard-42866e76-62f1-456e-b5fd-3f19aa1aef8c.png"),
    "blue": Path(r"C:/Users/user/AppData/Local/Temp/codex-clipboard-e46b02e6-2597-4183-8b40-529047c4a2f9.png"),
    "green": Path(r"C:/Users/user/AppData/Local/Temp/codex-clipboard-b3b46b4c-9f40-42a6-8949-14f9c5629b5f.png"),
    "gold": Path(r"C:/Users/user/AppData/Local/Temp/codex-clipboard-cd85277f-1fbb-46ed-814b-443c885d000f.png"),
    "red": Path(r"C:/Users/user/AppData/Local/Temp/codex-clipboard-b84fca2e-7d4d-4f3b-86fb-e9572c2eb653.png"),
    "grey": Path(r"C:/Users/user/AppData/Local/Temp/codex-clipboard-59aa3288-69b9-4a62-b7ad-1590a2df38a9.png"),
    "white": Path(r"C:/Users/user/AppData/Local/Temp/codex-clipboard-ee0a1233-e2b9-4c22-a226-d47310880bec.png"),
    "silver": Path(r"C:/Users/user/AppData/Local/Temp/codex-clipboard-f9038ad0-58da-45c7-95e6-cee04c934819.png"),
}

types = [
    ("sedan", 0, 0),
    ("hatchback", 1, 0),
    ("wagon", 2, 0),
    ("suv", 3, 0),
    ("coupe", 0, 1),
    ("convertible", 1, 1),
    ("minivan", 2, 1),
    ("pickup", 3, 1),
    ("van", 0, 2),
    ("minibus", 1, 2),
    ("liftback", 2, 2),
    ("crossover-coupe", 3, 2),
]

# Tile coordinates for the 1536x1024 reference sheets. The crop stops above
# the Russian captions so the result is reusable as an in-app vehicle visual.
xs = [23, 401, 777, 1155]
ys = [136, 425, 709]
tile_w, tile_h = 360, 238
crop = (8, 22, 352, 232)

def recolor(image: Image.Image, target_hex: str) -> Image.Image:
    rgba = np.asarray(image.convert("RGBA")).copy()
    rgb = rgba[:, :, :3].astype(np.float32) / 255.0
    hsv = np.zeros_like(rgb)
    for y in range(rgb.shape[0]):
        for x in range(rgb.shape[1]):
            hsv[y, x] = colorsys.rgb_to_hsv(*rgb[y, x])

    candidate = (
        (hsv[:, :, 0] > 0.53)
        & (hsv[:, :, 0] < 0.70)
        & (hsv[:, :, 1] > 0.34)
        & (hsv[:, :, 2] > 0.24)
    )
    # Keep only the connected blue car region; dark background compression
    # noise can otherwise be mistaken for painted panels.
    seen = np.zeros(candidate.shape, dtype=bool)
    regions = []
    h, w = candidate.shape
    for sy, sx in zip(*np.where(candidate)):
        if seen[sy, sx]:
            continue
        stack, region = [(int(sy), int(sx))], []
        seen[sy, sx] = True
        while stack:
            cy, cx = stack.pop(); region.append((cy, cx))
            for ny in range(max(0, cy - 1), min(h, cy + 2)):
                for nx in range(max(0, cx - 1), min(w, cx + 2)):
                    if candidate[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True; stack.append((ny, nx))
        regions.append(region)
    blue_body = np.zeros(candidate.shape, dtype=bool)
    if regions:
        for y, x in max(regions, key=len):
            blue_body[y, x] = True
    target = np.array([int(target_hex[i:i+2], 16) for i in (1, 3, 5)], dtype=np.float32) / 255.0
    value = hsv[:, :, 2][blue_body]
    # Preserve the source's highlights and panel shading while changing hue.
    scale = np.clip(0.35 + value * 0.82, 0.2, 1.0)[:, None]
    rgba[:, :, :3][blue_body] = np.clip(target[None, :] * scale * 255, 0, 255).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")

for name, source in SHEETS.items():
    if not source.exists():
        raise FileNotFoundError(source)
    shutil.copy2(source, OUT / f"source-{name}.png")

for color, source in SHEETS.items():
    sheet = Image.open(source).convert("RGB")
    color_dir = OUT / color
    color_dir.mkdir(exist_ok=True)
    for slug, col, row in types:
        x, y = xs[col], ys[row]
        tile = sheet.crop((x + crop[0], y + crop[1], x + crop[2], y + crop[3]))
        tile.save(color_dir / f"{slug}.png", optimize=True)
