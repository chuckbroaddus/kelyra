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
const OUT = arg('--out', '/tmp/gb-ask-setup');
const SAVE = process.argv.includes('--save');
const OFFICE = process.argv.includes('--office');
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
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
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

async function teacherFlow(c, port) {
  await c.send('Page.navigate', { url: `http://127.0.0.1:${WEB_PORT}/class/${CLASS_ID}/syllabus-interview?kelyra_persona_port=${port}` });
  await click(c, 'Weighted categories, all equal', 120000);
  await sleep(800);
  await say(c, 'Tests 50, Quizzes 30, Homework 20');
  await click(c, 'Drop the lowest Quizzes*', 60000);
  await click(c, 'Counts as 50', 60000);
  await pointFor(c, '10% a day, no lower than 50'); // wait for late question
  await waitText(c, /10% a day, no lower than 50/, 60000);
  await say(c, '10% a day, no lower than 50');
  await waitText(c, /Bonus points on top/, 60000);
  await sleep(800);
  await shot(c, 'gb-ask-setup-midflow-375.png');
  await click(c, 'Bonus points on top');
  await click(c, 'Up to 5% extra', 60000);
  await waitText(c, /Higher score, max 70/, 60000);
  await say(c, 'tests only, keep the higher score, max 70');
  await waitText(c, /No minimum|Nearest whole/, 60000);
  await click(c, 'Use the usual choices for the rest');
  await waitText(c, /Your setup — tap a line to change it/, 60000);
  await sleep(800);
  await scrollToText(c, 'Your setup — tap a line to change it', 60);
  await shot(c, 'gb-ask-setup-summary-375.png');
  await click(c, 'Change Late work*');
  await waitText(c, /let's change that/, 60000);
  await say(c, '5 points per day');
  await waitText(c, /5 pts off per day/, 60000);
  await waitText(c, /Your setup — tap a line to change it/, 60000);
  await sleep(800);
  await scrollToText(c, 'Your setup — tap a line to change it', 60);
  await shot(c, 'gb-ask-setup-summary-edited-375.png');
  await click(c, 'Put these answers in the form');
  await waitText(c, /Your answers are filled in/, 60000);
  await sleep(2500);
  await scrollToText(c, 'Your answers are filled in', 80);
  await shot(c, 'gb-ask-setup-form-applied-375.png');
  fs.writeFileSync(path.join(OUT, 'form-applied.txt'), await bodyText(c));
  if (SAVE) {
    await click(c, 'Save draft');
    await waitText(c, /Draft saved|Saved|Could not save|Fix /i, 60000);
    await sleep(2500);
    await shot(c, 'gb-ask-setup-saved-375.png');
    fs.writeFileSync(path.join(OUT, 'form-saved.txt'), await bodyText(c));
  }
}

async function officeFlow(c, port) {
  await c.send('Page.navigate', { url: `http://127.0.0.1:${WEB_PORT}/school/grading-policy/interview?kelyra_persona_port=${port}` });
  await click(c, 'High', 120000);
  await click(c, 'Every 6 weeks', 60000);
  await click(c, 'Use the usual choices for the rest', 60000);
  await waitText(c, /Your setup — tap a line to change it/, 90000);
  await sleep(800);
  await scrollToText(c, 'Your setup — tap a line to change it', 60);
  await shot(c, 'gb-ask-setup-office-summary-375.png');
  await click(c, 'Put these answers in the form');
  await waitText(c, /Your answers are filled in/, 60000);
  await sleep(2000);
  await shot(c, 'gb-ask-setup-office-form-375.png');
  fs.writeFileSync(path.join(OUT, 'office-form.txt'), await bodyText(c));
}

async function main() {
  const persona = OFFICE ? 'office' : 'teacher';
  const server = await sessionServer(persona, persona);
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
      if (OFFICE) await officeFlow(c, port);
      else await teacherFlow(c, port);
    } catch (err) {
      await shot(c, `gb-ask-setup-${persona}-ERROR-375.png`).catch(() => {});
      fs.writeFileSync(path.join(OUT, `${persona}-error-body.txt`), await bodyText(c).catch(() => ''));
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
