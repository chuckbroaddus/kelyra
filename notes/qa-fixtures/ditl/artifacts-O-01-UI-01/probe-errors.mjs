import { chromium } from '../_pw/node_modules/playwright/index.mjs';
const exe =
  process.env.HOME +
  '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const c = await chromium.launchPersistentContext('/tmp/ditl-pw-lane-c-fresh', {
  headless: true,
  executablePath: exe,
  viewport: { width: 1280, height: 900 },
  args: ['--disable-dev-shm-usage'],
});
const p = c.pages()[0] || (await c.newPage());
const logs = [];
p.on('console', (msg) => logs.push(['con', msg.type(), msg.text().slice(0, 300)]));
p.on('pageerror', (err) => logs.push(['pageerror', String(err).slice(0, 400)]));
await p.goto('http://localhost:8081/sign-in', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1500);
await p.locator('input').nth(0).fill('ditl-admin');
await p.locator('input[type=password]').fill('DITL-admin-test');
await p.getByRole('button', { name: /sign in/i }).click();
await p.waitForTimeout(10000);
const body = (await p.innerText('body')).replace(/\n+/g, ' | ').slice(0, 1000);
console.log('BODY', body);
console.log('LOGS');
for (const L of logs) console.log(L.join(' | '));
// dump react root text nodes count
const meta = await p.evaluate(() => ({
  ls: !!localStorage.getItem('sb-aohibokgilxhqwmupdfv-auth-token'),
  title: document.title,
  links: [...document.querySelectorAll('a')].map((a) => a.textContent?.trim()).filter(Boolean).slice(0, 30),
}));
console.log('META', JSON.stringify(meta, null, 2));
await p.screenshot({ path: 'notes/qa-fixtures/ditl/artifacts-O-01-UI-01/admin-stuck.png', fullPage: true });
await c.close();
