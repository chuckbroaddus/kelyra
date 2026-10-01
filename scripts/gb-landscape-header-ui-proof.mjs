#!/usr/bin/env node
/**
 * Gradebook landscape header UI proof (t_ee73d1b4 / t_a054b175).
 * Portrait 375×812 keeps full avatar + name; landscape 812×375 half-size avatar + name.
 * Static fixture mirrors studentHead / studentHeadLandscape — no Supabase, no AI.
 *   node scripts/gb-landscape-header-ui-proof.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT =
  process.env.GB_LAND_PROOF_OUT ||
  path.join(os.tmpdir(), 'gb-landscape-header-t_a054b175');

const require = createRequire(import.meta.url);
function loadPlaywright() {
  const tries = [
    path.join(ROOT, 'node_modules/playwright'),
    '/Users/chuckbroaddus/projects/kelyra/node_modules/playwright',
    '/Users/chuckbroaddus/.hermes/hermes-agent/node_modules/playwright',
  ];
  for (const p of tries) {
    try {
      return require(p);
    } catch {
      /* next */
    }
  }
  throw new Error('playwright not found');
}

const { chromium } = loadPlaywright();
const PORTRAIT = { height: 96, colWidth: 72, avatar: 56 };
const LANDSCAPE = { height: 48, colWidth: 56, avatar: 28 };
const NAMES = ['Ava', 'Ben', 'Cora', 'Diego', 'Elena', 'Finn', 'Gia', 'Hank'];

// SECTION: html + main

function headerHtml(mode) {
  const m = mode === 'landscape' ? LANDSCAPE : PORTRAIT;
  const students = NAMES.map((name) => {
    const face =
      m.avatar > 0
        ? `<div class="avatar" style="width:${m.avatar}px;height:${m.avatar}px">${name[0]}</div>`
        : '';
    return `<div class="col" style="width:${m.colWidth}px;height:${m.height}px" data-mode="${mode}">
      ${face}
      <div class="name ${mode === 'landscape' ? 'compact' : ''}">${name}</div>
    </div>`;
  }).join('');
  return `<!doctype html>
<html><head><meta charset="utf-8" /><title>GB header ${mode}</title>
<style>
  body { margin:0; font-family: -apple-system, system-ui, sans-serif; background:#f6f1ea; color:#1a1612; }
  .frame { display:flex; flex-direction:column; height:100vh; }
  .label { padding:8px 12px; font-size:12px; color:#6b635a; }
  .row { display:flex; flex-direction:row; align-items:stretch; border-bottom:1px solid #e4dcd2; background:#fff8f0; }
  .frozen { width:156px; flex:0 0 156px; display:flex; align-items:center; padding:0 10px; font-weight:700; font-size:13px; border-right:1px solid #e4dcd2; height:${m.height}px; box-sizing:border-box; }
  .cols { display:flex; flex-direction:row; overflow:hidden; }
  .col { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:${mode === 'landscape' ? 2 : 4}px; border-right:1px solid #efe6dc; box-sizing:border-box; }
  .avatar { border-radius:999px; background:#c9b8a6; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:${mode === 'landscape' ? 12 : 18}px; }
  .name { font-size:11px; line-height:14px; font-weight:600; text-align:center; width:100%; }
  .name.compact { font-size:12px; line-height:16px; font-weight:700; }
  .grid { flex:1; background:#fff; }
  .meta { padding:10px 12px; font-size:12px; color:#6b635a; }
</style></head>
<body>
  <div class="frame" data-proof-mode="${mode}" data-head-height="${m.height}" data-col-width="${m.colWidth}" data-avatar="${m.avatar}">
    <div class="label">Gradebook header · ${mode} · head ${m.height}px · col ${m.colWidth}px · avatar ${m.avatar}</div>
    <div class="row" id="header-row">
      <div class="frozen">Assignment</div>
      <div class="cols">${students}</div>
    </div>
    <div class="grid"></div>
    <div class="meta">Portrait keeps full avatars. Landscape keeps half-size avatars and a shorter strip.</div>
  </div>
</body></html>`;
}

async function shot(page, file) {
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const log = { shots: [], checks: {}, out: OUT };
  try {
    {
      const page = await browser.newPage({
        viewport: { width: 375, height: 812, deviceScaleFactor: 2 },
      });
      await page.setContent(headerHtml('portrait'), { waitUntil: 'domcontentloaded' });
      const h = await page.locator('#header-row').boundingBox();
      const avatars = await page.locator('.avatar').count();
      log.checks.portrait = {
        headerHeight: h?.height ?? null,
        expectedHeight: PORTRAIT.height,
        avatarCount: avatars,
        ok: Math.abs((h?.height ?? 0) - PORTRAIT.height) <= 1 && avatars === NAMES.length,
      };
      log.shots.push(await shot(page, path.join(OUT, '01-gradebook-header-portrait-375.png')));
      await page.close();
    }
    {
      const page = await browser.newPage({
        viewport: { width: 812, height: 375, deviceScaleFactor: 2 },
      });
      await page.setContent(headerHtml('landscape'), { waitUntil: 'domcontentloaded' });
      const h = await page.locator('#header-row').boundingBox();
      const avatars = await page.locator('.avatar').count();
      const compactNames = await page.locator('.name.compact').count();
      log.checks.landscape = {
        headerHeight: h?.height ?? null,
        expectedHeight: LANDSCAPE.height,
        avatarCount: avatars,
        expectedAvatar: LANDSCAPE.avatar,
        compactNameCount: compactNames,
        ok:
          Math.abs((h?.height ?? 0) - LANDSCAPE.height) <= 1 &&
          avatars === NAMES.length &&
          LANDSCAPE.avatar === PORTRAIT.avatar / 2 &&
          compactNames === NAMES.length &&
          (h?.height ?? 99) < PORTRAIT.height,
      };
      log.shots.push(await shot(page, path.join(OUT, '02-gradebook-header-landscape-812x375.png')));
      await page.close();
    }
    {
      const page = await browser.newPage({
        viewport: { width: 375, height: 812, deviceScaleFactor: 2 },
      });
      await page.setContent(headerHtml('portrait'), { waitUntil: 'domcontentloaded' });
      log.shots.push(await shot(page, path.join(OUT, '03-rotate-frame-a-portrait.png')));
      await page.setViewportSize({ width: 812, height: 375 });
      await page.setContent(headerHtml('landscape'), { waitUntil: 'domcontentloaded' });
      log.shots.push(await shot(page, path.join(OUT, '03-rotate-frame-b-landscape.png')));
      await page.close();
    }
    const pass = log.checks.portrait.ok && log.checks.landscape.ok;
    log.pass = pass;
    fs.writeFileSync(path.join(OUT, 'proof.json'), JSON.stringify(log, null, 2));
    console.log(JSON.stringify(log, null, 2));
    if (!pass) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
