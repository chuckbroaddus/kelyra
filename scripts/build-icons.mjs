#!/usr/bin/env node
/**
 * Rasterize Kelyra icons to square PNGs.
 * Each glyph is cropped to its ink bbox, then uniformly scaled so the
 * longest axis fills the same square. White ink + alpha for tintColor.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'assets', 'icons');
const DESIGN = 24;
const SCALE = 12;
const RENDER = DESIGN * SCALE;
const OUT_SIZE = 96;
const PAD = 2;

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function canvas() {
  return new PNG({ width: RENDER, height: RENDER, colorType: 6 });
}

function blend(png, x, y, a) {
  if (a <= 0) return;
  x = Math.floor(x);
  y = Math.floor(y);
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const i = (png.width * y + x) << 2;
  const na = clamp(a, 0, 1);
  const oa = png.data[i + 3] / 255;
  const out = oa + na * (1 - oa);
  png.data[i] = 255;
  png.data[i + 1] = 255;
  png.data[i + 2] = 255;
  png.data[i + 3] = Math.round(out * 255);
}

function aa(d) {
  return clamp(0.5 - d, 0, 1);
}

function stamp(png, sdf, stroke, fill) {
  const sw = (stroke ?? 0) * SCALE;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const d = sdf(x + 0.5, y + 0.5);
      let a = 0;
      if (fill) a = Math.max(a, aa(d));
      if (sw) a = Math.max(a, aa(Math.abs(d) - sw / 2));
      if (a > 0.002) blend(png, x, y, a);
    }
  }
}

function U(n) {
  return n * SCALE;
}

function sdfCircle(px, py, cx, cy, r) {
  return Math.hypot(px - U(cx), py - U(cy)) - U(r);
}

function wrap2pi(a) {
  const t = 2 * Math.PI;
  return ((a % t) + t) % t;
}

/** Clockwise wedge. PNG y is down; 12 o’clock is -π/2, 3 o’clock is 0. */
function inSweep(ang, start, sweep) {
  return wrap2pi(ang - start) <= sweep + 1e-4;
}

/**
 * Counts-toward pie: full stroke circle so every glyph crops to the same
 * square, plus a filled slice. Clock from 12: Q1 UR, Q2 LR, Q3 LL, Q4 UL.
 * S1 = right half, S2 = left half.
 */
function pieSlice(png, start, sweep) {
  const cx = 12;
  const cy = 12;
  const r = 7.4;
  circle(png, cx, cy, r, ST, false);
  stamp(
    png,
    (x, y) => {
      const dx = x - U(cx);
      const dy = y - U(cy);
      const circleD = Math.hypot(dx, dy) - U(r);
      const ang = Math.atan2(dy, dx);
      if (inSweep(ang, start, sweep)) return circleD;
      return Math.min(
        sdfSegment(x, y, cx, cy, cx + Math.cos(start) * r, cy + Math.sin(start) * r),
        sdfSegment(x, y, cx, cy, cx + Math.cos(start + sweep) * r, cy + Math.sin(start + sweep) * r),
      );
    },
    0,
    true,
  );
}

function sdfSegment(px, py, x1, y1, x2, y2) {
  const ax = U(x1);
  const ay = U(y1);
  const bx = U(x2);
  const by = U(y2);
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1);
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

function sdfRoundRect(px, py, x, y, w, h, r) {
  const rx = U(Math.max(0, r));
  const cx = U(x + w / 2);
  const cy = U(y + h / 2);
  const hw = U(w / 2);
  const hh = U(h / 2);
  const dx = Math.abs(px - cx) - (hw - rx);
  const dy = Math.abs(py - cy) - (hh - rx);
  const ox = Math.max(dx, 0);
  const oy = Math.max(dy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(dx, dy), 0) - rx;
}

function circle(png, cx, cy, r, stroke, fill) {
  stamp(png, (x, y) => sdfCircle(x, y, cx, cy, r), stroke, fill);
}

function line(png, x1, y1, x2, y2, stroke) {
  stamp(png, (x, y) => sdfSegment(x, y, x1, y1, x2, y2), stroke, false);
}

