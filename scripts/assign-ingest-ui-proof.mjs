#!/usr/bin/env node
/**
 * Assign-ingest UI proof @375 (web). Feeds a corpus fixture straight into the
 * assignment editor's answer-key photo picker (CDP file-chooser intercept, no
 * camera), waits for the analyze-answer-key result to render, and screenshots
 * the real review fields.
 *
 *   node scripts/assign-ingest-ui-proof.mjs --port 8095 --class <classId> --stamp <runStamp> A04:clean A12:photo N01:clean
 *
 * Uses QA Chrome :9223 in ONE new tab that is always closed. Persona session is
 * served on 127.0.0.1 with CORS for the given web port only; tokens never print.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPersonas, signInPersona } from './ui-persona-session.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CORPUS = path.join(ROOT, 'notes/qa-fixtures/assign-ingest');
const CHROME = 'http://127.0.0.1:9223';

function arg(flag, dflt = '') {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}
const WEB_PORT = Number(arg('--port', '8095'));
const CLASS_ID = arg('--class', 'd1715000-0000-4000-a000-000000000301');
const STAMP = arg('--stamp', 'ui');
const PERSONA = arg('--persona', 'teacher');
const CASES = process.argv.slice(2).filter((a, i, all) => /^[A-Z]\d\d:(clean|photo)$/.test(a));
const OUT = path.join(CORPUS, 'runs', STAMP, 'ui-proof');
const MIRROR = '/tmp/assign-ingest-eval';
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(MIRROR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function readEnv() {
  const env = {};
  for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
  }
  return env;
}

async function sessionServer() {
  const env = readEnv();
  const creds = loadPersonas()[PERSONA];
  if (!creds) throw new Error('PERSONA_MISSING');
  const tokens = await signInPersona({
    url: env.EXPO_PUBLIC_SUPABASE_URL,
    anonKey: env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    handle: creds.handle,
    password: creds.password,
  });
  const allowed = new Set([`http://127.0.0.1:${WEB_PORT}`, `http://localhost:${WEB_PORT}`]);
  const server = http.createServer((req, res) => {
    const origin = req.headers.origin;
    if (origin && allowed.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.writeHead(204);
      return res.end();
    }
    if (req.method !== 'GET' || req.url !== '/session') {
      res.writeHead(404);
      return res.end();
    }
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify({ ...tokens, seat: 'teacher' }));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return server;
}

function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject, timer } = pending.get(msg.id);
      clearTimeout(timer);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(`CDP ${msg.error.message}`));
      else resolve(msg.result);
    } else if (msg.method) {
      for (const l of listeners) l(msg);
    }
  });
  const opened = new Promise((res, rej) => {
    ws.addEventListener('open', res);
    ws.addEventListener('error', () => rej(new Error('CDP_FAILED')));
  });
  return {
    opened,
    on: (fn) => listeners.push(fn),
    send(method, params = {}, timeoutMs = 30000) {
      const n = ++id;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(n);
          reject(new Error(`CDP_TIMEOUT ${method}`));
        }, timeoutMs);
        pending.set(n, { resolve, reject, timer });
        ws.send(JSON.stringify({ id: n, method, params }));
      });
    },
    close: () => ws.close(),
  };
}

async function evalJs(c, expression) {
  const r = await c.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  return r.result?.value;
}

/** Center of the first visible element whose aria-label or own text equals label. */
async function pointFor(c, label) {
  return evalJs(
    c,
    `(() => {
      const want = ${JSON.stringify(label)};
      const els = [...document.querySelectorAll('[aria-label],[role="button"],div,span,button')];
      for (const el of els) {
        const name = (el.getAttribute('aria-label') || '').trim();
        const txt = (el.innerText || '').trim();
        if (name !== want && txt !== want) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        if (r.bottom < 0 || r.top > innerHeight) { el.scrollIntoView({ block: 'center' }); }
        const r2 = el.getBoundingClientRect();
        return { x: r2.left + r2.width / 2, y: r2.top + r2.height / 2 };
      }
      return null;
    })()`,
  );
}

async function click(c, label, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const p = await pointFor(c, label);
    if (p) {
      await sleep(250);
      const q = (await pointFor(c, label)) || p;
      for (const type of ['mousePressed', 'mouseReleased']) {
        await c.send('Input.dispatchMouseEvent', { type, x: q.x, y: q.y, button: 'left', clickCount: 1 });
      }
      return true;
    }
    await sleep(400);
  }
  throw new Error(`CLICK_MISSING ${label}`);
}

async function bodyText(c) {
  return (await evalJs(c, 'document.body ? document.body.innerText : ""')) || '';
}

async function waitText(c, re, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const t = await bodyText(c);
    const m = t.match(re);
    if (m) return { text: t, match: m[0] };
    await sleep(700);
  }
  return null;
}

async function shot(c, file) {
  const r = await c.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
  fs.copyFileSync(file, path.join(MIRROR, path.basename(file)));
}

