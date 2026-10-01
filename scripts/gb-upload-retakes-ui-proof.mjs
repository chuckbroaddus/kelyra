#!/usr/bin/env node
/**
 * GB-12 “Answer a few questions instead” UI proof @375 (web).
 * Drives the real syllabus interview on YOUR worktree Expo (default :8131),
 * screenshots mid-flow, the editable summary, and the syllabus form after
 * “Put these answers in the form” (+ Save draft). One QA-Chrome :9223 tab, always closed.
 *
 *   node scripts/gb-ask-setup-ui-proof.mjs --port 8131 --class <classId> [--save]
 *
 * Persona session served on 127.0.0.1 with CORS for that port only; tokens never print.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPersonas, signInPersona } from './ui-persona-session.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = 'http://127.0.0.1:9223';
function arg(flag, dflt = '') {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}
const WEB_PORT = Number(arg('--port', '8131'));
const CLASS_ID = arg('--class', 'd1715000-0000-4000-a000-000000000301');
const OUT = arg('--out', '/tmp/gb-upload-retakes');
const CASE = arg('--case', 'S06__clean');
const RUN = arg('--run', 'notes/qa-fixtures/gradebook-ingest/runs/202610011122');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function readEnv() {
  const env = {};
  for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
  }
  return env;
}

async function sessionServer(persona, seat) {
  const env = readEnv();
  const creds = loadPersonas()[persona];
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
    res.end(JSON.stringify({ ...tokens, seat }));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return server;
}

function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const listeners = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.method && listeners.has(msg.method)) for (const fn of listeners.get(msg.method)) fn(msg.params);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject, timer } = pending.get(msg.id);
      clearTimeout(timer);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(`CDP ${msg.error.message}`));
      else resolve(msg.result);
    }
  });
  const opened = new Promise((res, rej) => {
    ws.addEventListener('open', res);
    ws.addEventListener('error', () => rej(new Error('CDP_FAILED')));
  });
  return {
    opened,
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
    on(method, fn) {
      listeners.set(method, [...(listeners.get(method) || []), fn]);
    },
    close: () => ws.close(),
  };
}

async function evalJs(c, expression) {
  const r = await c.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  return r.result?.value;
}

async function pointFor(c, label) {
  const prefix = label.endsWith('*');
  const base = prefix ? label.slice(0, -1) : label;
  return evalJs(
    c,
    `(() => {
      const want = ${JSON.stringify(base)};
      const prefix = ${prefix};
      const eq = (v) => (prefix ? v.startsWith(want) : v === want);
      const els = [...document.querySelectorAll('[aria-label],[role="button"],div,span,button,input')];
      const hits = els.filter((el) => {
        const name = (el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').trim();
        const txt = (el.innerText || '').trim();
        if (!eq(name) && !eq(txt)) return false;
        const r = el.getBoundingClientRect();
        return r.width >= 2 && r.height >= 2;
      });
      const el = hits[hits.length - 1];
      if (!el) return null;
      el.scrollIntoView({ block: 'center' });
      const r2 = el.getBoundingClientRect();
      return { x: r2.left + r2.width / 2, y: r2.top + r2.height / 2 };
    })()`,
  );
}

async function click(c, label, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const p = await pointFor(c, label);
    if (p) {
      await sleep(300);
      const q = (await pointFor(c, label)) || p;
      for (const type of ['mousePressed', 'mouseReleased']) {
        await c.send('Input.dispatchMouseEvent', { type, x: q.x, y: q.y, button: 'left', clickCount: 1 });
      }
      await sleep(700);
      return true;
    }
    await sleep(400);
  }
  throw new Error(`CLICK_MISSING ${label}`);
}

async function say(c, text) {
  await click(c, 'Type here');
  await c.send('Input.insertText', { text });
  await sleep(300);
  await click(c, 'Send');
  await sleep(1500);
}

async function bodyText(c) {
  return (await evalJs(c, 'document.body ? document.body.innerText : ""')) || '';
}

async function waitText(c, re, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const t = await bodyText(c);
    if (re.test(t)) return t;
    await sleep(600);
  }
  throw new Error(`WAIT_TIMEOUT ${re}`);
}

async function scrollToText(c, text, offset = 70) {
  await evalJs(
    c,
    `(() => {
      const want = ${JSON.stringify(text)};
      const all = [...document.querySelectorAll('div,span')];
      const el = all.reverse().find((e) => (e.innerText || '').trim().startsWith(want) && e.children.length === 0) || all.find((e) => (e.innerText || '').trim().startsWith(want));
      if (!el) return false;
      let p = el.parentElement;
      while (p && !(p.scrollHeight > p.clientHeight + 4 && getComputedStyle(p).overflowY !== 'visible')) p = p.parentElement;
      const top = el.getBoundingClientRect().top;
      if (p) p.scrollTop += top - ${offset} - p.getBoundingClientRect().top; else window.scrollBy(0, top - ${offset});
      return true;
    })()`,
  );
  await sleep(700);
}

async function shot(c, name) {
  const r = await c.send('Page.captureScreenshot', { format: 'png' });
  const file = path.join(OUT, name);
  fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
  console.log('SHOT', file);
  return file;
}


const CORS = (origin) => [
  { name: 'Access-Control-Allow-Origin', value: origin || '*' },
  { name: 'Access-Control-Allow-Headers', value: '*' },
  { name: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,PATCH,OPTIONS' },
  { name: 'Access-Control-Allow-Credentials', value: 'true' },
  { name: 'Content-Type', value: 'application/json' },
];

/** Answer only the four requests a document import makes; everything else goes through. */
async function stubIngest(c, recorded) {
  const handled = [];
  c.on('Fetch.requestPaused', async (p) => {
    const { requestId, request } = p;
    const url = request.url;
    const origin = request.headers.Origin || request.headers.origin || `http://127.0.0.1:${WEB_PORT}`;
    const reply = (status, body) =>
      c.send('Fetch.fulfillRequest', {
        requestId,
        responseCode: status,
        responseHeaders: CORS(origin),
        body: Buffer.from(body == null ? '' : JSON.stringify(body)).toString('base64'),
      });
    try {
      if (request.method === 'OPTIONS') return void (await reply(204, null));
      if (/ingest-grading-doc/.test(url)) {
        handled.push('ingest-grading-doc');
        return void (await reply(200, recorded));
      }
      if (/\/storage\/v1\/object\/sign\//.test(url)) {
        handled.push('sign');
        const body = request.postData ? JSON.parse(request.postData) : {};
        if (Array.isArray(body.paths)) {
          return void (await reply(200, body.paths.map((x) => ({ path: x, signedURL: `/object/sign/photos/${x}?token=proof`, error: null }))));
        }
        return void (await reply(200, { signedURL: '/object/sign/photos/proof.png?token=proof' }));
      }
      if (/\/storage\/v1\/object\//.test(url) && request.method !== 'GET') {
        handled.push('upload');
        return void (await reply(200, { Key: 'photos/proof.png', Id: 'proof' }));
      }
      if (/\/rest\/v1\/assets/.test(url) && request.method === 'POST') {
        handled.push('assets');
        const row = request.postData ? JSON.parse(request.postData) : {};
        const one = Array.isArray(row) ? row[0] : row;
        return void (await reply(201, { id: 'a0000000-0000-4000-a000-00000000proof', created_at: new Date().toISOString(), thumb_storage_path: null, ...one }));
      }
      await c.send('Fetch.continueRequest', { requestId });
    } catch (err) {
      console.error('STUB_ERR', url.slice(0, 80), String(err.message || err));
    }
  });
  await c.send('Fetch.enable', {
    patterns: [
      { urlPattern: '*ingest-grading-doc*', requestStage: 'Request' },
      { urlPattern: '*/storage/v1/object/*', requestStage: 'Request' },
      { urlPattern: '*/rest/v1/assets*', requestStage: 'Request' },
    ],
  });
  return handled;
}

