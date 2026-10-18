from pathlib import Path
import json
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / "public/images/mobile-cars/catalog/manifest.json").read_text(encoding="utf-8"))
for slug in ["toyota-corolla-cross", "nissan-x-trail", "bmw-3-series", "lada-vesta", "mazda-cx-5", "tank-300"]:
    img = np.asarray(Image.open(ROOT / "public/images/mobile-cars/catalog/processed" / f"{slug}.png").convert("RGBA"))
    a = img[:, :, 3]
    print("\n", slug)
    print("alpha", {v: int((a >= v).sum()) for v in [1, 24, 64, 128, 200, 250]})
    yx = np.argwhere(a > 24)
    print("bbox", tuple(yx.min(axis=0)[::-1]), tuple(yx.max(axis=0)[::-1]))
    # opaque span per row and occupancy; helps identify floor/stand artifacts.
    for y in range(0, 360, 20):
        xs = np.where(a[y] > 24)[0]
        if len(xs): print(f" row {y:3d}: {xs.min():3d}-{xs.max():3d} ({len(xs):3d})")
