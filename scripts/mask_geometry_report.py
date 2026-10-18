import json
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / "public/images/mobile-cars/catalog/manifest.json").read_text(encoding="utf-8"))
rows = []
for item in manifest:
    slug = item["slug"]
    image = np.asarray(Image.open(ROOT / "public" / item["src"].lstrip("/")).convert("RGBA"))
    mask = np.asarray(Image.open(ROOT / "public" / item["paintMaskSrc"].lstrip("/")).convert("RGBA"))
    object_alpha = image[:, :, 3] > 24
    paint_alpha = mask[:, :, 3] > 24
    outside = int(np.count_nonzero(paint_alpha & ~object_alpha))
    object_area = int(object_alpha.sum())
    paint_area = int(paint_alpha.sum())
    rows.append({
        "slug": slug,
        "object": object_area,
        "paint": paint_area,
        "outsideObject": outside,
        "outsidePctOfPaint": round(100 * outside / max(paint_area, 1), 2),
        "paintPctOfObject": round(100 * paint_area / max(object_area, 1), 2),
    })
print(json.dumps({"models": len(rows), "outsideTotal": sum(r["outsideObject"] for r in rows), "worstOutside": sorted(rows, key=lambda r: r["outsidePctOfPaint"], reverse=True)[:12], "worstCoverage": sorted(rows, key=lambda r: r["paintPctOfObject"])[:12]}, ensure_ascii=False, indent=2))
