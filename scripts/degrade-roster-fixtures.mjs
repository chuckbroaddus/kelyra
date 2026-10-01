#!/usr/bin/env node
/**
 * Seeded "rough phone photo" degradation for the roster-ingest corpus.
 *
 *   node scripts/degrade-roster-fixtures.mjs            # every case with eval-meta.rough
 *   node scripts/degrade-roster-fixtures.mjs R19 R23    # subset
 *
 * Input per case:  clean.png (from render-roster-ingest-pngs.mjs), eval-meta.json `degrade`
 *                  spec (written by gen-roster-ingest-fixtures.mjs), layout.json (GT boxes).
 * Output per case: rough.jpg (what the eval sends) + visibility.json (per-name in-frame /
 *                  occlusion estimate used to keep expected.json honest).
 *
 * Pure-JS pixel ops + sharp (already a dependency). Fully deterministic per `seed`.
 * Effects: keystone/perspective, rotation, crop-off-edge, crumple (warp + shading),
 * creases/folds, page curl near binding, coffee stain, pen marks, desk background +
 * clutter (under and over the page), hand/phone shadow, glare hotspot, uneven light,
 * defocus + motion blur, low light + sensor noise, JPEG artifacts (optionally twice).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CORPUS = path.join(ROOT, 'notes/qa-fixtures/roster-ingest');

// ---------- seeded helpers ----------
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(r) {
  let u = 0;
  while (u === 0) u = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
}
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const deg = (d) => (d * Math.PI) / 180;

function makeNoise(r, w, h, cell) {
  const gw = Math.ceil(w / cell) + 4;
  const gh = Math.ceil(h / cell) + 4;
  const g = new Float32Array(gw * gh);
  for (let i = 0; i < g.length; i++) g[i] = r() * 2 - 1;
  return (x, y) => {
    const fx = clamp(x / cell + 1, 0, gw - 1.001);
    const fy = clamp(y / cell + 1, 0, gh - 1.001);
    const ix = Math.floor(fx);
    const iy = Math.floor(fy);
    const tx = fx - ix;
    const ty = fy - iy;
    const sx = tx * tx * (3 - 2 * tx);
    const sy = ty * ty * (3 - 2 * ty);
    const a = g[iy * gw + ix];
    const b = g[iy * gw + ix + 1];
    const c = g[(iy + 1) * gw + ix];
    const d = g[(iy + 1) * gw + ix + 1];
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}
function makeFbm(r, w, h, cell, oct = 3) {
  const ns = [];
  for (let o = 0; o < oct; o++) ns.push(makeNoise(r, w, h, Math.max(2, cell / 2 ** o)));
  return (x, y) => {
    let s = 0;
    let amp = 1;
    let tot = 0;
    for (const n of ns) {
      s += n(x, y) * amp;
      tot += amp;
      amp *= 0.5;
    }
    return s / tot;
  };
}

// ---------- geometry ----------
function solve(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let i = c + 1; i < n; i++) if (Math.abs(M[i][c]) > Math.abs(M[p][c])) p = i;
    [M[c], M[p]] = [M[p], M[c]];
    for (let i = 0; i < n; i++) {
      if (i === c) continue;
      const f = M[i][c] / M[c][c];
      for (let j = c; j <= n; j++) M[i][j] -= f * M[c][j];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}
function homography(src, dst) {
  const A = [];
  const b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [X, Y] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -X * x, -X * y]);
    b.push(X);
    A.push([0, 0, 0, x, y, 1, -Y * x, -Y * y]);
    b.push(Y);
  }
  return [...solve(A, b), 1];
}
function inv3(m) {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [
    A / det, -(b * i - c * h) / det, (b * f - c * e) / det,
    B / det, (a * i - c * g) / det, -(a * f - c * d) / det,
    C / det, -(a * h - b * g) / det, (a * e - b * d) / det,
  ];
}
function applyH(m, x, y) {
  const w = m[6] * x + m[7] * y + m[8];
  return [(m[0] * x + m[1] * y + m[2]) / w, (m[3] * x + m[4] * y + m[5]) / w];
}

// ---------- raster helpers ----------
function pointInPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function polyBBox(pts, W, H) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return [clamp(Math.floor(x0), 0, W - 1), clamp(Math.floor(y0), 0, H - 1), clamp(Math.ceil(x1), 0, W - 1), clamp(Math.ceil(y1), 0, H - 1)];
}
function fillPolyMask(mask, W, H, pts, v = 1) {
  const [x0, y0, x1, y1] = polyBBox(pts, W, H);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (pointInPoly(x + 0.5, y + 0.5, pts)) mask[y * W + x] = Math.max(mask[y * W + x], v);
  }
}
function rectPts(cx, cy, w, h, angDeg) {
  const a = deg(angDeg);
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
}
function ellipsePts(cx, cy, rx, ry, angDeg, n = 48) {
  const a = deg(angDeg);
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const x = Math.cos(t) * rx;
    const y = Math.sin(t) * ry;
    out.push([cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)]);
  }
  return out;
}
function boxBlur1(src, w, h, r) {
  if (r < 1) return src;
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const k = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    let s = 0;
    const o = y * w;
    for (let x = -r; x <= r; x++) s += src[o + clamp(x, 0, w - 1)];
    for (let x = 0; x < w; x++) {
      tmp[o + x] = s / k;
      s += src[o + clamp(x + r + 1, 0, w - 1)] - src[o + clamp(x - r, 0, w - 1)];
    }
  }
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let y = -r; y <= r; y++) s += tmp[clamp(y, 0, h - 1) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = s / k;
      s += tmp[clamp(y + r + 1, 0, h - 1) * w + x] - tmp[clamp(y - r, 0, h - 1) * w + x];
    }
  }
  return out;
}
function gaussBlur(src, w, h, r) {
  let a = src;
  for (let i = 0; i < 3; i++) a = boxBlur1(a, w, h, Math.max(1, Math.round(r)));
  return a;
}
function splitRGB(buf, n) {
  const ch = [new Float32Array(n), new Float32Array(n), new Float32Array(n)];
  for (let i = 0; i < n; i++) { ch[0][i] = buf[i * 3]; ch[1][i] = buf[i * 3 + 1]; ch[2][i] = buf[i * 3 + 2]; }
  return ch;
}
function mergeRGB(ch, buf, n) {
  for (let i = 0; i < n; i++) { buf[i * 3] = ch[0][i]; buf[i * 3 + 1] = ch[1][i]; buf[i * 3 + 2] = ch[2][i]; }
}
function bilinear(buf, w, h, x, y, out) {
  const x0 = clamp(Math.floor(x), 0, w - 1);
  const y0 = clamp(Math.floor(y), 0, h - 1);
  const x1 = Math.min(x0 + 1, w - 1);
  const y1 = Math.min(y0 + 1, h - 1);
  const tx = clamp(x - x0, 0, 1);
  const ty = clamp(y - y0, 0, 1);
  for (let c = 0; c < 3; c++) {
    const a = buf[(y0 * w + x0) * 3 + c];
    const b = buf[(y0 * w + x1) * 3 + c];
    const d = buf[(y1 * w + x0) * 3 + c];
    const e = buf[(y1 * w + x1) * 3 + c];
    out[c] = a + (b - a) * tx + (d - a) * ty + (a - b - d + e) * tx * ty;
  }
}
/** Stroke a polyline into a float mask with soft edge. */
function strokeMask(mask, W, H, pts, width) {
  const hw = width / 2;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const x0 = clamp(Math.floor(Math.min(ax, bx) - hw - 2), 0, W - 1);
    const x1 = clamp(Math.ceil(Math.max(ax, bx) + hw + 2), 0, W - 1);
    const y0 = clamp(Math.floor(Math.min(ay, by) - hw - 2), 0, H - 1);
    const y1 = clamp(Math.ceil(Math.max(ay, by) + hw + 2), 0, H - 1);
    const dx = bx - ax;
    const dy = by - ay;
    const L2 = dx * dx + dy * dy || 1;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const t = clamp(((x - ax) * dx + (y - ay) * dy) / L2, 0, 1);
      const px = ax + t * dx - x;
      const py = ay + t * dy - y;
      const d = Math.sqrt(px * px + py * py);
      const v = clamp(hw + 0.7 - d, 0, 1);
      if (v > mask[y * W + x]) mask[y * W + x] = v;
    }
  }
}

