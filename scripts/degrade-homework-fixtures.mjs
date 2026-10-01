#!/usr/bin/env node
/**
 * Seeded, reproducible "rough phone photo" degrader for the homework-ingest corpus.
 *
 *   node scripts/degrade-homework-fixtures.mjs            # all cases whose eval-meta.json has `rough`
 *   node scripts/degrade-homework-fixtures.mjs H18 H23    # just these
 *
 * Input:  <case>/clean.png (from render-homework-ingest-pngs.mjs) + <case>/eval-meta.json `rough` recipe
 * Output: <case>/rough.jpg
 *
 * Uses `sharp` (already present in node_modules as a transitive dep; no new package.json dep) for
 * PNG/SVG decode, blur/convolve and JPEG encode. Geometry (homography, curl, crumple), lighting,
 * glare and sensor noise are plain JS on RGBA buffers, driven by a mulberry32 PRNG seeded from the
 * recipe so the same recipe always yields the same pixels.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CORPUS = path.join(ROOT, 'notes/qa-fixtures/homework-ingest');
const require = createRequire(path.join(ROOT, 'package.json'));
const sharp = require('sharp');

// ---------- rng ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(rng) {
  const u = Math.max(1e-9, rng());
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const clamp = (x, lo, hi) => (x < lo ? lo : x > hi ? hi : x);
const rr = (rng, a, b) => a + (b - a) * rng();

// ---------- raster helpers ----------
async function svgRaster(svg, w, h) {
  const { data } = await sharp(Buffer.from(svg), { density: 72 })
    .resize(w, h, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return data;
}
function overBlend(dst, src, opacity = 1) {
  for (let i = 0; i < dst.length; i += 4) {
    const a = (src[i + 3] / 255) * opacity;
    if (a <= 0) continue;
    dst[i] = src[i] * a + dst[i] * (1 - a);
    dst[i + 1] = src[i + 1] * a + dst[i + 1] * (1 - a);
    dst[i + 2] = src[i + 2] * a + dst[i + 2] * (1 - a);
  }
}
/** darken dst by alpha of mask (black shadow) */
function shadowBlend(dst, mask, opacity, w, h, dx = 0, dy = 0) {
  for (let y = 0; y < h; y++) {
    const sy = y - dy;
    if (sy < 0 || sy >= h) continue;
    for (let x = 0; x < w; x++) {
      const sx = x - dx;
      if (sx < 0 || sx >= w) continue;
      const a = (mask[(sy * w + sx) * 4 + 3] / 255) * opacity;
      if (a <= 0) continue;
      const i = (y * w + x) * 4;
      dst[i] *= 1 - a;
      dst[i + 1] *= 1 - a;
      dst[i + 2] *= 1 - a;
    }
  }
}
async function blurRGBA(buf, w, h, sigma) {
  if (!sigma || sigma < 0.3) return buf;
  const { data } = await sharp(Buffer.from(buf), { raw: { width: w, height: h, channels: 4 } })
    .blur(sigma)
    .raw()
    .toBuffer({ resolveWithObject: true });
  return data;
}

// ---------- geometry ----------
function solve(A, b) {
  const n = b.length;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((r, i) => r[n] / r[i]);
}
function homography(src, dst) {
  const A = [];
  const b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [X, Y] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -x * X, -y * X]);
    b.push(X);
    A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]);
    b.push(Y);
  }
  return [...solve(A, b), 1];
}
/** place = {cx, cy, width (fraction of W), rot deg, keyTop, keySide} → 4 corners TL,TR,BR,BL in px */
function quadFor(place, pw, ph, W, H) {
  const w = (place.width ?? 0.85) * W;
  const h = (w * ph) / pw;
  const kt = place.keyTop ?? 0;
  const ks = place.keySide ?? 0;
  const pts = [
    [-w / 2, -h / 2],
    [w / 2, -h / 2],
    [w / 2, h / 2],
    [-w / 2, h / 2],
  ].map(([x, y]) => {
    const xs = y < 0 ? 1 - kt / 2 : 1 + kt / 2;
    const ys = x > 0 ? 1 - ks / 2 : 1 + ks / 2;
    return [x * xs, y * ys];
  });
  const t = ((place.rot ?? 0) * Math.PI) / 180;
  const cx = (place.cx ?? 0.5) * W;
  const cy = (place.cy ?? 0.5) * H;
  return pts.map(([x, y]) => [cx + x * Math.cos(t) - y * Math.sin(t), cy + x * Math.sin(t) + y * Math.cos(t)]);
}

