#!/usr/bin/env python3
"""Soft face ink must share idle optical center but stay smaller (not upscaled to idle bbox)."""
from PIL import Image
from pathlib import Path
import sys
base = Path(sys.argv[1] if len(sys.argv) > 1 else 'assets/brand')

def ink(im, thresh=16):
  w, h = im.size
  pix = im.load()
  L, T, R, B = w, h, -1, -1
  for y in range(h):
    for x in range(w):
      if pix[x, y][3] > thresh:
        L = min(L, x); T = min(T, y); R = max(R, x); B = max(B, y)
  return (L + R) / 2, (T + B) / 2, B - T + 1, R - L + 1

idle = Image.open(base / 'kelyra.png').convert('RGBA')
soft = Image.open(base / 'kelyra-soft.png').convert('RGBA')
icx, icy, ih, iw = ink(idle)
scx, scy, sh, sw = ink(soft)
center_ok = abs(icx - scx) <= 8 and abs(icy - scy) <= 8
size_ok = sh <= ih and sh < ih * 0.85 and sw < iw * 0.85
print(f'idle={icx},{icy},{ih},{iw} soft={scx},{scy},{sh},{sw} center_ok={center_ok} size_ok={size_ok}')
sys.exit(0 if center_ok and size_ok else 1)
