#!/usr/bin/env node
/** Fast HTML→PNG for carrider fixtures. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CORPUS = path.join(ROOT, 'notes/qa-fixtures/carrider-ingest');
const require = createRequire(import.meta.url);

async function loadPlaywright() {
  const tries = [
    path.join(ROOT, 'node_modules/playwright'),
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

function makePhoto(cleanPng, photoJpg) {
  const py = path.join(__dirname, 'lib/gradebook-ingest-photo.py');
  if (fs.existsSync(py)) {
    const r = spawnSync('python3', [py, cleanPng, photoJpg], { encoding: 'utf8', timeout: 30000 });
    if (r.status === 0 && fs.existsSync(photoJpg)) return;
  }
  spawnSync('sips', ['-s', 'format', 'jpeg', cleanPng, '--out', photoJpg], {
    encoding: 'utf8',
    timeout: 15000,
  });
}

async function main() {
  const { chromium } = await loadPlaywright();
  const dirs = fs
    .readdirSync(CORPUS)
    .filter((d) => fs.existsSync(path.join(CORPUS, d, 'source.html')))
    .sort();
  console.log('render dirs', dirs.length);
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-gpu', '--no-first-run'],
  });
  const page = await browser.newPage({ viewport: { width: 840, height: 1100 } });
  for (const id of dirs) {
    const dir = path.join(CORPUS, id);
    const html = path.join(dir, 'source.html');
    const png = path.join(dir, 'clean.png');
    if (process.env.SKIP_EXISTING === '1' && fs.existsSync(png)) {
      console.log('skip', id);
      continue;
    }
    await page.goto(pathToFileURL(html).href, { waitUntil: 'load', timeout: 15000 });
    await page.screenshot({ path: png, type: 'png', fullPage: false });
    try {
      const st = fs.statSync(png);
      if (st.size > 380000) spawnSync('sips', ['-Z', '1000', png], { timeout: 10000 });
    } catch {
      /* */
    }
    let meta = {};
    const metaPath = path.join(dir, 'eval-meta.json');
    if (fs.existsSync(metaPath)) meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    if (meta.photo) {
      makePhoto(png, path.join(dir, 'photo.jpg'));
    }
    console.log('ok', id);
  }
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
