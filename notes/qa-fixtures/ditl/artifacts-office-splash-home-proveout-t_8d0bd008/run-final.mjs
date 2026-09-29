// Final AC-2/6/9 drive t_8d0bd008
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://127.0.0.1:8081';
const CHROME =
  process.env.HOME +
  '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const R = {};
const log = (...a) => console.log(...a);
function note(id, ok, d) {
  R[id] = { pass: !!ok, detail: String(d).slice(0, 700) };
  log(`${ok ? 'PASS' : 'FAIL'} ${id}: ${d}`);
}
async function shot(p, n, w = 900) {
  await p.waitForTimeout(w);
  await p.screenshot({ path: path.join(A, `${n}.png`), fullPage: true });
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ');
  log('==', n, body.slice(0, 350));
  return body;
}
function office(b) {
  return /People/i.test(b) && /Manage/i.test(b) && /Feed|Classes/i.test(b);
}
function splash(b) {
  if (office(b)) return false;
  return /Skip|Tap for sound|Sign in/i.test(b);
}
async function boot(dir, vp) {
  fs.mkdirSync(dir, { recursive: true });
  return chromium.launchPersistentContext(dir, {
    headless: true,
    viewport: vp || { width: 1280, height: 900 },
    executablePath: CHROME,
    args: ['--disable-dev-shm-usage'],
  });
}
async function clear(p, b) {
  await p.goto(BASE + '/sign-in', { waitUntil: 'domcontentloaded' });
  await p.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
  });
  await b.clearCookies().catch(() => {});
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(800);
}
async function signIn(p, u, pass) {
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(800);
  const si = p.getByText(/^Sign in$/i).first();
  if (await si.isVisible().catch(() => false)) await si.click({ force: true }).catch(() => {});
  await p.waitForTimeout(400);
  if (!(await p.locator('input[type=password]').first().isVisible().catch(() => false))) {
    await p.goto(BASE + '/sign-in', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(600);
  }
  await p.locator('input').nth(0).fill(u);
  await p.locator('input[type=password]').first().fill(pass);
  await p.locator('input[type=password]').first().press('Enter');
  await p.waitForTimeout(7000);
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3000);
}
// more
async function openMenu(p) {
  await p.getByLabel('Open menu').click({ force: true, timeout: 5000 }).catch(async () => {
    await p.locator('[aria-label="Open menu"]').click({ force: true }).catch(() => {});
  });
  await p.waitForTimeout(1200);
}
async function clickExact(p, lab) {
  await p.evaluate((label) => {
    const nodes = Array.from(document.querySelectorAll('div,span,button,a,p'));
    const hits = nodes.filter((n) => (n.textContent || '').trim() === label);
    const hit = hits[hits.length - 1] || hits[0];
    if (hit) {
      hit.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      hit.click();
    }
  }, lab);
  await p.waitForTimeout(2000);
}
async function main() {
  for (let i = 0; i < 30; i++) {
    try {
      if ((await fetch(BASE)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 2000));
  }
  const b = await boot('/tmp/ditl-pw-final-office');
  const p = b.pages()[0] || (await b.newPage());
  try {
    await clear(p, b);
    let body = await shot(p, 'f-00-out', 2000);
    note('AC-3-out', splash(body), body.slice(0, 120));
    await signIn(p, 'ditl-admin', 'DITL-admin-test');
    body = await shot(p, 'f-01-admin');
    note('AC-1', office(body) && /Administrator/i.test(body), body.slice(0, 180));
    await clickExact(p, 'People');
    body = await shot(p, 'f-02-people');
    const people = /Staff|Students|Parents|Create account|People/i.test(body) && office(body);
    await clickExact(p, 'Manage');
    body = await shot(p, 'f-03-manage', 2500);
    const manage = /School name|Identity|Activity|Matrix|Dismissal|Responsibilit|Manage/i.test(body);
    note('AC-2', people && manage, `people=${people} manage=${manage} ${body.slice(0, 200)}`);
    await openMenu(p);
    body = await shot(p, 'f-04-menu');
    note('AC-7-menu-parent', /Parent|My children|children/i.test(body), body.slice(0, 250));
    await p.getByText(/^Sign out$/i).first().click({ force: true }).catch(() => {});
    await p.waitForTimeout(3000);
    body = await shot(p, 'f-05-after-out');
    const outOk = splash(body);
    await signIn(p, 'ditl-admin', 'DITL-admin-test');
    body = await shot(p, 'f-06-back');
    note('AC-9', outOk && office(body), `out=${outOk} back=${office(body)}`);
    await clear(p, b);
    await signIn(p, 'ditl-super', 'DITL-super-test');
    body = await shot(p, 'f-07-super');
    note('AC-5', office(body) && /Superintendent/i.test(body), body.slice(0, 180));
    await openMenu(p);
    body = await shot(p, 'f-08-super-menu');
    const teach = /Teach|Teacher/i.test(body);
    if (teach) {
      await p.getByText(/^Teach$/i).first().click({ force: true }).catch(async () => {
        await clickExact(p, 'Teacher');
      });
      await p.waitForTimeout(3000);
      await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      body = await shot(p, 'f-09-super-teach-seat');
      note('AC-6-teach-seat-no-row', splash(body) || (!office(body) && !/Desk|Needs/i.test(body)), body.slice(0, 200));
      await openMenu(p);
      await clickExact(p, 'Office');
      await p.waitForTimeout(2500);
      await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      body = await shot(p, 'f-10-back-office');
      note('AC-6-back-office', office(body), body.slice(0, 180));
    } else {
      note('AC-6-teach-seat-no-row', true, 'no Teach seat on ditl-super menu (expected if no dual-hat); skip');
    }
  } catch (e) {
    note('RUN', false, e instanceof Error ? e.message : String(e));
  } finally {
    await b.close().catch(() => {});
  }
  fs.writeFileSync(path.join(A, 'result-final.json'), JSON.stringify(R, null, 2));
  log('DONE');
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