function roundRect(png, x, y, w, h, r, stroke, fill) {
  stamp(png, (px, py) => sdfRoundRect(px, py, x, y, w, h, r), stroke, fill);
}

function poly(png, pts, stroke, fill) {
  stamp(
    png,
    (x, y) => {
      let d = 1e9;
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const a = pts[i];
        const b = pts[j];
        d = Math.min(d, sdfSegment(x, y, a[0], a[1], b[0], b[1]));
        const yi = U(a[1]);
        const yj = U(b[1]);
        const xi = U(a[0]);
        const xj = U(b[0]);
        const hit = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1) + xi;
        if (hit) inside = !inside;
      }
      return inside ? -d : d;
    },
    stroke,
    fill,
  );
}

function bust(png, cx, cy, s, stroke) {
  circle(png, cx, cy - 3.1 * s, 3.2 * s, stroke, false);
  roundRect(png, cx - 5.4 * s, cy + 0.4 * s, 10.8 * s, 6.4 * s, 4.2 * s, stroke, false);
}

function person(png, cx, feetY, s, stroke) {
  const head = 2.5 * s;
  const bodyW = 3.4 * s;
  const bodyH = 8.2 * s;
  circle(png, cx, feetY - bodyH - head * 1.15, head, stroke, false);
  roundRect(png, cx - bodyW / 2, feetY - bodyH, bodyW, bodyH, bodyW / 2, stroke, false);
}

const ST = 1.9;

