#!/usr/bin/env node
/**
 * Seeded, reproducible "rough phone photo" degradation for anskey-ingest fixtures.
 *   node scripts/degrade-anskey-fixtures.mjs            # all cases with eval-meta.rough
 *   node scripts/degrade-anskey-fixtures.mjs K20 K28    # selected
 *
 * Input: <case>/clean.png (from render-anskey-ingest-pngs.mjs) + eval-meta.json rough_recipe.
 * Output: <case>/rough.jpg. Uses only `sharp` (already a dependency) + JS pixel ops.
 *
 * Pipeline per case:
 *   1. page space (840x1100 CSS px, scaled to the PNG): highlighter, pen marks, sticky note,
 *      glare hotspot, crumple/fold height-field (displacement + shading)
 *   2. background (desk wood + clutter / dark table) with optional underlay page (student paper)
 *   3. placement: rotation + scale + offset + per-corner perspective jitter → homography warp
 *   4. photo space: blur / motion blur, shadow blobs, low light (gain/gamma/cast/vignette),
 *      sensor noise, JPEG quality
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CORPUS = path.join(ROOT, 'notes/qa-fixtures/anskey-ingest');
const OUT_W = 1080;
const OUT_H = 1440;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rnd() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(r) {
  let u = 0;
  let v = 0;
  while (u === 0) u = r();
  while (v === 0) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

/** RGB float image */
function img(w, h, fill = [255, 255, 255]) {
  const d = new Float32Array(w * h * 3);
  for (let i = 0; i < w * h; i += 1) {
    d[i * 3] = fill[0];
    d[i * 3 + 1] = fill[1];
    d[i * 3 + 2] = fill[2];
  }
  return { w, h, d };
}
async function load(file, cropH = null) {
  let s = sharp(file).removeAlpha();
  if (cropH) {
    const m = await sharp(file).metadata();
    s = s.extract({ left: 0, top: 0, width: m.width, height: Math.min(m.height, Math.round(cropH * (m.width / 840))) });
  }
  const { data, info } = await s.raw().toBuffer({ resolveWithObject: true });
  const out = img(info.width, info.height);
  for (let i = 0; i < data.length; i += 1) out.d[i] = data[i];
  return out;
}
function toBuf(im) {
  const b = Buffer.alloc(im.w * im.h * 3);
  for (let i = 0; i < b.length; i += 1) b[i] = clamp(Math.round(im.d[i]));
  return b;
}
async function svgRGBA(svg, w, h) {
  const { data } = await sharp(Buffer.from(svg)).resize(w, h, { fit: 'fill' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return data;
}
/** blend RGBA overlay onto float image. mode: over | multiply | screen */
function blend(im, rgba, mode = 'over', opacity = 1) {
  for (let i = 0; i < im.w * im.h; i += 1) {
    const a = (rgba[i * 4 + 3] / 255) * opacity;
    if (a <= 0) continue;
    for (let c = 0; c < 3; c += 1) {
      const base = im.d[i * 3 + c];
      const top = rgba[i * 4 + c];
      let v;
      if (mode === 'multiply') v = (base * top) / 255;
      else if (mode === 'screen') v = 255 - ((255 - base) * (255 - top)) / 255;
      else v = top;
      im.d[i * 3 + c] = base * (1 - a) + v * a;
    }
  }
}
function sample(im, x, y) {
  // bilinear; returns null outside
  if (x < 0 || y < 0 || x > im.w - 1 || y > im.h - 1) return null;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, im.w - 1);
  const y1 = Math.min(y0 + 1, im.h - 1);
  const fx = x - x0;
  const fy = y - y0;
  const o = [0, 0, 0];
  for (let c = 0; c < 3; c += 1) {
    const a = im.d[(y0 * im.w + x0) * 3 + c];
    const b = im.d[(y0 * im.w + x1) * 3 + c];
    const cc = im.d[(y1 * im.w + x0) * 3 + c];
    const dd = im.d[(y1 * im.w + x1) * 3 + c];
    o[c] = a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + cc * (1 - fx) * fy + dd * fx * fy;
  }
  return o;
}

// ---------- homography ----------
function solve(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c += 1) {
    let p = c;
    for (let r = c + 1; r < n; r += 1) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r += 1) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k += 1) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}
