#!/usr/bin/env node
/** People-ingest UI proof @375 via ui-drive seed + Playwright CDP drop. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CORPUS = path.join(ROOT, 'notes/qa-fixtures/people-ingest');
const STAMP = process.env.PEOPLE_UI_STAMP || '202610011128';
const OUT = path.join(CORPUS, 'runs', STAMP, 'ui-proof');
const TMP = '/tmp/people-ingest-eval/ui-proof';
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });
const require = createRequire(import.meta.url);

function loadPw() {
  for (const t of [path.join(ROOT, 'node_modules/playwright'), '/Users/chuckbroaddus/.hermes/hermes-agent/node_modules/playwright']) {
    try { return require(t); } catch { /* */ }
  }
  throw new Error('playwright missing');
}

const CASES = [
  { id: 'PC01', file: 'clean.png', label: 'PC01-parent-card-review-375' },
  { id: 'SC01', file: 'clean.png', label: 'SC01-student-emergency-375' },
  { id: 'SC03', file: 'photo.jpg', label: 'SC03-handwritten-student-375' },
  { id: 'MP01', file: 'clean.png', label: 'MP01-directory-multi-375' },
  { id: 'N01', file: 'clean.png', label: 'N01-homework-negative-375' },
];

async function main() {
  spawnSync('node', [path.join(ROOT, 'scripts/ui-drive.mjs'), '--surface', 'web', '--persona', 'teacher', '--route', '/capture', '--out', path.join(TMP, 'seed.json')], { cwd: ROOT, encoding: 'utf8', timeout: 180000 });
  const { chromium } = loadPw();
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
  const context = browser.contexts()[0] || await browser.newContext();
  const page = await context.newPage();
  await page.setViewportSize({ width: 375, height: 812 });
  const results = [];
  for (const c of CASES) {
    const img = path.join(CORPUS, c.id, c.file);
    const outPng = path.join(OUT, `${c.label}.png`);
    const tmpPng = path.join(TMP, `${c.label}.png`);
    try {
      await page.goto('http://127.0.0.1:8081/capture', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(2000);
      const inputs = await page.$$('input[type=file]');
      if (inputs.length) await inputs[0].setInputFiles(img);
      else {
        const b64 = fs.readFileSync(img).toString('base64');
        await page.evaluate(async ({ b64, name, mime }) => {
          const bin = atob(b64);
          const arr = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          const file = new File([arr], name, { type: mime });
          const dt = new DataTransfer();
          dt.items.add(file);
          const target = document.body;
          target.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer: dt }));
          target.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
          target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
        }, { b64, name: path.basename(img), mime: img.endsWith('.png') ? 'image/png' : 'image/jpeg' });
      }
      await page.waitForTimeout(14000);
      const bodyText = await page.innerText('body').catch(() => '');
      await page.screenshot({ path: outPng, fullPage: false });
      fs.copyFileSync(outPng, tmpPng);
      const bad = /Could not read/i.test(bodyText) || (/Sign in/i.test(bodyText) && !/Parent|Student|Save/i.test(bodyText));
      results.push({ id: c.id, label: c.label, path: outPng, ok: !bad, snippet: bodyText.slice(0, 200).replace(/\s+/g, ' ') });
      console.log(c.id, bad ? 'FAIL' : 'ok', outPng);
    } catch (err) {
      results.push({ id: c.id, ok: false, error: String(err.message || err) });
      console.log(c.id, 'ERR', err.message || err);
    }
  }
  try { await page.close(); } catch { /* */ }
  fs.writeFileSync(path.join(OUT, 'ui-proof.json'), JSON.stringify(results, null, 2));
  fs.copyFileSync(path.join(OUT, 'ui-proof.json'), path.join(TMP, 'ui-proof.json'));
  console.log('done', OUT);
}
main().catch((e) => { console.error(e); process.exit(1); });
