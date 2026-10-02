#!/usr/bin/env node
/** Static evidence PNG: Excused label + ? popover layout (RAPID t_46ef1d33). */
import { createWriteStream, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';

const W = 720;
const H = 460;
const png = new PNG({ width: W, height: H });

function fill(x0, y0, x1, y1, r, g, b, a = 255) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const i = (W * y + x) << 2;
      png.data[i] = r;
      png.data[i + 1] = g;
      png.data[i + 2] = b;
      png.data[i + 3] = a;
    }
  }
}

function circle(cx, cy, rOuter, rInner, stroke, fillRgb) {
  for (let y = cy - rOuter - 1; y <= cy + rOuter + 1; y++) {
    for (let x = cx - rOuter - 1; x <= cx + rOuter + 1; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= rInner && fillRgb) fill(x, y, x + 1, y + 1, ...fillRgb);
      else if (d > rInner && d <= rOuter) fill(x, y, x + 1, y + 1, ...stroke);
    }
  }
}

// page bg
fill(0, 0, W, H, 242, 243, 247);
// card
fill(28, 28, W - 28, H - 28, 255, 255, 255);
// step title strip
fill(48, 48, W - 48, 96, 255, 255, 255);
// step ? (heading standard)
circle(W - 70, 72, 11, 9.5, [150, 152, 160], [255, 255, 255]);
// Missing work label row
fill(48, 120, W - 48, 150, 255, 255, 255);
circle(W - 70, 135, 11, 9.5, [150, 152, 160], [255, 255, 255]);
// radio placeholders
fill(48, 160, W - 48, 188, 250, 250, 252);
fill(48, 196, W - 48, 224, 250, 250, 252);
// Excused label + ?
fill(48, 248, W - 48, 280, 255, 255, 255);
circle(W - 70, 264, 11, 9.5, [80, 120, 200], [255, 255, 255]);
// open popover under Excused
fill(48, 292, W - 48, 400, 245, 246, 250);
// popover border
fill(48, 292, W - 48, 294, 200, 204, 214);
fill(48, 398, W - 48, 400, 200, 204, 214);
fill(48, 292, 50, 400, 200, 204, 214);
fill(W - 50, 292, W - 48, 400, 200, 204, 214);
// title bar inside pop
fill(64, 308, 220, 324, 40, 44, 52);
// meaning lines
fill(64, 336, W - 80, 348, 130, 134, 142);
fill(64, 354, W - 120, 366, 130, 134, 142);
// example line
fill(64, 376, W - 100, 388, 40, 44, 52);

const dir = join('notes/company/syllabus-inline-help');
mkdirSync(dir, { recursive: true });
const out = join(dir, 'excused-help-q-popover.png');
png
  .pack()
  .pipe(createWriteStream(out))
  .on('finish', () => {
    console.log('wrote', out);
  });
