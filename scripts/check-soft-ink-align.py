#!/usr/bin/env python3
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
  return (L + R) / 2, (T + B) / 2, B - T + 1

idle = Image.open(base / 'kelyra.png').convert('RGBA')
soft = Image.open(base / 'kelyra-soft.png').convert('RGBA')
icx, icy, ih = ink(idle)
scx, scy, sh = ink(soft)
ok = abs(icx - scx) <= 8 and abs(icy - scy) <= 8 and abs(ih - sh) <= 12
print(f'idle={icx},{icy},{ih} soft={scx},{scy},{sh} ok={ok}')
sys.exit(0 if ok else 1)
