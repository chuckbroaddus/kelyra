import { chromium } from '../_pw/node_modules/playwright/index.mjs';
const UD = '/tmp/ditl-pw-lane-a';
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
await p.goto('http://localhost:8081/sign-in');
await p.waitForTimeout(400);
await p.evaluate(() => {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {}
});
await p.goto('http://localhost:8081/sign-in');
await p.waitForTimeout(800);
await p.locator('input').nth(0).fill('ditl-teacher-a');
await p.locator('input[type=password]').first().fill('DITL-teacher-test');
await p.locator('input[type=password]').first().press('Enter');
await p.waitForTimeout(5000);
await p.goto('http://localhost:8081/inbox');
await p.waitForTimeout(2500);
const dels = p.getByRole('button', { name: /^Delete$/i });
console.log('del count', await dels.count());
if (await dels.count()) await dels.first().click({ force: true });
await p.waitForTimeout(1200);
const labels = await p.evaluate(() =>
  [...document.querySelectorAll('button')].map((b) => (b.innerText || '').trim()).filter(Boolean).slice(0, 40),
);
console.log('buttons', labels);
// Confirm sheet primary is often "Delete"
for (const lab of labels) {
  if (/^delete$/i.test(lab) || /delete this/i.test(lab)) {
    await p.getByRole('button', { name: lab }).last().click({ force: true }).catch(() => {});
    await p.waitForTimeout(800);
  }
}
await p.waitForTimeout(2000);
const t = await p.innerText('body');
console.log('still', t.includes('1790531215247'));
console.log(t.slice(0, 500));
await p.screenshot({
  path: '/Users/chuckbroaddus/projects/kelyra/notes/qa-fixtures/ditl/artifacts-DH-01-UI-02/teardown-final.png',
  fullPage: true,
});
await p.evaluate(() => {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {}
});
await ctx.close();
