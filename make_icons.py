# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow"]
# ///
"""Render PWA PNG icons (192, 512) matching web/icon.svg."""
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).parent / "web"
BG = (13, 13, 18)


def star(cx, cy, r_out, r_in):
    pts = []
    for i in range(10):
        r = r_out if i % 2 == 0 else r_in
        a = -math.pi / 2 + i * math.pi / 5
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def render(size: int) -> Image.Image:
    s = size / 512
    img = Image.new("RGB", (size, size), BG)
    glow = Image.new("RGB", (size, size), BG)
    d = ImageDraw.Draw(glow)
    for i in range(60, 0, -1):
        t = i / 60
        r = 200 * s * t
        col = tuple(int(BG[k] + (c - BG[k]) * (1 - t) ** 0.6) for k, c in enumerate((255, 160, 80)))
        d.ellipse((256 * s - r, 256 * s - r, 256 * s + r, 256 * s + r), fill=col)
    img = Image.blend(img, glow.filter(ImageFilter.GaussianBlur(8 * s)), 1)
    ImageDraw.Draw(img).polygon(star(256 * s, 262 * s, 140 * s, 58 * s), fill=(255, 248, 230))
    return img


for n in (192, 512):
    render(n).save(OUT / f"icon-{n}.png")
    print(f"wrote icon-{n}.png")
