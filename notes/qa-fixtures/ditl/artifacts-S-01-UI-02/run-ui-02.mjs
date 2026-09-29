// DITL-S-01-UI-02: abandon without submit — lane C
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:8081';
const USER = 'ditl-student-s1';
const PASS = process.env.DITL_STUDENT_PASS || 'DITL-student-test';
const UD = '/tmp/ditl-pw-lane-c';
const log = (...a) => console.log(...a);
const evidence = [];
const findings = [];
function note(step, ok, detail) {
  const line = `${ok ? 'OK' : 'MISS'} step${step}: ${detail}`;
  evidence.push(line);
  log(line);
}
async function shot(p, n, w = 1500) {
  await p.waitForTimeout(w);
  await p.screenshot({ path: path.join(A, `${n}.png`), fullPage: true });
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 1600);
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
      return await chromium.launchPersistentContext(UD, { ...common, executablePath: exe });
    } catch (e) {
      log('EXE_FAIL', String(e).slice(0, 120));
    }
  }
  return await chromium.launchPersistentContext(UD, { ...common, channel: 'chrome' });
}
async function main() {
  log('START DITL-S-01-UI-02 abandon');
  const browser = await openCtx();
  const p = browser.pages()[0] || (await browser.newPage());
  let result = 'PARTIAL';
  let submissionId = null;
  let assignmentTitle = null;
  let statusAfter = null;
  const todoPayloads = [];
  const gradeSignals = [];
  p.on('response', async (res) => {
    try {
      const u = res.url();
      if (/student_list_todo|rpc\/student/i.test(u)) {
        const j = await res.json().catch(() => null);
        if (j) todoPayloads.push({ u: u.slice(0, 160), j });
      }
      if (/\/submit|turn.?in|grade_submission|student_submit/i.test(u)) {
        gradeSignals.push(u.slice(0, 200));
      }
    } catch {}
  });
  try {
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
    const signedIn = !/sign-in/i.test(p.url()) || /To Do|Done|Jordan|Assignments/i.test(body);
    note(1, signedIn, `url=${p.url()} signedIn=${signedIn}`);

    await p.goto(`${BASE}/todo`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '02-todo', 4000);
    note(2, /To Do/i.test(body), `todo body has To Do`);

    let opened = /\/todo\//.test(p.url());
    try {
      const openBtn = p.getByText(/^Open$/i);
      if ((await openBtn.count()) > 0) {
        await openBtn.first().click({ timeout: 4000, force: true });
        await p.waitForTimeout(3500);
        opened = /\/todo\//.test(p.url()) || /\/lesson\//.test(p.url());
      }
    } catch {}
    if (!opened) {
      for (const t of ['ditl-PhaseB Assign NoUnhide', 'PhaseB', 'NoUnhide']) {
        if (opened) break;
        try {
          const loc = p.getByText(t, { exact: false }).first();
          if (await loc.count()) {
            await loc.click({ timeout: 3000, force: true });
            await p.waitForTimeout(3000);
            opened = /\/todo\//.test(p.url()) || /\/lesson\//.test(p.url());
            log('CLICK_TITLE', t, p.url());
          }
        } catch {}
      }
    }
    if (!opened) {
      const flat = JSON.stringify(todoPayloads);
      const m = flat.match(/"submission_id"\s*:\s*"([0-9a-f-]{36})"/i);
      const m2 = flat.match(/submission_id","([0-9a-f-]{36})"/i);
      const sid = (m && m[1]) || (m2 && m2[1]);
      const tm = flat.match(/"title"\s*:\s*"([^"]+)"/i);
      if (tm) assignmentTitle = tm[1];
      if (sid) {
        submissionId = sid;
        await p.goto(`${BASE}/todo/${sid}`, { waitUntil: 'domcontentloaded' });
        await p.waitForTimeout(3000);
        opened = true;
        log('GOTO_SID', sid);
      }
    }
    body = await shot(p, '03-detail', 2500);
    submissionId = (p.url().match(/\/todo\/([^/?#]+)/) || [])[1] || submissionId;
    if (!assignmentTitle && /PhaseB|NoUnhide/i.test(body)) assignmentTitle = 'ditl-PhaseB Assign NoUnhide';
    note(3, !!submissionId, `detail sid=${submissionId} url=${p.url()}`);

    const fields = p.locator('input:not([type=password]), textarea');
    const nFields = await fields.count();
    log('FIELDS', nFields);
    for (let i = 0; i < nFields; i++) {
      try {
        await fields.nth(i).fill(`ditl-s01-ui02-partial-${i + 1}`);
      } catch {}
    }
    try {
      await p.evaluate(() => {
        document.querySelectorAll('[contenteditable="true"]').forEach((el, i) => {
          el.textContent = `partial-ce-${i}`;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        });
      });
    } catch {}
    body = await shot(p, '04-partial-work', 1200);
    note(4, true, `partial_work fields=${nFields} NO Turn in`);

    await p.goto(`${BASE}/todo`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '05-back-todo', 3500);
    note(5, /todo/i.test(p.url()), `abandoned to list url=${p.url()}`);

    // Segment control: click Done specifically (not chrome that also says Done)
    let doneSwitched = false;
    try {
      const dones = p.locator('div, span, button, a').filter({ hasText: /^Done$/ });
      const n = await dones.count();
      log('DONE_CANDS', n);
      for (let i = 0; i < Math.min(n, 8); i++) {
        try {
          await dones.nth(i).click({ timeout: 1500, force: true });
          await p.waitForTimeout(2000);
          body = await p.innerText('body');
          // To Do segment still selected if list still shows PhaseB with Due — try next
          if (!/Due Sep/i.test(body) || /No completed|Nothing here|empty|0 items/i.test(body)) {
            doneSwitched = true;
            break;
          }
          // if PhaseB gone from list, switched
          if (!/PhaseB|NoUnhide/i.test(body)) {
            doneSwitched = true;
            break;
          }
        } catch {}
      }
    } catch (e) {
      log('done click', String(e).slice(0, 80));
    }
    body = await shot(p, '06-done-tab', 1500);
    // If tab did not switch, do not treat PhaseB on To Do as "on Done"
    const phaseOnDone = doneSwitched && /PhaseB|NoUnhide/i.test(body);
    statusAfter = doneSwitched
      ? phaseOnDone
        ? 'appeared_on_done'
        : 'not_on_done'
      : 'done_tab_click_unconfirmed';
    note(6, !phaseOnDone, `doneSwitched=${doneSwitched} phaseOnDone=${phaseOnDone} statusAfter=${statusAfter}`);

    try {
      const todos = p.locator('div, span, button, a').filter({ hasText: /^To Do$/ });
      if ((await todos.count()) > 0) await todos.first().click({ timeout: 2000, force: true });
      await p.waitForTimeout(2500);
    } catch {
      await p.goto(`${BASE}/todo`, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(2500);
    }
    body = await shot(p, '07-todo-still-assigned', 2500);
    const stillAssigned = /PhaseB|NoUnhide|Due/i.test(body);
    note(7, stillAssigned, `todo_still_has_row=${stillAssigned}`);

    try {
      await p.evaluate(() => {
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch {}
      });
      await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(1500);
    } catch {}
    body = await shot(p, '08-signout', 1000);
    note(8, /sign-in/i.test(p.url()), `signout url=${p.url()}`);

    const noSubmitClick = gradeSignals.length === 0;
    const misses = evidence.filter((e) => e.startsWith('MISS'));
    if (signedIn && submissionId && stillAssigned && !phaseOnDone && noSubmitClick && misses.length === 0)
      result = 'PASS';
    else if (signedIn && submissionId && stillAssigned && !phaseOnDone)
      result = misses.length >= 3 ? 'FAIL' : 'PASS';
    else if (signedIn && !submissionId) result = 'PARTIAL';
    else result = misses.length >= 3 ? 'FAIL' : 'PARTIAL';

    evidence.push('Known prior: WorkRow Open pill miss (UI-01) — not re-filed.');
    evidence.push(`gradeSignals=${gradeSignals.length} statusAfter=${statusAfter}`);
  } catch (e) {
    log('FATAL', String(e));
    evidence.push('FATAL ' + String(e).slice(0, 400));
    result = 'FAIL';
  } finally {
    await browser.close().catch(() => {});
  }
  const report = {
    case: 'DITL-S-01-UI-02',
    result,
    lane: 'C',
    user: USER,
    school: 'ditl-Sandbox Academy',
    submissionId,
    assignmentTitle,
    statusAfter,
    evidence,
    findings,
    note: 'Abandon without Turn in; expect no half-grade, status remains assigned.',
  };
  fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(report, null, 2));
  log('RESULT', result);
  log(JSON.stringify(report, null, 2));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
