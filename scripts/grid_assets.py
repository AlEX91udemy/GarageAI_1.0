from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "artifacts" / "grid-assets"
OUT.mkdir(parents=True, exist_ok=True)
for slug in ["toyota-corolla-cross", "nissan-x-trail", "bmw-3-series", "lada-vesta", "mazda-cx-5", "tank-300"]:
    image = Image.open(ROOT / "public/images/mobile-cars/catalog/processed" / f"{slug}.png").convert("RGBA")
    bg = Image.new("RGBA", image.size, (235,235,235,255)); bg.alpha_composite(image)
    draw = ImageDraw.Draw(bg)
    for x in range(0, 641, 40):
        draw.line((x,0,x,360), fill=(0,0,0,80), width=1)
        draw.text((x+2,2), str(x), fill=(0,0,0,255))
    for y in range(0, 361, 40):
        draw.line((0,y,640,y), fill=(0,0,0,80), width=1)
        draw.text((2,y+2), str(y), fill=(0,0,0,255))
    bg.convert("RGB").save(OUT / f"{slug}.jpg", quality=92)