const RECIPES = {
  menu: (p) => {
    line(p, 3.2, 6.2, 20.8, 6.2, ST);
    line(p, 3.2, 12, 20.8, 12, ST);
    line(p, 3.2, 17.8, 20.8, 17.8, ST);
  },
  filter: (p) => {
    line(p, 3.2, 6.4, 20.8, 6.4, ST);
    line(p, 5.6, 12, 18.4, 12, ST);
    line(p, 8.4, 17.6, 15.6, 17.6, ST);
  },
  close: (p) => {
    line(p, 5.2, 5.2, 18.8, 18.8, ST);
    line(p, 18.8, 5.2, 5.2, 18.8, ST);
  },
  setup: (p) => {
    bust(p, 8.2, 14.2, 1, ST);
    bust(p, 16.2, 15.4, 0.78, ST);
  },
  today: (p) => {
    poly(p, [[12, 2.4], [21.2, 10.2], [2.8, 10.2]], ST, true);
    roundRect(p, 5.2, 9.6, 13.6, 12.2, 0.4, ST, false);
  },
  capture: (p) => {
    roundRect(p, 2.4, 5.4, 19.2, 13.4, 3.2, ST, false);
    circle(p, 12, 12.1, 4.1, ST, false);
  },
  records: (p) => {
    roundRect(p, 3.2, 3.2, 7.8, 7.8, 1.2, ST, false);
    roundRect(p, 13, 3.2, 7.8, 7.8, 1.2, ST, false);
    roundRect(p, 3.2, 13, 7.8, 7.8, 1.2, ST, false);
    roundRect(p, 13, 13, 7.8, 7.8, 1.2, ST, false);
  },
  classes: (p) => {
    roundRect(p, 2.6, 2.8, 18.8, 12.2, 1.2, ST, false);
    line(p, 12, 15, 12, 19.2, ST);
    line(p, 6.4, 20.4, 17.6, 20.4, ST);
  },
  family: (p) => RECIPES.parents(p),
  inbox: (p) => {
    roundRect(p, 3, 5.2, 18, 13.8, 1.6, ST, false);
    line(p, 5.6, 16.6, 18.4, 16.6, ST);
  },
  zoomIn: (p) => {
    circle(p, 10.2, 10.2, 6.2, ST, false);
    line(p, 14.8, 14.8, 20.4, 20.4, ST);
    line(p, 10.2, 7.4, 10.2, 13, ST);
    line(p, 7.4, 10.2, 13, 10.2, ST);
  },
  zoomOut: (p) => {
    circle(p, 10.2, 10.2, 6.2, ST, false);
    line(p, 14.8, 14.8, 20.4, 20.4, ST);
    line(p, 7.4, 10.2, 13, 10.2, ST);
  },
  search: (p) => {
    circle(p, 10.2, 10.2, 6.4, ST, false);
    line(p, 15, 15, 20.6, 20.6, ST);
  },
  bell: (p) => {
    roundRect(p, 7.2, 4.4, 9.6, 11.2, 4.8, ST, false);
    line(p, 5.4, 16.2, 18.6, 16.2, ST);
    circle(p, 12, 18.6, 1.3, ST, true);
  },
  // Stroke fallback only. In-app Ask/Kelyra chrome uses assets/brand/kelyra.png
  // (full-color, never tinted). Do not replace that mark with this glyph.
  ask: (p) => {
    roundRect(p, 3.2, 4.2, 17.6, 13.4, 4.6, ST, false);
    poly(p, [[8.2, 17.4], [10.6, 17.4], [8.6, 21]], ST, true);
    roundRect(p, 10.2, 8.2, 3.6, 3.6, 0.6, ST, false);
  },
  person: (p) => bust(p, 12, 14.4, 1.15, ST),
  parents: (p) => {
    person(p, 7.2, 21.4, 0.95, ST);
    person(p, 16.8, 21.4, 0.95, ST);
    line(p, 9.6, 15.2, 14.4, 15.2, ST);
  },
  children: (p) => {
    person(p, 7.8, 21.4, 1, ST);
    person(p, 16.8, 21.4, 0.7, ST);
    line(p, 10.2, 16.2, 14.4, 16.2, ST);
  },
  back: (p) => {
    line(p, 14.8, 4.6, 7.2, 12, ST);
    line(p, 7.2, 12, 14.8, 19.4, ST);
  },
  send: (p) => {
    poly(p, [[4.2, 19.4], [12, 4.4], [19.8, 19.4], [12, 15.2]], ST, false);
    line(p, 12, 15.2, 12, 20.2, ST);
  },
  check: (p) => {
    line(p, 4.8, 12.4, 9.8, 18, ST);
    line(p, 9.8, 18, 19.6, 5.6, ST);
  },
  mail: (p) => {
    roundRect(p, 2.8, 5.6, 18.4, 13, 1.2, ST, false);
    line(p, 3.4, 6.4, 12, 13.2, ST);
    line(p, 20.6, 6.4, 12, 13.2, ST);
  },
  chat: (p) => {
    roundRect(p, 8.4, 3.6, 12.4, 8.4, 3.4, ST, false);
    roundRect(p, 3.2, 9.2, 13.6, 9.2, 3.6, ST, false);
    poly(p, [[6.4, 18.2], [8.8, 18.2], [6.8, 21.4]], ST, true);
  },
  settings: (p) => {
    circle(p, 12, 12, 4.2, ST, false);
    circle(p, 12, 12, 2.1, ST, false);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const x1 = 12 + Math.cos(a) * 5.4;
      const y1 = 12 + Math.sin(a) * 5.4;
      const x2 = 12 + Math.cos(a) * 9.4;
      const y2 = 12 + Math.sin(a) * 9.4;
      line(p, x1, y1, x2, y2, ST + 0.4);
    }
  },
  share: (p) => {
    roundRect(p, 5.2, 8.4, 13.6, 12.4, 1.4, ST, false);
    line(p, 12, 3.4, 12, 12.4, ST);
    line(p, 12, 3.4, 8.2, 7.4, ST);
    line(p, 12, 3.4, 15.8, 7.4, ST);
  },
  save: (p) => {
    roundRect(p, 5.2, 3.2, 13.6, 12.4, 1.4, ST, false);
    line(p, 12, 20.6, 12, 11.6, ST);
    line(p, 12, 20.6, 8.2, 16.6, ST);
    line(p, 12, 20.6, 15.8, 16.6, ST);
  },
  compose: (p) => {
    roundRect(p, 3.2, 7.2, 11.6, 11.6, 1.2, ST, false);
    line(p, 12.4, 4.2, 20.4, 12.2, ST);
    line(p, 20.4, 12.2, 18.6, 14, ST);
  },
  plus: (p) => {
    line(p, 12, 4, 12, 20, ST);
    line(p, 4, 12, 20, 12, ST);
  },
  mic: (p) => {
    roundRect(p, 9.2, 3.6, 5.6, 10.4, 2.8, ST, false);
    stamp(p, (x, y) => sdfRoundRect(x, y, 6.2, 9.6, 11.6, 7.4, 5.2), ST, false);
    line(p, 12, 17, 12, 21.2, ST);
  },
  focus: (p) => {
    circle(p, 12, 12, 9.2, ST, false);
    circle(p, 12, 12, 5.2, ST, false);
    circle(p, 12, 12, 1.5, 0, true);
  },
  login: (p) => {
    circle(p, 7.2, 12, 3.6, ST, false);
    line(p, 10.6, 12, 19.8, 12, ST);
    line(p, 17.4, 12, 17.4, 14.8, ST);
  },
  history: (p) => {
    circle(p, 12, 12, 9, ST, false);
    line(p, 12, 12, 12, 6.6, ST);
    line(p, 12, 12, 16.4, 12, ST);
  },
  work: (p) => {
    roundRect(p, 6.2, 3.2, 11.6, 17.6, 1.2, ST, false);
    line(p, 8.6, 8.4, 15.4, 8.4, ST);
    line(p, 8.6, 11.6, 13.6, 11.6, ST);
  },
  practice: (p) => {
    roundRect(p, 3.2, 5.2, 5.2, 5.2, 1, ST, false);
    line(p, 4.4, 7.8, 7.2, 7.8, ST);
    line(p, 10.2, 7.8, 20.6, 7.8, ST);
    roundRect(p, 3.2, 13.6, 5.2, 5.2, 1, ST, false);
    line(p, 10.2, 16.2, 20.6, 16.2, ST);
  },
  details: (p) => {
    line(p, 3.4, 6.2, 20.6, 6.2, ST);
    line(p, 3.4, 12, 17.2, 12, ST);
    line(p, 3.4, 17.8, 13.6, 17.8, ST);
  },
  manage: (p) => {
    line(p, 3.2, 6.2, 20.8, 6.2, ST);
    circle(p, 16.4, 6.2, 1.7, 0, true);
    line(p, 3.2, 12, 20.8, 12, ST);
    circle(p, 8.2, 12, 1.7, 0, true);
    line(p, 3.2, 17.8, 20.8, 17.8, ST);
    circle(p, 13.4, 17.8, 1.7, 0, true);
  },
  photo: (p) => {
    roundRect(p, 5.6, 3.6, 14.2, 10.4, 1.4, ST, false);
    roundRect(p, 3.4, 8.4, 14.2, 10.4, 1.4, ST, false);
  },
  file: (p) => {
    roundRect(p, 6.2, 3.2, 11.8, 17.6, 1.2, ST, false);
    line(p, 13.6, 3.2, 17.8, 7.6, ST);
    line(p, 13.6, 3.2, 13.6, 7.6, ST);
    line(p, 13.6, 7.6, 17.8, 7.6, ST);
  },
  link: (p) => {
    circle(p, 8.4, 12, 5.2, ST, false);
    circle(p, 15.6, 12, 5.2, ST, false);
  },
  post: (p) => {
    roundRect(p, 3.4, 5.2, 17.2, 11.2, 4.2, ST, false);
    poly(p, [[6.4, 16.2], [9.2, 16.2], [6.8, 20.4]], ST, true);
    line(p, 7.4, 9.2, 14.8, 9.2, ST);
    line(p, 7.4, 12.2, 12.4, 12.2, ST);
  },
  alert: (p) => {
    poly(p, [[12, 3.2], [21.2, 20.4], [2.8, 20.4]], ST, false);
    line(p, 12, 9.2, 12, 14.6, ST);
    circle(p, 12, 17.2, 1.1, 0, true);
  },
  speaker: (p) => {
    roundRect(p, 3.6, 9.2, 4.4, 5.6, 1, ST, false);
    poly(p, [[8, 9.2], [13.6, 5.4], [13.6, 18.6], [8, 14.8]], ST, false);
    stamp(p, (x, y) => Math.abs(Math.hypot(x - U(16.4), y - U(12)) - U(3.4)) - 0.01, ST, false);
  },
  mute: (p) => {
    RECIPES.speaker(p);
    line(p, 4.4, 4.4, 19.6, 19.6, ST);
  },
  /** Student tray: own marks. Report card, not the teacher 2×2 records grid. */
  grades: (p) => {
    roundRect(p, 5.2, 3.2, 13.6, 17.6, 1.2, ST, false);
    line(p, 8.2, 8.2, 16, 8.2, ST);
    line(p, 8.2, 11.4, 16, 11.4, ST);
    line(p, 8.2, 14.6, 12.8, 14.6, ST);
    line(p, 14.2, 16.6, 16, 18.6, ST);
    line(p, 16, 18.6, 20.2, 13.8, ST);
  },
  /** Assignment cell: waiting. Empty circle. */
  statusAssigned: (p) => {
    circle(p, 12, 12, 7.4, ST, false);
  },
  /** Assignment cell: student opened it. Circle with a center mark. */
  statusStarted: (p) => {
    circle(p, 12, 12, 7.4, ST, false);
    circle(p, 12, 12, 2.6, 0, true);
  },
  /** Assignment cell: turned in, waiting on the teacher. */
  statusCompleted: (p) => {
    circle(p, 12, 12, 7.4, ST, false);
    line(p, 8.2, 12.2, 10.8, 15.4, ST);
    line(p, 10.8, 15.4, 16.4, 8.6, ST);
  },
  /** Assignment cell: teacher graded. Gold-star school mark. */
  statusGraded: (p) => {
    const pts = [];
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      const b = a + Math.PI / 5;
      pts.push([12 + Math.cos(a) * 8.4, 12.2 + Math.sin(a) * 8.4]);
      pts.push([12 + Math.cos(b) * 3.5, 12.2 + Math.sin(b) * 3.5]);
    }
    poly(p, pts, ST, true);
  },
  /** Counts toward: everything. Solid disk. */
  termAll: (p) => {
    circle(p, 12, 12, 7.4, ST, true);
  },
  /** Quarter 1: 12–3, upper right. */
  termQ1: (p) => pieSlice(p, -Math.PI / 2, Math.PI / 2),
  /** Quarter 2: 3–6, lower right. */
  termQ2: (p) => pieSlice(p, 0, Math.PI / 2),
  /** Quarter 3: 6–9, lower left. */
  termQ3: (p) => pieSlice(p, Math.PI / 2, Math.PI / 2),
  /** Quarter 4: 9–12, upper left. */
  termQ4: (p) => pieSlice(p, Math.PI, Math.PI / 2),
  /** Semester 1: right half (Q1+Q2). */
  termS1: (p) => pieSlice(p, -Math.PI / 2, Math.PI),
  /** Semester 2: left half (Q3+Q4). */
  termS2: (p) => pieSlice(p, Math.PI / 2, Math.PI),
  /** Year: filled disk inside a clear rim — the whole cycle, not All’s solid pie. */
  termYear: (p) => {
    circle(p, 12, 12, 8.2, ST, false);
    circle(p, 12, 12, 5, ST, true);
  },
  feedSchool: (p) => {
    roundRect(p, 9.6, 2.4, 4.8, 3.4, 0.4, ST, false);
    poly(p, [[12, 5.2], [21.4, 11.2], [2.6, 11.2]], ST, true);
    roundRect(p, 4.4, 10.6, 15.2, 11.2, 0.4, ST, false);
    roundRect(p, 10.2, 15.4, 3.6, 6.4, 0.2, ST, false);
  },
  feedClass: (p) => RECIPES.classes(p),
  feedBook: (p) => {
    roundRect(p, 3.6, 5.4, 8.2, 13.4, 1, ST, false);
    roundRect(p, 12.2, 5.4, 8.2, 13.4, 1, ST, false);
    line(p, 12, 5.8, 12, 18.4, ST);
  },
  feedEnglish: (p) => {
    line(p, 6.4, 18.4, 9.2, 5.6, ST);
    line(p, 9.2, 5.6, 12, 18.4, ST);
    line(p, 7.4, 13.2, 10.8, 13.2, ST);
    roundRect(p, 14.2, 6.2, 5.6, 11.6, 1.2, ST, false);
  },
  feedLanguage: (p) => {
    roundRect(p, 3.4, 4.8, 10.4, 8.2, 3.4, ST, false);
    roundRect(p, 10.2, 11, 10.4, 8.2, 3.4, ST, false);
  },
  feedPencil: (p) => {
    line(p, 6.2, 17.8, 17.8, 6.2, ST + 0.6);
    poly(p, [[5.2, 18.8], [6.8, 19.4], [5.8, 17.2]], ST, true);
  },
  feedMath: (p) => {
    line(p, 5.2, 8.2, 18.8, 8.2, ST);
    line(p, 8.4, 8.2, 8.4, 18.4, ST);
    line(p, 15.6, 8.2, 15.6, 18.4, ST);
  },
  feedGeom: (p) => {
    poly(p, [[12, 3.6], [21, 19.6], [3, 19.6]], ST, false);
  },
  feedStat: (p) => {
    roundRect(p, 4.2, 12.4, 4, 8, 0.8, ST, false);
    roundRect(p, 10, 7.2, 4, 13.2, 0.8, ST, false);
    roundRect(p, 15.8, 4.4, 4, 16, 0.8, ST, false);
  },
  feedScience: (p) => {
    roundRect(p, 9.4, 3.4, 5.2, 5.2, 0.6, ST, false);
    stamp(p, (x, y) => sdfRoundRect(x, y, 6.4, 8, 11.2, 12.2, 5.4), ST, false);
  },
  feedChem: (p) => {
    circle(p, 8.4, 9.2, 3.2, ST, false);
    circle(p, 15.6, 9.2, 3.2, ST, false);
    circle(p, 12, 15.6, 3.2, ST, false);
    line(p, 10.8, 10.8, 13.2, 13.4, ST);
  },
  feedPhysics: (p) => {
    circle(p, 12, 12, 2.2, ST, false);
    stamp(p, (x, y) => {
      const dx = (x - U(12)) / U(8.4);
      const dy = (y - U(12)) / U(4.2);
      return Math.abs(Math.hypot(dx, dy) - 1);
    }, ST, false);
    stamp(p, (x, y) => {
      const dx = (x - U(12)) / U(4.2);
      const dy = (y - U(12)) / U(8.4);
      return Math.abs(Math.hypot(dx, dy) - 1);
    }, ST, false);
  },
  feedBio: (p) => {
    line(p, 12, 20.4, 12, 6.4, ST);
    stamp(p, (x, y) => sdfCircle(x, y, 8.6, 10.2, 4.4), ST, false);
    stamp(p, (x, y) => sdfCircle(x, y, 15.4, 10.2, 4.4), ST, false);
  },
  feedLab: (p) => {
    roundRect(p, 6.2, 4.4, 4.4, 15.6, 2.2, ST, false);
    roundRect(p, 13.4, 8.4, 4.4, 11.6, 2.2, ST, false);
  },
  feedGlobe: (p) => {
    circle(p, 12, 12, 8.6, ST, false);
    stamp(p, (x, y) => sdfRoundRect(x, y, 8.4, 3.6, 7.2, 16.8, 3.6), ST, false);
    line(p, 4.2, 12, 19.8, 12, ST);
  },
  feedWorldHistory: (p) => RECIPES.feedGlobe(p),
  feedUSHistory: (p) => {
    roundRect(p, 3.6, 5.4, 16.8, 13.2, 1, ST, false);
    line(p, 3.6, 9.2, 20.4, 9.2, ST);
    line(p, 8.8, 5.4, 8.8, 18.6, ST);
  },
  feedStateHistory: (p) => {
    roundRect(p, 5.2, 4.4, 13.6, 15.2, 1.2, ST, false);
    circle(p, 12, 12, 3.2, ST, false);
  },
  feedMap: (p) => {
    roundRect(p, 3.2, 6.4, 5.6, 11.2, 0.8, ST, false);
    roundRect(p, 9.2, 4.8, 5.6, 14.4, 0.8, ST, false);
    roundRect(p, 15.2, 7.2, 5.6, 10, 0.8, ST, false);
  },
  feedGov: (p) => {
    line(p, 4, 8.4, 20, 8.4, ST);
    line(p, 6.4, 8.4, 6.4, 18.4, ST);
    line(p, 12, 8.4, 12, 18.4, ST);
    line(p, 17.6, 8.4, 17.6, 18.4, ST);
    line(p, 4.4, 18.4, 19.6, 18.4, ST);
    poly(p, [[12, 3.2], [20, 8.4], [4, 8.4]], ST, true);
  },
  feedEcon: (p) => {
    line(p, 4.4, 19.2, 4.4, 4.8, ST);
    line(p, 4.4, 19.2, 20.2, 19.2, ST);
    line(p, 5.2, 15.6, 10.2, 10.4, ST);
    line(p, 10.2, 10.4, 14.2, 12.8, ST);
    line(p, 14.2, 12.8, 19.4, 6.2, ST);
  },
  feedBible: (p) => {
    line(p, 12, 3.6, 12, 20.4, ST);
    line(p, 6.4, 8.2, 17.6, 8.2, ST);
  },
  feedArt: (p) => {
    stamp(p, (x, y) => sdfRoundRect(x, y, 4.4, 6.4, 15.2, 12.2, 6.4), ST, false);
    circle(p, 12, 14.6, 2.2, ST, false);
  },
  feedMusic: (p) => {
    line(p, 9.4, 4.4, 9.4, 17.2, ST);
    line(p, 9.4, 4.4, 17.2, 6.2, ST);
    circle(p, 8, 17.6, 2.4, 0, true);
  },
  feedTheater: (p) => {
    circle(p, 8, 12, 5.2, ST, false);
    circle(p, 16, 12, 5.2, ST, false);
  },
  feedSport: (p) => {
    circle(p, 12, 12, 8.2, ST, false);
    line(p, 5.2, 12, 18.8, 12, ST);
  },
  feedCode: (p) => {
    line(p, 8.6, 6.4, 4.2, 12, ST);
    line(p, 4.2, 12, 8.6, 17.6, ST);
    line(p, 15.4, 6.4, 19.8, 12, ST);
    line(p, 19.8, 12, 15.4, 17.6, ST);
    line(p, 13.2, 5.8, 10.8, 18.2, ST);
  },
  feedRobot: (p) => {
    roundRect(p, 5.6, 6.4, 12.8, 12.8, 1.6, ST, false);
    circle(p, 9.2, 11.4, 1.4, 0, true);
    circle(p, 14.8, 11.4, 1.4, 0, true);
    line(p, 12, 3.4, 12, 6.4, ST);
    circle(p, 12, 3, 1.1, 0, true);
  },
  feedShop: (p) => {
    poly(p, [[6.2, 8.4], [4.4, 12.2], [7.8, 12.2]], ST, false);
    line(p, 6.2, 12.2, 6.2, 19.6, ST);
    line(p, 12.4, 5.2, 18.6, 18.8, ST);
  },
  feedAg: (p) => {
    line(p, 12, 20.2, 12, 5.6, ST);
    line(p, 12, 9.2, 6.8, 6.4, ST);
    line(p, 12, 9.2, 17.2, 6.4, ST);
    line(p, 12, 13.2, 7.4, 11.2, ST);
    line(p, 12, 13.2, 16.6, 11.2, ST);
  },
  feedHealth: (p) => {
    circle(p, 12, 13.2, 6.6, ST, false);
    line(p, 12, 6.6, 12, 3.8, ST);
  },
  feedNews: (p) => {
    roundRect(p, 4.2, 4.2, 15.6, 15.6, 1.2, ST, false);
    line(p, 7, 8.4, 17, 8.4, ST);
    line(p, 7, 12, 15.2, 12, ST);
    line(p, 7, 15.6, 13.4, 15.6, ST);
  },
  feedLibrary: (p) => {
    roundRect(p, 4.4, 6.4, 4.2, 12.2, 0.8, ST, false);
    roundRect(p, 9.9, 5.2, 4.2, 13.4, 0.8, ST, false);
    roundRect(p, 15.4, 7.2, 4.2, 11.4, 0.8, ST, false);
    line(p, 3.6, 18.8, 20.4, 18.8, ST);
  },
  feedHeart: (p) => {
    circle(p, 8.6, 9.2, 4.4, ST, false);
    circle(p, 15.4, 9.2, 4.4, ST, false);
    poly(p, [[4.6, 11.2], [12, 20.2], [19.4, 11.2]], ST, false);
  },
  feedStar: (p) => {
    poly(p, [[12, 3.4], [20.6, 12], [12, 20.6], [3.4, 12]], ST, false);
  },
  feedSun: (p) => {
    circle(p, 12, 12, 4.6, ST, false);
    line(p, 12, 2.8, 12, 5.4, ST);
    line(p, 12, 18.6, 12, 21.2, ST);
    line(p, 2.8, 12, 5.4, 12, ST);
    line(p, 18.6, 12, 21.2, 12, ST);
  },
};

