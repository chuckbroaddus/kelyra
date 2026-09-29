// DITL-S-03-UI-02 lane C — focus list → tap → complete
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
const rpcHits = [];

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
  log('START DITL-S-03-UI-02');
  const browser = await openCtx();
  const p = browser.pages()[0] || (await browser.newPage());
  let result = 'PARTIAL';
  let submissionId = null;
  let focusTitle = null;
  let completed = false;
  let onDone = false;
  const todoRows = [];
  p.on('response', async (res) => {
    try {
      const u = res.url();
      const st = res.status();
      if (/student_list_todo/i.test(u)) {
        const j = await res.json().catch(() => null);
        if (Array.isArray(j)) {
          for (const row of j) todoRows.push(row);
          log('TODO_ROWS', j.length, j.map((r) => `${r.assignment_title}:${r.submission_id}:${r.status || r.kind}`).join(' | ').slice(0, 400));
        }
        rpcHits.push({ st, u: u.slice(0, 160), snip: JSON.stringify(j).slice(0, 800) });
        return;
      }
      if (!/student_submit|turn_in|turn-in|submit_practice|rpc\/.*submit|list_my_practice/i.test(u)) return;
      const txt = await res.text().catch(() => '');
      rpcHits.push({ st, u: u.slice(0, 160), snip: txt.slice(0, 400) });
      log('HIT_SUBMIT', st, u.slice(0, 110), txt.slice(0, 160));
    } catch {}
  });
  async function pickFocusSid() {
    const prefer = [/PhaseB/i, /NoUnhide/i, /place-value/i, /Math HW S1/i, /Focus/i];
    for (const re of prefer) {
      const hit = todoRows.find((r) => re.test(String(r.assignment_title || r.title || '')));
      if (hit?.submission_id) {
        focusTitle = hit.assignment_title || hit.title || focusTitle;
        return hit.submission_id;
      }
    }
    const any = todoRows.find((r) => r.submission_id && /practice|todo|open|started|assigned/i.test(JSON.stringify(r)));
    if (any?.submission_id) {
      focusTitle = any.assignment_title || any.title || focusTitle;
      return any.submission_id;
    }
    return todoRows.find((r) => r.submission_id)?.submission_id || null;
  }
  try {
    await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1200);
    await p.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
    });
    await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2000);
    await p.locator('input').nth(0).fill(USER);
    await p.locator('input[type=password]').first().fill(PASS);
    await p.locator('input[type=password]').first().press('Enter');
    await p.waitForTimeout(7000);
    let body = await shot(p, '01-after-signin');
    const signedIn = !/sign-in/i.test(p.url()) || /To Do|Jordan|Assignments|Messages/i.test(body);
    note(1, signedIn, `url=${p.url()} signedIn=${signedIn}`);

    // Step 2: Focus list = /todo (assigned practice / focus-linked)
    await p.goto(`${BASE}/todo`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '02-focus-list', 4500);
    const listOk = /todo/i.test(p.url()) || /To Do|Practice|Assignment|Done|Focus/i.test(body);
    const focusCue =
      /PhaseB|place-value|ditl-bulk|Focus|Practice|ditl-Math HW|NoUnhide/i.test(body);
    const crossList = /\bJamie Lee\b|ditl-student-s2|Alex Rivera|Samira Khan/i.test(body);
    note(2, listOk && !crossList, `listOk=${listOk} focusCue=${focusCue} cross=${crossList}`);
    if (crossList) {
      findings.push(
        'FINDING: cross-student bleed on student focus/todo list; severity P0; case DITL-S-03-UI-02',
      );
    }

    // Step 3: Tap / open focus item (prefer PhaseB submission id from list_todo)
    let opened = /\/todo\//.test(p.url());
    // Prefer direct navigation — list row clicks are flaky on web
    if (!opened) {
      const sid = await pickFocusSid();
      if (sid) {
        submissionId = sid;
        await p.goto(`${BASE}/todo/${sid}`, { waitUntil: 'domcontentloaded' });
        await p.waitForTimeout(4000);
        opened = /\/todo\//.test(p.url());
        log('GOTO_SID', sid, p.url());
      }
    }
    if (!opened) {
      try {
        // StudentWorkList may use pressable rows without Open label
        const row = p.locator('[data-testid], a, div[role="button"], button').filter({
          hasText: /PhaseB|NoUnhide|place-value/i,
        });
        if ((await row.count()) > 0) {
          await row.first().click({ force: true, timeout: 4000 });
          await p.waitForTimeout(3500);
          opened = /\/todo\//.test(p.url()) || /\/lesson\//.test(p.url());
        }
      } catch {}
    }
    if (!opened) {
      try {
        const openBtn = p.getByText(/^Open$/i);
        if ((await openBtn.count()) > 0) {
          await openBtn.first().click({ timeout: 4000, force: true });
          await p.waitForTimeout(3500);
          opened = /\/todo\//.test(p.url()) || /\/lesson\//.test(p.url());
        }
      } catch {}
    }
    body = await shot(p, '03-focus-detail', 2500);
    submissionId = (p.url().match(/\/todo\/([^/?#]+)/) || [])[1] || submissionId;
    if (!focusTitle && /PhaseB|NoUnhide|place-value|HW S1/i.test(body)) {
      focusTitle = body.match(/ditl-[A-Za-z0-9 _-]+/)?.[0] || focusTitle || 'focus-item';
    }
    note(3, opened || !!submissionId, `opened=${opened} sid=${submissionId} title=${focusTitle} url=${p.url()}`);

    // Step 4: Complete action — fill answers + Turn in
    let filled = 0;
    // Stay on detail; avoid bare digit/A-D clicks (they hit tray badges → Messages)
    try {
      const ans = p.getByPlaceholder(/Your answer/i);
      const n = await ans.count();
      log('ANSWER_FIELDS', n);
      for (let i = 0; i < n; i++) {
        try {
          await ans.nth(i).click({ force: true });
          await ans.nth(i).fill(`ditl-s03-ui02-ans-${i + 1}`);
          filled++;
        } catch {}
      }
      if (n === 0) {
        const fields = p.locator('input:not([type=password]):not([type=hidden]), textarea');
        const nFields = await fields.count();
        log('FIELDS_FALLBACK', nFields);
        for (let i = 0; i < nFields; i++) {
          try {
            await fields.nth(i).fill(`ditl-s03-ui02-ans-${i + 1}`);
            filled++;
          } catch {}
        }
      }
    } catch (e) {
      log('fill', String(e).slice(0, 100));
    }
    body = await shot(p, '04-filled', 1200);
    const stillOnDetail = /\/todo\/[0-9a-f-]+/i.test(p.url());
    note(4, stillOnDetail, `filled_ops=${filled} stillOnDetail=${stillOnDetail} url=${p.url()} bodyHasAns=${/ditl-s03-ui02/i.test(body)}`);

    // Turn in only (exact PrimaryButton label)
    let clickedTurnIn = false;
    try {
      if (!stillOnDetail && submissionId) {
        await p.goto(`${BASE}/todo/${submissionId}`, { waitUntil: 'domcontentloaded' });
        await p.waitForTimeout(3500);
      }
      const turn = p.getByText(/^Turn in$/i);
      const nTurn = await turn.count();
      log('TURN_CANDS', nTurn, p.url());
      if (nTurn > 0) {
        await turn.last().click({ force: true, timeout: 5000 });
        clickedTurnIn = true;
        await p.waitForTimeout(4000);
      } else {
        const rb = p.getByRole('button', { name: /^Turn in$/i });
        if (await rb.count()) {
          await rb.first().click({ force: true });
          clickedTurnIn = true;
          await p.waitForTimeout(4000);
        }
      }
      // evaluate click as last resort on sticky footer
      if (!clickedTurnIn) {
        clickedTurnIn = await p.evaluate(() => {
          const nodes = Array.from(document.querySelectorAll('div,span,button,a'));
          const t = nodes.find((n) => /^Turn in$/i.test((n.textContent || '').trim()));
          if (t) {
            t.click();
            return true;
          }
          return false;
        });
        if (clickedTurnIn) await p.waitForTimeout(4000);
      }
    } catch (e) {
      log('complete', String(e).slice(0, 100));
    }
    body = await shot(p, '05-after-complete', 2500);
    const submitHit = rpcHits.some(
      (h) => /student_submit|turn_in|submit_practice|\/submit/i.test(h.u) && h.st < 400,
    );
    const completeCue = /submitted|turned in|turn in received|success|already submitted/i.test(body);
    const leftToTodoList = /\/todo\/?$/.test(p.url().replace(BASE, 'http://localhost:8081')) || p.url().endsWith('/todo') || /\/todo$/.test(p.url());
    // After successful turn-in, app replace()s to /todo with Done tab
    completed = Boolean(submitHit || completeCue || (clickedTurnIn && leftToTodoList));
    note(
      5,
      opened && (completed || clickedTurnIn),
      `completed=${completed} clickedTurnIn=${clickedTurnIn} submitHit=${submitHit} completeCue=${completeCue} leftToTodo=${leftToTodoList} url=${p.url()}`,
    );

    // Step 5b: Confirm Done tab / list status
    try {
      await p.goto(`${BASE}/todo`, { waitUntil: 'domcontentloaded' });
    } catch (e) {
      log('todo nav fail', String(e).slice(0, 80));
      await p.waitForTimeout(3000);
      await p.goto(`${BASE}/todo`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    }
    await p.waitForTimeout(2500);
    try {
      const dones = p.locator('div, span, button, a').filter({ hasText: /^Done$/ });
      const n = await dones.count();
      for (let i = 0; i < Math.min(n, 8); i++) {
        try {
          await dones.nth(i).click({ timeout: 1500, force: true });
          await p.waitForTimeout(2000);
          body = await p.innerText('body');
          if (!/Due Sep/i.test(body) || /PhaseB|NoUnhide|HW S1|submitted|complete/i.test(body)) {
            onDone = true;
            break;
          }
        } catch {}
      }
    } catch {}
    body = await shot(p, '06-done-tab', 2000);
    const titleOnDone =
      onDone &&
      (focusTitle
        ? body.toLowerCase().includes(String(focusTitle).toLowerCase().slice(0, 12))
        : /PhaseB|NoUnhide|HW S1|place-value/i.test(body));
    // also accept To Do list no longer showing open item as "started"
    await p.goto(`${BASE}/todo`, { waitUntil: 'domcontentloaded' });
    const todoBody = await shot(p, '07-todo-after', 3000);
    const stillOpenOnly = /PhaseB|NoUnhide/i.test(todoBody) && /Open|Due /i.test(todoBody);
    note(
      6,
      onDone || completed || !stillOpenOnly,
      `onDone=${onDone} titleOnDone=${titleOnDone} stillOpenOnly=${stillOpenOnly}`,
    );

    // Cross-student isolation check on people
    await p.goto(`${BASE}/student/people`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '08-people', 2500);
    const peopleBleed =
      /score|%\s|grade average/i.test(body) && /Jamie|classmate|Alex Rivera/i.test(body);
    note(7, !peopleBleed, `peopleBleed=${peopleBleed}`);
    if (peopleBleed) {
      findings.push(
        'FINDING: classmate scores on student people after focus complete; severity P0; case DITL-S-03-UI-02',
      );
    }

    // Teardown sign out
    let signedOut = false;
    try {
      await p.evaluate(() => {
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch {}
      });
      await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
      body = await shot(p, '09-signout', 2000);
      signedOut = /sign-in|Sign in|password/i.test(body) || /sign-in/i.test(p.url());
    } catch (e) {
      log('signout', String(e).slice(0, 80));
    }
    note(8, signedOut, `signedOut=${signedOut}`);

    const stepsOk = evidence.filter((e) => e.startsWith('OK')).length;
    const stepsMiss = evidence.filter((e) => e.startsWith('MISS')).length;
    if (findings.some((f) => /P0/.test(f))) result = 'FAIL';
    else if (signedIn && listOk && (opened || submissionId) && completed && stepsMiss === 0)
      result = 'PASS';
    else if (signedIn && listOk && (opened || submissionId) && (completed || filled > 0) && stepsMiss <= 2)
      result = 'PARTIAL';
    else if (signedIn && stepsOk >= 3) result = 'PARTIAL';
    else result = 'FAIL';
  } finally {
    await browser.close().catch(() => {});
  }
  const out = {
    case: 'DITL-S-03-UI-02',
    result,
    evidence,
    findings,
    user: USER,
    lane: 'C',
    ud: UD,
    submissionId,
    focusTitle,
    completed,
    onDone,
    rpcHits: rpcHits.slice(0, 30),
  };
  fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(out, null, 2));
  fs.writeFileSync(
    path.join(A, 'SUMMARY.txt'),
    `DITL-S-03-UI-02 RESULT=${result} lane=C Chromium ${UD}\nApp: ${BASE} user=${USER}\n` +
      evidence.join('\n') +
      '\nFINDINGS:\n' +
      (findings.length ? findings.join('\n') : '(none)') +
      '\n',
  );
  log('RESULT', result);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
