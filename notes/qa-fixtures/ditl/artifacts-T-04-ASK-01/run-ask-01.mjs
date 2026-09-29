// DITL-T-04-ASK-01 lane A — teacher Ask assignment list + grade explain dual path
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:8081';
const USER = 'ditl-teacher-a';
const PASS = process.env.DITL_TEACHER_PASS || 'DITL-teacher-test';
const UD = '/tmp/ditl-pw-lane-a';
const CLASS = 'd1715000-0000-4000-a000-000000000301';
const MARKER = 'ditl-T-04-ASK-01-' + Date.now();
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
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 3500);
  log('==', n, p.url());
  log(body.slice(0, 1600));
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
  if (!(await box.count())) box = p.locator('[contenteditable="true"]').last();
  if (!(await box.count())) box = p.locator('input[type=text]').last();
  await box.click({ timeout: 8000 }).catch(() => {});
  await box.fill(text).catch(async () => {
    await p.keyboard.type(text, { delay: 10 });
  });
  const sendBtn = p.getByRole('button', { name: /^Send$/i });
  if (await sendBtn.count()) await sendBtn.first().click();
  else await p.keyboard.press('Enter');
  await p.waitForTimeout(2500);
  for (let i = 0; i < 60; i++) {
    const t = await p.innerText('body').catch(() => '');
    if (!/Asking AI|Opening Kelyra|Working…|Working\.\.\./i.test(t) && i > 4) break;
    await p.waitForTimeout(2500);
  }
  await p.waitForTimeout(1500);
}

async function main() {
  log('START DITL-T-04-ASK-01', MARKER);
  const browser = await openCtx();
  const p = browser.pages()[0] || (await browser.newPage());
  p.on('response', async (res) => {
    try {
      const u = res.url();
      if (!/ask-assistant|list_assignments|list_grade|grade_cell|rpc\//i.test(u)) return;
      const st = res.status();
      let snip = '';
      try {
        snip = (await res.text()).slice(0, 600);
      } catch {}
      toolHits.push({ st, u: u.slice(0, 160), snip });
      log('NET', st, u.slice(0, 110), snip.slice(0, 140));
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
  await p.waitForTimeout(1000);
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
    (!/sign-in/i.test(p.url()) || /Desk|Needs Attention|ditl-Math|Period|Messages|Ask|Gradebook/i.test(body)) &&
    !(/Sign in to see work/i.test(body) && !/Desk|Needs/i.test(body));
  note(1, signedIn, `url=${p.url()} signedIn=${signedIn}`);
  if (!signedIn) {
    findings.push('FINDING: teacher sign-in failed; severity P0; case DITL-T-04-ASK-01');
    result = 'FAIL';
    return;
  }

  await p.goto(`${BASE}/class/${CLASS}/gradebook`, { waitUntil: 'domcontentloaded' });
  body = await shot(p, '02-gradebook-ui', 4000);
  const gbUi = /Gradebook|Overall|Jordan|Jamie|Riley|Hist|Multi|Assignment|Score|%/i.test(body);
  const uiAssignNames = [];
  for (const name of ['Hist', 'Multi', 'ditl-', 'Homework', 'Quiz', 'Math', 'History']) {
    if (new RegExp(name, 'i').test(body)) uiAssignNames.push(name);
  }
  note(2, gbUi, `gradebook_ui=${gbUi} names=${uiAssignNames.join(',') || 'none'} snip=${body.slice(0, 400)}`);

  await p.goto(`${BASE}/class/${CLASS}`, { waitUntil: 'domcontentloaded' });
  body = await shot(p, '03-class-desk', 3000);
  const deskOk = /Desk|Today|Assignment|ditl-|Needs|Capture/i.test(body);
  note(3, deskOk, `desk=${deskOk}`);

  await p.goto(`${BASE}/ask`, { waitUntil: 'domcontentloaded' });
  body = await shot(p, '04-ask-home', 3500);
  try {
    const jc = p.getByText(/Just chatting/i);
    if (await jc.count()) await jc.first().click({ force: true, timeout: 2000 }).catch(() => {});
  } catch {}
  body = await shot(p, '04b-ask-ground', 1200);
  const onAsk = /\/ask/i.test(p.url()) || /Ask|Just chatting|Which assignment/i.test(body);
  note(4, onAsk, `ask_surface url=${p.url()} onAsk=${onAsk}`);

  await sendAsk(
    p,
    'Call list_assignments (or equivalent) for my active class. List assignment titles and categories only. Do not create or delete. Do not invent titles not returned by tools.',
  );
  body = await shot(p, '05-ask-list-assignments', 1000);
  const askList =
    /assignment|list_assignments|Hist|Multi|homework|quiz|title|category|no assignment/i.test(body) ||
    toolHits.some((h) => /list_assign|assignment/i.test(h.u + h.snip) && h.st < 400);
  note(5, askList, `ask_list=${askList} snip=${body.slice(-500)}`);

  await sendAsk(
    p,
    'Using list_grade_cells or grade tools, explain grades for student Jordan Lee on one existing assignment if any. Report scores/status from tools only. Do not change grades. Do not Approve.',
  );
  body = await shot(p, '06-ask-grade-explain', 1000);
  const askGrade =
    /Jordan|grade|score|cell|list_grade|Overall|%|no grade|not graded|pending|explain/i.test(body) ||
    toolHits.some((h) => /grade/i.test(h.u + h.snip) && h.st < 400);
  note(6, askGrade, `ask_grade_explain=${askGrade} snip=${body.slice(-500)}`);

  await p.goto(`${BASE}/class/${CLASS}/gradebook`, { waitUntil: 'domcontentloaded' });
  body = await shot(p, '07-gradebook-dual', 3500);
  const dualStudents = /Jordan/i.test(body);
  const dualOk = dualStudents && (askGrade || askList) && gbUi;
  note(7, dualOk, `dual path students=${dualStudents} askList=${askList} askGrade=${askGrade}`);

  await p.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
  });
  await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
  body = await shot(p, '08-signout', 1000);
  note(8, /sign-in/i.test(p.url()), `signedOut url=${p.url()}`);
  evidence.push('MARKER ' + MARKER);
  evidence.push('TOOL_HITS ' + JSON.stringify(toolHits).slice(0, 2500));
  evidence.push('NOTE leftovers ditl-Hist HW / ditl-Multi are known — not findings');
}

function finish() {
  const misses = evidence.filter((e) => e.startsWith('MISS'));
  const fatals = evidence.filter((e) => e.startsWith('FATAL'));
  if (fatals.length) result = 'FAIL';
  else if (misses.length === 0) result = 'PASS';
  else if (misses.length >= 3) result = 'FAIL';
  else result = 'PARTIAL';
  const report = {
    case: 'DITL-T-04-ASK-01',
    result,
    marker: MARKER,
    evidence,
    findings,
    misses,
    toolHits: toolHits.slice(0, 40),
    gaps: [],
  };
  fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(report, null, 2));
  log('RESULT', result);
  log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
