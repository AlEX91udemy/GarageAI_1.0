from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
for slug in ["toyota-corolla-cross", "nissan-x-trail", "bmw-3-series", "lada-vesta", "mazda-cx-5", "tank-300"]:
    a = np.asarray(Image.open(ROOT / "public/images/mobile-cars/catalog/processed" / f"{slug}.png").convert("RGBA"))[:, :, 3]
    print(slug)
    for y,x in [(40,350),(50,350),(60,300),(80,300),(100,300),(120,300),(140,100),(200,100),(280,100),(300,200),(320,350),(300,350)]:
        print((x,y), int(a[y,x]), end='; ')
    print()