// ---------- scene pieces ----------
const BG = {
  wood: [118, 80, 48],
  dark_desk: [52, 50, 49],
  laminate: [188, 182, 170],
  fabric: [64, 74, 92],
  white_desk: [214, 211, 203],
  carpet: [96, 88, 80],
};
function makeBackground(r, W, H, kind) {
  const base = BG[kind] || BG.laminate;
  const bg = new Float32Array(W * H * 3);
  const big = makeFbm(r, W, H, 260, 4);
  const fine = makeNoise(r, W, H, 3);
  const warp = makeFbm(r, W, H, 120, 2);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let f = 0.92 + 0.16 * big(x, y);
    if (kind === 'wood') {
      const s = Math.sin((y * 0.95 + x * 0.08 + warp(x, y) * 70) * 0.075);
      f *= 0.82 + 0.22 * (0.5 + 0.5 * s) + 0.05 * fine(x, y * 0.2);
    } else if (kind === 'fabric' || kind === 'carpet') {
      f *= 0.9 + 0.12 * fine(x, y) + 0.05 * Math.sin(x * 0.9) * Math.sin(y * 0.9);
    } else {
      f *= 1 + 0.03 * fine(x, y);
    }
    const i = (y * W + x) * 3;
    bg[i] = base[0] * f; bg[i + 1] = base[1] * f; bg[i + 2] = base[2] * f;
  }
  return bg;
}
/** Soft drop shadow under a polygon mask. */
function dropShadow(buf, W, H, mask, dx, dy, blurR, strength) {
  const sh = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const sx = x - dx;
    const sy = y - dy;
    if (sx >= 0 && sy >= 0 && sx < W && sy < H) sh[y * W + x] = mask[Math.floor(sy) * W + Math.floor(sx)];
  }
  const b = gaussBlur(sh, W, H, blurR);
  for (let i = 0; i < W * H; i++) {
    const f = 1 - strength * b[i];
    buf[i * 3] *= f; buf[i * 3 + 1] *= f; buf[i * 3 + 2] *= f;
  }
}
/** Clutter object: paper (fake unreadable text), sticky, pen, phone, mug, folder. Returns its mask. */
function drawObject(buf, W, H, obj, r) {
  const mask = new Float32Array(W * H);
  const kind = obj.kind;
  const cx = obj.cx * W;
  const cy = obj.cy * H;
  if (kind === 'mug') {
    const R = obj.r * W;
    fillPolyMask(mask, W, H, ellipsePts(cx, cy, R, R, 0));
    dropShadow(buf, W, H, mask, R * 0.12, R * 0.18, R * 0.15, 0.45);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!mask[i]) continue;
      const d = Math.hypot(x - cx, y - cy) / R;
      const col = d > 0.82 ? [225, 222, 215] : d > 0.76 ? [160, 150, 140] : [70, 42, 22];
      const lit = d < 0.76 ? 1 + 0.25 * Math.max(0, 0.4 - Math.hypot(x - cx + R * 0.3, y - cy + R * 0.3) / R) : 1;
      buf[i * 3] = col[0] * lit; buf[i * 3 + 1] = col[1] * lit; buf[i * 3 + 2] = col[2] * lit;
    }
    return mask;
  }
  const w = obj.w * W;
  const h = obj.h * H;
  const pts = rectPts(cx, cy, w, h, obj.angle || 0);
  fillPolyMask(mask, W, H, pts);
  dropShadow(buf, W, H, mask, 6, 9, 9, kind === 'paper' || kind === 'folder' ? 0.35 : 0.5);
  const color = obj.color || { paper: [236, 234, 228], sticky: [246, 226, 120], pen: [30, 40, 120], phone: [25, 25, 28], folder: [205, 160, 90] }[kind] || [200, 200, 200];
  const a = deg(obj.angle || 0);
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  // fake text rows for paper/sticky (unreadable dashes, never letters)
  const rows = [];
  if (kind === 'paper' || kind === 'sticky') {
    const pitch = kind === 'paper' ? Math.max(10, h * 0.035) : Math.max(12, h * 0.16);
    for (let yy = h * 0.08; yy < h * 0.92; yy += pitch) {
      const segs = [];
      let xx = w * 0.08;
      const end = w * (0.6 + 0.32 * r());
      while (xx < end) {
        const len = w * (0.03 + 0.09 * r());
        segs.push([xx, Math.min(xx + len, end)]);
        xx += len + w * (0.015 + 0.015 * r());
      }
      rows.push({ y: yy, h: pitch * (kind === 'paper' ? 0.36 : 0.3), segs });
    }
  }
  const [x0, y0, x1, y1] = polyBBox(pts, W, H);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * W + x;
    if (!mask[i]) continue;
    const lx = (x - cx) * ca + (y - cy) * sa + w / 2;
    const ly = -(x - cx) * sa + (y - cy) * ca + h / 2;
    let col = color;
    let f = 1;
    if (kind === 'phone') {
      const inset = Math.min(w, h) * 0.06;
      if (lx > inset && lx < w - inset && ly > inset * 2 && ly < h - inset * 2) col = [18, 22, 30];
      f = 1 + 0.25 * Math.max(0, 1 - Math.abs(lx - ly * 0.4 - w * 0.2) / (w * 0.15)) * 0.4;
    }
    if (kind === 'pen') f = 0.75 + 0.5 * Math.max(0, 1 - Math.abs(ly - h * 0.35) / (h * 0.5));
    for (const row of rows) {
      if (ly >= row.y && ly < row.y + row.h) {
        for (const [s0, s1] of row.segs) if (lx >= s0 && lx < s1) { col = [95, 95, 100]; break; }
      }
    }
    buf[i * 3] = col[0] * f; buf[i * 3 + 1] = col[1] * f; buf[i * 3 + 2] = col[2] * f;
  }
  return mask;
}

