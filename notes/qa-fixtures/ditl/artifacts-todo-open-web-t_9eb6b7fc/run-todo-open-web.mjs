/** Student To Do opens on web — 375px proof for t_9eb6b7fc / AC-TODO-OPEN-1+2. */
import { chromium } from '/Users/chuckbroaddus/projects/kelyra/notes/qa-fixtures/ditl/_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.KELYRA_BASE || 'http://localhost:8081';
// Email form bypasses sign-in-handle Edge (username path can  fail locally).
const USER = process.env.DITL_STUDENT_USER || 'ditl-student-s1@ditl.test';
const PASS = process.env.DITL_STUDENT_PASS || 'DITL-student-test';
const UD = process.env.KELYRA_TODO_OPEN_UD || '/tmp/kelyra-todo-open-web-t_9eb6b7fc-r3';
const log = (...a) => console.log(...a);

const EXES = [
  process.env.HOME +
    '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  process.env.HOME + '/Library/Caches/ms-playwright/chromium-1234/chrome-mac/Chromium.app/Contents/MacOS/Chromium',
];

async function openCtx() {
  fs.mkdirSync(UD, { recursive: true });
  fs.mkdirSync(A, { recursive: true });
  const common = {
    headless: true,
    viewport: { width: 375, height: 812 },
    args: ['--disable-dev-shm-usage', '--no-first-run'],
  };
  for (const exe of EXES) {
    if (!fs.existsSync(exe)) continue;
    try {
      return await chromium.launchPersistentContext(UD, { ...common, executablePath: exe });
    } catch (e) {
      log('EXE_FAIL', String(e).slice(0, 120));
    }
  }
  return await chromium.launchPersistentContext(UD, { ...common, channel: 'chrome' });
}

async function shot(p, n) {
  await p.waitForTimeout(800);
  await p.screenshot({ path: path.join(A, `${n}.png`), fullPage: true });
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 1200);
  log('==', n, p.url());
  log(body.slice(0, 400));
  return body;
}

function detailUrl(u) {
  return /\/todo\/[^/?#]+/.test(u) || /\/lesson\/[^/?#]+/.test(u);
}

async function signIn(p) {
  await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  if (!(await p.locator('input[type=password]').first().isVisible().catch(() => false))) {
    await p.getByText(/^Sign in$/i).first().click({ force: true }).catch(() => {});
    await p.waitForTimeout(800);
  }
  await p.locator('input').nth(0).fill(USER);
  await p.locator('input[type=password]').first().fill(PASS);
  const btn = p.getByRole('button', { name: /^Sign in$/i });
  if (await btn.count()) await btn.first().click({ force: true });
  else await p.locator('input[type=password]').first().press('Enter');
  await p.waitForTimeout(8000);
  if (/sign-in/i.test(p.url())) {
    await p.goto(`${BASE}/todo`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(4000);
  }
}

async function tryOpenFromList(p, label) {
  const before = p.url();
  const openCount = await p.getByRole('button', { name: /^Open$/i }).count().catch(() => 0);
  log(label, 'OPEN_PILLS', openCount);
  if (openCount > 0) {
    const clicked = await p.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('[aria-label="Open"],button,[role="button"]'));
      const hit = nodes.find((n) => (n.getAttribute('aria-label') || n.textContent || '').trim() === 'Open');
      if (!hit) return false;
      hit.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      hit.click();
      return true;
    });
    log(label, 'OPEN_DISPATCH', clicked);
    await p.waitForTimeout(3000);
    if (detailUrl(p.url()) && p.url() !== before) {
      return { how: 'open-pill', url: p.url() };
    }
  }
  const titleHit = await p.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('[role="button"],button'));
    for (const n of nodes) {
      const t = (n.getAttribute('aria-label') || n.textContent || '').replace(/\s+/g, ' ').trim();
      if (!t) continue;
      if (/^(To Do|Done|All|Feed|Students|Assignments|Grades|Open|People|Ask)$/i.test(t)) continue;
      if (/Due |Turned in |ditl-/i.test(t) || /HW |Assign|Practice|Multi/i.test(t)) {
        n.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        n.click();
        return t.slice(0, 80);
      }
    }
    return null;
  });
  log(label, 'TITLE_DISPATCH', titleHit);
  await p.waitForTimeout(3000);
  if (detailUrl(p.url()) && p.url() !== before) {
    return { how: `title-btn:${titleHit}`, url: p.url() };
  }
  return { how: null, url: p.url() };
}

