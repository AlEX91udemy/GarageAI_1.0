from pathlib import Path
from collections import deque
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
SLUGS=['toyota-corolla-cross','nissan-x-trail','bmw-3-series','lada-vesta','mazda-cx-5','tank-300']
def comps(binary):
 h,w=binary.shape; seen=np.zeros_like(binary,bool); out=[]
 for y,x in zip(*np.where(binary)):
  if seen[y,x]: continue
  q=deque([(int(y),int(x))]); seen[y,x]=1; pts=[]
  while q:
   cy,cx=q.popleft(); pts.append((cy,cx))
   for ny in range(max(0,cy-1),min(h,cy+2)):
    for nx in range(max(0,cx-1),min(w,cx+2)):
     if binary[ny,nx] and not seen[ny,nx]: seen[ny,nx]=1;q.append((ny,nx))
  p=np.array(pts); yy,xx=p[:,0],p[:,1]; out.append((len(pts),(xx.min(),yy.min(),xx.max()+1,yy.max()+1)))
 return sorted(out,reverse=True)
for slug in SLUGS:
 im=np.asarray(Image.open(ROOT/'public/images/mobile-cars/catalog/processed'/f'{slug}.png').convert('RGBA')).astype(float)
 a=im[:,:,3]>24; rgb=im[:,:,:3]; lum=rgb@np.array([.2126,.7152,.0722]);
 ys,xs=np.where(a); top,left=ys.min(),xs.min(); bottom,right=ys.max(),xs.max(); w=right-left; h=bottom-top
 region=a.copy(); region[:int(top+.08*h)]=0; region[int(top+.60*h):]=0; region[:,:int(left+.20*w)]=0; region[:,int(left+.88*w):]=0
 for name, cand in [('dark',lum<120),('verydark',lum<80),('bluegray',(lum<190)&(rgb[:,:,2]>rgb[:,:,0]*.9)),('lowSatDark',(lum<160)&((rgb.max(2)-rgb.min(2))<55))]:
  b=region&cand; cs=[x for x in comps(b) if x[0]>=40]
  print(slug,name,cs[:10])
 print('wheels', [(name, [x for x in comps(a & (lum < th)) if x[0] >= 40][:12]) for name, th in [('dark', 80), ('mid', 120)]])
