#!/usr/bin/env node
/**
 * Car-rider ingest UI proof @ 375px (web, no camera).
 *
 *   node scripts/carrider-ui-proof.mjs <stamp> [--port 8097]
 *
 * Needs: worktree Expo web on --port (not 8081), QA Chrome CDP on :9223,
 * persona file for `teacher`. Feeds fixture files through the Capture
 * "Photo or Video" file chooser, taps "Ask AI to process", waits for the
 * vehicle review card (plate / make / model / tag / riders / pickups) and
 * screenshots it. Opens one tab on QA Chrome and always closes it.
 * Never prints session tokens.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CORPUS = path.join(ROOT, 'notes/qa-fixtures/carrider-ingest');
const stamp = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'latest';
const portIdx = process.argv.indexOf('--port');
const WEB_PORT = portIdx > 0 ? Number(process.argv[portIdx + 1]) : 8097;
const ORIGIN = `http://127.0.0.1:${WEB_PORT}`;
const OUT = path.join(CORPUS, 'runs', stamp, 'ui-proof');
const TMP = '/tmp/carrider-ingest-eval';
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });

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

const CASES = [
  { id: 'V01', file: 'V01/photo.jpg', label: 'V01-plate-photo-review-375', note: 'license plate', wait: 'plate' },
  { id: 'V05', file: 'V05/photo.jpg', label: 'V05-partial-plate-375', note: 'license plate', wait: 'any' },
  { id: 'T01', file: 'T01/photo.jpg', label: 'T01-hang-tag-375', note: 'rider check-in hang tag', wait: 'any' },
  { id: 'F02', file: 'F02/clean.png', label: 'F02-authorized-pickup-375', note: 'rider check-in pickup form', wait: 'any' },
  { id: 'N01', file: 'N01/clean.png', label: 'N01-negative-homework-375', note: '', wait: 'intent' },
];

function startPersona() {
  return new Promise((resolve, reject) => {
    const child = spawn('node', ['scripts/ui-persona-session.mjs', '--persona', 'teacher'], { cwd: ROOT });
    let out = '';
    const timer = setTimeout(() => reject(new Error('PERSONA_NOT_READY')), 60000);
    child.stdout.on('data', (d) => {
      out += d;
      const m = out.match(/INJECT_PORT=(\d+)/);
      if (m) {
        clearTimeout(timer);
        resolve({ child, port: Number(m[1]) });
      }
    });
    child.stderr.on('data', () => {});
    child.on('exit', () => reject(new Error('PERSONA_EXITED')));
  });
}

async function settle(page, c) {
  const start = Date.now();
  while (Date.now() - start < 90000) {
    const state = await page.evaluate(() => {
      const text = document.body.innerText || '';
      const inputs = Array.from(document.querySelectorAll('input')).map((i) => i.value).filter(Boolean);
      return {
        asking: /Asking AI…|Reading plate \/ vehicle…/.test(text),
        vehicle: /This will be a Ride vehicle/.test(text),
        intent: /This will be (a|an) /.test(text),
        readable: /Plate not readable|Not a car-rider document|Car tag #|Riders:|Authorized pickup:/.test(text),
        inputs,
        failed: /Could not read|Classify failed/.test(text),
      };
    });
    if (state.failed) return { ok: false, state };
    if (!state.asking) {
      if (c.wait === 'intent' && state.intent) return { ok: true, state };
      if (state.vehicle && (state.inputs.length >= 1 || state.readable)) {
        await page.waitForTimeout(1500);
        return { ok: true, state };
      }
    }
    await page.waitForTimeout(1000);
  }
  return { ok: false, state: null };
}

async function main() {
  const { chromium } = loadPlaywright();
  const persona = await startPersona();
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
  const context = browser.contexts()[0];
  const page = await context.newPage();
  const shots = [];
  try {
    await page.setViewportSize({ width: 375, height: 812 });
    const netLog = [];
    page.on('response', (r) => {
      const u = r.url();
      if (/functions\/v1\/|storage\/v1\/object/.test(u)) netLog.push(`${r.status()} ${u.replace(/\?.*$/, '').split('/').slice(-2).join('/')}`);
    });
    page.on('console', (m) => {
      if (m.type() === 'error') netLog.push(`console: ${m.text().slice(0, 160)}`);
    });
    // Persona server only allows the 8081 origin; relay it locally for this worktree port.
    await page.route(`http://127.0.0.1:${persona.port}/session`, async (route) => {
      const r = await fetch(`http://127.0.0.1:${persona.port}/session`);
      await route.fulfill({
        status: r.status,
        headers: { 'content-type': 'application/json', 'access-control-allow-origin': ORIGIN },
        body: await r.text(),
      });
    });
    // Deployed classify-capture / ride-lpr (v8) answer the browser preflight without CORS
    // headers, so web Capture cannot read them directly (ride-lpr fix is in this branch,
    // pending deploy). Relay those two calls from Node and add only the CORS headers;
    // request + response bodies are passed through unchanged and never logged.
    const CORS = {
      'access-control-allow-origin': ORIGIN,
      'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
      'access-control-allow-methods': 'POST, OPTIONS',
    };
    await page.route(/\/functions\/v1\/(classify-capture|ride-lpr)(\?|$)/, async (route) => {
      const req = route.request();
      if (req.method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: CORS, body: '' });
        return;
      }
      const headers = { ...req.headers() };
      delete headers.origin;
      delete headers.referer;
      const r = await fetch(req.url(), { method: req.method(), headers, body: req.postDataBuffer() ?? undefined });
      await route.fulfill({
        status: r.status,
        headers: { 'content-type': r.headers.get('content-type') || 'application/json', ...CORS },
        body: Buffer.from(await r.arrayBuffer()),
      });
    });
    await page.goto(`${ORIGIN}/capture?kelyra_persona_port=${persona.port}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => window.__kelyraPersonaInject === 'ok' || window.__kelyraPersonaInject === 'fail', null, { timeout: 120000 });
    const inject = await page.evaluate(() => window.__kelyraPersonaInject);
    if (inject !== 'ok') throw new Error('PERSONA_INJECT_FAILED');

    for (const c of CASES) {
      const fixture = path.join(CORPUS, c.file);
      if (!fs.existsSync(fixture)) {
        console.warn('missing', c.file);
        continue;
      }
      console.log('case', c.id);
      netLog.length = 0;
      await page.goto(`${ORIGIN}/capture`, { waitUntil: 'domcontentloaded', timeout: 120000 });
      const lib = page.locator('[aria-label="Photo or Video"]').first();
      await lib.waitFor({ state: 'visible', timeout: 90000 });
      const [chooser] = await Promise.all([page.waitForEvent('filechooser', { timeout: 15000 }), lib.click()]);
      await chooser.setFiles(fixture);
      await page.waitForTimeout(1500);
      if (c.note) {
        const note = page.getByPlaceholder('What is this? Name, note, or say it').first();
        await note.fill(c.note);
      }
      const ask = page.getByText('Ask AI to process', { exact: true }).first();
      await ask.waitFor({ state: 'visible', timeout: 20000 });
      await ask.click();
      const res = await settle(page, c);
      // Bring the read-back into view: last vehicle field / intent card.
      const anchor = c.wait === 'intent' ? page.getByText(/This will be (a|an) /).first() : page.getByText('Model', { exact: true }).first();
      await anchor.scrollIntoViewIfNeeded().catch(() => null);
      await page.waitForTimeout(800);
      const dest = path.join(OUT, `${c.label}.png`);
      await page.screenshot({ path: dest });
      fs.copyFileSync(dest, path.join(TMP, `${c.label}.png`));
      const inputs = res.state ? res.state.inputs : [];
      shots.push({ id: c.id, file: c.file, path: dest, settled: res.ok, inputs, net: [...netLog] });
      console.log('net', c.id, JSON.stringify(netLog));
      console.log('shot', c.id, res.ok ? 'settled' : 'NOT_SETTLED', JSON.stringify(inputs));
    }
  } finally {
    await page.close().catch(() => null);
    persona.child.kill('SIGTERM');
  }
  const log = { stamp, port: WEB_PORT, shots, out: OUT, tmp: TMP };
  fs.writeFileSync(path.join(OUT, 'ui-proof-log.json'), JSON.stringify(log, null, 2));
  fs.writeFileSync(path.join(TMP, 'ui-proof-log.json'), JSON.stringify(log, null, 2));
  console.log('done', OUT);
  process.exit(0);
}

main().catch((err) => {
  console.error(String(err?.message || err));
  process.exit(1);
});
