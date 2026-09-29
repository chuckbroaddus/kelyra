import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'fs';
const exe =
  process.env.HOME +
  '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const UD = '/tmp/ditl-pw-lane-c';
const c = await chromium.launchPersistentContext(UD, {
  headless: true,
  executablePath: exe,
  viewport: { width: 1280, height: 900 },
  args: ['--disable-dev-shm-usage', '--no-first-run'],
});
const p = c.pages()[0] || (await c.newPage());
const hits = [];
p.on('response', async (res) => {
  const u = res.url();
  if (/auth|token|login|sign/i.test(u)) {
    const t = await res.text().catch(() => '');
    hits.push({ st: res.status(), u: u.slice(0, 120), t: t.slice(0, 200) });
  }
});
await p.goto('http://localhost:8081/sign-in', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1000);
await p.evaluate(() => {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {}
});
await p.goto('http://localhost:8081/sign-in', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1500);
const user = process.argv[2] || 'ditl-admin';
const pass = process.argv[3] || 'DITL-admin-test';
await p.locator('input').nth(0).fill(user);
await p.locator('input[type=password]').fill(pass);
await p.getByRole('button', { name: /sign in/i }).click();
await p.waitForTimeout(8000);
const body = (await p.innerText('body')).replace(/\n+/g, ' | ').slice(0, 1200);
console.log('URL', p.url());
console.log('BODY', body);
console.log('HITS', JSON.stringify(hits, null, 2));
await c.close();
