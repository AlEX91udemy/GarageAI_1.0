from pathlib import Path
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
points={
"toyota-corolla-cross":[(300,90),(350,95),(420,100),(480,110),(300,130),(430,140),(250,145),(350,170),(500,180)],
"nissan-x-trail":[(300,100),(350,100),(400,110),(450,120),(300,130),(430,145),(200,160),(400,190)],
"bmw-3-series":[(300,70),(350,70),(430,80),(480,100),(280,110),(400,120),(200,145),(400,180)],
"lada-vesta":[(270,120),(330,115),(400,120),(460,130),(250,145),(350,155),(450,160),(250,190)],
"mazda-cx-5":[(300,110),(350,105),(400,115),(450,130),(250,145),(380,150),(430,180),(200,180)],
"tank-300":[(220,125),(280,125),(340,125),(400,130),(450,140),(250,150),(380,170),(430,190)],
}
for slug, pts in points.items():
 a=np.asarray(Image.open(ROOT/'public/images/mobile-cars/catalog/processed'/f'{slug}.png').convert('RGBA'))
 print('\n'+slug)
 for x,y in pts:
  r,g,b,al=a[y,x]; mx=max(int(r),int(g),int(b)); mn=min(int(r),int(g),int(b)); lum=0.2126*r+0.7152*g+0.0722*b
  print((x,y), (int(r),int(g),int(b),int(al)), 'lum',round(float(lum)), 'sat',round((mx-mn)/max(mx,1),2))
