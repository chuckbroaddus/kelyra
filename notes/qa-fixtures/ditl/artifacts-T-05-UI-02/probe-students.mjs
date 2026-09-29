import { chromium } from '../_pw/node_modules/playwright/index.mjs';
const UD = '/tmp/ditl-pw-lane-a';
const exe =
  process.env.HOME +
  '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const ctx = await chromium.launchPersistentContext(UD, {
  headless: true,
  viewport: { width: 1280, height: 900 },
  executablePath: exe,
  args: ['--disable-dev-shm-usage'],
});
const p = ctx.pages()[0] || (await ctx.newPage());
const BASE = 'http://localhost:8081';
await p.goto(BASE + '/sign-in');
await p.waitForTimeout(800);
await p.evaluate(() => {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {}
});
await p.goto(BASE + '/sign-in');
await p.waitForTimeout(1000);
await p.locator('input').nth(0).fill('ditl-teacher-a');
await p.locator('input[type=password]').first().fill('DITL-teacher-test');
await p.locator('input[type=password]').first().press('Enter');
await p.waitForTimeout(6000);
await p.goto(BASE + '/class/d1715000-0000-4000-a000-000000000301');
await p.waitForTimeout(2000);
await p.getByText('Students', { exact: true }).first().click().catch(() => {});
await p.waitForTimeout(2500);
const t = (await p.innerText('body')).replace(/\n+/g, ' | ');
console.log('URL', p.url());
console.log(t.slice(0, 2000));
await p.screenshot({ path: 'probe-students.png', fullPage: true });
// click Jamie
const jamie = p.getByText('Jamie', { exact: true });
console.log('jamie count', await jamie.count());
if (await jamie.count()) {
  await jamie.first().click({ force: true });
  await p.waitForTimeout(2500);
  console.log('AFTER_JAMIE', p.url());
  console.log((await p.innerText('body')).replace(/\n+/g, ' | ').slice(0, 800));
  await p.getByText('Details', { exact: true }).first().click({ force: true }).catch(() => {});
  await p.waitForTimeout(2000);
  console.log('JAMIE_DET', p.url());
  console.log((await p.innerText('body')).replace(/\n+/g, ' | ').slice(0, 1200));
  await p.screenshot({ path: 'probe-jamie-details.png', fullPage: true });
}
await ctx.close();
