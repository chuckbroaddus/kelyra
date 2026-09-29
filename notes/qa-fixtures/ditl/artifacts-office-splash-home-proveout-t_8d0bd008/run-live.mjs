// LIVE IQG prove-out t_8d0bd008 office splash home — not loop-as-pass
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.KELYRA_BASE || 'http://127.0.0.1:8081';
const UD = '/tmp/ditl-pw-office-splash-prove-t8d0';
const CHROME =
  process.env.HOME +
  '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const PASS = process.env.DITL_ADMIN_PASS || 'DITL-admin-test';
const SUPER_PASS = process.env.DITL_SUPER_PASS || PASS;
const TEACH_PASS = process.env.DITL_TEACHER_PASS || 'DITL-teacher-test';
const STUDENT_PASS = process.env.DITL_STUDENT_PASS || 'DITL-student-test';
const PARENT_PASS = process.env.DITL_PARENT_PASS || 'DITL-parent-test';
const log = (...a) => console.log(...a);
const results = {};

function note(id, ok, detail) {
  results[id] = { pass: !!ok, detail: String(detail).slice(0, 800) };
  log(`${ok ? 'PASS' : 'FAIL'} ${id}: ${detail}`);
}

async function shot(p, n, w = 900) {
  await p.waitForTimeout(w);
  await p.screenshot({ path: path.join(A, `${n}.png`), fullPage: true });
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ');
  log('==', n, p.url(), body.slice(0, 500));
  return body;
}

function isSplash(body) {
  if (/People/i.test(body) && /Manage/i.test(body) && (/Feed/i.test(body) || /Classes/i.test(body)))
    return false;
  if (/Sign in/i.test(body) && !/People/i.test(body)) return true;
  if (/Spring Baptist|Welcome to Kelyra/i.test(body) && /Sign in/i.test(body) && !/Manage/i.test(body))
    return true;
  return false;
}

function isOfficeHome(body) {
  return (
    /People/i.test(body) &&
    /Manage/i.test(body) &&
    (/Feed/i.test(body) || /Classes/i.test(body)) &&
    !isSplash(body)
  );
}

async function openCtx(vp) {
  fs.mkdirSync(UD, { recursive: true });
  fs.mkdirSync(A, { recursive: true });
  const common = {
    headless: true,
    viewport: vp || { width: 1280, height: 900 },
    args: ['--disable-dev-shm-usage', '--no-first-run'],
  };
  const dir = UD + (vp ? '-phone' : '');
  if (fs.existsSync(CHROME)) {
    try {
      return await chromium.launchPersistentContext(dir, { ...common, executablePath: CHROME });
    } catch {}
  }
  return chromium.launchPersistentContext(dir, { ...common, channel: 'chrome' });
}

async function clear(p, ctx) {
  await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await p.waitForTimeout(500);
  await p.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
  });
  await ctx.clearCookies().catch(() => {});
  await p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1200);
}

async function signIn(p, user, pass) {
  await p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  const si = p.getByText(/^Sign in$/i).first();
  if (await si.isVisible().catch(() => false)) {
    await si.click({ force: true }).catch(() => {});
    await p.waitForTimeout(800);
  }
  if (!(await p.locator('input[type=password]').first().isVisible().catch(() => false))) {
    await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1000);
  }
  await p.locator('input').nth(0).fill(user);
  await p.locator('input[type=password]').first().fill(pass);
  await p.locator('input[type=password]').first().press('Enter');
  await p.waitForTimeout(7000);
  if (/sign-in/i.test(p.url())) {
    await p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(4000);
  }
}

async function clickTab(p, label) {
  await p.evaluate((lab) => {
    const nodes = Array.from(document.querySelectorAll('div,span,button,a,p'));
    const hits = nodes.filter((n) => (n.textContent || '').trim() === lab);
    const hit = hits[hits.length - 1] || hits[0];
    if (hit) {
      hit.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      hit.click();
    }
  }, label);
  await p.waitForTimeout(1500);
}

async function signOut(p) {
  await p.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('div,span,button,a,p'));
    const hit = nodes.find((n) => /^Sign out$/i.test((n.textContent || '').trim()));
    if (hit) hit.click();
  });
  await p.waitForTimeout(2500);
  let body = await p.innerText('body').catch(() => '');
  if (!/Sign in/i.test(body)) {
    await p.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('div,span,button,a'));
      const menu = nodes.find((n) => /@|Kelyra/i.test((n.textContent || '').trim()));
      if (menu) menu.click();
    });
    await p.waitForTimeout(800);
    await p.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('div,span,button,a,p'));
      const hit = nodes.find((n) => /Sign out/i.test((n.textContent || '').trim()));
      if (hit) hit.click();
    });
    await p.waitForTimeout(2500);
  }
  await p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2000);
}