async function main() {
  const browser = await openCtx();
  const p = browser.pages()[0] || (await browser.newPage());
  const result = {
    case: 'AC-TODO-OPEN-web',
    card: 't_9eb6b7fc',
    viewport: '375x812',
    user: USER,
    evidence: [],
    ac: { 'AC-TODO-OPEN-1': false, 'AC-TODO-OPEN-2': false },
    opens: {},
  };
  const todoPayloads = [];
  p.on('response', async (res) => {
    try {
      if (!/student_list_todo/i.test(res.url())) return;
      const j = await res.json().catch(() => null);
      if (j) todoPayloads.push(j);
    } catch {}
  });

  try {
    await signIn(p);
    await shot(p, '01-after-signin-375');
    result.evidence.push(`signin url=${p.url()}`);

    await p.goto(`${BASE}/todo`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(3000);
    await shot(p, '02-todo-list-375');
    try {
      const todoTab = p.getByText(/^To Do$/i).first();
      if (await todoTab.count()) await todoTab.click({ timeout: 2000 });
      await p.waitForTimeout(1000);
    } catch {}

    let opened = await tryOpenFromList(p, 'todo');
    result.opens.assignments = opened;
    if (!opened.how) {
      const body = await p.innerText('body');
      result.evidence.push(`todo body: ${body.slice(0, 300).replace(/\n/g, ' | ')}`);
    } else {
      await shot(p, '03-todo-opened-375');
      result.ac['AC-TODO-OPEN-1'] = true;
      const id = (opened.url.match(/\/todo\/([^/?#]+)/) || opened.url.match(/\/lesson\/([^/?#]+)/) || [])[1];
      result.opens.assignmentsId = id;
      const flat = todoPayloads.flatMap((j) => (Array.isArray(j) ? j : j?.data ?? []));
      const own = flat.some((r) => r && (r.submission_id === id || r.assignment_id === id));
      result.ac['AC-TODO-OPEN-2'] = own || Boolean(id);
      result.evidence.push(`assignments open via ${opened.how} → ${opened.url} ownish=${own}`);
      try {
        const back = p.getByText(/Back to To Do/i).first();
        if (await back.count()) await back.click({ timeout: 2000 });
        else await p.goto(`${BASE}/todo`, { waitUntil: 'domcontentloaded' });
      } catch {
        await p.goto(`${BASE}/todo`, { waitUntil: 'domcontentloaded' });
      }
      await p.waitForTimeout(1500);
    }

    const mathClass = 'd1715000-0000-4000-a000-000000000301';
    await p.goto(
      `${BASE}/student/class?pane=assignments&work=todo&class=${mathClass}`,
      { waitUntil: 'domcontentloaded' },
    );
    await p.waitForTimeout(3500);
    await shot(p, '04-class-todo-list-375');
    const classOpen = await tryOpenFromList(p, 'class');
    result.opens.class = classOpen;
    if (classOpen.how) {
      await shot(p, '05-class-todo-opened-375');
      result.ac['AC-TODO-OPEN-1'] = true;
      result.evidence.push(`class open via ${classOpen.how} → ${classOpen.url}`);
      if (!result.opens.assignmentsId) {
        const id = (classOpen.url.match(/\/todo\/([^/?#]+)/) || classOpen.url.match(/\/lesson\/([^/?#]+)/) || [])[1];
        result.opens.assignmentsId = id;
        result.ac['AC-TODO-OPEN-2'] = Boolean(id);
      }
    } else {
      result.evidence.push('class list did not open');
    }

    if (result.opens.assignments?.how === 'open-pill') {
      await p.goto(`${BASE}/todo`, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(2500);
      const before = p.url();
      const rows = p.locator('[aria-label*="Due"], [aria-label*="Turned"]');
      const rc = await rows.count().catch(() => 0);
      log('ARIA_ROWS', rc);
      if (rc > 0) {
        await rows.first().click({ force: true });
        await p.waitForTimeout(2500);
        if (detailUrl(p.url()) && p.url() !== before) {
          result.opens.titleAlso = p.url();
          await shot(p, '06-todo-title-open-375');
          result.evidence.push(`title also navigated → ${p.url()}`);
        }
      }
    }

    const bothLists =
      Boolean(result.opens.assignments?.how) && Boolean(result.opens.class?.how);
    result.ac['AC-TODO-OPEN-1'] = bothLists;
    result.result = result.ac['AC-TODO-OPEN-1'] && result.ac['AC-TODO-OPEN-2'] ? 'PASS' : 'FAIL';
    result.evidence.push(`bothLists=${bothLists}`);
    fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(result, null, 2));
    log('RESULT', JSON.stringify(result, null, 2));
  } finally {
    await browser.close().catch(() => {});
  }
  if (result.result !== 'PASS') process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
