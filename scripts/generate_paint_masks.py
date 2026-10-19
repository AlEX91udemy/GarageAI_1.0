"""Generate conservative body-paint masks for the bundled catalog renders.

The masks are intentionally white only on painted body panels. Windows, wheels,
lights, grilles, chrome and the dark studio background remain black.
"""

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "images" / "mobile-cars"
TARGET = SOURCE / "masks"
TARGET.mkdir(parents=True, exist_ok=True)


def save_mask(name: str, body, cutouts) -> None:
    mask = Image.new("L", (1536, 1024), 0)
    draw = ImageDraw.Draw(mask)
    draw.polygon(body, fill=255)
    for shape, points in cutouts:
        getattr(draw, shape)(points, fill=0)
    mask.save(TARGET / f"{name}-body.png", optimize=True)


save_mask(
    "nissan-xtrail-t31",
    [
        (55, 305), (195, 235), (530, 205), (760, 200), (1010, 240),
        (1300, 315), (1480, 430), (1490, 675), (1405, 755),
        (1180, 765), (950, 720), (820, 655), (620, 700), (430, 715),
        (235, 775), (85, 710),
    ],
    [
        ("polygon", [(190, 300), (275, 245), (560, 235), (820, 240), (1065, 290),
                     (1120, 430), (950, 440), (760, 420), (560, 430), (305, 410)]),
        ("ellipse", (115, 610, 430, 900)),
        ("ellipse", (1040, 600, 1355, 900)),
        ("polygon", [(1130, 450), (1435, 455), (1480, 555), (1430, 620), (1130, 605)]),
        ("polygon", [(910, 630), (1480, 625), (1460, 730), (1190, 755), (960, 705)]),
    ],
)

save_mask(
    "toyota-corolla-cross",
    [
        (20, 300), (170, 225), (470, 180), (805, 195), (1110, 260),
        (1385, 360), (1510, 500), (1490, 735), (1300, 780),
        (1060, 735), (900, 650), (625, 690), (450, 735), (205, 765), (45, 680),
    ],
    [
        ("polygon", [(155, 285), (260, 225), (555, 220), (820, 235), (1070, 300),
                     (1120, 420), (880, 435), (650, 425), (390, 420), (180, 390)]),
        ("ellipse", (55, 610, 360, 900)),
        ("ellipse", (820, 595, 1130, 900)),
        ("polygon", [(1110, 455), (1470, 460), (1505, 585), (1430, 650), (1110, 620)]),
        ("polygon", [(950, 650), (1490, 650), (1470, 750), (1290, 775), (1030, 735)]),
    ],
)

save_mask(
    "bmw-3-series-f30",
    [
        (28, 330), (170, 260), (405, 190), (690, 175), (960, 215),
        (1210, 295), (1460, 420), (1515, 650), (1450, 755),
        (1220, 775), (1020, 735), (850, 650), (620, 685), (430, 735),
        (175, 735), (45, 650),
    ],
    [
        ("polygon", [(160, 315), (260, 250), (470, 215), (735, 215), (970, 250),
                     (1100, 350), (1070, 435), (810, 430), (570, 420), (330, 425), (180, 400)]),
        ("ellipse", (75, 600, 375, 895)),
        ("ellipse", (840, 585, 1150, 900)),
        ("polygon", [(1100, 430), (1450, 430), (1510, 545), (1440, 635), (1110, 610)]),
        ("polygon", [(980, 640), (1500, 635), (1480, 750), (1240, 780), (1040, 735)]),
    ],
)