async function runSurface(tag, vp) {
  log('SURFACE', tag);
  const browser = await openCtx(vp);
  const p = browser.pages()[0] || (await browser.newPage());
  try {
    await clear(p, browser);
    let body = await shot(p, `${tag}-00-signed-out`);
    note(`AC-OFFICE-HOME-3-signed-out-${tag}`, isSplash(body), body.slice(0, 200));

    await signIn(p, 'ditl-admin', PASS);
    body = await shot(p, `${tag}-01-admin-home`);
    note(
      `AC-OFFICE-HOME-1-${tag}`,
      isOfficeHome(body) && /Administrator|ditl-admin/i.test(body),
      body.slice(0, 250),
    );

    await clickTab(p, 'People');
    body = await shot(p, `${tag}-02-people`);
    const peopleOk = /People/i.test(body) && !isSplash(body);
    await clickTab(p, 'Manage');
    body = await shot(p, `${tag}-03-manage`);
    const manageOk = /Manage|School|Activity|Matrix|Responsibilit/i.test(body) && !isSplash(body);
    note(`AC-OFFICE-HOME-2-${tag}`, peopleOk && manageOk, `people=${peopleOk} manage=${manageOk}`);

    await signOut(p);
    body = await shot(p, `${tag}-04-after-signout`);
    const splashAfter = isSplash(body);
    await signIn(p, 'ditl-admin', PASS);
    body = await shot(p, `${tag}-05-admin-return`);
    note(
      `AC-OFFICE-HOME-9-${tag}`,
      splashAfter && isOfficeHome(body),
      `splashAfter=${splashAfter} officeAgain=${isOfficeHome(body)}`,
    );

    await clear(p, browser);
    await signIn(p, 'ditl-super', SUPER_PASS);
    body = await shot(p, `${tag}-06-super-home`);
    note(
      `AC-OFFICE-HOME-5-${tag}`,
      isOfficeHome(body) && /Superintendent|ditl-super/i.test(body),
      body.slice(0, 250),
    );
    await clickTab(p, 'Manage');
    body = await shot(p, `${tag}-07-super-manage`);
    note(`AC-OFFICE-HOME-5-manage-${tag}`, !isSplash(body) && /Manage/i.test(body), body.slice(0, 200));

    await clear(p, browser);
    await signIn(p, 'ditl-admin', PASS);
    body = await shot(p, `${tag}-08-admin-not-parent-route`);
    note(
      `AC-OFFICE-HOME-7-${tag}`,
      !/\/parent/i.test(p.url()) && isOfficeHome(body),
      `url=${p.url()} office=${isOfficeHome(body)}`,
    );

    await clear(p, browser);
    await signIn(p, 'ditl-teacher-a', TEACH_PASS);
    body = await shot(p, `${tag}-09-teacher`);
    note(
      `AC-OFFICE-HOME-3-teacher-${tag}`,
      !isSplash(body) && (/Teacher|Classes|Desk|Needs|Diary/i.test(body) || /class\//i.test(p.url())),
      `url=${p.url()} ${body.slice(0, 180)}`,
    );

    await clear(p, browser);
    await signIn(p, 'ditl-student-s1', STUDENT_PASS);
    body = await shot(p, `${tag}-10-student`);
    note(
      `AC-OFFICE-HOME-3-student-${tag}`,
      !isSplash(body) && (/todo|To Do|assignment|class/i.test(body + p.url()) || /Jordan/i.test(body)),
      `url=${p.url()} ${body.slice(0, 180)}`,
    );

    await clear(p, browser);
    await signIn(p, 'ditl-parent-1', PARENT_PASS);
    body = await shot(p, `${tag}-11-parent`);
    const pureParentOffice =
      /People/i.test(body) && /Manage/i.test(body) && /Administrator/i.test(body);
    note(
      `AC-OFFICE-HOME-3-parent-${tag}`,
      !pureParentOffice && (/parent|Jordan|Jamie|Ride/i.test(body + p.url()) || !isOfficeHome(body)),
      body.slice(0, 200),
    );

    await clear(p, browser);
    body = await shot(p, `${tag}-12-splash-copy`, 2000);
    note(`AC-OFFICE-HOME-8-splash-${tag}`, isSplash(body) || /Sign in/i.test(body), body.slice(0, 150));
  } catch (e) {
    note(`RUN-${tag}`, false, e instanceof Error ? e.message : String(e));
  } finally {
    await browser.close().catch(() => {});
  }
}

async function main() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(BASE);
      if (r.ok || r.status === 200) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 1500));
  }
  await runSurface('web', null);
  await runSurface('phone', { width: 390, height: 844 });
  fs.writeFileSync(
    path.join(A, 'result-live.json'),
    JSON.stringify({ results, at: new Date().toISOString() }, null, 2),
  );
  log('DONE');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

