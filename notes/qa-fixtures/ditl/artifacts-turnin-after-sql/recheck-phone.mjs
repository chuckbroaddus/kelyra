// phone recheck after web turn-in
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://127.0.0.1:8081';
const SID = '8c1e6ed0-f708-454b-b509-9b40ff2c3377';
const USER = 'ditl-student-s1';
const PASS = process.env.DITL_STUDENT_PASS || 'DITL-student-test';
const UD = '/tmp/ditl-pw-turnin-phone-recheck';
const log = (...a) => console.log(...a);
fs.mkdirSync(UD, { recursive: true });
const exe =
  process.env.HOME +
  '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const browser = await chromium.launchPersistentContext(UD, {
  headless: true,
  viewport: { width: 390, height: 844 },
  executablePath: exe,
  args: ['--disable-dev-shm-usage'],
});
const p = browser.pages()[0] || (await browser.newPage());
await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1000);
await p.evaluate(() => {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {}
});
await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1200);
await p.locator('input').nth(0).fill(USER);
await p.locator('input[type=password]').first().fill(PASS);
await p.locator('input[type=password]').first().press('Enter');
await p.waitForTimeout(6000);
await p.goto(`${BASE}/todo/${SID}`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(3500);
let body = (await p.innerText('body')).replace(/\n+/g, ' | ');
await p.screenshot({ path: path.join(A, 'phone390-recheck-detail.png'), fullPage: true });
log('DETAIL', p.url());
log(body.slice(0, 1500));
log('hasTurn', /Turn in/i.test(body), 'couldNot', /Could not submit/i.test(body));
await p.goto(`${BASE}/todo`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2500);
const dones = p.locator('div, span, button, a').filter({ hasText: /^Done$/ });
const n = await dones.count();
for (let i = 0; i < Math.min(n, 6); i++) {
  try {
    await dones.nth(i).click({ timeout: 1500, force: true });
    await p.waitForTimeout(1500);
  } catch {}
}
body = (await p.innerText('body')).replace(/\n+/g, ' | ');
await p.screenshot({ path: path.join(A, 'phone390-recheck-done.png'), fullPage: true });
log('DONE', p.url());
log(body.slice(0, 1500));
log('phaseB', /PhaseB|NoUnhide/i.test(body), 'turned', /Turned in/i.test(body));
await browser.close();
