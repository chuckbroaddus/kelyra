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
const CLASS = 'd1715000-0000-4000-a000-000000000301';
await p.goto(BASE + '/sign-in');
await p.waitForTimeout(600);
await p.evaluate(() => {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {}
});
await p.goto(BASE + '/sign-in');
await p.waitForTimeout(800);
await p.locator('input').nth(0).fill('ditl-teacher-a');
await p.locator('input[type=password]').first().fill('DITL-teacher-test');
await p.locator('input[type=password]').first().press('Enter');
await p.waitForTimeout(5500);
await p.goto(BASE + `/class/${CLASS}`);
await p.waitForTimeout(1500);
const names = ['Riley', 'Samira', 'Jordan'];
for (const n of names) {
  await p.goto(BASE + `/class/${CLASS}`);
  await p.waitForTimeout(1200);
  const el = p.getByText(n, { exact: true });
  if (await el.count()) {
    await el.first().click({ force: true });
    await p.waitForTimeout(2000);
  }
  console.log(n, p.url());
  // try Details via role tab
  const det = p.getByRole('button', { name: /^Details$/i });
  console.log('details buttons', await det.count());
  if (await det.count()) await det.last().click({ force: true });
  await p.waitForTimeout(1500);
  // scroll body
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await p.waitForTimeout(500);
  const body = (await p.innerText('body')).replace(/\n+/g, ' | ');
  console.log(body.slice(0, 1400));
  console.log('MARKERS', {
    maple: /123 Maple/i.test(body),
    alex: /alex\.rivera/i.test(body),
    phone: /555-0142/i.test(body),
    mar15: /Mar 15/i.test(body),
    addDetails: /Add details/i.test(body),
  });
  await p.screenshot({ path: `probe-${n.toLowerCase()}.png`, fullPage: true });
}
// sign out via profile
await p.goto(BASE + '/profile');
await p.waitForTimeout(1500);
console.log('PROFILE', (await p.innerText('body')).replace(/\n+/g, ' | ').slice(0, 600));
const so = p.getByText(/Sign out/i);
if (await so.count()) await so.first().click({ force: true });
await p.waitForTimeout(2000);
console.log('AFTER_SO', p.url(), (await p.innerText('body')).replace(/\n+/g, ' | ').slice(0, 300));
await ctx.close();