/** homography mapping src pts -> dst pts (4 each) */
function homography(src, dst) {
  const A = [];
  const b = [];
  for (let i = 0; i < 4; i += 1) {
    const [x, y] = src[i];
    const [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  const h = solve(A, b);
  return [...h, 1];
}
function applyH(H, x, y) {
  const w = H[6] * x + H[7] * y + H[8];
  return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w];
}
/** warp page onto dst with quad (tl,tr,br,bl in dst px). Edge antialias via 1px feather. */
function warpOnto(dst, page, quad) {
  const Hinv = homography(quad, [[0, 0], [page.w, 0], [page.w, page.h], [0, page.h]]);
  for (let y = 0; y < dst.h; y += 1) {
    for (let x = 0; x < dst.w; x += 1) {
      const [sx, sy] = applyH(Hinv, x + 0.5, y + 0.5);
      if (sx < -1 || sy < -1 || sx > page.w || sy > page.h) continue;
      const p = sample(page, Math.min(Math.max(sx, 0), page.w - 1), Math.min(Math.max(sy, 0), page.h - 1));
      if (!p) continue;
      const edge = Math.min(sx + 1, sy + 1, page.w - sx, page.h - sy);
      const a = Math.max(0, Math.min(1, edge));
      const i = (y * dst.w + x) * 3;
      for (let c = 0; c < 3; c += 1) dst.d[i + c] = dst.d[i + c] * (1 - a) + p[c] * a;
    }
  }
}
function placeQuad(place, pw, ph) {
  const s = (place.scale ?? 0.85) * Math.min(OUT_W / pw, OUT_H / ph);
  const cx = OUT_W / 2 + (place.dx ?? 0) * OUT_W;
  const cy = OUT_H / 2 + (place.dy ?? 0) * OUT_H;
  const th = ((place.rot ?? 0) * Math.PI) / 180;
  const corners = [[-pw / 2, -ph / 2], [pw / 2, -ph / 2], [pw / 2, ph / 2], [-pw / 2, ph / 2]];
  const jit = place.corners || [[0, 0], [0, 0], [0, 0], [0, 0]];
  return corners.map(([x, y], i) => {
    const X = x * s;
    const Y = y * s;
    return [cx + X * Math.cos(th) - Y * Math.sin(th) + jit[i][0] * OUT_W, cy + X * Math.sin(th) + Y * Math.cos(th) + jit[i][1] * OUT_H];
  });
}

// ---------- page-space effects ----------
function pageSvg(w, h, inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 840 ${Math.round((h * 840) / w)}">${inner}</svg>`;
}
async function fxHighlighter(page, e, r) {
  const [cr, cg, cb] = e.color || [255, 236, 60];
  const rects = e.rects
    .map(([x, y, w, h]) => {
      const sk = (r() * 2 - 1) * 3;
      return `<path d="M${x} ${y + sk} L${x + w} ${y - sk} L${x + w + 4} ${y + h - sk} L${x - 3} ${y + h + sk} Z" fill="rgb(${cr},${cg},${cb})" opacity="0.85"/>`;
    })
    .join('');
  blend(page, await svgRGBA(pageSvg(page.w, page.h, rects), page.w, page.h), 'multiply', 1);
}
async function fxPen(page, e, r) {
  const [cr, cg, cb] = e.color || [200, 30, 40];
  const col = `rgb(${cr},${cg},${cb})`;
  const j = (a) => (r() * 2 - 1) * a;
  const parts = e.marks.map((m) => {
    if (m.kind === 'check') return `<path d="M${m.x - 12} ${m.y - 2} L${m.x - 3 + j(2)} ${m.y + 10} L${m.x + 16} ${m.y - 18 + j(3)}" stroke="${col}" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    if (m.kind === 'circle') return `<ellipse cx="${m.x}" cy="${m.y}" rx="${m.rx}" ry="${m.ry}" transform="rotate(${j(10)} ${m.x} ${m.y})" stroke="${col}" stroke-width="2.6" fill="none"/>`;
    if (m.kind === 'underline') return `<path d="M${m.x} ${m.y} q ${m.w / 2} ${j(4)} ${m.w} ${j(3)}" stroke="${col}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    if (m.kind === 'scribble') {
      let d = `M${m.x} ${m.y + m.h / 2}`;
      for (let k = 0; k < 9; k += 1) d += ` L${m.x + (k + 1) * (m.w / 9)} ${m.y + (k % 2 ? 0 : m.h) + j(3)}`;
      return `<path d="${d}" stroke="${col}" stroke-width="3.4" fill="none" stroke-linejoin="round"/>`;
    }
    if (m.kind === 'text') return `<text x="${m.x}" y="${m.y}" font-family="Bradley Hand, Noteworthy, Marker Felt, cursive" font-size="${m.size || 22}" fill="${col}" transform="rotate(${j(4)} ${m.x} ${m.y})">${String(m.text).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`;
    return '';
  });
  blend(page, await svgRGBA(pageSvg(page.w, page.h, parts.join('')), page.w, page.h), 'over', 0.92);
}
async function fxSticky(page, e) {
  const { x, y, w, h, rot = 0, color = '#ffe873', text = '' } = e;
  const inner = `<defs><filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter></defs>
<g transform="rotate(${rot} ${x + w / 2} ${y + h / 2})"><rect x="${x + 6}" y="${y + 9}" width="${w}" height="${h}" fill="black" opacity="0.35" filter="url(#sh)"/>
<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/><rect x="${x}" y="${y}" width="${w}" height="26" fill="black" opacity="0.06"/>
<text x="${x + 20}" y="${y + h / 2 + 10}" font-family="Marker Felt, Noteworthy, cursive" font-size="28" fill="#1f2937">${text}</text></g>`;
  blend(page, await svgRGBA(pageSvg(page.w, page.h, inner), page.w, page.h), 'over', 1);
}
function fxGlare(page, e) {
  const k = page.w / 840;
  const cx = e.cx * k;
  const cy = e.cy * k;
  const rx = e.rx * k;
  const ry = e.ry * k;
  const core = e.core ?? 0.5;
  for (let y = 0; y < page.h; y += 1) {
    for (let x = 0; x < page.w; x += 1) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const d = Math.sqrt(dx * dx + dy * dy);
      // flat blown-out core, then smooth falloff to ~2.2 radii
      let a = d <= core ? 1 : Math.max(0, 1 - (d - core) / (2.2 - core));
      a = Math.pow(a, 1.6) * (e.strength ?? 1);
      // wide soft bloom so the hotspot reads as a reflection, not a white-out patch
      const bloom = 0.35 * Math.exp(-(d * d) / (2 * 2.4 * 2.4));
      if (a <= 0 && bloom < 0.01) continue;
      const i = (y * page.w + x) * 3;
      // float overexposure (>255) so later low-light/gain passes keep the core blown out
      const level = e.level ?? 345;
      const tint = [0.97, 0.99, 1.0];
      for (let c = 0; c < 3; c += 1) {
        const v = page.d[i + c] + (level * tint[c] - page.d[i + c]) * a;
        page.d[i + c] = v + (level - v) * bloom * (1 - a);
      }
    }
  }
}
function fxCrumple(page, e, r) {
  const k = page.w / 840;
  const W = page.w;
  const H = page.h;
  const amt = e.amount ?? 0.7;
  const hgt = new Float32Array(W * H);
  const bumps = [];
  for (let b = 0; b < (e.bumps ?? 20); b += 1) bumps.push({ x: r() * W, y: r() * H, s: (30 + r() * 110) * k, a: (r() * 2 - 1) * 40 * k * amt });
  const seg = (x1, y1, x2, y2, a, w, soft) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const L = Math.hypot(dx, dy);
    return { x1, y1, ux: dx / L, uy: dy / L, L, a, w, soft };
  };
  const lines = (e.creases || []).map(([x1, y1, x2, y2]) => seg(x1 * k, y1 * k, x2 * k, y2 * k, (r() > 0.5 ? 1 : -1) * 7 * k * (0.5 + amt), 9 * k, false));
  const nW = Math.round((e.wrinkles ?? 40) * amt);
  for (let q = 0; q < nW; q += 1) {
    const x = r() * W;
    const y = r() * H;
    const th = r() * Math.PI;
    const len = (60 + r() * 260) * k;
    lines.push(seg(x, y, x + Math.cos(th) * len, y + Math.sin(th) * len, (r() * 2 - 1) * 3.2 * k, 5 * k, true));
  }
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      let v = 0;
      for (const b of bumps) {
        const dx = x - b.x;
        const dy = y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 9 * b.s * b.s) v += b.a * Math.exp(-d2 / (2 * b.s * b.s));
      }
      for (const c of lines) {
        const px = x - c.x1;
        const py = y - c.y1;
        const t = px * c.ux + py * c.uy;
        const d = Math.abs(-px * c.uy + py * c.ux);
        if (d > 6 * c.w) continue;
        let along = 1;
        if (c.soft) {
          if (t < 0 || t > c.L) continue;
          along = Math.sin((Math.PI * t) / c.L);
        }
        v += c.a * along * Math.exp(-d / c.w);
      }
      hgt[y * W + x] = v;
    }
  }
  const src = { w: W, h: H, d: Float32Array.from(page.d) };
  const lx = -0.6;
  const ly = -0.8;
  for (let y = 1; y < H - 1; y += 1) {
    for (let x = 1; x < W - 1; x += 1) {
      const gx = (hgt[y * W + x + 1] - hgt[y * W + x - 1]) / 2;
      const gy = (hgt[(y + 1) * W + x] - hgt[(y - 1) * W + x]) / 2;
      const p = sample(src, Math.min(W - 1, Math.max(0, x + gx * 1.5)), Math.min(H - 1, Math.max(0, y + gy * 1.5)));
      const shade = 1 + 0.32 * (gx * lx + gy * ly);
      const i = (y * W + x) * 3;
      for (let c = 0; c < 3; c += 1) page.d[i + c] = p[c] * Math.max(0.6, Math.min(1.1, shade));
    }
  }
}

