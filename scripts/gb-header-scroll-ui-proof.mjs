#!/usr/bin/env node
/**
 * GB StickyTable header scroll-sync UI proof (t_6cc16a3e).
 * Static harness mirrors the single-owner + translateX model.
 *   node scripts/gb-header-scroll-ui-proof.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'notes/qa-fixtures/gb-header-scroll/proof.html');
const OUT = path.join(ROOT, 'notes/qa-fixtures/gb-header-scroll/runs/t_6cc16a3e/ui-proof');
const MIRROR = '/tmp/gb-header-scroll-t_6cc16a3e';
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(MIRROR, { recursive: true });

const require = createRequire(import.meta.url);
function loadPlaywright() {
  for (const t of [
    path.join(ROOT, 'node_modules/playwright'),
    path.join(process.env.HOME || '', '.hermes/hermes-agent/node_modules/playwright'),
  ]) {
    try {
      return require(t);
    } catch {
      /* next */
    }
  }
  throw new Error('playwright missing');
}

const { chromium } = loadPlaywright();
const url = pathToFileURL(HTML).href;
const log = { shots: [], samples: [], ok: true };

async function shot(page, name) {
  const dest = path.join(OUT, name);
  await page.screenshot({ path: dest });
  fs.copyFileSync(dest, path.join(MIRROR, name));
  log.shots.push(dest);
  return dest;
}

async function runView(browser, view, tag) {
  const page = await browser.newPage({ viewport: view, deviceScaleFactor: 2 });
  await page.goto(url);
  await page.waitForFunction(() => window.__gbScrollProof);
  await shot(page, `${tag}-rest.png`);

  const max = await page.evaluate(() => window.__gbScrollProof.max());
  const frames = [0, Math.min(40, max), Math.min(120, max), Math.min(max * 0.5, max), max];
  for (let i = 0; i < frames.length; i += 1) {
    const sample = await page.evaluate((x) => window.__gbScrollProof.scrollTo(x), frames[i]);
    log.samples.push({ view: tag, ...sample });
    if (!sample.synced) log.ok = false;
    await shot(page, `${tag}-frame-${i}-x${Math.round(frames[i])}.png`);
  }
  // Overscroll-ish: clamp at ends already; nudge past with large value
  const end = await page.evaluate((x) => window.__gbScrollProof.scrollTo(x), max + 80);
  log.samples.push({ view: tag, end: true, ...end });
  if (!end.synced) log.ok = false;
  await shot(page, `${tag}-end.png`);
  await page.close();
}

const browser = await chromium.launch({ headless: true });
try {
  await runView(browser, { width: 375, height: 812 }, 'portrait-375');
  await runView(browser, { width: 812, height: 375 }, 'landscape-812x375');
} finally {
  await browser.close();
}

const summary = path.join(OUT, 'summary.json');
fs.writeFileSync(summary, JSON.stringify(log, null, 2));
fs.copyFileSync(summary, path.join(MIRROR, 'summary.json'));
console.log(log.ok ? 'PASS' : 'FAIL');
console.log('OUT', OUT);
console.log('samples', log.samples.length, 'shots', log.shots.length);
process.exit(log.ok ? 0 : 1);
