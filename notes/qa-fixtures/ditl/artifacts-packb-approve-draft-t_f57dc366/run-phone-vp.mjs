import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://127.0.0.1:8081';
const UD = '/tmp/ditl-pw-packb-phone-t_f57dc366';
const exe =
  process.env.HOME +
  '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const ctx = await chromium.launchPersistentContext(UD, {
  headless: true,
  executablePath: exe,
  viewport: { width: 390, height: 844 },
  args: ['--disable-dev-shm-usage'],
});
const p = ctx.pages()[0] || (await ctx.newPage());
await p.goto(BASE + '/sign-in', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(400);
await p.evaluate(() => {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {}
});
await p.goto(BASE + '/sign-in', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(800);
await p.locator('input').nth(0).fill('ditl-teacher-a');
await p.locator('input[type=password]').first().fill(process.env.DITL_TEACHER_PASS || 'DITL-teacher-test');
await p.locator('input[type=password]').first().press('Enter');
await p.waitForTimeout(7000);
const url =
  BASE +
  '/class/d1715000-0000-4000-a000-000000000301/student/2bcee429-11ce-4f84-b2de-9aab349f03cc?capture=4ac67add-3f16-4ee9-a924-53b1005fb95a&tab=focus';
await p.goto(url, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(5000);
const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ');
await p.screenshot({ path: path.join(A, 'p-02-focus-capture.png'), fullPage: true });
const sig = {
  packB: /Keyed review|Pack B/i.test(body),
  accept: /Accept recommendation/i.test(body),
  gap: /Suggested gap|Draft cheap/i.test(body),
};
fs.writeFileSync(path.join(A, 'result-phone-vp.json'), JSON.stringify({ url: p.url(), sig, head: body.slice(0, 900) }, null, 2));
console.log(JSON.stringify({ url: p.url(), sig, head: body.slice(0, 500) }));
await ctx.close();
