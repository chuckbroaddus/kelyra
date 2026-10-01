#!/usr/bin/env node
/**
 * GB-INGEST-FIX-4 real UI proof @ 375px via window.__kelyraIngestFromUri.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CORPUS = path.join(ROOT, 'notes/qa-fixtures/gradebook-ingest');
const CDP = process.env.CDP_URL || 'http://127.0.0.1:9223';
const BASE = process.env.EXPO_WEB_URL || 'http://127.0.0.1:8081';
const OUT =
  process.argv[2] ||
  path.join(CORPUS, 'runs', process.env.RUN_STAMP || 'ui-proof-r4', 'ui-proof');
const TMP = '/tmp/gb-ingest-eval-r4';
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });
const CLASS_ID = process.env.GB_PROOF_CLASS_ID || 'd1715000-0000-4000-a000-000000000301';

const SHOTS = [
  {
    name: 'S01-photo-review-375',
    persona: 'teacher',
    route: `/class/${CLASS_ID}/syllabus`,
    fixture: path.join(CORPUS, 'S01/photo.jpg'),
    alt: path.join(CORPUS, 'S01/clean.png'),
  },
  {
    name: 'S08-handwritten-375',
    persona: 'teacher',
    route: `/class/${CLASS_ID}/syllabus`,
    fixture: path.join(CORPUS, 'S08/photo.jpg'),
    alt: path.join(CORPUS, 'S08/clean.png'),
  },
  {
    name: 'N03-mixed-doc-warning-375',
    persona: 'teacher',
    route: `/class/${CLASS_ID}/syllabus`,
    fixture: path.join(CORPUS, 'N03/photo.jpg'),
    alt: path.join(CORPUS, 'N03/clean.png'),
  },
  {
    name: 'H01-policy-prefill-375',
    persona: 'office',
    route: '/school/grading-policy',
    fixture: path.join(CORPUS, 'H01/photo.jpg'),
    alt: path.join(CORPUS, 'H01/clean.png'),
  },
  {
    name: 'H10-levels-repeat-include-375',
    persona: 'office',
    route: '/school/grading-policy',
    fixture: path.join(CORPUS, 'H10/clean.png'),
    alt: path.join(CORPUS, 'H10/clean.png'),
  },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function cdpList() {
  const r = await fetch(`${CDP}/json/list`);
  if (!r.ok) throw new Error(`CDP list ${r.status}`);
  return r.json();
}

async function ensureChrome() {
  try {
    await cdpList();
    return;
  } catch {
    const launch = path.join(
      process.env.HOME || '',
      '.hermes/profiles/chief-of-staff/scripts/launch_qe_chrome.sh',
    );
    if (fs.existsSync(launch)) {
      spawn('bash', [launch], { stdio: 'ignore', detached: true }).unref();
      for (let i = 0; i < 20; i++) {
        await sleep(500);
        try {
          await cdpList();
          return;
        } catch {
          /* */
        }
      }
    }
    throw new Error('CHROME_NOT_READY');
  }
}

async function withWs(wsUrl, fn) {
  const { default: WebSocket } = await import('ws');
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
    setTimeout(() => reject(new Error('ws open timeout')), 15000);
  });
  let nextId = 1;
  const pending = new Map();
  ws.on('message', (raw) => {
    const msg = JSON.parse(String(raw));
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  });
  const send = (method, params = {}) => {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          reject(new Error('cdp timeout ' + method));
        }
      }, 120000);
    });
  };
  try {
    return await fn(send);
  } finally {
    try {
      ws.close();
    } catch {
      /* */
    }
  }
}

async function closeTab(id) {
  try {
    await fetch(`${CDP}/json/close/${id}`, { method: 'PUT' });
  } catch {
    /* */
  }
}

function fixtureToDataUrl(filePath) {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
  return { dataUrl: `data:${mime};base64,${buf.toString('base64')}`, mime };
}

