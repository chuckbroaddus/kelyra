import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'fs';
const ROOT = '/Users/chuckbroaddus/projects/kelyra';
function env(k) {
  const envText = fs.readFileSync(ROOT + '/.env', 'utf8');
  const m = envText.match(new RegExp('^' + k + '=(.*)$', 'm'));
  return m[1].trim().replace(/^['\"]|['\"]$/g, '');
}
const URL = env('EXPO_PUBLIC_SUPABASE_URL');
const ANON = env('EXPO_PUBLIC_SUPABASE_ANON_KEY');
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
// get session via edge
const r = await fetch(URL + '/functions/v1/sign-in-handle', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: 'Bearer ' + ANON },
  body: JSON.stringify({ handle: 'ditl-admin', password: 'DITL-admin-test' }),
});
const sess = await r.json();
console.log('edge st', r.status, Object.keys(sess), sess.user?.email || sess.error || sess.msg);
if (!sess.access_token) {
  console.log(JSON.stringify(sess).slice(0, 400));
  process.exit(1);
}
await p.goto('http://localhost:8081/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2000);
await p.evaluate(
  ({ access_token, refresh_token, key }) => {
    const payload = {
      access_token,
      refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      expires_in: 3600,
      token_type: 'bearer',
      user: null,
    };
    localStorage.setItem(key, JSON.stringify(payload));
  },
  {
    access_token: sess.access_token,
    refresh_token: sess.refresh_token,
    key: 'sb-aohibokgilxhqwmupdfv-auth-token',
  },
);
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(10000);
console.log('BODY', (await p.innerText('body')).replace(/\n+/g, ' | ').slice(0, 1500));
await p.screenshot({ path: ROOT + '/notes/qa-fixtures/ditl/artifacts-O-01-UI-01/inject-session.png', fullPage: true });
await c.close();
