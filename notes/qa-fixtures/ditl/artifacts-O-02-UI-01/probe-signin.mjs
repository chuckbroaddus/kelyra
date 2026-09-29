// probe sign-in form on :8081 lane-c
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:8081';
const UD = '/tmp/ditl-pw-lane-c';
const USER = 'ditl-admin';
const PASS = process.env.DITL_ADMIN_PASS || 'DITL-admin-test';

async function openCtx() {
  const common = {
    headless: true,
    viewport: { width: 1280, height: 900 },
    args: ['--disable-dev-shm-usage', '--no-first-run'],
  };
  const exe =
    process.env.HOME +
    '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
  if (fs.existsSync(exe)) return chromium.launchPersistentContext(UD, { ...common, executablePath: exe });
  return chromium.launchPersistentContext(UD, { ...common, channel: 'chrome' });
}

const browser = await openCtx();
const p = browser.pages()[0] || (await browser.newPage());
await p.goto(BASE + '/sign-in', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(500);
await p.evaluate(() => {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {}
});
await p.goto(BASE + '/sign-in', { waitUntil: 'networkidle' }).catch(() => {});
await p.waitForTimeout(3000);
const info = await p.evaluate(() => {
  const inputs = [...document.querySelectorAll('input')].map((el) => ({
    type: el.type,
    name: el.name,
    placeholder: el.placeholder,
    aria: el.getAttribute('aria-label'),
    visible: !!(el.offsetWidth || el.offsetHeight),
  }));
  const buttons = [...document.querySelectorAll('button')].map((b) => b.innerText.slice(0, 40));
  return { url: location.href, inputs, buttons, body: document.body.innerText.slice(0, 500) };
});
console.log(JSON.stringify(info, null, 2));
await p.screenshot({ path: path.join(A, 'probe-signin.png'), fullPage: true });

// try fill
const n = await p.locator('input').count();
console.log('input count', n);
if (n >= 2) {
  await p.locator('input').nth(0).fill(USER);
  await p.locator('input[type=password]').first().fill(PASS);
  await p.getByRole('button', { name: /sign in/i }).click().catch(async () => {
    await p.locator('input[type=password]').first().press('Enter');
  });
  await p.waitForTimeout(10000);
  const after = await p.evaluate(() => ({
    url: location.href,
    body: document.body.innerText.slice(0, 800),
    ls: Object.keys(localStorage),
  }));
  console.log('AFTER', JSON.stringify(after, null, 2));
  await p.screenshot({ path: path.join(A, 'probe-after.png'), fullPage: true });
}
await browser.close();
