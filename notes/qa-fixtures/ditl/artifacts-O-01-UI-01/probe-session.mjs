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
const rpc = [];
p.on('response', async (res) => {
  const u = res.url();
  if (/supabase\.co\/(rest|rpc|functions)/i.test(u) || /my_profile|membership|school|office/i.test(u)) {
    const t = await res.text().catch(() => '');
    rpc.push({ st: res.status(), u: u.slice(0, 140), t: t.slice(0, 300) });
  }
});
await p.goto('http://localhost:8081/sign-in', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(800);
await p.evaluate(() => {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {}
});
await p.goto('http://localhost:8081/sign-in', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1200);
await p.locator('input').nth(0).fill('ditl-admin');
await p.locator('input[type=password]').fill('DITL-admin-test');
await p.getByRole('button', { name: /sign in/i }).click();
await p.waitForTimeout(12000);
const ls = await p.evaluate(() => {
  const o = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    o[k] = String(localStorage.getItem(k)).slice(0, 120);
  }
  return o;
});
console.log('URL', p.url());
console.log('BODY', (await p.innerText('body')).replace(/\n+/g, ' | ').slice(0, 1500));
console.log('LS keys', Object.keys(ls));
console.log('LS', JSON.stringify(ls, null, 2).slice(0, 2000));
console.log('RPC', JSON.stringify(rpc.slice(0, 30), null, 2));
for (const path of ['/?tab=people', '/admin/people', '/office', '/people', '/manage']) {
  await p.goto('http://localhost:8081' + path, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(4000);
  console.log('NAV', path, p.url(), (await p.innerText('body')).replace(/\n+/g, ' | ').slice(0, 400));
}
await c.close();
