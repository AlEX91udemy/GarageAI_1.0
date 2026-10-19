from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "artifacts" / "alpha-overlay"
OUT.mkdir(parents=True, exist_ok=True)
for slug in ["toyota-corolla-cross", "nissan-x-trail", "bmw-3-series", "lada-vesta", "mazda-cx-5", "tank-300"]:
    image = Image.open(ROOT / "public/images/mobile-cars/catalog/processed" / f"{slug}.png").convert("RGBA")
    alpha = np.asarray(image)[:, :, 3]
    alpha = np.where(alpha > 40, alpha, 0).astype(np.uint8)
    overlay = Image.new("RGBA", image.size, (220, 38, 38, 0))
    overlay.putalpha(Image.fromarray(alpha, mode="L"))
    result = Image.new("RGBA", image.size, (235, 235, 235, 255))
    result.alpha_composite(image)
    result.alpha_composite(overlay)
    result.convert("RGB").save(OUT / f"{slug}.jpg", quality=92)
