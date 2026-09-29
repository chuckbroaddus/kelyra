import { chromium } from '../_pw/node_modules/playwright/index.mjs';
const exe =
  process.env.HOME +
  '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const c = await chromium.launchPersistentContext('/tmp/ditl-pw-lane-c', {
  headless: true,
  executablePath: exe,
  viewport: { width: 390, height: 844 },
  args: ['--disable-dev-shm-usage'],
});
const p = c.pages()[0] || (await c.newPage());
await p.goto('http://localhost:8081/sign-in', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(500);
await p.evaluate(() => {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {}
});
await p.reload();
await p.waitForTimeout(1500);
await p.locator('input').nth(0).fill('ditl-admin');
await p.locator('input[type=password]').fill('DITL-admin-test');
await p.getByRole('button', { name: /sign in/i }).click();
for (const ms of [3000, 6000, 10000, 15000]) {
  await p.waitForTimeout(ms === 3000 ? 3000 : ms - 3000);
  const body = (await p.innerText('body')).replace(/\n+/g, ' | ').slice(0, 900);
  console.log('T', ms, p.url(), body);
  // click possible seat choices
  for (const label of ['Office', 'Administrator', 'Admin', 'Devon', 'Parent', 'Continue', 'Enter']) {
    const loc = p.getByText(new RegExp('^' + label + '$', 'i'));
    if ((await loc.count()) > 0) {
      console.log('CLICK', label);
      try {
        await loc.first().click({ timeout: 1500 });
      } catch {}
    }
  }
}
await p.screenshot({ path: 'notes/qa-fixtures/ditl/artifacts-O-01-UI-01/probe-mobile.png', fullPage: true });
console.log('FINAL', (await p.innerText('body')).replace(/\n+/g, ' | ').slice(0, 1500));
await c.close();
