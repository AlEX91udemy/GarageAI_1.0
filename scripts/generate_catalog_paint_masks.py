"""Create transparent normalized car images and body-paint masks.

This script is an asset build step. The browser only consumes the generated
PNG files and does not need rembg/OpenCV at runtime.
"""

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
try:
    from rembg import new_session, remove
except ModuleNotFoundError:
    new_session = None
    remove = None

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "public/images/mobile-cars/catalog/manifest.json"
PROCESSED = ROOT / "public/images/mobile-cars/catalog/processed"
MASKS = ROOT / "public/images/mobile-cars/catalog/masks"
WIDTH, HEIGHT = 640, 360
SESSION = new_session("u2netp") if new_session else None

# Image-specific structural annotations.  These are deliberately expressed in
# the normalized 640x360 coordinate space used by the browser.  The outline is
# the photographed vehicle only; holes are apertures/parts which must never be
# painted.  Keeping this data with the asset pipeline is important: a generic
# cabin polygon cannot describe perspective, three-quarter views, or a side
# profile without cutting through the roof, pillars, bumpers, or fenders.
#
# These annotations are not colour masks.  They define the semantic region of
# each photograph and are intersected with the foreground alpha at the end.
STRUCTURAL_PROFILES = {
    "toyota-corolla-cross": {
        "alpha_silhouette": True,
        "outline": [(76, 224), (78, 183), (90, 164), (126, 151), (181, 137),
                     (220, 105), (270, 77), (335, 65), (408, 69), (456, 91),
                     (492, 125), (529, 139), (551, 162), (558, 191),
                     (549, 225), (537, 239), (505, 241), (497, 217),
                     (484, 195), (463, 190), (443, 204), (435, 228),
                     (372, 231), (357, 220), (350, 199), (331, 193),
                     (314, 209), (308, 238), (269, 239), (248, 229),
                     (220, 230), (190, 239), (137, 239), (102, 235)],
        "holes": [
            {"kind": "polygon", "points": [(186, 132), (222, 101), (267, 79), (307, 77), (322, 126), (277, 139)]},
            {"kind": "polygon", "points": [(331, 79), (377, 78), (397, 89), (407, 139), (333, 139)]},
            {"kind": "polygon", "points": [(413, 88), (450, 99), (480, 130), (484, 141), (414, 139)]},
            {"kind": "ellipse", "box": (310, 190, 375, 276)},
            {"kind": "ellipse", "box": (493, 151, 556, 224)},
            {"kind": "polygon", "points": [(85, 166), (205, 159), (234, 188), (223, 212), (87, 215)]},
            {"kind": "polygon", "points": [(81, 220), (270, 220), (276, 248), (84, 247)]},
            {"kind": "polygon", "points": [(207, 154), (275, 151), (285, 166), (216, 176)]},
        ],
        "external": [
            {"kind": "polygon", "points": [(294, 28), (410, 28), (420, 67), (302, 69)]},
            {"kind": "polygon", "points": [(65, 270), (284, 270), (302, 320), (48, 320)]},
        ],
    },
    "nissan-x-trail": {
        "alpha_silhouette": True,
        "outline": [(96, 245), (98, 183), (111, 157), (150, 139), (205, 126),
                     (256, 98), (318, 80), (389, 77), (447, 96), (480, 119),
                     (516, 132), (535, 157), (538, 201), (527, 238),
                     (510, 254), (481, 252), (473, 224), (456, 201),
                     (432, 202), (414, 229), (411, 256), (280, 257),
                     (268, 224), (249, 202), (226, 204), (210, 231),
                     (206, 253), (143, 255)],
        "holes": [
            {"kind": "polygon", "points": [(210, 129), (257, 101), (316, 86), (345, 88), (365, 139), (218, 155)]},
            {"kind": "polygon", "points": [(371, 88), (408, 91), (438, 105), (455, 140), (373, 140)]},
            {"kind": "polygon", "points": [(463, 113), (487, 127), (508, 148), (511, 157), (465, 151)]},
            {"kind": "ellipse", "box": (199, 192, 272, 276)},
            {"kind": "ellipse", "box": (409, 192, 486, 276)},
            {"kind": "polygon", "points": [(111, 157), (210, 148), (243, 169), (246, 196), (105, 204)]},
            {"kind": "polygon", "points": [(101, 211), (235, 207), (255, 246), (104, 247)]},
            {"kind": "polygon", "points": [(87, 182), (111, 155), (126, 190), (111, 240), (94, 245)]},
        ],
        "external": [
            {"kind": "polygon", "points": [(72, 142), (101, 142), (105, 270), (72, 278)]},
            {"kind": "polygon", "points": [(391, 250), (550, 250), (550, 320), (382, 320)]},
        ],
    },
    "bmw-3-series": {
        "alpha_silhouette": True,
        "outline": [(91, 239), (94, 187), (111, 161), (159, 143), (221, 123),
                     (280, 83), (340, 62), (418, 64), (479, 79), (524, 103),
                     (550, 137), (556, 193), (544, 239), (522, 253),
                     (493, 250), (485, 222), (467, 199), (444, 202),
                     (426, 229), (422, 254), (282, 255), (272, 222),
                     (251, 199), (229, 202), (213, 229), (207, 252),
                     (136, 252)],
        "holes": [
            {"kind": "polygon", "points": [(216, 128), (264, 92), (316, 74), (347, 75), (360, 125), (226, 143)]},
            {"kind": "polygon", "points": [(370, 75), (412, 73), (449, 83), (474, 113), (478, 130), (371, 128)]},
            {"kind": "polygon", "points": [(481, 94), (513, 110), (533, 135), (534, 145), (485, 133)]},
            {"kind": "ellipse", "box": (201, 191, 275, 278)},
            {"kind": "ellipse", "box": (477, 181, 548, 260)},
            {"kind": "polygon", "points": [(99, 161), (190, 151), (222, 169), (216, 194), (96, 202)]},
            {"kind": "polygon", "points": [(94, 209), (232, 207), (260, 245), (94, 246)]},
            {"kind": "polygon", "points": [(225, 147), (295, 145), (300, 160), (232, 171)]},
        ],
        "external": [],
    },
    "lada-vesta": {
        "alpha_silhouette": True,
        "outline": [(97, 191), (102, 162), (122, 151), (173, 143), (220, 119),
                     (278, 101), (354, 100), (414, 108), (461, 128), (510, 139),
                     (532, 157), (535, 193), (523, 211), (488, 216),
                     (478, 195), (463, 184), (444, 185), (428, 200), (425, 215),
                     (228, 216), (221, 194), (207, 184), (188, 184), (174, 199),
                     (168, 215), (126, 213)],
        "holes": [
            {"kind": "polygon", "points": [(223, 117), (273, 104), (314, 104), (324, 142), (204, 143)]},
            {"kind": "polygon", "points": [(334, 104), (374, 106), (410, 113), (437, 137), (337, 141)]},
            {"kind": "polygon", "points": [(444, 120), (470, 130), (493, 143), (468, 144)]},
            {"kind": "ellipse", "box": (164, 174, 226, 224)},
            {"kind": "ellipse", "box": (424, 174, 487, 224)},
            {"kind": "polygon", "points": [(100, 158), (139, 151), (160, 167), (153, 183), (99, 184)]},
            {"kind": "polygon", "points": [(99, 187), (169, 188), (177, 210), (101, 209)]},
            {"kind": "polygon", "points": [(502, 143), (533, 154), (535, 178), (507, 174)]},
        ],
        "external": [],
    },
    "mazda-cx-5": {
        "alpha_silhouette": True,
        "outline": [(119, 235), (124, 193), (139, 174), (181, 158), (238, 145),
                     (282, 112), (337, 94), (402, 92), (454, 105), (493, 130),
                     (531, 143), (555, 171), (556, 216), (542, 242),
                     (517, 252), (495, 242), (488, 214), (472, 194),
                     (449, 195), (429, 220), (426, 247), (317, 250),
                     (307, 219), (288, 198), (266, 201), (248, 227), (242, 250),
                     (174, 250), (151, 240)],
        "holes": [
            {"kind": "polygon", "points": [(241, 145), (280, 115), (331, 99), (353, 101), (363, 145), (253, 158)]},
            {"kind": "polygon", "points": [(373, 99), (405, 99), (439, 109), (462, 133), (464, 146), (373, 145)]},
            {"kind": "polygon", "points": [(472, 118), (493, 132), (517, 149), (520, 157), (476, 151)]},
            {"kind": "ellipse", "box": (237, 188, 310, 275)},
            {"kind": "ellipse", "box": (478, 181, 548, 257)},
            {"kind": "polygon", "points": [(133, 172), (205, 158), (244, 171), (241, 195), (126, 202)]},
            {"kind": "polygon", "points": [(124, 207), (249, 207), (268, 246), (123, 244)]},
            {"kind": "polygon", "points": [(244, 150), (310, 148), (316, 161), (251, 176)]},
        ],
        "external": [],
    },
    "tank-300": {
        "alpha_silhouette": True,
        "outline": [(184, 236), (186, 161), (198, 132), (225, 113), (270, 106),
                     (321, 104), (365, 111), (399, 127), (428, 145), (455, 160),
                     (464, 195), (456, 229), (435, 244), (415, 244),
                     (409, 215), (395, 194), (376, 194), (361, 212), (358, 244),
                     (274, 244), (267, 214), (253, 193), (235, 194), (222, 213),
                     (218, 242)],
        "holes": [
            {"kind": "polygon", "points": [(205, 130), (231, 116), (267, 112), (281, 153), (207, 158)]},
            {"kind": "polygon", "points": [(292, 111), (325, 111), (355, 118), (380, 139), (383, 155), (292, 153)]},
            {"kind": "polygon", "points": [(391, 127), (416, 141), (439, 157), (442, 165), (396, 158)]},
            {"kind": "ellipse", "box": (213, 180, 278, 260)},
            {"kind": "ellipse", "box": (356, 179, 424, 253)},
            {"kind": "polygon", "points": [(407, 154), (455, 160), (462, 191), (425, 188)]},
            {"kind": "polygon", "points": [(186, 191), (224, 189), (235, 236), (187, 237)]},
        ],
        "external": [
            {"kind": "polygon", "points": [(445, 105), (570, 105), (570, 245), (452, 245)]},
            {"kind": "polygon", "points": [(90, 130), (185, 130), (185, 245), (90, 245)]},
        ],
    },
}


