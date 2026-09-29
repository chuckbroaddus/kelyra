import { chromium } from '../../qa-fixtures/ditl/_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const UD = '/tmp/ditl-pw-lane-a';
const BASE = 'http://127.0.0.1:8081';
const USER = 'ditl-teacher-a';
const PASS = process.env.DITL_TEACHER_PASS || 'DITL-teacher-test';
const exe =
  process.env.HOME +
  '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const c = await chromium.launchPersistentContext(UD, {
  headless: true,
  executablePath: exe,
  viewport: { width: 390, height: 844 },
  args: ['--disable-dev-shm-usage', '--no-first-run'],
});
const p = c.pages()[0] || (await c.newPage());
await p.goto(BASE + '/sign-in', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(400);
await p.evaluate(() => {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {}
});
await p.goto(BASE + '/sign-in', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1000);
await p.locator('input').nth(0).fill(USER);
await p.locator('input[type=password]').first().fill(PASS);
await p.locator('input[type=password]').first().press('Enter');
await p.waitForTimeout(6000);
const top = await p.evaluate(() =>
  [...document.querySelectorAll('button, [role="button"], a, [aria-label]')]
    .map((el) => {
      const r = el.getBoundingClientRect();
      const t = (el.getAttribute('aria-label') || el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 80);
      return { t, al: el.getAttribute('aria-label'), tag: el.tagName, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    })
    .filter((x) => x.w > 8 && x.h > 8 && x.y < 120)
    .slice(0, 40),
);
fs.writeFileSync('/tmp/ditl-dh-01-ask-01-rerun-out/probe-top.json', JSON.stringify({ url: p.url(), top }, null, 2));
// try common openers
for (const sel of ['Open menu', 'menu', 'Menu', 'Account', 'Profile']) {
  const hit = await p.evaluate((s) => {
    const el = [...document.querySelectorAll('button, [role="button"], [aria-label]')].find((n) => {
      const t = (n.getAttribute('aria-label') || n.innerText || '').trim();
      return t === s || new RegExp(s, 'i').test(t);
    });
    if (el) {
      el.click();
      return (el.getAttribute('aria-label') || el.innerText || '').trim().slice(0, 80);
    }
    return null;
  }, sel);
  if (hit) {
    await p.waitForTimeout(1200);
    const menu = await p.evaluate(() =>
      [...document.querySelectorAll('button, [role="menuitem"], a, [aria-label], div, span')]
        .map((el) => (el.getAttribute('aria-label') || el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 100))
        .filter((t) => t && t.length < 100 && /parent|teach|seat|sign|child|switch|home|ride/i.test(t))
        .slice(0, 40),
    );
    fs.writeFileSync('/tmp/ditl-dh-01-ask-01-rerun-out/probe-menu.json', JSON.stringify({ hit, menu, url: p.url() }, null, 2));
    await p.screenshot({ path: '/tmp/ditl-dh-01-ask-01-rerun-out/probe-menu.png', fullPage: true });
    break;
  }
}
// click top-left button by geometry
await p.mouse.click(28, 48);
await p.waitForTimeout(1200);
const afterClick = await p.evaluate(() => ({
  url: location.href,
  text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 1500),
  labels: [...document.querySelectorAll('button, [role="menuitem"], a, [aria-label]')]
    .map((el) => (el.getAttribute('aria-label') || el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 90))
    .filter((t) => /parent|teach|seat|sign|switch|child|menu/i.test(t))
    .slice(0, 40),
}));
fs.writeFileSync('/tmp/ditl-dh-01-ask-01-rerun-out/probe-corner.json', JSON.stringify(afterClick, null, 2));
await p.screenshot({ path: '/tmp/ditl-dh-01-ask-01-rerun-out/probe-corner.png', fullPage: true });
await c.close();
console.log('done');
