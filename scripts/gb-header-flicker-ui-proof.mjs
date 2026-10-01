#!/usr/bin/env node
/**
 * Gradebook StickyTable H-scroll flicker UI proof (t_2338d5d5).
 * Standalone dual-scroller harness (no Supabase / no AI).
 * Portrait 375 + landscape 812x375 shots + scroll frame sequence.
 *
 *   node scripts/gb-header-flicker-ui-proof.mjs
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const OUT =
  process.env.GB_FLICKER_OUT ||
  path.join(ROOT, 'notes/qa-runs/gb-header-flicker-t_2338d5d5');

function loadPlaywright() {
  const tries = [
    path.join(ROOT, 'node_modules/playwright'),
    '/Users/chuckbroaddus/projects/kelyra/node_modules/playwright',
    '/Users/chuckbroaddus/.hermes/hermes-agent/node_modules/playwright',
  ];
  for (const t of tries) {
    try {
      return require(t);
    } catch {
      /* next */
    }
  }
  throw new Error('playwright not found');
}

function contentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  return 'text/plain; charset=utf-8';
}

// SECTION: main
async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const harnessDir = path.join(ROOT, 'scripts');
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    let rel = url.pathname === '/' ? '/gb-header-flicker-harness.html' : url.pathname;
    const filePath = path.join(harnessDir, path.basename(rel));
    if (!filePath.startsWith(harnessDir) || !fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end('missing');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType(filePath) });
    res.end(fs.readFileSync(filePath));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const origin = `http://127.0.0.1:${port}/`;

  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  const log = { shots: [], sweep: null, frames: [] };

  async function capture(view, name) {
    const page = await browser.newPage({
      viewport: { width: view.width, height: view.height, deviceScaleFactor: 2 },
    });
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(250);
    const file = path.join(OUT, name);
    await page.screenshot({ path: file, fullPage: true });
    log.shots.push({ name, file, ...view });
    await page.close();
    return file;
  }

  await capture({ width: 375, height: 812 }, '01-portrait-375.png');
  await capture({ width: 812, height: 375 }, '02-landscape-812x375.png');

  {
    const page = await browser.newPage({
      viewport: { width: 375, height: 812, deviceScaleFactor: 2 },
    });
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(150);
    const framesDir = path.join(OUT, 'scroll-frames');
    fs.mkdirSync(framesDir, { recursive: true });
    const max = await page.evaluate(() => {
      const bodyEl = document.getElementById('body');
      return Math.max(0, bodyEl.scrollWidth - bodyEl.clientWidth);
    });
    for (let i = 0; i <= 8; i++) {
      const x = (max * i) / 8;
      await page.evaluate((target) => {
        const headEl = document.getElementById('head');
        const bodyEl = document.getElementById('body');
        bodyEl.scrollLeft = target;
        headEl.scrollLeft = Math.max(0, target - (target > 0 ? 1.1 : 0));
      }, x);
      await page.waitForTimeout(40);
      const frame = path.join(framesDir, `frame-${String(i).padStart(2, '0')}.png`);
      await page.screenshot({ path: frame, fullPage: false });
      log.frames.push(frame);
    }
    log.sweep = await page.evaluate(async () => window.__gbProof.sweep(30));
    const mid = path.join(OUT, '03-scroll-mid-375.png');
    await page.screenshot({ path: mid, fullPage: true });
    log.shots.push({ name: '03-scroll-mid-375.png', file: mid });
    await page.close();
  }

  await browser.close();
  server.close();

  const pass =
    log.sweep &&
    log.sweep.delta <= 1.5 &&
    log.sweep.reverseAttempts === 0 &&
    log.shots.length >= 2 &&
    log.frames.length >= 5;

  const summary = {
    task: 't_2338d5d5',
    pass: Boolean(pass),
    root_cause:
      'StickyTable two-way H-scroll used an 80ms unlock timer; lagging follower onScroll became driver and scrollTo-fought the header (rapid flicker).',
    fix:
      'Driver claimed on begin-drag, held until that scroller ends; peer events ignored; sub-pixel epsilon skips no-op scrollTo; no short unlock timer.',
    sweep: log.sweep,
    shots: log.shots,
    frames: log.frames,
    out: OUT,
  };
  fs.writeFileSync(path.join(OUT, 'ui-proof-log.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  if (!pass) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
