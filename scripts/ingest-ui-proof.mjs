#!/usr/bin/env node
/**
 * Ingest UI proof @375 (roster / homework / anskey) on a worktree Expo web port.
 * Feeds fixture files through the Capture file picker (CDP file-chooser intercept,
 * no camera, no OS dialog), waits for the AI review card, screenshots.
 * Signs in via the splash form (persona file read here, never printed) because
 * persona inject CORS only allows :8081 origins.
 *
 *   KELYRA_WEB=http://127.0.0.1:8121 node scripts/ingest-ui-proof.mjs <slug> <outDir> <caseId:file>...
 *
 * Env: WAIT_TEXT (regex for settled review), PICK (button label, default "Photo or Video"),
 *      START_ROUTE (default /capture), AFTER_CLICKS ("Label|Label"), AFTER_WAIT (regex).
 * Uses the existing QA Chrome on :9223 (one tab, closed at the end).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import WebSocket from 'ws';

const BASE = (process.env.KELYRA_WEB || 'http://127.0.0.1:8121').replace(/\/$/, '');
const CDP = process.env.KELYRA_CDP || 'http://127.0.0.1:9223';
const [slug, outDir, ...cases] = process.argv.slice(2);
const WAIT_TEXT = new RegExp(
  process.env.WAIT_TEXT || 'Create class|students|Attach key|Save to student|Not an answer key|Could not',
  'i',
);
const PERSONA = process.env.PERSONA || 'teacher';
const START_ROUTE = process.env.START_ROUTE || '/capture';
const PICK = process.env.PICK || 'Photo or Video';
const PRE_PICK = (process.env.PRE_PICK || '').split('|').filter(Boolean);
const POST_PICK = (process.env.POST_PICK ?? 'Ask AI to process').split('|').filter(Boolean);
const AFTER = (process.env.AFTER_CLICKS || '').split('|').filter(Boolean);
const READY_LABEL = process.env.READY_LABEL || PRE_PICK[0] || PICK;
fs.mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function creds(name) {
  const raw = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.kelyra', 'ui-personas.json'), 'utf8'));
  return raw[name];
}

const target = await (await fetch(`${CDP}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl, { perMessageDeflate: false });
await new Promise((r, j) => {
  ws.once('open', r);
  ws.once('error', j);
});
let seq = 0;
const pending = new Map();
const listeners = [];
ws.on('message', (raw) => {
  const msg = JSON.parse(String(raw));
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  } else if (msg.method) {
    for (const l of listeners) l(msg);
  }
});
function send(method, params = {}) {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error('cdp timeout ' + method));
      }
    }, 60000);
  });
}
async function evaluate(expression, userGesture = false) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture });
  return r.result?.value;
}
const bodyText = () => evaluate('document.body ? document.body.innerText : ""');
async function goto(route) {
  await send('Page.navigate', { url: `${BASE}${route}` });
  await sleep(2500);
}
async function waitFor(re, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const t = (await bodyText().catch(() => '')) || '';
    if (re.test(t)) return t;
    await sleep(1500);
  }
  return null;
}
function clickExpr(label) {
  const l = JSON.stringify(label);
  return `(() => {
    const els = [...document.querySelectorAll('[aria-label],[role="button"],button')];
    const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const hit = els.filter(vis).find((e) => e.getAttribute('aria-label') === ${l})
      || els.filter(vis).find((e) => (e.innerText || '').trim() === ${l});
    if (!hit) return false;
    hit.scrollIntoView({ block: 'center' });
    hit.click();
    return true;
  })()`;
}
const click = (label) => evaluate(clickExpr(label), true);
async function shot(file, full = true) {
  let clip;
  if (full) {
    const h = await evaluate('Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, 812)');
    await send('Emulation.setDeviceMetricsOverride', { width: 375, height: Math.min(h || 812, 4000), deviceScaleFactor: 2, mobile: true });
    await sleep(800);
  }
  const r = await send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip } : {}) });
  fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
  await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 2, mobile: true });
}

const log = [];
try {
  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 2, mobile: true });
  await send('Page.setInterceptFileChooserDialog', { enabled: true });

  // ---- sign in (wait for hydration first; only use the form if truly signed out)
  if (process.env.FRESH_SIGNIN === '1') {
    // Switch persona on this private origin without tapping Sign out.
    await send('Storage.clearDataForOrigin', { origin: BASE, storageTypes: 'local_storage,indexeddb,cookies' });
  }
  await goto('/capture');
  let t = await waitFor(/Drop photos|Image Preview|Sign in first|Sign in/i, 90000);
  for (let i = 0; i < 30 && /Finishing sign-in/.test(t || ''); i++) {
    await sleep(1500);
    t = await bodyText();
  }
  if (!/Drop photos|Image Preview/.test(t || '')) {
    await goto('/sign-in');
    await waitFor(/Password|Sign in/i, 60000);
    for (let i = 0; i < 20; i++) {
      const has = await evaluate('!!document.querySelector(\'input[type="password"]\')');
      if (has) break;
      await click('Sign in');
      await sleep(1000);
    }
    const c = creds(PERSONA);
    await evaluate(`(() => { const i=[...document.querySelectorAll('input')].find(e=>e.type!=='password'); i.focus(); return true })()`);
    await send('Input.insertText', { text: c.handle });
    await evaluate(`(() => { document.querySelector('input[type="password"]').focus(); return true })()`);
    await send('Input.insertText', { text: c.password });
    await sleep(300);
    // submit (second Sign in) — pressing Enter in the password field is one submit
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    for (let i = 0; i < 40; i++) {
      await sleep(1000);
      const has = await evaluate('!!document.querySelector(\'input[type="password"]\')');
      if (!has) break;
      if (i === 8) await click('Sign in');
    }
    log.push({ signIn: 'form' });
  } else log.push({ signIn: 'existing-session' });

  for (const spec of cases) {
    const [id, file] = spec.split(':');
    await goto(START_ROUTE);
    let ready = false;
    for (let i = 0; i < 60 && !ready; i++) {
      ready = await evaluate(`(() => [...document.querySelectorAll('[aria-label],[role="button"]')].some((e) => e.getAttribute('aria-label') === ${JSON.stringify(READY_LABEL)} || (e.innerText || '').trim() === ${JSON.stringify(READY_LABEL)}))()`);
      if (!ready) await sleep(1500);
    }
    if (!ready) {
      await shot(path.join(outDir, `${id}-FAIL-start.png`), false);
      log.push({ id, error: 'start not ready', text: ((await bodyText()) || '').slice(0, 300) });
      continue;
    }
    const chooser = new Promise((resolve) => {
      const l = (msg) => {
        if (msg.method === 'Page.fileChooserOpened') {
          listeners.splice(listeners.indexOf(l), 1);
          resolve(msg.params);
        }
      };
      listeners.push(l);
      setTimeout(() => resolve(null), 20000);
    });
    for (const label of PRE_PICK) {
      let ok = false;
      for (let i = 0; i < 20 && !ok; i++) {
        ok = await click(label);
        if (!ok) await sleep(1000);
      }
      log.push({ id, preClick: label, ok });
      await sleep(1200);
    }
    let clicked = false;
    for (let i = 0; i < 20 && !clicked; i++) {
      clicked = await click(PICK);
      if (!clicked) await sleep(1000);
    }
    const fc = await chooser;
    if (!clicked || !fc) {
      log.push({ id, error: `no file chooser (clicked=${clicked})` });
      continue;
    }
    await send('DOM.setFileInputFiles', { files: [path.resolve(file)], backendNodeId: fc.backendNodeId });
    for (const label of POST_PICK) {
      let ok = false;
      for (let i = 0; i < 40 && !ok; i++) {
        await sleep(1000);
        ok = await click(label);
      }
      log.push({ id, postClick: label, ok });
    }
    const settled = await waitFor(WAIT_TEXT, 180000);
    for (const label of AFTER) {
      if (await click(label)) await sleep(4000);
    }
    if (process.env.AFTER_WAIT) await waitFor(new RegExp(process.env.AFTER_WAIT, 'i'), 180000);
    if (process.env.SCROLL_TO) {
      // Bring the review card above the sticky composer before the shot.
      await evaluate(`(() => {
        const re = new RegExp(${JSON.stringify(process.env.SCROLL_TO)});
        const all = [...document.querySelectorAll('div,span')].filter((e) => re.test(e.innerText || '') && e.children.length < 3);
        const el = all[all.length - 1];
        if (el) el.scrollIntoView({ block: 'start' });
        return Boolean(el);
      })()`);
    }
    await sleep(1500);
    const out = path.join(outDir, `${id}-review-375.png`);
    await shot(out);
    const text = (await bodyText()) || '';
    fs.writeFileSync(path.join(outDir, `${id}-review-375.txt`), text);
    log.push({ id, shot: out, settled: Boolean(settled), text: text.replace(/\s+/g, ' ').slice(0, 700) });
  }
} catch (err) {
  log.push({ error: String(err?.message || err) });
} finally {
  fs.writeFileSync(path.join(outDir, `${slug}-ui-proof-log.json`), JSON.stringify(log, null, 2));
  try { ws.close(); } catch {}
  await fetch(`${CDP}/json/close/${target.id}`).catch(() => {});
}
console.log(JSON.stringify(log, null, 2));