async function flow(c, port) {
  const recorded = JSON.parse(fs.readFileSync(path.join(ROOT, RUN, `${CASE}.json`), 'utf8')).json;
  const fixture = path.join(ROOT, 'notes/qa-fixtures/gradebook-ingest', CASE.split('__')[0], CASE.endsWith('photo') ? 'photo.jpg' : 'clean.png');
  const mime = fixture.endsWith('.jpg') ? 'image/jpeg' : 'image/png';
  const dataUri = `data:${mime};base64,${fs.readFileSync(fixture).toString('base64')}`;
  const handled = await stubIngest(c, recorded);
  await c.send('Page.navigate', { url: `http://127.0.0.1:${WEB_PORT}/class/${CLASS_ID}/syllabus?kelyra_persona_port=${port}` });
  await waitText(c, /Answer a few questions instead|Take a photo of a syllabus/, 120000);
  for (let i = 0; i < 60 && !(await evalJs(c, 'Boolean(window.__kelyraIngestReady)')); i += 1) await sleep(500);
  await sleep(1500);
  await evalJs(c, `window.__kelyraIngestFromUri(${JSON.stringify(dataUri)}, ${JSON.stringify(mime)})`);
  await waitText(c, /Done reading|Could not read|Could not open/i, 90000);
  await sleep(1500);
  fs.writeFileSync(path.join(OUT, 'proposal-card.txt'), await bodyText(c));
  await scrollToText(c, 'Retakes', 120).catch(() => {});
  await shot(c, 'gb-upload-retakes-proposal-375.png');
  await click(c, 'Use these settings', 30000);
  await waitText(c, /Settings added/, 30000);
  await sleep(1500);
  await click(c, 'Review & publish', 20000);
  await waitText(c, /What families will read/, 30000);
  await scrollToText(c, 'What families will read', 90);
  await shot(c, 'gb-upload-retakes-form-review-375.png');
  fs.writeFileSync(path.join(OUT, 'form-review.txt'), await bodyText(c));
  console.log('STUBBED', JSON.stringify(handled));
}

async function main() {
  const server = await sessionServer('teacher', 'teacher');
  const port = server.address().port;
  let targetId = null;
  try {
    const created = await fetch(`${CHROME}/json/new?about:blank`, { method: 'PUT' });
    const target = await created.json();
    targetId = target.id;
    const c = cdp(target.webSocketDebuggerUrl);
    await c.opened;
    await c.send('Page.enable');
    await c.send('Runtime.enable');
    await c.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 2, mobile: true });
    try {
      await flow(c, port);
    } catch (err) {
      await shot(c, 'gb-upload-retakes-ERROR-375.png').catch(() => {});
      fs.writeFileSync(path.join(OUT, 'error-body.txt'), await bodyText(c).catch(() => ''));
      throw err;
    } finally {
      c.close();
    }
  } finally {
    if (targetId) await fetch(`${CHROME}/json/close/${targetId}`).catch(() => {});
    server.close();
  }
  console.log('DONE', OUT);
}

main().catch((err) => {
  console.error(String(err.message || err));
  process.exit(2);
});