async function scrollToText(c, text, offset = 90) {
  await evalJs(
    c,
    `(() => {
      const want = ${JSON.stringify(text)};
      const all = [...document.querySelectorAll('div,span')];
      const el = all.find((e) => (e.innerText || '').trim() === want);
      if (!el) return false;
      let p = el.parentElement;
      while (p && !(p.scrollHeight > p.clientHeight + 4 && getComputedStyle(p).overflowY !== 'visible')) p = p.parentElement;
      const top = el.getBoundingClientRect().top;
      if (p) p.scrollTop += top - ${offset} - p.getBoundingClientRect().top; else window.scrollBy(0, top - ${offset});
      return true;
    })()`,
  );
  await sleep(600);
}

async function runCase(c, injectPort, spec) {
  const [id, variant] = spec.split(':');
  const file = path.join(CORPUS, id, variant === 'photo' ? 'photo.jpg' : 'clean.png');
  if (!fs.existsSync(file)) throw new Error(`FIXTURE_MISSING ${spec}`);
  const url = `http://127.0.0.1:${WEB_PORT}/class/${CLASS_ID}/assignment/new?kelyra_persona_port=${injectPort}`;
  await c.send('Page.navigate', { url });
  const ready = await waitText(c, /Answer key/i, 90000);
  if (!ready) {
    await shot(c, path.join(OUT, `${id}-${variant}-NOT-SETTLED.png`));
    throw new Error(`ROUTE_NOT_SETTLED ${spec}`);
  }
  await sleep(1200);
  await click(c, 'Photo');
  await sleep(500);
  await click(c, 'Take photo');
  await sleep(800);
  const chooser = new Promise((resolve) => {
    c.on((msg) => {
      if (msg.method === 'Page.fileChooserOpened') resolve(msg.params);
    });
  });
  await click(c, 'Choose from library');
  const opened = await Promise.race([chooser, sleep(15000).then(() => null)]);
  if (!opened) throw new Error(`FILE_CHOOSER_MISSING ${spec}`);
  await c.send('DOM.setFileInputFiles', { files: [file], backendNodeId: opened.backendNodeId });
  const done = await waitText(
    c,
    /Read the written answers|Proposed answers — check each one|Could not tell if this was blank|does not look like an answer key|Not an answer key|No key items found|Could not read that key photo|student work/i,
    150000,
  );
  const text = await bodyText(c);
  const base = `${id}-${variant}`;
  const result = { spec, file: path.relative(ROOT, file), outcome: done?.match ?? 'TIMEOUT', shots: [] };
  // top of key section (status + thumb), then the extracted items
  await scrollToText(c, 'Answer key', 60);
  const s1 = path.join(OUT, `${base}-review-375.png`);
  await shot(c, s1);
  result.shots.push(path.basename(s1));
  if (/1\. (Stem|Needs you)/.test(text)) {
    await scrollToText(c, text.match(/1\. (Stem|Needs you)/)[0], 40);
    const s2 = path.join(OUT, `${base}-items-375.png`);
    await shot(c, s2);
    result.shots.push(path.basename(s2));
  }
  const fields = await evalJs(
    c,
    `[...document.querySelectorAll('input,textarea')].map((e) => e.value).filter(Boolean).slice(0, 60)`,
  );
  result.field_values = fields;
  return result;
}

async function main() {
  if (!CASES.length) throw new Error('usage: ... A04:clean');
  const server = await sessionServer();
  const injectPort = server.address().port;
  let targetId = null;
  const results = [];
  try {
    const created = await fetch(`${CHROME}/json/new?about:blank`, { method: 'PUT' });
    const target = await created.json();
    targetId = target.id;
    const c = cdp(target.webSocketDebuggerUrl);
    await c.opened;
    await c.send('Page.enable');
    await c.send('Runtime.enable');
    await c.send('DOM.enable');
    await c.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 2, mobile: true });
    await c.send('Page.setInterceptFileChooserDialog', { enabled: true });
    for (const spec of CASES) {
      try {
        const r = await runCase(c, injectPort, spec);
        results.push(r);
        console.log('CASE', spec, r.outcome, r.shots.join(','));
      } catch (err) {
        results.push({ spec, error: String(err.message || err) });
        console.log('CASE', spec, 'ERROR', String(err.message || err));
      }
    }
    c.close();
  } finally {
    if (targetId) await fetch(`${CHROME}/json/close/${targetId}`).catch(() => {});
    server.close();
  }
  const resultsPath = path.join(OUT, 'ui-proof-results.json');
  let merged = [];
  try {
    merged = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
  } catch {}
  for (const r of results) merged = [...merged.filter((m) => m.spec !== r.spec), r];
  fs.writeFileSync(resultsPath, JSON.stringify(merged, null, 2));
  console.log('OUT', OUT);
}

main().catch((err) => {
  console.error(String(err.message || err));
  process.exit(2);
});
