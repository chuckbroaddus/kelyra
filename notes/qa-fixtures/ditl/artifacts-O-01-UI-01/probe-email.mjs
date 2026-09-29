import { chromium } from '../_pw/node_modules/playwright/index.mjs';
const exe =
  process.env.HOME +
  '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const c = await chromium.launchPersistentContext('/tmp/ditl-pw-lane-c-email', {
  headless: true,
  executablePath: exe,
  viewport: { width: 1280, height: 900 },
  args: ['--disable-dev-shm-usage'],
});
const p = c.pages()[0] || (await c.newPage());
const msgs = [];
p.on('console', (m) => {
  if (/error|Error|fail|session|auth/i.test(m.text())) msgs.push(m.text().slice(0, 250));
});
p.on('pageerror', (e) => msgs.push('PE ' + String(e).slice(0, 250)));
await p.goto('http://localhost:8081/sign-in', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2000);
// ensure form visible
const skip = p.getByText(/^Skip$/i);
if (await skip.count()) {
  try {
    await skip.first().click({ timeout: 2000 });
  } catch {}
}
await p.waitForTimeout(1000);
await p.locator('input').nth(0).fill('ditl-admin@ditl.test');
await p.locator('input[type=password]').fill('DITL-admin-test');
await p.getByRole('button', { name: /sign in/i }).click();
await p.waitForTimeout(12000);
console.log('URL', p.url());
console.log('BODY', (await p.innerText('body')).replace(/\n+/g, ' | ').slice(0, 1500));
console.log('MSGS', msgs.join('\n'));
// try teacher
await p.evaluate(async () => {
  try {
    const keys = await window.localStorage.clear();
  } catch {}
});
await p.goto('http://localhost:8081/sign-in', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1500);
await p.locator('input').nth(0).fill('ditl-teacher-a');
await p.locator('input[type=password]').fill('DITL-teacher-test');
await p.getByRole('button', { name: /sign in/i }).click();
await p.waitForTimeout(10000);
console.log('TEACHER', (await p.innerText('body')).replace(/\n+/g, ' | ').slice(0, 800));
await c.close();