/** paper-space distortion: returns [srcU, srcV, shade] for displayed paper coords */
function makeDistort(recipe, pw, ph, rng) {
  const curl = recipe.curl;
  const crumple = recipe.crumple;
  const folds = recipe.folds || [];
  const waves = [];
  if (crumple) {
    const n = crumple.waves ?? 9;
    for (let k = 0; k < n; k++) {
      const ang = rr(rng, 0, Math.PI);
      const freq = rr(rng, 2.5, 11) / Math.max(pw, ph);
      waves.push({
        kx: Math.cos(ang) * freq * 2 * Math.PI,
        ky: Math.sin(ang) * freq * 2 * Math.PI,
        ph: rr(rng, 0, 2 * Math.PI),
        a: rr(rng, 0.4, 1) * (crumple.amp ?? 4),
      });
    }
  }
  const light = [Math.cos(0.8), Math.sin(0.8)];
  return (u, v) => {
    let su = u;
    let sv = v;
    let shade = 1;
    if (curl) {
      const nu = u / pw;
      const t = Math.max(0, (nu - (curl.start ?? 0.62)) / (1 - (curl.start ?? 0.62)));
      const yv = (v - ph / 2) / (ph / 2);
      su = u + (curl.squeeze ?? 30) * t * t * t;
      sv = v - (curl.fan ?? 28) * t * t * yv - (curl.bow ?? 10) * Math.sin(Math.PI * nu);
      shade *= 1 - (curl.dark ?? 0.32) * t * t + 0.08 * Math.exp(-((t - 0.45) ** 2) / 0.01);
    }
    if (waves.length) {
      let dx = 0;
      let gl = 0;
      for (const w of waves) {
        const s = w.kx * u + w.ky * v + w.ph;
        dx += w.a * Math.sin(s);
        gl += w.a * Math.cos(s) * (w.kx * light[0] + w.ky * light[1]);
      }
      su += dx * 0.7;
      sv += dx * 0.5;
      shade *= 1 + 0.16 * Math.tanh(gl * (crumple.shadeGain ?? 1));
    }
    for (const f of folds) {
      const pos = f.axis === 'v' ? u / pw : v / ph;
      const d = pos - f.pos;
      const side = d < 0 ? -1 : 1;
      const ad = Math.abs(d);
      shade *= side < 0 ? 1 - 0.06 * Math.exp(-ad / 0.08) : 0.9 + 0.1 * Math.min(1, ad / 0.35);
      if (ad < 0.004) shade *= 0.8;
      // continuous ridge (no tearing at the fold line)
      if (f.axis === 'v') su += (f.kink ?? 2) * Math.exp(-ad / 0.03);
      else sv += (f.kink ?? 2) * Math.exp(-ad / 0.03);
    }
    return [su, sv, shade];
  };
}

function sample(paper, pw, ph, u, v, out) {
  if (u < -1 || v < -1 || u > pw || v > ph) {
    out[3] = 0;
    return;
  }
  const x0 = Math.floor(u);
  const y0 = Math.floor(v);
  const fx = u - x0;
  const fy = v - y0;
  let r = 0, g = 0, b = 0, a = 0;
  for (let j = 0; j < 2; j++) {
    for (let i = 0; i < 2; i++) {
      const x = x0 + i;
      const y = y0 + j;
      const wgt = (i ? fx : 1 - fx) * (j ? fy : 1 - fy);
      if (x < 0 || y < 0 || x >= pw || y >= ph) continue;
      const k = (y * pw + x) * 4;
      r += paper[k] * wgt;
      g += paper[k + 1] * wgt;
      b += paper[k + 2] * wgt;
      a += 255 * wgt;
    }
  }
  if (a > 0) {
    const n = a / 255;
    out[0] = r / n;
    out[1] = g / n;
    out[2] = b / n;
  }
  out[3] = a;
}

