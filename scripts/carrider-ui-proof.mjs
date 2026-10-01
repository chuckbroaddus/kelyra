#!/usr/bin/env node
/** Car-rider ingest UI proof @ 375px — drop fixtures onto Capture (no camera). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CORPUS = path.join(ROOT, 'notes/qa-fixtures/carrider-ingest');
const stamp = process.argv[2] || '202610011130';
const OUT = path.join(CORPUS, 'runs', stamp, 'ui-proof');
const TMP = '/tmp/carrider-ingest-eval';
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });

const require = createRequire(import.meta.url);
function loadPlaywright() {
  for (const t of [
    path.join(ROOT, 'node_modules/playwright'),
    '/Users/chuckbroaddus/.hermes/hermes-agent/node_modules/playwright',
  ]) {
    try {
      return require(t);
    } catch {
      /* */
    }
  }
  throw new Error('playwright missing');
}

function drive(persona, route, outJson) {
  return new Promise((resolve) => {
    const p = spawn(
      'node',
      ['scripts/ui-drive.mjs', '--surface', 'web', '--persona', persona, '--route', route, '--out', outJson],
      { cwd: ROOT, env: { ...process.env }, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) => resolve({ code, out, err }));
  });
}

// MAIN_BELOW

const CASES = [
  { id: 'V01', file: 'V01/clean.png', label: 'V01-clean-plate-review-375', note: 'clean rear plate vehicle' },
  { id: 'V05', file: 'V05/photo.jpg', label: 'V05-partial-plate-375', note: 'partial plate unreadable' },
  { id: 'T01', file: 'T01/clean.png', label: 'T01-hang-tag-375', note: 'hang tag plate+tag' },
  { id: 'F02', file: 'F02/clean.png', label: 'F02-authorized-pickup-375', note: 'authorized pickup form' },
  { id: 'N01', file: 'N01/clean.png', label: 'N01-negative-homework-375', note: 'negative homework reject' },
];

async function main() {
  const ridePacket = path.join(OUT, 'ride-chrome.json');
  const capPacket = path.join(OUT, 'capture-chrome.json');
  console.log('ui-drive /ride');
  await drive('teacher', '/ride', ridePacket);
  console.log('ui-drive /capture');
  await drive('teacher', '/capture', capPacket);

  for (const [name, pkt] of [
    ['ride-chrome', ridePacket],
    ['capture-chrome', capPacket],
  ]) {
    const dir = pkt.replace(/\.json$/, '');
    for (const f of ['web-390.png', 'web-1280.png', 'web-after.png']) {
      const src = path.join(dir, f);
      if (fs.existsSync(src)) {
        const dest = path.join(OUT, `${name}-${f}`);
        fs.copyFileSync(src, dest);
        fs.copyFileSync(src, path.join(TMP, path.basename(dest)));
      }
    }
  }

  const { chromium } = loadPlaywright();
  let browser;
  try {
    browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
  } catch {
    browser = await chromium.launch({ headless: true });
  }
  const context = browser.contexts()[0] || (await browser.newContext());
  const page = await context.newPage();
  await page.setViewportSize({ width: 375, height: 812 });

  const shots = [];
  for (const c of CASES) {
    const fixture = path.join(CORPUS, c.file);
    if (!fs.existsSync(fixture)) {
      console.warn('missing', fixture);
      continue;
    }
    console.log('drop', c.id);
    await page.goto('http://127.0.0.1:8081/capture', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2500);
    let fileChooser = null;
    try {
      const waiter = page.waitForEvent('filechooser', { timeout: 4000 });
      await page.getByText(/Library|Photos|Files|Add photo|Choose/i).first().click({ timeout: 3000 });
      fileChooser = await waiter;
    } catch {
      fileChooser = null;
    }
    if (fileChooser) {
      await fileChooser.setFiles(fixture);
    } else {
      const buf = fs.readFileSync(fixture);
      const b64 = buf.toString('base64');
      const name = path.basename(fixture);
      const mime = name.endsWith('.png') ? 'image/png' : 'image/jpeg';
      await page.evaluate(
        async ({ b64, name, mime }) => {
          const bin = atob(b64);
          const arr = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          const file = new File([arr], name, { type: mime });
          const dt = new DataTransfer();
          dt.items.add(file);
          const target =
            document.querySelector('[data-capture-drop]') ||
            document.querySelector('[class*="Photo"]') ||
            document.body;
          target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
        },
        { b64, name, mime },
      );
    }
    const note = page.getByPlaceholder(/note|say what/i).first();
    if ((await note.count()) > 0) {
      await note.fill('license plate vehicle rider check-in');
    }
    const ask = page.getByText(/Ask AI|Read|Classify/i).first();
    if ((await ask.count()) > 0) {
      await ask.click({ timeout: 3000 }).catch(() => null);
    }
    await page.waitForTimeout(8000);
    const dest = path.join(OUT, `${c.label}.png`);
    await page.screenshot({ path: dest, fullPage: false });
    fs.copyFileSync(dest, path.join(TMP, `${c.label}.png`));
    shots.push({ id: c.id, path: dest, note: c.note });
    console.log('shot', dest);
  }

  try {
    await page.close();
  } catch {
    /* */
  }

  const log = { stamp, shots, out: OUT, tmp: TMP };
  fs.writeFileSync(path.join(OUT, 'ui-proof-log.json'), JSON.stringify(log, null, 2));
  fs.writeFileSync(path.join(TMP, 'ui-proof-log.json'), JSON.stringify(log, null, 2));
  console.log('done', OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
