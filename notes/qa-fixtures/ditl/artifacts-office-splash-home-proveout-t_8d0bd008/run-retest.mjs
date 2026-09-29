// Retest AC-3/5/9 office splash t_8d0bd008
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://127.0.0.1:8081';
const UD = '/tmp/ditl-pw-office-splash-retest';
const CHROME =
  process.env.HOME +
  '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const results = {};
const log = (...a) => console.log(...a);
function note(id, ok, d) {
  results[id] = { pass: !!ok, detail: String(d).slice(0, 900) };
  log(`${ok ? 'PASS' : 'FAIL'} ${id}: ${d}`);
}
// more below
async function shot(p, n, w = 800) {
  await p.waitForTimeout(w);
  await p.screenshot({ path: path.join(A, `${n}.png`), fullPage: true });
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ');
  log('==', n, p.url(), body.slice(0, 400));
  return body;
}
function isSplash(body) {
  if (/People/i.test(body) && /Manage/i.test(body) && /Feed|Classes/i.test(body)) return false;
  if (/Skip|Tap for sound/i.test(body)) return true;
  if (/Sign in/i.test(body) && !/People/i.test(body)) return true;
  return false;
}
function isOffice(body) {
  return /People/i.test(body) && /Manage/i.test(body) && /Feed|Classes/i.test(body);
}
async function openB(dir, vp) {
  fs.mkdirSync(dir, { recursive: true });
  const common = {
    headless: true,
    viewport: vp || { width: 1280, height: 900 },
    args: ['--disable-dev-shm-usage'],
  };
  if (fs.existsSync(CHROME)) return chromium.launchPersistentContext(dir, { ...common, executablePath: CHROME });
  return chromium.launchPersistentContext(dir, { ...common, channel: 'chrome' });
}
async function clear(p, b) {
  await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(400);
  await p.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
  });
  await b.clearCookies().catch(() => {});
  await p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1000);
}
async function signIn(p, user, pass) {
  await p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1000);
  const si = p.getByText(/^Sign in$/i).first();
  if (await si.isVisible().catch(() => false)) await si.click({ force: true }).catch(() => {});
  await p.waitForTimeout(500);
  if (!(await p.locator('input[type=password]').first().isVisible().catch(() => false))) {
    await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(800);
  }
  await p.locator('input').nth(0).fill(user);
  await p.locator('input[type=password]').first().fill(pass);
  await p.locator('input[type=password]').first().press('Enter');
  await p.waitForTimeout(7000);
  if (/sign-in/i.test(p.url())) {
    await p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(3500);
  }
}
async function doSignOut(p) {
  await p.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('div,span,button,a'));
    const hits = nodes.filter((n) => {
      const t = (n.textContent || '').trim();
      return /^Kelyra$/i.test(t) || /@ditl-/.test(t);
    });
    if (hits[0]) hits[0].click();
  });
  await p.waitForTimeout(1000);
  await p.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('div,span,button,a,p'));
    const hit = nodes.find((n) => /^Sign out$/i.test((n.textContent || '').trim()));
    if (hit) hit.click();
  });
  await p.waitForTimeout(3000);
  await p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2000);
}

async function main() {
  const b = await openB(UD);
  const p = b.pages()[0] || (await b.newPage());
  try {
    await clear(p, b);
    let body = await shot(p, 'rt-00-signed-out', 2500);
    note('AC-3-signed-out', isSplash(body), body.slice(0, 200));
    await signIn(p, 'ditl-admin', 'DITL-admin-test');
    body = await shot(p, 'rt-01-admin');
    note('AC-1', isOffice(body), body.slice(0, 200));
    await p.goto(`${BASE}/?tab=people`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, 'rt-02-people-tab');
    const people = /Staff|People|Create/i.test(body) && !isSplash(body);
    await p.goto(`${BASE}/?tab=manage`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, 'rt-03-manage-tab');
    const manage = /School|Manage|Activity|Matrix|Dismiss|Identity|Responsibilit/i.test(body);
    note('AC-2-tabs', people && manage, `people=${people} manage=${manage} ${body.slice(0, 160)}`);
    await doSignOut(p);
    body = await shot(p, 'rt-04-signout');
    const afterOut = isSplash(body);
    await signIn(p, 'ditl-admin', 'DITL-admin-test');
    body = await shot(p, 'rt-05-back');
    note('AC-9', afterOut && isOffice(body), `out=${afterOut} back=${isOffice(body)}`);
    await clear(p, b);
    await signIn(p, 'ditl-super', 'DITL-super-test');
    body = await shot(p, 'rt-06-super');
    note('AC-5', isOffice(body) && /Superintendent|ditl-super/i.test(body), body.slice(0, 250));
    await p.goto(`${BASE}/?tab=manage`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, 'rt-07-super-manage');
    note('AC-5-manage', !isSplash(body) && /Manage|School|Activity|Identity/i.test(body), body.slice(0, 200));
  } catch (e) {
    note('RUN', false, e instanceof Error ? e.message : String(e));
  } finally {
    await b.close().catch(() => {});
  }
  const b2 = await openB(UD + 'p', { width: 390, height: 844 });
  const p2 = b2.pages()[0] || (await b2.newPage());
  try {
    await clear(p2, b2);
    await signIn(p2, 'ditl-super', 'DITL-super-test');
    let body = await shot(p2, 'rt-phone-super');
    note('AC-5-phone', isOffice(body) && /Superintendent|ditl-super/i.test(body), body.slice(0, 250));
    await clear(p2, b2);
    await signIn(p2, 'ditl-admin', 'DITL-admin-test');
    body = await shot(p2, 'rt-phone-admin');
    note('AC-1-phone', isOffice(body), body.slice(0, 200));
    await p2.goto(`${BASE}/?tab=people`, { waitUntil: 'domcontentloaded' });
    body = await shot(p2, 'rt-phone-people');
    await p2.goto(`${BASE}/?tab=manage`, { waitUntil: 'domcontentloaded' });
    const m = await shot(p2, 'rt-phone-manage');
    note('AC-2-phone-tabs', /People|Staff/i.test(body) && /Manage|School|Activity|Identity/i.test(m), 'ok');
  } catch (e) {
    note('PHONE', false, e instanceof Error ? e.message : String(e));
  } finally {
    await b2.close().catch(() => {});
  }
  fs.writeFileSync(path.join(A, 'result-retest.json'), JSON.stringify(results, null, 2));
  log('DONE');
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});

