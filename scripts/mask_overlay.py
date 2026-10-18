from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[1]
for slug in ['toyota-corolla-cross','nissan-x-trail','bmw-3-series','lada-vesta','mazda-cx-5','tank-300']:
 im=Image.open(ROOT/'public/images/mobile-cars/catalog/processed'/f'{slug}.png').convert('RGBA')
 m=np.asarray(Image.open(ROOT/'public/images/mobile-cars/catalog/masks'/f'{slug}-body.png').convert('RGBA'))[:,:,3]
 bg=Image.new('RGBA',im.size,(235,235,235,255)); bg.alpha_composite(im)
 ov=Image.new('RGBA',im.size,(220,30,30,0)); ov.putalpha(Image.fromarray(np.where(m>24,150,0).astype('uint8'))); bg.alpha_composite(ov)
 bg.convert('RGB').save(ROOT/'artifacts'/f'{slug}-mask-over-original.jpg',quality=92)
