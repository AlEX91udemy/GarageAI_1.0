from pathlib import Path
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
for slug in ["toyota-corolla-cross","nissan-x-trail","bmw-3-series","lada-vesta","mazda-cx-5","tank-300"]:
 a=np.asarray(Image.open(ROOT/'public/images/mobile-cars/catalog/processed'/f'{slug}.png').convert('RGBA'))[:,:,3]
 print(slug)
 for y in range(220,341,10):
  print(y, ' '.join(f'{t}:{int((a[y]>=t).sum())}' for t in (24,64,128,200,250)))
