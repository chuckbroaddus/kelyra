// teardown delete confirm for DH-01-UI-02 marker capture
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const UD = '/tmp/ditl-pw-lane-a';
const BASE = 'http://localhost:8081';
const USER = 'ditl-teacher-a';
const PASS = process.env.DITL_TEACHER_PASS || 'DITL-teacher-test';
const MARKER = '1790531215247';
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
await p.goto(BASE + '/sign-in');
await p.waitForTimeout(500);
await p.evaluate(() => {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {}
});
await p.goto(BASE + '/sign-in');
await p.waitForTimeout(800);
await p.locator('input').nth(0).fill(USER);
await p.locator('input[type=password]').first().fill(PASS);
await p.locator('input[type=password]').first().press('Enter');
await p.waitForTimeout(5000);
await p.goto(BASE + '/inbox');
await p.waitForTimeout(2500);
await p.evaluate((m) => {
  const all = [...document.querySelectorAll('button, a, div, span')];
  const mark = all.find((n) => (n.innerText || '').includes(m));
  if (!mark) return;
  let el = mark;
  for (let i = 0; i < 12 && el; i++) {
    const del = [...(el.querySelectorAll?.('button,a,span') || [])].find((x) =>
      /^Delete$/i.test((x.innerText || '').trim()),
    );
    if (del) {
      del.click();
      return;
    }
    el = el.parentElement;
  }
}, MARKER);
await p.waitForTimeout(1000);
// confirm destructive
const yes = p.getByRole('button', { name: /Delete|Remove|Yes/i });
if (await yes.count()) await yes.first().click({ force: true }).catch(() => {});
await p.getByText(/Delete this work/i).click({ force: true }).catch(() => {});
await p.waitForTimeout(500);
for (const name of [/Delete this work/i, /^Delete$/i, /Remove/i]) {
  const b = p.getByRole('button', { name });
  if (await b.count()) await b.last().click({ force: true }).catch(() => {});
}
await p.waitForTimeout(2500);
const t = await p.innerText('body');
console.log('still', t.includes(MARKER), t.slice(0, 400));
await p.evaluate(() => {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {}
});
await ctx.close();