// ---------- background ----------
async function background(bg, r) {
  const kind = bg?.kind || 'desk';
  let inner = '';
  if (kind === 'table') {
    const [cr, cg, cb] = bg.tone || [80, 80, 80];
    inner += `<rect width="${OUT_W}" height="${OUT_H}" fill="rgb(${cr},${cg},${cb})"/>`;
  } else {
    inner += `<rect width="${OUT_W}" height="${OUT_H}" fill="rgb(138,96,62)"/>`;
    for (let k = 0; k < 140; k += 1) {
      const y = r() * OUT_H;
      const t = 0.5 + r() * 0.5;
      inner += `<path d="M0 ${y} C ${OUT_W * 0.3} ${y + (r() - 0.5) * 40}, ${OUT_W * 0.6} ${y + (r() - 0.5) * 40}, ${OUT_W} ${y + (r() - 0.5) * 30}" stroke="rgb(${Math.round(90 * t)},${Math.round(58 * t)},${Math.round(34 * t)})" stroke-width="${1 + r() * 4}" fill="none" opacity="${0.25 + r() * 0.4}"/>`;
    }
  }
  if (bg?.clutter) {
    // pen, mug ring + mug, phone, paper clip, eraser
    const px = 60 + r() * 200;
    inner += `<g transform="rotate(${-30 + r() * 20} ${px} ${OUT_H - 120})"><rect x="${px}" y="${OUT_H - 140}" width="300" height="20" rx="9" fill="#1d4ed8"/><rect x="${px + 290}" y="${OUT_H - 137}" width="34" height="14" rx="5" fill="#d1d5db"/><rect x="${px + 20}" y="${OUT_H - 146}" width="70" height="6" fill="#9ca3af"/></g>`;
    inner += `<circle cx="${OUT_W - 90}" cy="110" r="105" fill="#f5f5f4"/><circle cx="${OUT_W - 90}" cy="110" r="88" fill="#3f2a1d"/><circle cx="${OUT_W - 90}" cy="110" r="88" fill="none" stroke="#e7e5e4" stroke-width="6"/>`;
    inner += `<circle cx="${110 + r() * 60}" cy="${200 + r() * 80}" r="70" fill="none" stroke="#5b3a22" stroke-width="5" opacity="0.5"/>`;
    if (bg.busy) {
      inner += `<g transform="rotate(${8 + r() * 10} ${OUT_W - 160} ${OUT_H - 220})"><rect x="${OUT_W - 260}" y="${OUT_H - 420}" width="200" height="400" rx="28" fill="#111827"/><rect x="${OUT_W - 250}" y="${OUT_H - 405}" width="180" height="370" rx="20" fill="#1f2937"/></g>`;
      inner += `<g transform="rotate(${-12} 120 ${OUT_H / 2})"><rect x="-40" y="${OUT_H / 2 - 260}" width="240" height="320" fill="#f1f5f9"/><text x="0" y="${OUT_H / 2 - 200}" font-size="20" fill="#475569" font-family="Helvetica">Field trip permission</text><rect x="0" y="${OUT_H / 2 - 180}" width="160" height="6" fill="#cbd5e1"/><rect x="0" y="${OUT_H / 2 - 160}" width="180" height="6" fill="#cbd5e1"/></g>`;
      inner += `<rect x="${OUT_W / 2}" y="${OUT_H - 60}" width="90" height="34" rx="6" fill="#f9a8d4" transform="rotate(14 ${OUT_W / 2} ${OUT_H - 60})"/>`;
    }
    inner += `<path d="M${OUT_W - 200} ${OUT_H - 40} l 40 -8 a 6 6 0 0 1 0 12 l -36 7 a 4 4 0 0 1 0 -8 l 30 -6" stroke="#9ca3af" stroke-width="3" fill="none"/>`;
  }
  const bgImg = img(OUT_W, OUT_H);
  blend(bgImg, await svgRGBA(`<svg xmlns="http://www.w3.org/2000/svg" width="${OUT_W}" height="${OUT_H}">${inner}</svg>`, OUT_W, OUT_H), 'over', 1);
  return bgImg;
}
async function dropShadow(dst, quad, strength = 0.45) {
  const pts = quad.map(([x, y]) => `${(x + 10).toFixed(1)},${(y + 14).toFixed(1)}`).join(' ');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${OUT_W}" height="${OUT_H}"><defs><filter id="b" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="12"/></filter></defs><polygon points="${pts}" fill="black" filter="url(#b)"/></svg>`;
  blend(dst, await svgRGBA(svg, OUT_W, OUT_H), 'over', strength);
}

// ---------- photo-space ----------
async function fxShadow(im, e) {
  const shapes = e.shapes
    .map((s) => {
      if (s.kind === 'rect') return `<rect x="${s.x * OUT_W}" y="${s.y * OUT_H}" width="${s.w * OUT_W}" height="${s.h * OUT_H}" rx="40" transform="rotate(${s.rot || 0} ${(s.x + s.w / 2) * OUT_W} ${(s.y + s.h / 2) * OUT_H})"/>`;
      return `<ellipse cx="${s.cx * OUT_W}" cy="${s.cy * OUT_H}" rx="${s.rx * OUT_W}" ry="${s.ry * OUT_H}" transform="rotate(${s.rot || 0} ${s.cx * OUT_W} ${s.cy * OUT_H})"/>`;
    })
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${OUT_W}" height="${OUT_H}"><defs><filter id="b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${(e.blur ?? 0.05) * OUT_W}"/></filter></defs><g fill="rgb(20,22,30)" filter="url(#b)">${shapes}</g></svg>`;
  blend(im, await svgRGBA(svg, OUT_W, OUT_H), 'multiply', e.strength ?? 0.5);
}
function fxLowlight(im, e) {
  const gain = e.gain ?? 0.6;
  const gamma = e.gamma ?? 1.2;
  const cast = e.cast || [1, 1, 1];
  const vig = e.vignette ?? 0.4;
  for (let y = 0; y < im.h; y += 1) {
    for (let x = 0; x < im.w; x += 1) {
      const dx = x / im.w - 0.5;
      const dy = y / im.h - 0.5;
      const v = 1 - vig * Math.min(1, (dx * dx + dy * dy) * 2.2);
      const i = (y * im.w + x) * 3;
      for (let c = 0; c < 3; c += 1) im.d[i + c] = 255 * Math.pow(im.d[i + c] / 255, gamma) * gain * cast[c] * v;
    }
  }
}
function fxNoise(im, e, r) {
  const s = e.sigma ?? 10;
  for (let i = 0; i < im.w * im.h; i += 1) {
    const l = gauss(r) * s;
    for (let c = 0; c < 3; c += 1) im.d[i * 3 + c] += l + gauss(r) * s * 0.35;
  }
}
async function viaSharp(im, fn) {
  const b = toBuf(im);
  const out = await fn(sharp(b, { raw: { width: im.w, height: im.h, channels: 3 } })).raw().toBuffer();
  for (let i = 0; i < out.length; i += 1) im.d[i] = out[i];
}
function motionKernel(len, angleDeg) {
  const n = len % 2 ? len : len + 1;
  const k = new Array(n * n).fill(0);
  const th = (angleDeg * Math.PI) / 180;
  const c = (n - 1) / 2;
  for (let t = -c; t <= c; t += 0.25) {
    const x = Math.round(c + t * Math.cos(th));
    const y = Math.round(c + t * Math.sin(th));
    k[y * n + x] += 1;
  }
  const s = k.reduce((a, b) => a + b, 0);
  return { width: n, height: n, kernel: k.map((v) => v / s) };
}

async function degradeCase(id) {
  const dir = path.join(CORPUS, id);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'eval-meta.json'), 'utf8'));
  const R = meta.rough_recipe;
  if (!R) return false;
  const r = mulberry32(R.seed || 1);
  const page = await load(path.join(dir, 'clean.png'), R.pageHeight || null);
  for (const e of R.page || []) {
    if (e.type === 'highlighter') await fxHighlighter(page, e, r);
    else if (e.type === 'pen') await fxPen(page, e, r);
    else if (e.type === 'sticky') await fxSticky(page, e, r);
    else if (e.type === 'glare') fxGlare(page, e, r);
    else if (e.type === 'crumple') fxCrumple(page, e, r);
  }
  const out = await background(R.background, r);
  const ul = R.background?.underlay;
  if (ul) {
    const under = await load(path.join(CORPUS, ul.asset, 'clean.png'));
    const q = placeQuad(ul, under.w, under.h);
    await dropShadow(out, q, 0.35);
    warpOnto(out, under, q);
  }
  const quad = placeQuad(R.place || {}, page.w, page.h);
  await dropShadow(out, quad, 0.45);
  warpOnto(out, page, quad);
  for (const e of R.photo || []) {
    if (e.type === 'blur') await viaSharp(out, (s) => s.blur(e.sigma));
    else if (e.type === 'motion') await viaSharp(out, (s) => s.convolve(motionKernel(e.len, e.angle)));
    else if (e.type === 'shadow') await fxShadow(out, e);
    else if (e.type === 'lowlight') fxLowlight(out, e);
    else if (e.type === 'noise') fxNoise(out, e, r);
  }
  const q = (R.photo || []).find((e) => e.type === 'jpeg')?.quality ?? 70;
  const crop = (R.photo || []).find((e) => e.type === 'crop');
  let pipe = sharp(toBuf(out), { raw: { width: out.w, height: out.h, channels: 3 } });
  if (crop) {
    // framing crop (fractions of the photo): simulates the phone not capturing the whole page
    pipe = pipe.extract({
      left: Math.round((crop.x ?? 0) * out.w),
      top: Math.round((crop.y ?? 0) * out.h),
      width: Math.round((crop.w ?? 1) * out.w),
      height: Math.round((crop.h ?? 1) * out.h),
    });
  }
  await pipe
    .jpeg({ quality: q, chromaSubsampling: '4:2:0', mozjpeg: false })
    .toFile(path.join(dir, 'rough.jpg'));
  return true;
}

async function main() {
  const only = process.argv.slice(2);
  const ids = fs
    .readdirSync(CORPUS)
    .filter((d) => /^[KN]\d+$/.test(d) && fs.existsSync(path.join(CORPUS, d, 'eval-meta.json')))
    .filter((d) => !only.length || only.includes(d))
    .sort();
  let n = 0;
  for (const id of ids) {
    const t0 = Date.now();
    if (await degradeCase(id)) {
      n += 1;
      console.log('rough', id, `${Date.now() - t0}ms`);
    }
  }
  console.log('degraded', n);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
