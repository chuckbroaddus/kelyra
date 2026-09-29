import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
const ROOT = '/Users/chuckbroaddus/projects/kelyra';
function env(k) {
  const envText = fs.readFileSync(ROOT + '/.env', 'utf8');
  const m = envText.match(new RegExp('^' + k + '=(.*)$', 'm'));
  return m[1].trim().replace(/^['\"]|['\"]$/g, '');
}
const URL = env('EXPO_PUBLIC_SUPABASE_URL');
const ANON = env('EXPO_PUBLIC_SUPABASE_ANON_KEY');
const sb = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await sb.auth.signInWithPassword({
  email: 'ditl-admin@ditl.test',
  password: 'DITL-admin-test',
});
console.log('signin', error?.message || 'ok', data.session?.user?.email, data.user?.role);
if (!data.session) process.exit(1);
const session = data.session;
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
await p.goto('http://localhost:8081/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1500);
await p.evaluate((sessionJson) => {
  localStorage.setItem('sb-aohibokgilxhqwmupdfv-auth-token', sessionJson);
}, JSON.stringify(session));
await p.goto('http://localhost:8081/', { waitUntil: 'networkidle' });
await p.waitForTimeout(12000);
let body = (await p.innerText('body')).replace(/\n+/g, ' | ').slice(0, 1800);
console.log('BODY1', body);
// open hamburger / people
for (const label of ['People', 'Manage', 'Devon', 'Office', 'Menu', 'Account']) {
  const n = await p.getByText(new RegExp(label, 'i')).count();
  if (n) console.log('found', label, n);
}
await p.screenshot({ path: ROOT + '/notes/qa-fixtures/ditl/artifacts-O-01-UI-01/inject-full.png', fullPage: true });
// try desk routes used by office
for (const path of ['/?tab=people', '/?tab=manage', '/?tab=classes', '/?tab=feed']) {
  await p.goto('http://localhost:8081' + path, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(5000);
  body = (await p.innerText('body')).replace(/\n+/g, ' | ').slice(0, 900);
  console.log('NAV', path, body);
}
await c.close();
