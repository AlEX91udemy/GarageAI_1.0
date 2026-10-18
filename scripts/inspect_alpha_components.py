from pathlib import Path
from collections import deque
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
for slug in ["toyota-corolla-cross", "nissan-x-trail", "bmw-3-series", "lada-vesta", "mazda-cx-5", "tank-300"]:
    alpha = np.asarray(Image.open(ROOT / "public/images/mobile-cars/catalog/processed" / f"{slug}.png").convert("RGBA"))[:, :, 3]
    binary = alpha > 24
    seen = np.zeros(binary.shape, dtype=bool)
    components = []
    h, w = binary.shape
    for y, x in zip(*np.where(binary)):
        if seen[y, x]:
            continue
        q = deque([(int(y), int(x))])
        seen[y, x] = True
        count = 0
        minx = miny = 10_000
        maxx = maxy = 0
        while q:
            cy, cx = q.popleft()
            count += 1
            minx, miny = min(minx, cx), min(miny, cy)
            maxx, maxy = max(maxx, cx), max(maxy, cy)
            for ny in range(max(0, cy - 1), min(h, cy + 2)):
                for nx in range(max(0, cx - 1), min(w, cx + 2)):
                    if binary[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        q.append((ny, nx))
        components.append((count, (minx, miny, maxx + 1, maxy + 1)))
    components.sort(reverse=True)
    print(slug, "opaque", int(binary.sum()), "components", components[:8])
