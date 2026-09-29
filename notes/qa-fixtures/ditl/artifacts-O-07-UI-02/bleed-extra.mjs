// Supplemental bleed check S5 Samira + note S3/S4
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:8081';
const UD = '/tmp/ditl-pw-lane-a';
const PASS = process.env.DITL_ADMIN_PASS || 'DITL-admin-test';
const CLASS = 'd1715000-0000-4000-a000-000000000301';
const S5 = 'cd84bffd-33fb-4023-a7e3-c39598b85e88';
const MARKERS = ['Jordy', '555-0101', 'jordan.lee.ditl@example.test', '100 Ditl Lane', '2017-04-12', '(512) 555-0142', 'alex.rivera@school.edu', '123 Maple'];

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
await p.evaluate(() => {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {}
});
await browser.clearCookies().catch(() => {});
await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(800);
await p.locator('input').nth(0).fill('ditl-admin');
await p.locator('input[type=password]').first().fill(PASS);
await p.locator('input[type=password]').first().press('Enter');
await p.waitForTimeout(6000);
await p.goto(`${BASE}/class/${CLASS}/student/${S5}`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2500);
const tab = p.getByRole('tab', { name: /^Details$/i });
if (await tab.count()) await tab.first().click().catch(() => {});
await p.waitForTimeout(1000);
await p.screenshot({ path: path.join(A, '07-s5-samira.png'), fullPage: true });
const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ');
const hits = MARKERS.filter((m) => body.includes(m));
const out = {
  s5_url: p.url(),
  name_ok: /Samira/i.test(body),
  bleed_hits: hits,
  snip: body.slice(0, 900),
  notes: 'S3 Morgan not on Math class (prior T-05); S4 Riley id unresolved in prior lane',
};
fs.writeFileSync(path.join(A, 'bleed-extra.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
await p.goto(`${BASE}/profile`, { waitUntil: 'domcontentloaded' }).catch(() => {});
await p.waitForTimeout(800);
const so = p.getByRole('button', { name: /Sign out/i });
if (await so.count()) await so.first().click({ force: true }).catch(() => {});
else {
  await p.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
  });
}
await browser.close().catch(() => {});
