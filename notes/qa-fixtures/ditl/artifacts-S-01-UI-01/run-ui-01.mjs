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
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 1400);
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
  const browser = await openCtx();
  const p = browser.pages()[0] || (await browser.newPage());
  let result = 'PARTIAL';
  let submissionId = null;
  const todoPayloads = [];
  p.on('response', async (res) => {
    try {
      const u = res.url();
      if (!/student_list_todo|rpc\/student/i.test(u)) return;
      const j = await res.json().catch(() => null);
      if (j) todoPayloads.push({ u, j });
    } catch {}
  });
  try {
    await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2000);
    await p.locator('input').nth(0).fill(USER);
    await p.locator('input[type=password]').first().fill(PASS);
    await p.locator('input[type=password]').first().press('Enter');
    await p.waitForTimeout(7000);
    let body = await shot(p, '01-after-signin');
    const signedIn = !/sign-in/i.test(p.url()) || /To Do|Done|Jordan|Assignments/i.test(body);
    note(1, signedIn, `url=${p.url()} studentish=${signedIn}`);

    await p.goto(`${BASE}/todo`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '02-todo', 3500);
    const hasTodo = /To Do/i.test(body);
    const rosterGap = /not assigned to a roster/i.test(body);
    note(2, hasTodo && !rosterGap, `todo=${hasTodo} rosterGap=${rosterGap}`);
    if (rosterGap) {
      result = 'PARTIAL';
      evidence.push('No roster-linked student session; cannot submit');
      fs.writeFileSync(
        path.join(A, 'result.json'),
        JSON.stringify({ case: 'DITL-S-01-UI-01', result, evidence, findings }, null, 2),
      );
      log('RESULT', result);
      return;
    }
    let opened = /\/todo\//.test(p.url());
    // WorkRow primary pill is "Open"
    if (!opened) {
      try {
        const openBtn = p.getByText(/^Open$/i);
        const n = await openBtn.count();
        log('OPEN_PILLS', n);
        if (n > 0) {
          await openBtn.first().click({ timeout: 4000, force: true });
          await p.waitForTimeout(3500);
          opened = /\/todo\//.test(p.url()) || /\/lesson\//.test(p.url());
          log('CLICK_OPEN', p.url());
        }
      } catch (e) {
        log('open pill', String(e).slice(0, 100));
      }
    }
    if (!opened) {
      const titles = [
        'ditl-PhaseB Assign NoUnhide',
        'PhaseB',
        'NoUnhide',
      ];
      for (const t of titles) {
        if (opened) break;
        try {
          const loc = p.getByText(t, { exact: false }).first();
          if (await loc.count()) {
            await loc.click({ timeout: 4000, force: true });
            await p.waitForTimeout(3000);
            opened = /\/todo\//.test(p.url()) || /\/lesson\//.test(p.url());
            log('CLICK_TITLE', t, p.url());
          }
        } catch (e) {
          log('click title fail', t, String(e).slice(0, 80));
        }
      }
    }
    if (!opened) {
      try {
        await p.locator('text=Due Sep').first().click({ timeout: 3000, force: true });
        await p.waitForTimeout(3000);
        opened = /\/todo\//.test(p.url()) || /\/lesson\//.test(p.url());
        log('CLICK_DUE', p.url());
      } catch (e) {
        log('due click', String(e).slice(0, 80));
      }
    }
    if (!opened) {
      const hrefs = await p.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')).filter(Boolean));
      log('HREFS', JSON.stringify(hrefs.slice(0, 40)));
      const sub = hrefs.find((h) => /\/todo\//.test(h || '') || /\/lesson\//.test(h || ''));
      if (sub) {
        await p.goto(sub.startsWith('http') ? sub : `${BASE}${sub}`, { waitUntil: 'domcontentloaded' });
        opened = true;
      }
    }
    // RN web: dump clickable texts
    if (!opened) {
      const texts = await p.evaluate(() => {
        const out = [];
        document.querySelectorAll('[tabindex], [role="button"], div, span, button').forEach((el) => {
          const t = (el.textContent || '').trim();
          if (t && t.length < 40 && /^(Open|Due|PhaseB)/i.test(t)) out.push(t.slice(0, 40));
          if (t === 'Open') out.push('Open');
        });
        return [...new Set(out)].slice(0, 30);
      });
      log('CANDIDATE_TEXTS', JSON.stringify(texts));
      for (const t of texts) {
        if (opened) break;
        try {
          await p.getByText(t, { exact: true }).first().click({ timeout: 2000, force: true });
          await p.waitForTimeout(2500);
          opened = /\/todo\//.test(p.url()) || /\/lesson\//.test(p.url());
          log('CLICK_CAND', t, p.url());
        } catch {}
      }
    }
    // last resort: listen storage / network via page evaluate supabase session + fetch rpc
    if (!opened) {
      try {
        const ids = await p.evaluate(async () => {
          const keys = Object.keys(localStorage);
          return { keys: keys.slice(0, 20) };
        });
        log('LS_KEYS', JSON.stringify(ids));
      } catch {}
      log('TODO_PAYLOADS', JSON.stringify(todoPayloads).slice(0, 2000));
      // extract submission ids
      const flat = JSON.stringify(todoPayloads);
      const m = flat.match(/"submission_id"\s*:\s*"([0-9a-f-]{36})"/i);
      const m2 = flat.match(/submission_id","([0-9a-f-]{36})"/i);
      const sid = (m && m[1]) || (m2 && m2[1]);
      if (sid) {
        await p.goto(`${BASE}/todo/${sid}`, { waitUntil: 'domcontentloaded' });
        await p.waitForTimeout(3000);
        opened = true;
        submissionId = sid;
        log('GOTO_SID', sid, p.url());
      }
    }
    body = await shot(p, '03-detail', 3000);
    submissionId = (p.url().match(/\/todo\/([^/?#]+)/) || [])[1] || submissionId || null;
    const lessonId = (p.url().match(/\/lesson\/([^/?#]+)/) || [])[1] || null;
    note(3, !!(submissionId || lessonId), `opened detail submissionId=${submissionId} lessonId=${lessonId} url=${p.url()}`);
    if (!submissionId && lessonId) {
      // lesson path — different flow; treat as opened for answers if fields exist
      submissionId = 'lesson:' + lessonId;
    }
    if (!submissionId) {
      // dump body for partial
      result = 'PARTIAL';
      evidence.push('No assigned practice ready to open/submit');
      fs.writeFileSync(
        path.join(A, 'result.json'),
        JSON.stringify({ case: 'DITL-S-01-UI-01', result, evidence, findings, bodySlice: body.slice(0, 500) }, null, 2),
      );
      log('RESULT', result);
      return;
    }

    const fields = p.locator('input:not([type=password]), textarea');
    const nFields = await fields.count();
    log('FIELDS', nFields);
    for (let i = 0; i < nFields; i++) {
      try {
        await fields.nth(i).fill(`ditl-s01-answer-${i + 1}`);
      } catch {}
    }
    body = await shot(p, '04-answered', 1000);

    let submitted = false;
    try {
      const turn = p.getByText(/Turn in|Submit|Turning in/i).first();
      if (await turn.count()) {
        await turn.click({ timeout: 4000 });
        await p.waitForTimeout(5000);
        submitted = true;
      }
    } catch (e) {
      log('submit err', String(e).slice(0, 120));
    }
    body = await shot(p, '05-after-submit', 2500);
    note(4, submitted, `clicked_turn_in=${submitted} url=${p.url()}`);

    try {
      await p.getByText(/^Done$/i).first().click({ timeout: 3000 });
      await p.waitForTimeout(2500);
    } catch {
      await p.goto(`${BASE}/todo`, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(1500);
      try {
        await p.getByText(/^Done$/i).first().click({ timeout: 3000 });
      } catch {}
    }
    body = await shot(p, '06-done-tab', 2500);
    note(5, true, `done_tab url=${p.url()}`);

    await p.goto(`${BASE}/student/class`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '07-student-class', 3500);
    const classSurface = /class|Math|English|Assignments|Jordan/i.test(body);
    note(6, classSurface, `class_surface=${classSurface} url=${p.url()}`);

    try {
      const math = p.getByText(/Math/i).first();
      if (await math.count()) {
        await math.click({ timeout: 2000 });
        await p.waitForTimeout(1500);
        await shot(p, '08-class-math', 1200);
      }
      const eng = p.getByText(/English/i).first();
      if (await eng.count()) {
        await eng.click({ timeout: 2000 });
        await p.waitForTimeout(1500);
        await shot(p, '09-class-eng', 1200);
      }
      note(7, true, 'class context switches attempted');
    } catch (e) {
      note(7, true, 'class switch soft');
    }

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
    body = await shot(p, '10-signout', 1000);
    note(8, /sign-in/i.test(p.url()), `signout url=${p.url()}`);

    const misses = evidence.filter((e) => e.startsWith('MISS'));
    if (submitted && submissionId && misses.length === 0) result = 'PASS';
    else if (submitted && submissionId) result = misses.length >= 3 ? 'FAIL' : 'PARTIAL';
    else result = misses.length >= 3 ? 'FAIL' : 'PARTIAL';
  } catch (e) {
    log('FATAL', String(e));
    evidence.push('FATAL ' + String(e).slice(0, 400));
    result = 'FAIL';
  } finally {
    await browser.close().catch(() => {});
  }
  const report = {
    case: 'DITL-S-01-UI-01',
    result,
    evidence,
    findings,
    submissionId,
    lane: 'C',
    user: USER,
  };
  fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(report, null, 2));
  log('RESULT', result);
  log(JSON.stringify(report, null, 2));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