// ---------- page-space marks ----------
function boxOf(layout, name, kind = 'name', field = null) {
  const it = layout.items.find((x) => x.name === name && (field ? x.field === field : x.kind === kind));
  if (!it) throw new Error(`layout target not found: ${name} ${field || kind}`);
  return it.box; // page px
}
function applyStains(page, pw, ph, stains, layout, r, stainMask) {
  for (const s of stains) {
    let cx;
    let cy;
    if (s.target) {
      const [bx, by, bw, bh] = boxOf(layout, s.target);
      cx = bx + bw * (s.fx ?? 0.5);
      cy = by + bh * (s.fy ?? 0.5);
    } else {
      cx = s.at[0] * pw;
      cy = s.at[1] * ph;
    }
    const R = s.r;
    const edge = makeNoise(r, 64, 8, 6);
    const inner = makeFbm(r, pw, ph, R * 0.4, 3);
    const col = s.color || [128, 78, 36];
    for (let y = Math.max(0, Math.floor(cy - R * 1.3)); y < Math.min(ph, cy + R * 1.3); y++) {
      for (let x = Math.max(0, Math.floor(cx - R * 1.3)); x < Math.min(pw, cx + R * 1.3); x++) {
        const ang = Math.atan2(y - cy, x - cx);
        const re = R * (1 + 0.09 * edge(((ang + Math.PI) / (2 * Math.PI)) * 60, 2));
        const d = Math.hypot(x - cx, y - cy);
        if (d > re * 1.06) continue;
        const ring = Math.exp(-(((d - re) / (R * 0.05)) ** 2));
        const fill = d < re ? (s.fill ?? 0.32) * (0.75 + 0.5 * inner(x, y)) : 0;
        const a = clamp((s.strength ?? 1) * (fill + 0.55 * ring), 0, 0.95);
        const i = y * pw + x;
        stainMask[i] = Math.max(stainMask[i], a);
        for (let c = 0; c < 3; c++) page[i * 3 + c] *= 1 - a + (a * col[c]) / 255;
      }
    }
  }
}
function applyPen(page, pw, ph, marks, layout, r, penMask) {
  for (const m of marks) {
    const mask = new Float32Array(pw * ph);
    const width = m.width || 3;
    const col = m.color || [30, 50, 150];
    let pts = [];
    if (m.target) {
      const [bx, by, bw, bh] = boxOf(layout, m.target);
      if (m.type === 'scribble') {
        const from = bx + bw * (m.from ?? 0);
        const to = bx + bw * (m.to ?? 1);
        const n = Math.max(4, Math.round(((to - from) / bh) * (m.density ?? 2.2)));
        for (let k = 0; k <= n; k++) {
          const x = from + ((to - from) * k) / n + gauss(r) * 2;
          const y = k % 2 ? by + bh * 0.12 : by + bh * 0.9;
          pts.push([x, y + gauss(r) * 2]);
        }
        strokeMask(mask, pw, ph, pts, width);
      } else if (m.type === 'check') {
        const x = bx - 30 + (m.dx || 0);
        const y = by + bh * 0.6;
        strokeMask(mask, pw, ph, [[x, y], [x + 7, y + 9], [x + 24, y - 14]], width);
      } else if (m.type === 'circle') {
        const e = ellipsePts(bx + bw / 2, by + bh / 2, bw * 0.62, bh * 1.05, gauss(r) * 3, 40);
        e.push(e[0], e[1], e[2]);
        strokeMask(mask, pw, ph, e.map(([x, y]) => [x + gauss(r) * 1.2, y + gauss(r) * 1.2]), width);
      } else if (m.type === 'strike') {
        strokeMask(mask, pw, ph, [[bx - 4, by + bh * 0.55], [bx + bw * (m.to ?? 1) + 4, by + bh * 0.45]], width);
      } else if (m.type === 'underline') {
        strokeMask(mask, pw, ph, [[bx, by + bh + 2], [bx + bw * 0.5, by + bh + 4], [bx + bw, by + bh + 1]], width);
      }
    } else if (m.type === 'line') {
      pts = m.pts.map(([fx, fy]) => [fx * pw, fy * ph]);
      strokeMask(mask, pw, ph, pts, width);
    } else if (m.type === 'doodle') {
      // loose spiral doodle in a margin
      const cx = m.at[0] * pw;
      const cy = m.at[1] * ph;
      for (let t = 0; t < 18; t += 0.15) pts.push([cx + Math.cos(t) * t * 2.2, cy + Math.sin(t) * t * 1.6]);
      strokeMask(mask, pw, ph, pts, width);
    }
    const alpha = m.alpha ?? 0.9;
    for (let i = 0; i < pw * ph; i++) {
      const a = mask[i] * alpha;
      if (!a) continue;
      penMask[i] = Math.max(penMask[i], a);
      for (let c = 0; c < 3; c++) page[i * 3 + c] = page[i * 3 + c] * (1 - a) + Math.min(page[i * 3 + c], col[c]) * a;
    }
  }
}

