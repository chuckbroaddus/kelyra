// probe Details tab
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:8081';
const UD = '/tmp/ditl-pw-lane-a';
const CLASS = 'd1715000-0000-4000-a000-000000000301';
const S1 = '2bcee429-11ce-4f84-b2de-9aab349f03cc';
const PASS = process.env.DITL_TEACHER_PASS || 'DITL-teacher-test';
const exe =
  process.env.HOME +
  '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const browser = await chromium.launchPersistentContext(UD, {
  headless: true,
  viewport: { width: 1280, height: 900 },
  executablePath: exe,
  args: ['--disable-dev-shm-usage', '--no-first-run'],
});
const p = browser.pages()[0] || (await browser.newPage());
await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(500);
await p.evaluate(() => {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {}
});
await p.goto(`${BASE}/sign-in`);
await p.waitForTimeout(800);
await p.locator('input').nth(0).fill('ditl-teacher-a');
await p.locator('input[type=password]').first().fill(PASS);
await p.locator('input[type=password]').first().press('Enter');
await p.waitForTimeout(5000);
await p.goto(`${BASE}/class/${CLASS}/student/${S1}`);
await p.waitForTimeout(2500);

const dump = await p.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('[role=button],button,a,[tabindex]'));
  return btns
    .map((el) => ({
      t: (el.textContent || '').trim().slice(0, 40),
      aria: el.getAttribute('aria-label'),
      role: el.getAttribute('role'),
      cls: (el.className || '').toString().slice(0, 60),
    }))
    .filter((x) => /detail|focus|work|parent|preferred|clear|add /i.test(x.t + (x.aria || '')))
    .slice(0, 40);
});
console.log(JSON.stringify(dump, null, 2));

// try click all Details-like
for (const el of await p.locator('text=Details').all()) {
  const box = await el.boundingBox();
  console.log('Details box', box);
  await el.click({ force: true }).catch((e) => console.log('click fail', e.message));
  await p.waitForTimeout(1000);
}
await p.screenshot({ path: path.join(A, 'probe-details.png'), fullPage: true });
const body = await p.innerText('body');
console.log(body.slice(0, 1200));
// click Mar 15 / Add details hero subtitle
for (const t of ['Mar 15', 'Add details', 'Preferred name', 'Add preferred name']) {
  const c = await p.getByText(t, { exact: false }).count();
  console.log('count', t, c);
}
await browser.close();
