from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts'/'threshold-overlays'; OUT.mkdir(parents=True,exist_ok=True)
for slug in ['toyota-corolla-cross','nissan-x-trail','bmw-3-series','lada-vesta','mazda-cx-5','tank-300']:
 im=Image.open(ROOT/'public/images/mobile-cars/catalog/processed'/f'{slug}.png').convert('RGBA')
 a=np.asarray(im)[:,:,3]
 canvas=Image.new('RGB',(640*3,360),(235,235,235))
 for i,t in enumerate([24,128,200]):
  m=Image.new('RGBA',im.size,(210,30,30,0)); m.putalpha(Image.fromarray(np.where(a>=t,255,0).astype('uint8')))
  bg=Image.new('RGBA',im.size,(235,235,235,255)); bg.alpha_composite(m)
  d=ImageDraw.Draw(bg); d.rectangle((0,0,140,24),fill=(20,24,32)); d.text((5,5),f'{slug} a>={t}',fill='white')
  canvas.paste(bg.convert('RGB'),(i*640,0))
 canvas.save(OUT/f'{slug}.jpg',quality=92)
