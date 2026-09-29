import { chromium } from '../_pw/node_modules/playwright/index.mjs';
const exe =
  process.env.HOME +
  '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const c = await chromium.launchPersistentContext('/tmp/ditl-pw-lane-c', {
  headless: true,
  executablePath: exe,
  viewport: { width: 1280, height: 900 },
  args: ['--disable-dev-shm-usage'],
});
const p = c.pages()[0] || (await c.newPage());
p.on('console', (msg) => {
  const t = msg.text();
  if (/error|auth|session|profile|fail/i.test(t)) console.log('CON', msg.type(), t.slice(0, 200));
});
await p.goto('http://localhost:8081/sign-in', { waitUntil: 'domcontentloaded' });
await p.evaluate(() => {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {}
});
await p.goto('http://localhost:8081/sign-in', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2000);
await p.locator('input').nth(0).fill('ditl-admin');
await p.locator('input[type=password]').fill('DITL-admin-test');
await p.getByRole('button', { name: /sign in/i }).click();
await p.waitForTimeout(5000);
console.log('after click', p.url(), (await p.innerText('body')).slice(0, 300));
// hard reload to pick up supabase session from localStorage
await p.goto('http://localhost:8081/', { waitUntil: 'networkidle' });
await p.waitForTimeout(8000);
console.log('after reload', p.url(), (await p.innerText('body')).replace(/\n+/g, ' | ').slice(0, 1200));
const html = await p.content();
console.log('has People?', /People/.test(html));
console.log('has Devon?', /Devon/.test(html));
console.log('has Manage?', /Manage/.test(html));
console.log('has Feed?', /Feed/.test(html));
// try student that worked before for comparison
await p.evaluate(() => {
  try {
    localStorage.clear();
  } catch {}
});
await p.goto('http://localhost:8081/sign-in', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1500);
await p.locator('input').nth(0).fill('ditl-student-s1');
await p.locator('input[type=password]').fill('DITL-student-test');
await p.getByRole('button', { name: /sign in/i }).click();
await p.waitForTimeout(8000);
console.log('student', p.url(), (await p.innerText('body')).replace(/\n+/g, ' | ').slice(0, 800));
await c.close();