async function drivePersona(persona, route, outPacket) {
  await new Promise((resolve) => {
    const args = [
      path.join(ROOT, 'scripts/ui-drive.mjs'),
      '--surface',
      'web',
      '--persona',
      persona,
      '--route',
      route,
      '--out',
      outPacket,
    ];
    const p = spawn('node', args, { cwd: ROOT, env: { ...process.env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) => {
      fs.writeFileSync(outPacket.replace(/\.json$/, '-drive.log'), `${out}\n${err}\ncode=${code}`);
      resolve({ code, out, err });
    });
  });
}

async function findAppTab() {
  const list = await cdpList();
  const pages = list.filter((t) => t.type === 'page' && t.webSocketDebuggerUrl);
  const hit = pages.find((t) => (t.url || '').includes('8081')) || pages[0];
  if (!hit) throw new Error('no CDP page');
  return hit;
}

async function injectAndShot(shot) {
  const fixturePath = fs.existsSync(shot.fixture) ? shot.fixture : shot.alt;
  if (!fs.existsSync(fixturePath)) throw new Error('missing fixture ' + shot.name);
  const packet = path.join(OUT, `${shot.name}-drive.json`);
  await drivePersona(shot.persona, shot.route, packet);
  await sleep(1000);
  const tab = await findAppTab();
  const result = await withWs(tab.webSocketDebuggerUrl, async (send) => {
    await send('Page.enable');
    await send('Runtime.enable');
    await send('DOM.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 812,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await send('Page.navigate', { url: `${BASE}${shot.route}` });
    await sleep(6000);
    await send('Page.setInterceptFileChooserDialog', { enabled: true });

    // Click may open the OS file chooser; intercept then setFiles on the backend node
    const clickP = send('Runtime.evaluate', {
      expression: `(() => {
        const nodes = Array.from(document.querySelectorAll('button,[role="button"],div,span,a'));
        const el = nodes.find((n) => /Start from a document/i.test((n.innerText||'').trim()));
        if (!el) return 'missing';
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        el.click();
        return 'clicked';
      })()`,
      returnByValue: true,
    });

    // Wait briefly for FileChooserOpened event via polling input OR intercept
    let fileNodeId = null;
    for (let i = 0; i < 20; i++) {
      await sleep(200);
      const { root } = await send('DOM.getDocument', { depth: -1 });
      const q = await send('DOM.querySelector', {
        nodeId: root.nodeId,
        selector: 'input[type="file"],input[data-testid="file-input"]',
      });
      if (q?.nodeId) {
        fileNodeId = q.nodeId;
        break;
      }
    }
    const clicked = await clickP;
    if (clicked?.result?.value !== 'clicked' && !fileNodeId) {
      return { ok: false, reason: 'NO_START_BUTTON', detail: clicked?.result?.value };
    }
    if (!fileNodeId) {
      // one more poll after click resolves
      for (let i = 0; i < 15; i++) {
        await sleep(200);
        const { root } = await send('DOM.getDocument', { depth: -1 });
        const q = await send('DOM.querySelector', {
          nodeId: root.nodeId,
          selector: 'input[type="file"],input[data-testid="file-input"]',
        });
        if (q?.nodeId) {
          fileNodeId = q.nodeId;
          break;
        }
      }
    }
    if (!fileNodeId) return { ok: false, reason: 'NO_FILE_INPUT' };
    await send('DOM.setFileInputFiles', { nodeId: fileNodeId, files: [fixturePath] });

    let review = false;
    let bodyText = '';
    for (let i = 0; i < 100; i++) {
      const r = await send('Runtime.evaluate', {
        expression: `(() => {
          const t = (document.body && document.body.innerText) || '';
          const ok =
            /Filled from|Apply into wizard|Review highlighted|Proposal ready|Decision:/i.test(t) &&
            !/Could not read that document/i.test(t);
          return { ok, head: t.slice(0, 300) };
        })()`,
        returnByValue: true,
      });
      bodyText = r?.result?.value?.head || '';
      if (r?.result?.value?.ok) {
        review = true;
        break;
      }
      await sleep(1000);
    }
    if (!review) {
      const shotFail = await send('Page.captureScreenshot', { format: 'png' });
      const failPath = path.join(OUT, `${shot.name}-FAIL.png`);
      fs.writeFileSync(failPath, Buffer.from(shotFail.data, 'base64'));
      return { ok: false, reason: 'REVIEW_NOT_SHOWN', bodyText, failPath };
    }
    await sleep(500);
    const png = await send('Page.captureScreenshot', { format: 'png' });
    const outPng = path.join(OUT, `${shot.name}.png`);
    fs.writeFileSync(outPng, Buffer.from(png.data, 'base64'));
    fs.copyFileSync(outPng, path.join(TMP, `${shot.name}.png`));
    return { ok: true, path: outPng, bodyText };
  });

  try {
    const list = await cdpList();
    for (const t of list) {
      if (t.type !== 'page') continue;
      if ((t.url || '') === 'about:blank' || (t.url || '').startsWith('chrome-error')) {
        await closeTab(t.id);
      }
    }
  } catch {
    /* */
  }
  return { name: shot.name, fixture: fixturePath, ...result };
}

async function main() {
  await ensureChrome();
  try {
    const r = await fetch(BASE);
    if (!r.ok) throw new Error('web ' + r.status);
  } catch (e) {
    console.error('WEB_NOT_READY', String(e));
    process.exit(2);
  }
  const results = [];
  for (const shot of SHOTS) {
    console.error('SHOT', shot.name);
    try {
      const r = await injectAndShot(shot);
      results.push(r);
      console.error(r.ok ? 'OK' : 'FAIL', shot.name, r.reason || r.path);
    } catch (e) {
      results.push({ name: shot.name, ok: false, reason: String(e) });
      console.error('ERR', shot.name, e);
    }
  }
  const log = { stamp: process.env.RUN_STAMP || null, out: OUT, tmp: TMP, results };
  fs.writeFileSync(path.join(OUT, 'ui-proof-log.json'), JSON.stringify(log, null, 2));
  fs.writeFileSync(path.join(TMP, 'ui-proof-log.json'), JSON.stringify(log, null, 2));
  console.log(JSON.stringify({ ok: results.every((r) => r.ok), results }, null, 2));
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