def fit_to_canvas(image):
    image.thumbnail((round(WIDTH * 0.9), round(HEIGHT * 0.86)), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    left = (WIDTH - image.width) // 2
    top = (HEIGHT - image.height) // 2
    canvas.alpha_composite(image, (left, top))
    return canvas


def _edge_strength(rgba):
    """Find structural edges without classifying body pixels by colour."""
    rgb = rgba[:, :, :3].astype(np.float32)
    luminance = rgb @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    dx = np.roll(luminance, -1, axis=1) - np.roll(luminance, 1, axis=1)
    dy = np.roll(luminance, -1, axis=0) - np.roll(luminance, 1, axis=0)
    return np.hypot(dx, dy)


def _sample_bilinear(array, xs, ys):
    xs = np.clip(xs, 0, array.shape[1] - 1)
    ys = np.clip(ys, 0, array.shape[0] - 1)
    x0, y0 = np.floor(xs).astype(int), np.floor(ys).astype(int)
    x1, y1 = np.minimum(x0 + 1, array.shape[1] - 1), np.minimum(y0 + 1, array.shape[0] - 1)
    wx, wy = xs - x0, ys - y0
    return (
        array[y0, x0] * (1 - wx) * (1 - wy)
        + array[y0, x1] * wx * (1 - wy)
        + array[y1, x0] * (1 - wx) * wy
        + array[y1, x1] * wx * wy
    )


def _connected_components(binary):
    """Return 8-connected regions without altering the input geometry.

    We deliberately do not dilate, blur or close these regions.  The regions
    are only used as semantic *seeds* for glass, tyres and grilles; modifying
    their geometry was the source of the old mask spilling into body panels.
    """
    height, width = binary.shape
    visited = np.zeros_like(binary, dtype=bool)
    components = []
    for y, x in np.argwhere(binary):
        if visited[y, x]:
            continue
        visited[y, x] = True
        stack = [(y, x)]
        pixels = []
        while stack:
            cy, cx = stack.pop()
            pixels.append((cy, cx))
            for ny in range(max(0, cy - 1), min(height, cy + 2)):
                for nx in range(max(0, cx - 1), min(width, cx + 2)):
                    if binary[ny, nx] and not visited[ny, nx]:
                        visited[ny, nx] = True
                        stack.append((ny, nx))
        points = np.asarray(pixels, dtype=np.int16)
        ys, xs = points[:, 0], points[:, 1]
        components.append((points, xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    return components


def _semantic_non_body_regions(rgba, opaque, left, top, car_width, car_height, body_type):
    """Identify coherent non-painted vehicle parts from their structure.

    The painted body is never selected by its original hue, saturation or
    brightness.  We start with the whole foreground silhouette and subtract
    only sizeable, enclosed regions which have the geometry of glazing, tyres
    or a grille.  This makes a grey roof or pillar stay in the body mask: it
    is not a closed glass/wheel/grille region.
    """
    # The vehicle foreground itself is the semantic seed.  There is no colour
    # or luminance classifier here: a grey/blue/white roof, pillar or panel is
    # therefore always part of the same painted-body region.
    protected = Image.new("L", (WIDTH, HEIGHT), 0)
    draw = ImageDraw.Draw(protected)

    # Protect individual glass apertures, not a single cabin-shaped hole.
    # The old one-piece polygon erased the A/B/C pillars together with the
    # windows.  These inset apertures leave a structural roof border, front/rear
    # pillars and beltline in the body region.  The exact source hue is not
    # consulted; this is a shape prior for the glass openings.
    cabin_top = 0.22 if body_type in {"suv", "coupe"} else 0.24
    cabin_bottom = 0.43
    draw.polygon(
        [
            (round(left + 0.36 * car_width), round(top + cabin_bottom * car_height)),
            (round(left + 0.42 * car_width), round(top + cabin_top * car_height)),
            (round(left + 0.57 * car_width), round(top + cabin_top * car_height)),
            (round(left + 0.61 * car_width), round(top + cabin_bottom * car_height)),
        ],
        fill=255,
    )
    draw.polygon(
        [
            (round(left + 0.64 * car_width), round(top + cabin_bottom * car_height)),
            (round(left + 0.68 * car_width), round(top + (cabin_top + 0.015) * car_height)),
            (round(left + 0.75 * car_width), round(top + (cabin_top + 0.025) * car_height)),
            (round(left + 0.80 * car_width), round(top + cabin_bottom * car_height)),
        ],
        fill=255,
    )

    # Locate wheels only from structural circular edge evidence.  The search
    # is performed independently in the left and right lower wheel zones; it
    # never classifies body pixels by their original colour.
    edges = _edge_strength(rgba)
    angles = np.linspace(0, 2 * np.pi, 48, endpoint=False)
    for zone_left, zone_right in ((0.08, 0.46), (0.54, 0.94)):
        proposals = []
        for cx in np.arange(left + zone_left * car_width, left + zone_right * car_width, max(4, car_width / 45)):
            for cy in np.arange(top + 0.65 * car_height, top + 0.88 * car_height, max(4, car_height / 30)):
                for radius in np.linspace(0.045, 0.09, 6) * car_width:
                    values = _sample_bilinear(edges, cx + radius * np.cos(angles), cy + radius * 1.25 * np.sin(angles))
                    proposals.append((float(np.mean(values)), cx, cy, radius))
        if proposals:
            _score, cx, cy, radius = max(proposals)
            draw.ellipse(
                (round(cx - radius), round(cy - radius * 1.25), round(cx + radius), round(cy + radius * 1.25)),
                fill=255,
            )

    return np.asarray(protected) > 0


def _profile_body_mask(canvas, profile):
    """Rasterize an image-specific vehicle/body annotation.

    The outer contour is annotated against the same normalized render image as
    the source PNG.  Exclusions are separate apertures, so pillars, roof rails
    and painted sections between windows remain body by construction.  Alpha
    intersection prevents a hand annotation from inventing pixels outside the
    actual cutout.
    """
    rgba = np.asarray(canvas)
    opaque = rgba[:, :, 3] > 24
    geometry = Image.new("L", (WIDTH, HEIGHT), 0)
    draw = ImageDraw.Draw(geometry)
    draw.polygon(profile["outline"], fill=255)
    for hole in profile.get("holes", []):
        if hole["kind"] == "ellipse":
            draw.ellipse(hole["box"], fill=0)
        else:
            draw.polygon(hole["points"], fill=0)
    return Image.fromarray((opaque & (np.asarray(geometry) > 0)).astype(np.uint8) * 255, mode="L")


def build_structural_body_mask(canvas, body_type):
    # Use an image-specific structural contour whenever one exists.  This must
    # happen before the old generic semantic fallback: the fallback knows only
    # body type and cannot match the perspective or camera geometry of a photo.
    # It is retained for the remaining catalogue items until they receive the
    # same asset annotation, but no longer affects the verified problem cases.
    slug = getattr(canvas, "_garagehub_slug", None)
    if slug in STRUCTURAL_PROFILES:
        return _profile_body_mask(canvas, STRUCTURAL_PROFILES[slug])
    rgba = np.asarray(canvas)
    alpha = rgba[:, :, 3]
    opaque = alpha > 24
    coordinates = np.argwhere(opaque)
    if not len(coordinates):
        return Image.new("L", (WIDTH, HEIGHT), 0)

    top, left = coordinates.min(axis=0)
    bottom, right = coordinates.max(axis=0)
    car_width = max(1, right - left)
    car_height = max(1, bottom - top)
    # The mask begins as the complete car silhouette.  Crucially, we do not
    # create a generic window-shaped hole: that was excluding roofs, pillars
    # and upper panels whenever their original paint was grey or shadowed.
    protected = _semantic_non_body_regions(rgba, opaque, left, top, car_width, car_height, body_type)
    paint = opaque & ~protected
    return Image.fromarray((paint.astype(np.uint8) * 255), mode="L")


def process(entry):
    source_src = entry.get("sourceImageSrc") or f"/images/mobile-cars/catalog/{entry['slug']}.jpg"
    if "/processed/" in source_src:
        source_src = f"/images/mobile-cars/catalog/{entry['slug']}.jpg"
    source_path = ROOT / "public" / source_src.lstrip("/")
    processed_path = PROCESSED / f"{entry['slug']}.png"
    if SESSION:
        source = Image.open(source_path).convert("RGB")
        source.thumbnail((900, 900), Image.Resampling.LANCZOS)
        cutout = remove(source, session=SESSION)
        if not isinstance(cutout, Image.Image):
            cutout = Image.fromarray(np.asarray(cutout))
        canvas = fit_to_canvas(cutout.convert("RGBA"))
    else:
        # Reuse existing cutouts when the optional rembg build dependency is
        # unavailable; this still allows mask-only rebuilds.
        canvas = Image.open(processed_path).convert("RGBA")
    # Pillow images allow custom attributes, which keeps the public function
    # signature stable for existing scripts/tests.
    canvas._garagehub_slug = entry["slug"]
    paint_image = build_structural_body_mask(canvas, entry["bodyType"])
    paint_alpha = np.asarray(paint_image, dtype=np.uint8)
    paint_rgba = np.full((HEIGHT, WIDTH, 4), 255, dtype=np.uint8)
    paint_rgba[:, :, 3] = paint_alpha
    paint_image = Image.fromarray(paint_rgba, mode="RGBA")

    PROCESSED.mkdir(parents=True, exist_ok=True)
    MASKS.mkdir(parents=True, exist_ok=True)
    canvas.save(PROCESSED / f"{entry['slug']}.png", optimize=True)
    paint_image.save(MASKS / f"{entry['slug']}-body.png", optimize=True)
    return (
        f"/images/mobile-cars/catalog/processed/{entry['slug']}.png",
        f"/images/mobile-cars/catalog/masks/{entry['slug']}-body.png",
        source_src,
    )


manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
for item in manifest:
    item["src"], item["paintMaskSrc"], item["sourceImageSrc"] = process(item)
MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
