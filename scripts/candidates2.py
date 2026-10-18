from PIL import Image
from pathlib import Path
import numpy as np
from generate_catalog_paint_masks import _edge_strength,_sample_bilinear
slugs=['toyota-corolla-cross','nissan-x-trail','bmw-3-series','lada-vesta','mazda-cx-5','tank-300']
for slug in slugs:
 a=np.array(Image.open(Path('../public/images/mobile-cars/catalog/processed')/(slug+'.png')).convert('RGBA')) if False else np.array(Image.open(Path('../public/images/mobile-cars/catalog/processed')/(slug+'.png')).convert('RGBA'))
 op=a[:,:,3]>24; ys,xs=np.where(op);t,l=ys.min(),xs.min();w=xs.max()-l;h=ys.max()-t; rgb=a[:,:,:3].astype(float);lum=(rgb@np.array([.2126,.7152,.0722]))/255; ed=_edge_strength(a)/255;ang=np.linspace(0,2*np.pi,64,endpoint=False);ps=[]
 for cx in np.arange(l+.08*w,l+.94*w,max(4,w/50)):
  for cy in np.arange(t+.60*h,t+.91*h,max(4,h/40)):
   for r in np.linspace(.045,.09,6)*w:
    xo=cx+r*np.cos(ang);yo=cy+r*1.2*np.sin(ang); ring=_sample_bilinear(ed,xo,yo); inn=_sample_bilinear(lum,cx+r*.65*np.cos(ang),cy+r*.65*1.2*np.sin(ang)); ao=_sample_bilinear(op.astype(float),xo,yo); ai=_sample_bilinear(op.astype(float),cx,cy)
    score=ring.mean()*70 + (1-ring.std())*20 + (1-_sample_bilinear(lum,xo,yo).mean())*30 + ao.mean()*20 + ai*10
    ps.append((float(score),cx,cy,r,float(ring.mean()),float(lum[round(cy),round(cx)])))
 ps.sort(reverse=True);sel=[]
 for p in ps:
  if any((p[1]-q[1])**2+(p[2]-q[2])**2 < (.18*w)**2 for q in sel): continue
  sel.append(p)
  if len(sel)>=5:break
 print('\n',slug,[(round(z,1),round(x,1),round(y,1),round(r,1),round(e,2),round(ll,2)) for z,x,y,r,e,ll in sel])
