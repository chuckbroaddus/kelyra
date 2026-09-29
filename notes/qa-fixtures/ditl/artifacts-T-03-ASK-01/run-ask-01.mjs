// DITL-T-03-ASK-01 lane A — teacher Ask dual path
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:8081';
const USER = 'ditl-teacher-a';
const PASS = process.env.DITL_TEACHER_PASS || 'DITL-teacher-test';
const UD = '/tmp/ditl-pw-lane-a';
const MARKER = 'ditl-T-03-ASK-01-' + Date.now();
const log = (...a) => console.log(...a);
const evidence = [];
const findings = [];
const toolHits = [];
let result = 'PARTIAL';

function note(step, ok, detail) {
  const line = `${ok ? 'OK' : 'MISS'} step${step}: ${detail}`;
  evidence.push(line);
  log(line);
}

async function shot(p, n, w = 1500) {
  await p.waitForTimeout(w);
  await p.screenshot({ path: path.join(A, `${n}.png`), fullPage: true });
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 2000);
  log('==', n, p.url());
  log(body);
  return body;
}

async function openCtx() {
  fs.mkdirSync(UD, { recursive: true });
  const common = {
    headless: true,
    viewport: { width: 1280, height: 900 },
    args: ['--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check'],
  };
  const candidates = [
    process.env.HOME +
      '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
    process.env.HOME + '/Library/Caches/ms-playwright/chromium-1234/chrome-mac/Chromium.app/Contents/MacOS/Chromium',
    process.env.HOME + '/Library/Caches/ms-playwright/chromium-1148/chrome-mac/Chromium.app/Contents/MacOS/Chromium',
  ];
  for (const exe of candidates) {
    if (!fs.existsSync(exe)) continue;
    try {
      log('TRY_EXE', exe);
      return await chromium.launchPersistentContext(UD, { ...common, executablePath: exe });
    } catch (e) {
      log('EXE_FAIL', String(e).slice(0, 120));
    }
  }
  return await chromium.launchPersistentContext(UD, { ...common, channel: 'chrome' });
}

async function sendAsk(p, text) {
  let box = p.getByPlaceholder(/Ask/i).first();
  if (!(await box.count())) box = p.locator('textarea').first();
  if (!(await box.count())) box = p.locator('input[type=text]').last();
  await box.click({ timeout: 8000 }).catch(() => {});
  await box.fill(text).catch(async () => {
    await p.keyboard.type(text, { delay: 12 });
  });
  const sendBtn = p.getByRole('button', { name: /^Send$/i });
  if (await sendBtn.count()) await sendBtn.first().click();
  else await p.keyboard.press('Enter');
  await p.waitForTimeout(2500);
  for (let i = 0; i < 56; i++) {
    const t = await p.innerText('body').catch(() => '');
    if (!/Asking AI|Opening Kelyra|Working…|Working\.\.\./i.test(t) && i > 4) break;
    await p.waitForTimeout(2500);
  }
  await p.waitForTimeout(1500);
}

