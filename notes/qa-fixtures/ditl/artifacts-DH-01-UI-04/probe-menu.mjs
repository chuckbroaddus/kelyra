import { chromium } from '../_pw/node_modules/playwright/index.mjs';
const BASE = 'http://localhost:8081';
const USER = 'ditl-teacher-a';
const PASS = process.env.DITL_TEACHER_PASS || 'DITL-teacher-test';
const UD = '/tmp/ditl-pw-lane-a';
const exe = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const ctx = await chromium.launchPersistentContext(UD, { headless: true, executablePath: exe, viewport: { width: 390, height: 844 }, args: ['--disable-dev-shm-usage'] });
const p = ctx.pages()[0] || await ctx.newPage();
await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} });
await p.goto(`${BASE}/sign-in`);
await p.waitForTimeout(700);
await p.locator('input').nth(0).fill(USER);
await p.locator('input[type=password]').first().fill(PASS);
await p.locator('input[type=password]').first().press('Enter');
await p.waitForTimeout(5500);
await p.goto(`${BASE}/`);
await p.waitForTimeout(2000);
await p.getByLabel(/Open menu/i).click();
await p.waitForTimeout(1500);
const info = await p.evaluate(() => {
  const nodes = [...document.querySelectorAll('button, [role="button"], a, div, span, li')];
  return nodes
    .map((n) => {
      const al = n.getAttribute('aria-label') || '';
      const tx = (n.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 100);
      if (!al && !tx) return null;
      if (!/switch|parent|teach|office|children|sign out|seat|teacher|altitude/i.test(al + ' ' + tx)) return null;
      const r = n.getBoundingClientRect();
      return { al, tx, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w || r.width), h: Math.round(r.height), vis: r.width > 0 && r.height > 0 };
    })
    .filter(Boolean)
    .slice(0, 60);
});
console.log(JSON.stringify(info, null, 2));
console.log('BODY', (await p.innerText('body')).slice(0, 1500));
await p.screenshot({ path: 'notes/qa-fixtures/ditl/artifacts-DH-01-UI-04/probe-menu.png', fullPage: true });
await ctx.close();