/** warp paper into a fresh W×H RGBA layer */
function warpLayer(paper, pw, ph, quad, distort, W, H) {
  const Hinv = homography(quad, [
    [0, 0],
    [pw, 0],
    [pw, ph],
    [0, ph],
  ]);
  const layer = new Uint8ClampedArray(W * H * 4);
  const px = [0, 0, 0, 0];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const wq = Hinv[6] * x + Hinv[7] * y + Hinv[8];
      const u = (Hinv[0] * x + Hinv[1] * y + Hinv[2]) / wq;
      const v = (Hinv[3] * x + Hinv[4] * y + Hinv[5]) / wq;
      if (u < -2 || v < -2 || u > pw + 2 || v > ph + 2) continue;
      const [su, sv, shade] = distort ? distort(u, v) : [u, v, 1];
      sample(paper, pw, ph, su, sv, px);
      if (!px[3]) continue;
      const i = (y * W + x) * 4;
      layer[i] = px[0] * shade;
      layer[i + 1] = px[1] * shade;
      layer[i + 2] = px[2] * shade;
      layer[i + 3] = px[3];
    }
  }
  return layer;
}

// ---------- paper ----------
async function loadPaper(file, scale, opts = {}) {
  const meta = await sharp(file).metadata();
  const w = Math.round(meta.width * scale);
  let { data, info } = await sharp(file)
    .resize(w, null, { kernel: 'lanczos3' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let h = info.height;
  if (opts.trim !== false) {
    // crop to last row with "ink" (dark pixels) + padding, so short worksheets read as half-sheets
    let last = 0;
    for (let y = 0; y < h; y++) {
      let n = 0;
      for (let x = 0; x < w; x++) {
        const k = (y * w + x) * 4;
        if (0.3 * data[k] + 0.59 * data[k + 1] + 0.11 * data[k + 2] < 120) n++;
      }
      if (n > 3) last = y;
    }
    const nh = Math.min(h, Math.max(Math.round(h * (opts.minH ?? 0.45)), last + Math.round((opts.pad ?? 70) * scale)));
    data = data.subarray(0, nh * w * 4);
    h = nh;
  }
  return { data: new Uint8ClampedArray(data), w, h };
}

/** position helper: clean-px (cx/cy/cw/ch, pre-scale) wins over paper fractions (x/y/w/h) */
function pos(o, pw, ph, scale) {
  return {
    x: o.cx != null ? o.cx * scale : (o.x ?? 0.5) * pw,
    y: o.cy != null ? o.cy * scale : (o.y ?? 0.5) * ph,
    w: o.cw != null ? o.cw * scale : (o.w ?? 0.2) * pw,
    h: o.ch != null ? o.ch * scale : (o.h ?? 0.05) * ph,
  };
}

function paperOverlaySvg(recipe, pw, ph, rng, scale = 1) {
  const parts = [];
  const defs = `<defs><filter id="b6" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
<filter id="b2"><feGaussianBlur stdDeviation="1.4"/></filter><filter id="b3" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="3.5"/></filter><filter id="b14" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter></defs>`;
  // crumple creases: random polylines; dark crease + light ridge
  const cr = recipe.creases;
  if (cr) {
    for (let i = 0; i < (cr.count ?? 8); i++) {
      const x0 = rr(rng, -0.1, 1.1) * pw;
      const y0 = rr(rng, -0.1, 1.1) * ph;
      const ang = rr(rng, 0, Math.PI);
      const len = rr(rng, 0.4, 1.2) * Math.max(pw, ph);
      let pts = [[x0, y0]];
      let a = ang;
      for (let s = 0; s < 5; s++) {
        a += rr(rng, -0.35, 0.35);
        const [px, py] = pts[pts.length - 1];
        pts.push([px + (Math.cos(a) * len) / 5, py + (Math.sin(a) * len) / 5]);
      }
      const d = 'M' + pts.map((p) => p.map((n) => n.toFixed(1)).join(' ')).join(' L');
      const o = cr.strength ?? 0.35;
      parts.push(`<path d="${d}" stroke="#000" stroke-opacity="${(o * 0.35).toFixed(2)}" stroke-width="22" fill="none" filter="url(#b14)"/>`);
      parts.push(`<path d="${d}" stroke="#2a2a2a" stroke-opacity="${o.toFixed(2)}" stroke-width="1.8" fill="none" filter="url(#b2)"/>`);
      parts.push(`<path d="${d}" stroke="#fff" stroke-opacity="${(o * 1.4).toFixed(2)}" stroke-width="2.2" fill="none" transform="translate(2.5 2.5)" filter="url(#b2)"/>`);
    }
  }
  for (const f of recipe.folds || []) {
    const d = f.axis === 'v' ? `M${f.pos * pw} 0 L${f.pos * pw + 6} ${ph}` : `M0 ${f.pos * ph} L${pw} ${f.pos * ph - 5}`;
    parts.push(`<path d="${d}" stroke="#333" stroke-opacity="0.45" stroke-width="2" fill="none" filter="url(#b2)"/>`);
    parts.push(`<path d="${d}" stroke="#fff" stroke-opacity="0.7" stroke-width="3" fill="none" transform="translate(3 3)" filter="url(#b2)"/>`);
  }
  // eraser smudges: grey blurred smears with drag streaks
  for (const s of recipe.smudges || []) {
    const { x: cx, y: cy, w, h } = pos(s, pw, ph, scale);
    const op = s.opacity ?? 0.35;
    parts.push(`<g transform="rotate(${s.rot ?? -4} ${cx} ${cy})"><ellipse cx="${cx}" cy="${cy}" rx="${w / 2}" ry="${h / 2}" fill="#7b7b7b" fill-opacity="${op}" filter="url(#b6)"/>`);
    for (let k = 0; k < 7; k++) {
      const yy = cy + rr(rng, -h / 2, h / 2);
      parts.push(`<path d="M${cx - w / 2} ${yy} q ${w / 2} ${rr(rng, -6, 6)} ${w} 0" stroke="#6a6a6a" stroke-opacity="${(op * 0.45).toFixed(2)}" stroke-width="${rr(rng, 4, 10).toFixed(1)}" fill="none" filter="url(#b3)"/>`);
    }
    if (s.pill) {
      for (let k = 0; k < 10; k++) {
        parts.push(`<circle cx="${cx + rr(rng, -w / 2, w / 2)}" cy="${cy + rr(rng, -h, h)}" r="${rr(rng, 1.5, 3.5)}" fill="#c98c96" fill-opacity="0.8"/>`);
      }
    }
    parts.push('</g>');
  }
  // student pen marks / doodles
  for (const m of recipe.penMarks || []) {
    const { x, y } = pos(m, pw, ph, scale);
    const s = m.s ?? 1;
    const c = m.color ?? '#1d3a8f';
    const sw = (m.w ?? 3) * s;
    if (m.type === 'star')
      parts.push(`<path d="M${x} ${y - 30 * s} L${x + 9 * s} ${y - 9 * s} L${x + 30 * s} ${y - 8 * s} L${x + 13 * s} ${y + 6 * s} L${x + 19 * s} ${y + 28 * s} L${x} ${y + 15 * s} L${x - 19 * s} ${y + 28 * s} L${x - 13 * s} ${y + 6 * s} L${x - 30 * s} ${y - 8 * s} L${x - 9 * s} ${y - 9 * s} Z" stroke="${c}" stroke-width="${sw}" fill="none" stroke-linejoin="round"/>`);
    else if (m.type === 'scribble') {
      let d = `M${x} ${y}`;
      for (let k = 0; k < 14; k++) d += ` q ${rr(rng, 8, 20) * s} ${rr(rng, -40, 40) * s} ${rr(rng, 12, 26) * s} ${rr(rng, -8, 8) * s}`;
      parts.push(`<path d="${d}" stroke="${c}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`);
    } else if (m.type === 'doodle') {
      parts.push(`<g stroke="${c}" stroke-width="${sw}" fill="none" stroke-linecap="round"><circle cx="${x}" cy="${y}" r="${26 * s}"/><circle cx="${x - 9 * s}" cy="${y - 6 * s}" r="${3 * s}"/><circle cx="${x + 9 * s}" cy="${y - 6 * s}" r="${3 * s}"/><path d="M${x - 12 * s} ${y + 8 * s} q ${12 * s} ${12 * s} ${24 * s} 0"/></g>`);
    } else if (m.type === 'line') {
      parts.push(`<path d="M${x} ${y} q ${(m.dx ?? 200) * s * 0.5} ${rr(rng, -20, 20)} ${(m.dx ?? 200) * s} ${(m.dy ?? 30) * s}" stroke="${c}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`);
    } else if (m.type === 'blot') {
      parts.push(`<ellipse cx="${x}" cy="${y}" rx="${9 * s}" ry="${6 * s}" fill="${c}" fill-opacity="0.85" filter="url(#b2)"/>`);
    }
  }
  if (!parts.length) return null;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${ph}">${defs}${parts.join('')}</svg>`;
}

// ---------- desk + clutter ----------
function deskSvg(W, H, rng, kind) {
  const palettes = {
    wood: ['#8a5f3d', '#6e4a2e', '#a77a52'],
    laminate: ['#c8c1b2', '#b3ab9b', '#d9d3c6'],
    grey: ['#5d6570', '#4b525c', '#6f7883'],
    carpet: ['#4d5a6b', '#3e4958', '#5d6b7d'],
  };
  const [base, dark, light] = palettes[kind] || palettes.wood;
  const parts = [`<rect width="${W}" height="${H}" fill="${base}"/>`];
  const n = kind === 'carpet' ? 0 : 70;
  for (let i = 0; i < n; i++) {
    const y = rng() * H;
    const c = rng() < 0.5 ? dark : light;
    parts.push(
      `<path d="M-20 ${y.toFixed(0)} C ${W / 3} ${(y + rr(rng, -40, 40)).toFixed(0)}, ${(2 * W) / 3} ${(y + rr(rng, -40, 40)).toFixed(0)}, ${W + 20} ${(y + rr(rng, -30, 30)).toFixed(0)}" stroke="${c}" stroke-opacity="${rr(rng, 0.12, 0.45).toFixed(2)}" stroke-width="${rr(rng, 1, 7).toFixed(1)}" fill="none"/>`,
    );
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${parts.join('')}</svg>`;
}
function clutterSvg(items, W, H) {
  const ds = `<defs><filter id="ds" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur in="SourceAlpha" stdDeviation="7"/><feOffset dx="8" dy="10"/><feComponentTransfer><feFuncA type="linear" slope="0.5"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
  const g = items.map((it) => {
    const x = it.x * W;
    const y = it.y * H;
    const s = it.s ?? 1;
    const tr = `translate(${x} ${y}) rotate(${it.rot ?? 0}) scale(${s})`;
    let body = '';
    switch (it.type) {
      case 'pencil':
        body = `<rect x="-260" y="-13" width="440" height="26" fill="#e9b72b"/><rect x="-260" y="-4" width="440" height="3" fill="#c99412"/><rect x="180" y="-13" width="34" height="26" fill="#b9b9b9"/><rect x="214" y="-13" width="40" height="26" rx="6" fill="#ee93a7"/><path d="M-260 -13 L-330 0 L-260 13 Z" fill="#e8cfa8"/><path d="M-308 -4 L-330 0 L-308 4 Z" fill="#333"/>`;
        break;
      case 'eraser':
        body = `<rect x="-70" y="-34" width="140" height="68" rx="12" fill="#f0a3b3"/><rect x="-70" y="-34" width="50" height="68" rx="12" fill="#e58aa0"/><ellipse cx="30" cy="5" rx="25" ry="12" fill="#999" fill-opacity="0.35"/>`;
        break;
      case 'sticky':
        body = `<rect x="-110" y="-110" width="220" height="220" fill="#fbe86a"/><text x="-90" y="-40" font-family="Marker Felt" font-size="34" fill="#333">${it.text ?? 'quiz fri!'}</text><path d="M-90 10 h150 M-90 50 h120" stroke="#555" stroke-width="3"/>`;
        break;
      case 'calculator':
        body = `<rect x="-150" y="-230" width="300" height="460" rx="24" fill="#2a2e35"/><rect x="-118" y="-200" width="236" height="80" rx="6" fill="#aebd9e"/>` +
          Array.from({ length: 20 }, (_, k) => `<rect x="${-118 + (k % 4) * 62}" y="${-95 + Math.floor(k / 4) * 62}" width="50" height="46" rx="8" fill="${k % 4 === 3 ? '#e07b39' : '#555b66'}"/>`).join('');
        break;
      case 'mug':
        body = `<circle r="120" fill="#ececec"/><circle r="98" fill="#3e2414"/><ellipse cx="-30" cy="-30" rx="30" ry="14" fill="#fff" fill-opacity="0.25"/><rect x="110" y="-30" width="70" height="60" rx="26" fill="none" stroke="#ececec" stroke-width="22"/>`;
        break;
      case 'ring':
        body = `<circle r="95" fill="none" stroke="#7a5230" stroke-opacity="0.35" stroke-width="9"/>`;
        return `<g transform="${tr}">${body}</g>`;
      case 'ruler':
        body = `<rect x="-380" y="-36" width="760" height="72" fill="#dce8f0" fill-opacity="0.85"/>` +
          Array.from({ length: 38 }, (_, k) => `<path d="M${-370 + k * 20} -36 v${k % 5 ? 14 : 26}" stroke="#334" stroke-width="2"/>`).join('');
        break;
      case 'phone':
        body = `<rect x="-90" y="-180" width="180" height="360" rx="26" fill="#111"/><rect x="-80" y="-165" width="160" height="330" rx="16" fill="#1d2633"/>`;
        break;
      case 'clip':
        body = `<path d="M-40 -10 v60 a20 20 0 0 0 40 0 v-80 a14 14 0 0 0 -28 0 v70" stroke="#a9aeb5" stroke-width="5" fill="none"/>`;
        break;
      default:
        body = '';
    }
    return `<g transform="${tr}" filter="url(#ds)">${body}</g>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${ds}${g.join('')}</svg>`;
}

// ---------- scene-level light ----------
async function handShadowMask(hs, W, H) {
  const cx = hs.x * W;
  const cy = hs.y * H;
  const r = (hs.r ?? 0.22) * W;
  // palm blob + 4 fingers + forearm off-frame toward `from`
  const ang = hs.rot ?? -30;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><filter id="f" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${hs.blur ?? 45}"/></filter></defs>
<g transform="translate(${cx} ${cy}) rotate(${ang})" filter="url(#f)" fill="#000">
<ellipse rx="${r}" ry="${r * 0.8}"/>${[0, 1, 2, 3].map((k) => `<rect x="${-r * 0.75 + k * r * 0.42}" y="${-r * 2}" width="${r * 0.3}" height="${r * 1.4}" rx="${r * 0.15}"/>`).join('')}
<rect x="${-r * 0.8}" y="${r * 0.3}" width="${r * 1.6}" height="${H * 1.5}"/></g></svg>`;
  return svgRaster(svg, W, H);
}

async function degradeCase(id, opts = {}) {
  const dir = path.join(CORPUS, id);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'eval-meta.json'), 'utf8'));
  const recipe = meta.rough;
  if (!recipe) return null;
  const rng = mulberry32(recipe.seed ?? 1);
  const [W, H] = recipe.out ?? [1200, 1600];
  const scale = recipe.scale ?? 1.5;

  const paper = await loadPaper(path.join(dir, 'clean.png'), scale, recipe.paper || {});
  const ov = paperOverlaySvg(recipe, paper.w, paper.h, rng, scale);
  if (ov) overBlend(paper.data, await svgRaster(ov, paper.w, paper.h));
  if (recipe.fadeInk) {
    // faint pencil: lift dark values toward paper
    const f = recipe.fadeInk;
    for (let i = 0; i < paper.data.length; i += 4) {
      for (let c = 0; c < 3; c++) paper.data[i + c] = 255 - (255 - paper.data[i + c]) * f;
    }
  }

  // scene
  const scene = new Uint8ClampedArray(await svgRaster(deskSvg(W, H, rng, recipe.desk ?? 'wood'), W, H));
  const under = (recipe.clutter || []).filter((c) => !c.over);
  const overItems = (recipe.clutter || []).filter((c) => c.over);
  if (under.length) overBlend(scene, await svgRaster(clutterSvg(under, W, H), W, H));

  const sheets = [];
  if (recipe.overlap) {
    const op = await loadPaper(path.join(CORPUS, recipe.overlap.src, 'clean.png'), scale, recipe.overlap.paper || {});
    sheets.push({ p: op, place: recipe.overlap.place, distort: null });
  }
  sheets.push({ p: paper, place: recipe.place ?? {}, distort: makeDistort(recipe, paper.w, paper.h, rng) });
  let mainFwd = null;
  for (const s of sheets) {
    const quad = quadFor(s.place, s.p.w, s.p.h, W, H);
    if (s.p === paper)
      mainFwd = homography(
        [
          [0, 0],
          [s.p.w, 0],
          [s.p.w, s.p.h],
          [0, s.p.h],
        ],
        quad,
      );
    const layer = warpLayer(s.p.data, s.p.w, s.p.h, quad, s.distort, W, H);
    const sh = await blurRGBA(layer, W, H, 10);
    shadowBlend(scene, sh, 0.45, W, H, 9, 12);
    overBlend(scene, layer);
  }
  if (overItems.length) overBlend(scene, await svgRaster(clutterSvg(overItems, W, H), W, H));

  // lighting gradient + vignette
  const lg = recipe.light ?? { angle: 110, strength: 0.18 };
  const la = (lg.angle * Math.PI) / 180;
  const vig = recipe.vignette ?? 0.25;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const nx = x / W - 0.5;
      const ny = y / H - 0.5;
      const t = (nx * Math.cos(la) + ny * Math.sin(la) + 0.7) / 1.4;
      const f = (1 - lg.strength * clamp(t, 0, 1)) * (1 - vig * (nx * nx + ny * ny) * 2);
      const i = (y * W + x) * 4;
      scene[i] *= f;
      scene[i + 1] *= f;
      scene[i + 2] *= f;
    }
  }
  if (recipe.handShadow) {
    const m = await handShadowMask(recipe.handShadow, W, H);
    shadowBlend(scene, m, recipe.handShadow.opacity ?? 0.5, W, H);
  }
  if (recipe.lowLight) {
    const { gain = 0.55, cast = [1, 0.9, 0.72], gamma = 1.15 } = recipe.lowLight;
    for (let i = 0; i < scene.length; i += 4) {
      for (let c = 0; c < 3; c++) scene[i + c] = 255 * Math.pow((scene[i + c] / 255) * gain * cast[c], gamma);
    }
  }
  for (const g of recipe.glare || []) {
    // glare anchored on paper (clean px pcx/pcy, follows the warp) or in frame fractions (x/y)
    let gx = (g.x ?? 0.5) * W;
    let gy = (g.y ?? 0.5) * H;
    if (g.pcx != null && mainFwd) {
      const u = g.pcx * scale;
      const v = g.pcy * scale;
      const wq = mainFwd[6] * u + mainFwd[7] * v + mainFwd[8];
      gx = (mainFwd[0] * u + mainFwd[1] * v + mainFwd[2]) / wq;
      gy = (mainFwd[3] * u + mainFwd[4] * v + mainFwd[5]) / wq;
    }
    const rx = (g.rx ?? 0.14) * W;
    const ry = (g.ry ?? g.rx ?? 0.1) * W;
    for (let y = Math.max(0, Math.floor(gy - ry * 3)); y < Math.min(H, gy + ry * 3); y++) {
      for (let x = Math.max(0, Math.floor(gx - rx * 3)); x < Math.min(W, gx + rx * 3); x++) {
        const d2 = ((x - gx) / rx) ** 2 + ((y - gy) / ry) ** 2;
        let a = (g.strength ?? 0.85) * Math.exp(-d2 * 1.6);
        const cr = g.core ?? 0.35;
        if (d2 < cr * cr) a = Math.max(a, (g.coreLevel ?? 0.97) * (1 - (Math.sqrt(d2) / cr) ** 3));
        const i = (y * W + x) * 4;
        scene[i] += (255 - scene[i]) * a;
        scene[i + 1] += (252 - scene[i + 1]) * a;
        scene[i + 2] += (245 - scene[i + 2]) * a;
      }
    }
  }

  let img = sharp(Buffer.from(scene), { raw: { width: W, height: H, channels: 4 } });
  let buf = scene;
  if (recipe.motion) {
    const n = recipe.motion.len | 1;
    const ang = ((recipe.motion.angle ?? 0) * Math.PI) / 180;
    const k = new Array(n * n).fill(0);
    const c = (n - 1) / 2;
    for (let s = -c; s <= c; s += 0.25) {
      const xx = Math.round(c + s * Math.cos(ang));
      const yy = Math.round(c + s * Math.sin(ang));
      k[yy * n + xx] = 1;
    }
    const { data } = await img.convolve({ width: n, height: n, kernel: k }).raw().toBuffer({ resolveWithObject: true });
    buf = new Uint8ClampedArray(data);
    img = sharp(Buffer.from(buf), { raw: { width: W, height: H, channels: 4 } });
  }
  if (recipe.defocus) {
    const { data } = await img.blur(recipe.defocus).raw().toBuffer({ resolveWithObject: true });
    buf = new Uint8ClampedArray(data);
  } else if (!recipe.motion) {
    const { data } = await img.blur(0.6).raw().toBuffer({ resolveWithObject: true });
    buf = new Uint8ClampedArray(data);
  }
  const nz = recipe.noise ?? { sigma: 4, chroma: 1 };
  if (nz.sigma) {
    for (let i = 0; i < buf.length; i += 4) {
      const l = gauss(rng) * nz.sigma;
      for (let c = 0; c < 3; c++) buf[i + c] = buf[i + c] + l + gauss(rng) * nz.sigma * (nz.chroma ?? 0.6) * 0.6;
    }
  }
  const q = recipe.jpeg ?? { quality: 62 };
  let out = sharp(Buffer.from(buf), { raw: { width: W, height: H, channels: 4 } }).removeAlpha();
  if (q.double) {
    const small = await out
      .resize(Math.round(W * 0.6))
      .jpeg({ quality: q.double, chromaSubsampling: '4:2:0' })
      .toBuffer();
    out = sharp(small).resize(W, H);
  }
  const dst = path.join(dir, 'rough.jpg');
  await out.jpeg({ quality: q.quality ?? 62, chromaSubsampling: '4:2:0' }).toFile(dst);
  return dst;
}

async function main() {
  const ids = process.argv.slice(2);
  const dirs = (ids.length ? ids : fs.readdirSync(CORPUS))
    .filter((d) => fs.existsSync(path.join(CORPUS, d, 'eval-meta.json')))
    .sort();
  let n = 0;
  for (const id of dirs) {
    const meta = JSON.parse(fs.readFileSync(path.join(CORPUS, id, 'eval-meta.json'), 'utf8'));
    if (!meta.rough) continue;
    if (!fs.existsSync(path.join(CORPUS, id, 'clean.png'))) {
      console.warn('skip (no clean.png)', id);
      continue;
    }
    const t0 = Date.now();
    const dst = await degradeCase(id);
    n++;
    console.log('rough', id, (meta.rough.effects || []).join('+'), `${Date.now() - t0}ms`, path.relative(ROOT, dst));
  }
  console.log('degraded', n, 'cases');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
