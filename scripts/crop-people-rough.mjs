#!/usr/bin/env node
/**
 * Resolution probe for the people-ingest rough corpus: crop rough.jpg to the text area.
 *
 *   node scripts/crop-people-rough.mjs PR01 PR08 PH04           # writes <case>/rough-crop.jpg
 *   CROP_OUT=/tmp/view node scripts/crop-people-rough.mjs PR09  # eye-check copy elsewhere (PNG)
 *
 * The crop box is the page's text area — full page width, from the page top down to the last GT box
 * (+4% of the page) — mapped into rough.jpg through the page corners the degrader recorded
 * (bilinear approximation of its homography), padded by 2% of the frame and clamped to the frame.
 * Pixels are not resampled — only cropped — so the same detail reaches the model in fewer pixels.
 * eval-people-ingest.mjs scores rough-crop.jpg as variant `rough_crop` (bucket `rough_crop`)
 * next to the same case's `rough` variant.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CORPUS = path.join(ROOT, 'notes/qa-fixtures/people-ingest');
const require = createRequire(path.join(ROOT, 'package.json'));
const sharp = require('sharp');

async function cropCase(id) {
  const dir = path.join(CORPUS, id);
  const vis = JSON.parse(fs.readFileSync(path.join(dir, 'visibility.json'), 'utf8'));
  const [W, H] = vis.frame;
  const meta = await sharp(path.join(dir, 'rough.jpg')).metadata();
  const k = meta.width / W; // rough.jpg may be downscaled (outWidth)
  const [pw, ph] = vis.page;
  const [tl, tr, br, bl] = vis.page_corners;
  const lastY = Math.max(...vis.items.map((it) => it.page_box[1] + it.page_box[3]));
  const textBottom = Math.min(ph, lastY + 0.04 * ph);
  const at = (u, v) => {
    const s = u / pw;
    const t = v / ph;
    const top = [tl[0] + (tr[0] - tl[0]) * s, tl[1] + (tr[1] - tl[1]) * s];
    const bot = [bl[0] + (br[0] - bl[0]) * s, bl[1] + (br[1] - bl[1]) * s];
    return [top[0] + (bot[0] - top[0]) * t, top[1] + (bot[1] - top[1]) * t];
  };
  const pts = [at(0, 0), at(pw, 0), at(pw, textBottom), at(0, textBottom)];
  const pad = 0.02 * Math.max(W, H);
  const x0 = Math.min(...pts.map((q) => q[0])) - pad;
  const y0 = Math.min(...pts.map((q) => q[1])) - pad;
  const x1 = Math.max(...pts.map((q) => q[0])) + pad;
  const y1 = Math.max(...pts.map((q) => q[1])) + pad;
  const left = Math.max(0, Math.floor(x0 * k));
  const top = Math.max(0, Math.floor(y0 * k));
  const right = Math.min(meta.width, Math.ceil(x1 * k));
  const bottom = Math.min(meta.height, Math.ceil(y1 * k));
  const box = { left, top, width: right - left, height: bottom - top };
  const outDir = process.env.CROP_OUT;
  let out;
  if (outDir) {
    fs.mkdirSync(outDir, { recursive: true });
    out = path.join(outDir, `${id}-crop.png`);
    await sharp(path.join(dir, 'rough.jpg')).extract(box).png().toFile(out);
  } else {
    out = path.join(dir, 'rough-crop.jpg');
    // q95 re-encode of an un-resampled crop: adds ~no new artifacts on top of rough.jpg's own
    await sharp(path.join(dir, 'rough.jpg')).extract(box).jpeg({ quality: 95, chromaSubsampling: '4:4:4' }).toFile(out);
  }
  console.log('crop', id, `${meta.width}x${meta.height} -> ${box.width}x${box.height}`, path.relative(ROOT, out));
}

const ids = process.argv.slice(2);
if (!ids.length) {
  console.error('usage: node scripts/crop-people-rough.mjs <case id>...');
  process.exit(2);
}
for (const id of ids) await cropCase(id);