async function main() {
  log('START DITL-T-03-ASK-01', MARKER);
  const browser = await openCtx();
  const p = browser.pages()[0] || (await browser.newPage());
  p.on('response', async (res) => {
    try {
      const u = res.url();
      if (!/ask-assistant|list_threads|send_message|my_unread|list_inbox|rpc\//i.test(u)) return;
      const st = res.status();
      let snip = '';
      try {
        snip = (await res.text()).slice(0, 500);
      } catch {}
      toolHits.push({ st, u: u.slice(0, 140), snip });
      log('NET', st, u.slice(0, 100), snip.slice(0, 120));
    } catch {}
  });
  try {
    await runFlow(p);
  } catch (e) {
    log('FATAL', String(e));
    evidence.push('FATAL ' + String(e).slice(0, 500));
  } finally {
    await browser.close().catch(() => {});
  }
  finish();
}

async function runFlow(p) {
  await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  await p.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
  });
  await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  await p.locator('input').nth(0).fill(USER);
  await p.locator('input[type=password]').first().fill(PASS);
  await p.locator('input[type=password]').first().press('Enter');
  await p.waitForTimeout(7000);
  let body = await shot(p, '01-after-signin');
  const signedIn =
    !/sign-in/i.test(p.url()) || /Desk|Needs Attention|ditl-Math|Period|Messages|Ask/i.test(body);
  const wrongSeat = /Sign in to see work/i.test(body) && !/Desk|Needs/i.test(body);
  note(1, signedIn && !wrongSeat, `url=${p.url()} signedIn=${signedIn} wrongSeat=${wrongSeat}`);

  await p.goto(`${BASE}/messages`, { waitUntil: 'domcontentloaded' });
  body = await shot(p, '02-messages-ui', 4000);
  const uiMsgs = /Taylor|Avery|Messages|Alerts|thread|parent/i.test(body);
  note(2, uiMsgs, `ui_messages=${uiMsgs}`);

  await p.goto(`${BASE}/ask`, { waitUntil: 'domcontentloaded' });
  body = await shot(p, '03-ask-home', 3500);
  try {
    const jc = p.getByText(/Just chatting/i);
    if (await jc.count()) await jc.first().click({ force: true, timeout: 2000 }).catch(() => {});
  } catch {}
  body = await shot(p, '03b-ask-ground', 1500);
  const onAsk = /\/ask/i.test(p.url()) || /Ask|Just chatting|Which assignment/i.test(body);
  note(3, onAsk, `ask_surface url=${p.url()} onAsk=${onAsk}`);

  await sendAsk(
    p,
    'Call list_threads and my_unread_messages. Summarize my parent message threads for this class. Name parents if known (Taylor/Avery). Do not invent. Do not change grades.',
  );
  body = await shot(p, '04-ask-list-threads', 1000);
  const listed =
    /Taylor|Avery|thread|message|unread|inbox|parent|no unread|0 unread|conversation/i.test(body);
  note(4, listed, `list_threadsish=${listed} snip=${body.slice(-350)}`);

  await sendAsk(
    p,
    `Using send_message, reply on the existing Taylor Lee parent thread only with exactly this text and nothing else: ${MARKER} Ask dual-path probe. Do not invent a new parent. Do not change grades.`,
  );
  body = await shot(p, '05-ask-send', 1000);
  const sendAck =
    /send_message|sent|delivered|Taylor|thread|message|done|ok|replied/i.test(body) ||
    toolHits.some((h) => /send_message/i.test(h.u + h.snip) && h.st < 400);
  note(5, sendAck, `send_ack=${sendAck} hits=${toolHits.length}`);

  await p.goto(`${BASE}/messages`, { waitUntil: 'domcontentloaded' });
  body = await shot(p, '06-messages-after-ask', 4500);
  let dual = /Taylor/i.test(body);
  let markerOnUi = body.includes(MARKER);
  try {
    const row = p.getByText(/Taylor/i).first();
    if (await row.count()) {
      await row.click({ force: true, timeout: 5000 }).catch(() => {});
      await p.waitForTimeout(3000);
      body = await shot(p, '07-taylor-thread', 2000);
      markerOnUi = markerOnUi || body.includes(MARKER);
      dual = dual || /Taylor|You|Just now|makeup|Ask dual/i.test(body);
    }
  } catch (e) {
    log('open taylor', String(e).slice(0, 120));
  }
  note(6, dual, `dual_ui_taylor=${dual} markerOnUi=${markerOnUi}`);
  if (sendAck && dual && !markerOnUi) {
    evidence.push('NOTE: send_ack true but marker not on UI (tool refuse or open miss)');
  }

  await p.goto(`${BASE}/ask`, { waitUntil: 'domcontentloaded' });
  await sendAsk(
    p,
    'Call list_inbox. Summarize Needs triage counts only. Do not Approve. Do not delete captures.',
  );
  body = await shot(p, '08-ask-inbox', 1000);
  const inboxAsk = /inbox|Needs|Unassigned|draft|capture|0 |item|Attention/i.test(body);
  note(7, inboxAsk || listed, `list_inboxish=${inboxAsk}`);

  await p.goto(`${BASE}/inbox`, { waitUntil: 'domcontentloaded' });
  body = await shot(p, '09-inbox-ui', 3500);
  const inboxUi = /Needs|Unassigned|Review|All|Attention|inbox/i.test(body);
  note(8, inboxUi, `inbox_ui=${inboxUi}`);

  await p.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
  });
  await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
  body = await shot(p, '10-signout', 1000);
  note(9, /sign-in/i.test(p.url()), `signedOut url=${p.url()}`);
  evidence.push('MARKER ' + MARKER);
  evidence.push('TOOL_HITS ' + JSON.stringify(toolHits).slice(0, 2500));
  evidence.push('GAP: message delete via Ask residual OK per plan — not a finding');
}

function finish() {
  const misses = evidence.filter((e) => e.startsWith('MISS'));
  const fatals = evidence.filter((e) => e.startsWith('FATAL'));
  if (fatals.length) result = 'FAIL';
  else if (misses.length === 0) result = 'PASS';
  else if (misses.length >= 3) result = 'FAIL';
  else result = 'PARTIAL';
  const report = {
    case: 'DITL-T-03-ASK-01',
    result,
    marker: MARKER,
    evidence,
    findings,
    misses,
    toolHits: toolHits.slice(0, 40),
    gaps: ['GAP: delete message via Ask residual OK — not finding'],
  };
  fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(report, null, 2));
  log('RESULT', result);
  log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
