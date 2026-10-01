#!/usr/bin/env python3
"""Make a photo-like JPEG from a clean PNG (skew, gradient, noise, slight blur)."""
import sys
import math
import random

def main():
    if len(sys.argv) < 3:
        print("usage: gradebook-ingest-photo.py in.png out.jpg", file=sys.stderr)
        return 2
    src, dst = sys.argv[1], sys.argv[2]
    try:
        from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps
    except ImportError:
        print("PIL missing", file=sys.stderr)
        return 1

    random.seed(hash(src) & 0xFFFFFFFF)
    im = Image.open(src).convert("RGB")
    w, h = im.size

    # slight perspective-ish via affine
    dx = int(w * 0.03)
    dy = int(h * 0.02)
    coeffs = (1, 0.02, -dx, 0.01, 1, -dy)
    im = im.transform(im.size, Image.AFFINE, coeffs, resample=Image.BICUBIC, fillcolor=(30, 30, 30))

    # lighting gradient
    overlay = Image.new("RGB", im.size, (0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for y in range(h):
        shade = int(40 + 180 * (y / max(h - 1, 1)))
        draw.line([(0, y), (w, y)], fill=(shade, shade, int(shade * 0.95)))
    im = Image.blend(im, overlay, 0.18)

    # noise
    px = im.load()
    for _ in range(int(w * h * 0.02)):
        x = random.randrange(w)
        y = random.randrange(h)
        r, g, b = px[x, y]
        n = random.randint(-18, 18)
        px[x, y] = (max(0, min(255, r + n)), max(0, min(255, g + n)), max(0, min(255, b + n)))

    im = im.filter(ImageFilter.GaussianBlur(radius=0.6))
    im = ImageEnhance.Contrast(im).enhance(0.92)
    im = ImageEnhance.Color(im).enhance(0.85)
    im = ImageOps.expand(im, border=8, fill=(25, 25, 28))
    im.save(dst, "JPEG", quality=72, optimize=True)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