// ---------- main degrade ----------
async function degradeCase(id) {
  const dir = path.join(CORPUS, id);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'eval-meta.json'), 'utf8'));
  const spec = meta.degrade;
  if (!meta.rough || !spec) return null;
  const r = rng(spec.seed ?? 1);
  const { data, info } = await sharp(path.join(dir, 'clean.png')).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const pw = info.width;
  const ph = info.height;
  const page = new Float32Array(pw * ph * 3);
  for (let i = 0; i < page.length; i++) page[i] = data[i];

  // layout boxes → page px
  let layout = { items: [] };
  const lp = path.join(dir, 'layout.json');
  if (fs.existsSync(lp)) {
    const raw = JSON.parse(fs.readFileSync(lp, 'utf8'));
    const s = pw / raw.viewport.w;
    layout = { items: raw.items.map((it) => ({ ...it, box: it.box.map((v) => v * s) })) };
  }

  // paper tone / fibre
  const paperN = makeNoise(r, pw, ph, 2.5);
  const tone = spec.paperTone || [1, 0.99, 0.965];
  for (let i = 0; i < pw * ph; i++) {
    const f = 1 + 0.025 * paperN(i % pw, Math.floor(i / pw));
    for (let c = 0; c < 3; c++) page[i * 3 + c] *= tone[c] * f;
  }
  const stainMask = new Float32Array(pw * ph);
  const penMask = new Float32Array(pw * ph);
  if (spec.stains) applyStains(page, pw, ph, spec.stains, layout, r, stainMask);
  if (spec.pen) applyPen(page, pw, ph, spec.pen, layout, r, penMask);

  // frame + background + under-clutter
  const [W, H] = spec.frame || [1500, 2000]; // ~3MP phone-share size
  const out = makeBackground(r, W, H, spec.background || 'laminate');
  for (const obj of spec.clutter || []) drawObject(out, W, H, obj, r);

  // page placement: scale, keystone, rotation, offset, corner jitter
  const s = (spec.scale ?? 0.85) * Math.min(W / pw, H / ph);
  const ks = spec.keystone || {};
  const halfW = (pw * s) / 2;
  const halfH = (ph * s) / 2;
  const top = ks.top ?? 1;
  const bottom = ks.bottom ?? 1;
  const left = ks.left ?? 1;
  const right = ks.right ?? 1;
  let corners = [
    [-halfW * top, -halfH * left],
    [halfW * top, -halfH * right],
    [halfW * bottom, halfH * right],
    [-halfW * bottom, halfH * left],
  ];
  const rot = deg(spec.rotate || 0);
  const ccx = W / 2 + (spec.offset?.[0] || 0) * W;
  const ccy = H / 2 + (spec.offset?.[1] || 0) * H;
  corners = corners.map(([x, y]) => [
    ccx + x * Math.cos(rot) - y * Math.sin(rot) + gauss(r) * (spec.jitter || 0) * W,
    ccy + x * Math.sin(rot) + y * Math.cos(rot) + gauss(r) * (spec.jitter || 0) * W,
  ]);
  const Hm = homography([[0, 0], [pw, 0], [pw, ph], [0, ph]], corners);
  const Hi = inv3(Hm);

  // page mask + drop shadow under page
  const pageMask = new Float32Array(W * H);
  fillPolyMask(pageMask, W, H, corners);
  dropShadow(out, W, H, pageMask, 7, 10, 10, 0.45);

  // warp fields
  const cr = spec.crumple;
  const dU = cr ? makeFbm(r, pw, ph, cr.cell || 110, 3) : null;
  const dV = cr ? makeFbm(r, pw, ph, cr.cell || 110, 3) : null;
  const hN = cr ? makeFbm(r, pw, ph, (cr.cell || 110) * 0.6, 4) : null;
  const creases = [];
  for (const c of spec.creases || []) {
    const a = deg(c.angle);
    creases.push({ px: c.at[0] * pw, py: c.at[1] * ph, nx: -Math.sin(a), ny: Math.cos(a), shift: c.shift ?? 1.5, dark: c.dark ?? 0.35, panel: c.panel ?? 0.96, w: c.width ?? 2.2 });
  }
  if (cr?.creases) {
    for (let k = 0; k < cr.creases; k++) {
      const a = r() * Math.PI;
      // crumple creases are finite segments (fade out at the ends), unlike full folds
      creases.push({ px: r() * pw, py: r() * ph, nx: -Math.sin(a), ny: Math.cos(a), shift: 0.8 + r() * 1.2, dark: 0.22 + r() * 0.18, panel: 0.97 + r() * 0.05, w: 1.6 + r(), len: (0.2 + r() * 0.35) * Math.max(pw, ph) });
    }
  }
  const curl = spec.curl;
  const cw = curl ? curl.width * pw : 0;
  const col = [0, 0, 0];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const [u, v] = applyH(Hi, x + 0.5, y + 0.5);
    if (u < -2 || v < -2 || u > pw + 2 || v > ph + 2) continue;
    let su = u;
    let sv = v;
    let shade = 1;
    if (curl) {
      const du = curl.side === 'right' ? u - (pw - cw) : cw - u;
      if (du > 0) {
        // cylinder model: projected distance t → arc length; foreshortening grows toward the edge
        const t = clamp(du / cw, 0, 1);
        const thMax = deg(curl.angle ?? 80);
        const th = Math.asin(t * Math.sin(thMax));
        const arc = (cw * th) / Math.sin(thMax);
        su = curl.side === 'right' ? pw - cw + arc : cw - arc;
        sv = ph / 2 + (v - ph / 2) * (1 + (curl.bulge ?? 0.06) * t * t) + (curl.lift ?? 14) * t * t;
        shade *= 1 - (curl.depth ?? 0.5) * (th / thMax) ** 2;
      }
    }
    if (cr) {
      su += (cr.amp || 6) * dU(u, v);
      sv += (cr.amp || 6) * dV(u, v);
      const gx = hN(u + 3, v) - hN(u - 3, v);
      const gy = hN(u, v + 3) - hN(u, v - 3);
      shade *= 1 + (cr.shade || 0.15) * (gx * 0.7 + gy * 0.7) * 6;
    }
    for (const c of creases) {
      const d = (u - c.px) * c.nx + (v - c.py) * c.ny;
      let f = 1;
      if (c.len) {
        const along = Math.abs(-(u - c.px) * c.ny + (v - c.py) * c.nx);
        f = clamp(1 - (along - c.len / 2) / 60, 0, 1);
        if (!f) continue;
      }
      const ad = Math.abs(d);
      if (ad < c.w) shade *= 1 - c.dark * f * (1 - ad / c.w);
      else if (d > 0 && d < c.w * 3) shade *= 1 + 0.07 * f;
      if (d > 0) {
        su += c.nx * c.shift * f;
        sv += c.ny * c.shift * f;
        shade *= 1 - (1 - c.panel) * f;
      }
    }
    if (su < 0 || sv < 0 || su > pw - 1 || sv > ph - 1) continue;
    bilinear(page, pw, ph, su, sv, col);
    const i = (y * W + x) * 3;
    // soft anti-aliased page edge
    const edge = clamp(Math.min(u, v, pw - u, ph - v) + 0.5, 0, 1);
    for (let c = 0; c < 3; c++) out[i + c] = out[i + c] * (1 - edge) + col[c] * shade * edge;
  }

  // over-page clutter (occluders)
  const overMask = new Float32Array(W * H);
  for (const o of spec.overlap || []) {
    let obj = o;
    if (o.target) {
      // anchor an occluder on a GT box (page coords → frame), then nudge by dx/dy (frame fractions)
      const [bx, by, bw, bh] = boxOf(layout, o.target);
      const [tx, ty] = applyH(Hm, bx + bw * (o.tfx ?? 0.5), by + bh * (o.tfy ?? 0.5));
      obj = { ...o, cx: tx / W + (o.dx || 0), cy: ty / H + (o.dy || 0) };
    }
    const m = drawObject(out, W, H, obj, r);
    for (let i = 0; i < W * H; i++) overMask[i] = Math.max(overMask[i], m[i]);
  }

  // uneven light / vignette
  const L = spec.light || {};
  const gdx = L.gradient?.[0] ?? 0.3;
  const gdy = L.gradient?.[1] ?? 0.2;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const nx = x / W - 0.5;
    const ny = y / H - 0.5;
    const f = (1 - (L.amount ?? 0.12) * (nx * gdx + ny * gdy) * 2) * (1 - (L.vignette ?? 0.25) * (nx * nx + ny * ny) * 2);
    const i = (y * W + x) * 3;
    out[i] *= f; out[i + 1] *= f; out[i + 2] *= f;
  }

  // hand / phone shadow
  const shadowMask = new Float32Array(W * H);
  let shadowStrength = 0;
  if (spec.shadow) {
    const sh = spec.shadow;
    shadowStrength = sh.strength ?? 0.55;
    const raw = new Float32Array(W * H);
    if (sh.shape === 'band') {
      fillPolyMask(raw, W, H, sh.pts.map(([fx, fy]) => [fx * W, fy * H]));
    } else {
      const cx = sh.cx * W;
      const cy = sh.cy * H;
      fillPolyMask(raw, W, H, ellipsePts(cx, cy, sh.rx * W, sh.ry * H, sh.angle || 0));
      if (sh.armTo) {
        const ax = sh.armTo[0] * W;
        const ay = sh.armTo[1] * H;
        const th = (sh.armWidth ?? 0.16) * W;
        const a = Math.atan2(ay - cy, ax - cx) + Math.PI / 2;
        const ox = (Math.cos(a) * th) / 2;
        const oy = (Math.sin(a) * th) / 2;
        fillPolyMask(raw, W, H, [[cx + ox, cy + oy], [ax + ox * 1.4, ay + oy * 1.4], [ax - ox * 1.4, ay - oy * 1.4], [cx - ox, cy - oy]]);
      }
      if (sh.fingers) {
        // 3-4 finger blobs extending from the hand ellipse
        for (const [fx, fy, frx, fry, fa] of sh.fingers) fillPolyMask(raw, W, H, ellipsePts(fx * W, fy * H, frx * W, fry * H, fa));
      }
    }
    const soft = gaussBlur(raw, W, H, (sh.soft ?? 0.025) * W);
    for (let i = 0; i < W * H; i++) {
      shadowMask[i] = soft[i];
      const f = 1 - shadowStrength * soft[i];
      out[i * 3] *= f * 0.97; out[i * 3 + 1] *= f; out[i * 3 + 2] *= f * (1 + 0.04 * soft[i]);
    }
  }

  // glare hotspots
  const glareMask = new Float32Array(W * H);
  for (const g of spec.glare || []) {
    let gx;
    let gy;
    if (g.target) {
      const [bx, by, bw, bh] = boxOf(layout, g.target);
      [gx, gy] = applyH(Hm, bx + bw * (g.fx ?? 0.5), by + bh * (g.fy ?? 0.5));
    } else {
      gx = g.cx * W;
      gy = g.cy * H;
    }
    const rx = g.rx * W;
    const ry = g.ry * W;
    const a = deg(g.angle || 0);
    const st = g.strength ?? 1.6;
    for (let y = Math.max(0, Math.floor(gy - ry * 3.5)); y < Math.min(H, gy + ry * 3.5); y++) {
      for (let x = Math.max(0, Math.floor(gx - rx * 3.5)); x < Math.min(W, gx + rx * 3.5); x++) {
        const dx = x - gx;
        const dy = y - gy;
        const lx = (dx * Math.cos(a) + dy * Math.sin(a)) / rx;
        const ly = (-dx * Math.sin(a) + dy * Math.cos(a)) / ry;
        const v = Math.min(1, st * Math.exp(-(lx * lx + ly * ly)));
        const i = y * W + x;
        glareMask[i] = Math.max(glareMask[i], v);
        out[i * 3] += (255 - out[i * 3]) * v;
        out[i * 3 + 1] += (252 - out[i * 3 + 1]) * v;
        out[i * 3 + 2] += (244 - out[i * 3 + 2]) * v;
      }
    }
  }

  // blur (optics)
  const n = W * H;
  if (spec.defocus) {
    const ch = splitRGB(out, n).map((c) => gaussBlur(c, W, H, spec.defocus));
    mergeRGB(ch, out, n);
  }
  if (spec.motion) {
    const len = spec.motion.len;
    const a = deg(spec.motion.angle || 0);
    const src = Float32Array.from(out);
    const tmp = [0, 0, 0];
    const steps = Math.max(2, Math.round(len));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let sr = 0, sg = 0, sb = 0;
      for (let k = 0; k < steps; k++) {
        const t = k / (steps - 1) - 0.5;
        bilinear(src, W, H, clamp(x + Math.cos(a) * len * t, 0, W - 1), clamp(y + Math.sin(a) * len * t, 0, H - 1), tmp);
        sr += tmp[0]; sg += tmp[1]; sb += tmp[2];
      }
      const i = (y * W + x) * 3;
      out[i] = sr / steps; out[i + 1] = sg / steps; out[i + 2] = sb / steps;
    }
  }

  // exposure / low light / sensor noise
  const ll = spec.lowlight;
  const exposure = ll?.exposure ?? 1;
  const gamma = ll?.gamma ?? 1;
  const cast = ll?.cast || [1, 1, 1];
  const noise = spec.noise ?? ll?.noise ?? 3;
  const chromaN = makeNoise(r, W, H, 2);
  for (let i = 0; i < n; i++) {
    const lum = (out[i * 3] + out[i * 3 + 1] + out[i * 3 + 2]) / 765;
    const sig = noise * (0.55 + 0.9 * Math.sqrt(Math.max(0.02, 1 - lum)));
    const ln = gauss(r) * sig;
    const cn = chromaN(i % W, Math.floor(i / W)) * sig * 0.6;
    for (let c = 0; c < 3; c++) {
      let v = clamp(out[i * 3 + c] / 255, 0, 1);
      v = Math.pow(v * exposure * cast[c], gamma) * 255;
      v += ln + (c === 1 ? -cn : cn);
      out[i * 3 + c] = v;
    }
  }

  const bytes = Buffer.alloc(n * 3);
  for (let i = 0; i < n * 3; i++) bytes[i] = clamp(Math.round(out[i]), 0, 255);
  let img = sharp(bytes, { raw: { width: W, height: H, channels: 3 } });
  const outW = spec.outWidth || W;
  if (outW !== W) img = img.resize({ width: outW });
  let jpg = await img.jpeg({ quality: spec.jpeg ?? 70, chromaSubsampling: '4:2:0', mozjpeg: false }).toBuffer();
  if (spec.jpeg2) jpg = await sharp(jpg).jpeg({ quality: spec.jpeg2, chromaSubsampling: '4:2:0' }).toBuffer();
  fs.writeFileSync(path.join(dir, 'rough.jpg'), jpg);

  // ---------- visibility estimate per GT box ----------
  const vis = [];
  for (const it of layout.items) {
    const [bx, by, bw, bh] = it.box;
    let total = 0, inframe = 0, visible = 0;
    const fb = [Infinity, Infinity, -Infinity, -Infinity];
    const reasons = { off_frame: 0, glare: 0, shadow: 0, stain: 0, pen: 0, covered: 0, curl: 0 };
    for (let gy = 0; gy < 3; gy++) for (let gx = 0; gx < 8; gx++) {
      total++;
      const u = bx + (bw * (gx + 0.5)) / 8;
      const v = by + (bh * (gy + 0.5)) / 3;
      const [x, y] = applyH(Hm, u, v);
      fb[0] = Math.min(fb[0], x); fb[1] = Math.min(fb[1], y); fb[2] = Math.max(fb[2], x); fb[3] = Math.max(fb[3], y);
      if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) { reasons.off_frame++; continue; }
      inframe++;
      const oi = Math.floor(y) * W + Math.floor(x);
      const pi = clamp(Math.floor(v), 0, ph - 1) * pw + clamp(Math.floor(u), 0, pw - 1);
      let occ = false;
      if (glareMask[oi] >= 0.72) { reasons.glare++; occ = true; }
      if (shadowStrength * shadowMask[oi] >= 0.62) { reasons.shadow++; occ = true; }
      if (stainMask[pi] >= 0.4) { reasons.stain++; occ = true; }
      if (penMask[pi] >= 0.5) { reasons.pen++; occ = true; }
      if (overMask[oi] >= 0.5) { reasons.covered++; occ = true; }
      if (curl) {
        const du = curl.side === 'right' ? u - (pw - cw) : cw - u;
        // source arc beyond ~0.75·cw into the curl is squeezed to a sliver (see cylinder model)
        if (du / cw > (curl.occlude ?? 0.75)) { reasons.curl++; occ = true; }
      }
      if (!occ) visible++;
    }
    const vf = visible / total;
    vis.push({
      kind: it.kind,
      name: it.name,
      field: it.field || null,
      inframe: +(inframe / total).toFixed(2),
      visible: +vf.toFixed(2),
      suggest: vf >= 0.9 ? 'certain' : vf >= 0.35 ? 'uncertain' : 'absent',
      frame_box: fb.map((q) => Math.round(q)),
      reasons: Object.fromEntries(Object.entries(reasons).filter(([, k]) => k > 0)),
    });
  }
  fs.writeFileSync(path.join(dir, 'visibility.json'), JSON.stringify({ id, frame: [W, H], items: vis }, null, 2) + '\n');
  return { id, bytes: jpg.length, flagged: vis.filter((v) => v.suggest !== 'certain') };
}

async function main() {
  const only = process.argv.slice(2);
  const ids = fs
    .readdirSync(CORPUS)
    .filter((d) => fs.existsSync(path.join(CORPUS, d, 'eval-meta.json')))
    .filter((d) => !only.length || only.includes(d))
    .sort();
  for (const id of ids) {
    const res = await degradeCase(id);
    if (!res) continue;
    const fl = res.flagged.map((v) => `${v.field ? v.field + ':' : ''}${v.name}=${v.suggest}(${v.visible})`).join(', ');
    console.log('rough', id, `${Math.round(res.bytes / 1024)}KB`, fl ? `flags: ${fl}` : '');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
