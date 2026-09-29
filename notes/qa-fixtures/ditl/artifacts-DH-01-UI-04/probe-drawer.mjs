import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const BASE = 'http://localhost:8081';
const USER = 'ditl-teacher-a';
const PASS = process.env.DITL_TEACHER_PASS || 'DITL-teacher-test';
const UD = '/tmp/ditl-pw-lane-a';
const exe = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const ctx = await chromium.launchPersistentContext(UD, { headless: true, executablePath: exe, viewport: { width: 390, height: 844 }, args: ['--disable-dev-shm-usage'] });
const p = ctx.pages()[0] || await ctx.newPage();
await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} });
await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(800);
await p.locator('input').nth(0).fill(USER);
await p.locator('input[type=password]').first().fill(PASS);
await p.locator('input[type=password]').first().press('Enter');
await p.waitForTimeout(6000);
await p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2000);
const dump = async (tag) => {
  const info = await p.evaluate(() => {
    const all = [...document.querySelectorAll('*')].slice(0, 800);
    const interesting = [];
    for (const el of all) {
      const al = el.getAttribute('aria-label') || '';
      const role = el.getAttribute('role') || '';
      const tx = (el.innerText || '').trim().slice(0, 60);
      const tag = el.tagName;
      if (/switch|parent|teach|seat|drawer|menu|soft|kelyra|children|altitude|profile/i.test(al + ' ' + tx + ' ' + role)) {
        const r = el.getBoundingClientRect();
        interesting.push({ tag, al: al.slice(0,80), role, tx, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) });
      }
    }
    return { url: location.href, interesting: interesting.slice(0, 80), bodyTop: document.body.innerText.slice(0, 400) };
  });
  console.log('TAG', tag, JSON.stringify(info, null, 2));
};
await dump('home');
// try header soft variants
const clicks = await p.evaluate(() => {
  const out = [];
  const els = [...document.querySelectorAll('button, [role="button"], a, img, div')];
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.y < 120 && r.height >= 16 && r.height <= 80 && r.width >= 16 && r.width <= 80) {
      out.push({ tag: el.tagName, al: (el.getAttribute('aria-label')||'').slice(0,40), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), tx: (el.innerText||'').slice(0,20) });
    }
  }
  return out;
});
console.log('TOP_CLICKABLES', JSON.stringify(clicks, null, 2));
// click leftmost top
await p.mouse.click(28, 48);
await p.waitForTimeout(1200);
await dump('after-mouse-28-48');
await p.screenshot({ path: 'notes/qa-fixtures/ditl/artifacts-DH-01-UI-04/probe-after-tl.png', fullPage: true });
// try getByLabel
for (const lab of ['Open menu', 'Menu', 'Account', 'Profile', 'Kelyra', 'Switch seat', 'Altitude']) {
  const c = await p.getByLabel(new RegExp(lab, 'i')).count();
  console.log('label', lab, c);
}
await ctx.close();
