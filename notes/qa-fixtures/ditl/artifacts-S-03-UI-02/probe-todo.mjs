// probe PhaseB + Hist rows for student S1
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const BASE = 'http://localhost:8081';
const USER = 'ditl-student-s1';
const PASS = process.env.DITL_STUDENT_PASS || 'DITL-student-test';
const UD = '/tmp/ditl-pw-lane-c';

const exe =
  process.env.HOME +
  '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const rows = [];
async function main() {
  const ctx = await chromium.launchPersistentContext(UD, {
    headless: true,
    viewport: { width: 1280, height: 900 },
    executablePath: fs.existsSync(exe) ? exe : undefined,
    channel: fs.existsSync(exe) ? undefined : 'chrome',
    args: ['--disable-dev-shm-usage'],
  });
  const p = ctx.pages()[0] || (await ctx.newPage());
  p.on('response', async (res) => {
    if (!/student_list_todo/i.test(res.url())) return;
    const j = await res.json().catch(() => null);
    if (Array.isArray(j)) {
      rows.length = 0;
      rows.push(...j);
      console.log(JSON.stringify(j, null, 2).slice(0, 4000));
    }
  });
  await p.goto(BASE + '/sign-in', { waitUntil: 'domcontentloaded' });
  await p.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
  });
  await p.goto(BASE + '/sign-in', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  await p.locator('input').nth(0).fill(USER);
  await p.locator('input[type=password]').first().fill(PASS);
  await p.locator('input[type=password]').first().press('Enter');
  await p.waitForTimeout(6000);
  await p.goto(BASE + '/todo', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(4000);
  fs.writeFileSync('/tmp/ditl-s03-todo-rows.json', JSON.stringify(rows, null, 2));
  console.log('WROTE', rows.length);
  await ctx.close();
}
main();