function bbox(png) {
  let x0 = png.width;
  let y0 = png.height;
  let x1 = 0;
  let y1 = 0;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const a = png.data[(png.width * y + x) * 4 + 3];
      if (a < 10) continue;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < x0) return { x0: 0, y0: 0, x1: 1, y1: 1 };
  return { x0, y0, x1, y1 };
}

function sample(src, x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(src.width - 1, x0 + 1);
  const y1 = Math.min(src.height - 1, y0 + 1);
  const fx = x - x0;
  const fy = y - y0;
  const a00 = src.data[(src.width * y0 + x0) * 4 + 3];
  const a10 = src.data[(src.width * y0 + x1) * 4 + 3];
  const a01 = src.data[(src.width * y1 + x0) * 4 + 3];
  const a11 = src.data[(src.width * y1 + x1) * 4 + 3];
  return a00 * (1 - fx) * (1 - fy) + a10 * fx * (1 - fy) + a01 * (1 - fx) * fy + a11 * fx * fy;
}

function normalize(src) {
  const { x0, y0, x1, y1 } = bbox(src);
  const bw = x1 - x0 + 1;
  const bh = y1 - y0 + 1;
  const inner = OUT_SIZE - PAD * 2;
  const fit = inner / Math.max(bw, bh);
  const dw = bw * fit;
  const dh = bh * fit;
  const ox = (OUT_SIZE - dw) / 2;
  const oy = (OUT_SIZE - dh) / 2;
  const dst = new PNG({ width: OUT_SIZE, height: OUT_SIZE, colorType: 6 });
  for (let y = 0; y < OUT_SIZE; y++) {
    for (let x = 0; x < OUT_SIZE; x++) {
      const sx = x0 + (x - ox) / fit;
      const sy = y0 + (y - oy) / fit;
      if (sx < x0 || sy < y0 || sx > x1 + 1 || sy > y1 + 1) continue;
      const a = sample(src, sx, sy);
      if (a < 1) continue;
      const i = (OUT_SIZE * y + x) << 2;
      dst.data[i] = 255;
      dst.data[i + 1] = 255;
      dst.data[i + 2] = 255;
      dst.data[i + 3] = Math.round(clamp(a, 0, 255));
    }
  }
  return dst;
}

function ident(name) {
  return name.replace(/[^a-zA-Z0-9]/g, '_');
}

fs.mkdirSync(OUT, { recursive: true });
const names = Object.keys(RECIPES);
for (const name of names) {
  const png = canvas();
  RECIPES[name](png);
  const out = normalize(png);
  fs.writeFileSync(path.join(OUT, `${name}.png`), PNG.sync.write(out));
}

const imports = names
  .map((name) => `import ${ident(name)} from '../../../assets/icons/${name}.png';`)
  .join('\n');
const map = names.map((name) => `  '${name}': ${ident(name)},`).join('\n');
const ts = `/* Generated by scripts/build-icons.mjs — do not edit by hand. */
import type { ImageSourcePropType } from 'react-native';

${imports}

export const ICON_ASSETS: Record<string, ImageSourcePropType> = {
${map}
};
`;
fs.writeFileSync(path.join(ROOT, 'src/components/ui/iconAssets.ts'), ts);
console.log(`Wrote ${names.length} icons to assets/icons and iconAssets.ts`);
