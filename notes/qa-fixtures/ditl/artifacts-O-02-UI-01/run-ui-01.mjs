// DITL-O-02-UI-01 lane C — roster parent links + bio on S1
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const A = path.dirname(fileURLToPath(import.meta.url));
const ROOT = '/Users/chuckbroaddus/projects/kelyra';
const BASE = 'http://localhost:8081';
const UD = '/tmp/ditl-pw-lane-c';
const ADMIN_USER = 'ditl-admin';
const ADMIN_PASS = process.env.DITL_ADMIN_PASS || 'DITL-admin-test';
const evidence = [];
const findings = [];
const gaps = [];
const log = (...a) => console.log(...a);

function env(k) {
  const envText = fs.readFileSync(ROOT + '/.env', 'utf8');
  const m = envText.match(new RegExp('^' + k + '=(.*)$', 'm'));
  if (!m) throw new Error('missing ' + k);
  return m[1].trim().replace(/^['\"]|['\"]$/g, '');
}
function note(step, ok, detail) {
  const line = `${ok ? 'OK' : 'MISS'} step${step}: ${detail}`;
  evidence.push(line);
  log(line);
}
async function shot(p, n, w = 1200) {
  await p.waitForTimeout(w);
  await p.screenshot({ path: path.join(A, `${n}.png`), fullPage: true });
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 2400);
  log('==', n, p.url());
  log(body.slice(0, 900));
  return body;
}
async function openCtx() {
  fs.mkdirSync(UD, { recursive: true });
  fs.mkdirSync(A, { recursive: true });
  const common = {
    headless: true,
    viewport: { width: 1280, height: 900 },
    args: ['--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check'],
  };
  const candidates = [
    process.env.HOME +
      '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
    process.env.HOME +
      '/Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  ];
  for (const exe of candidates) {
    if (!fs.existsSync(exe)) continue;
    try {
      return await chromium.launchPersistentContext(UD, { ...common, executablePath: exe });
    } catch (e) {
      log('EXE_FAIL', String(e).slice(0, 120));
    }
  }
  return await chromium.launchPersistentContext(UD, { ...common, channel: 'chrome' });
}
async function clearSession(p) {
  await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await p.waitForTimeout(600);
  await p.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
  });
  await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
}
async function uiSignIn(p, user, pass) {
  await clearSession(p);
  await p.locator('input').nth(0).fill(user);
  await p.locator('input[type=password]').first().fill(pass);
  await p.locator('input[type=password]').first().press('Enter');
  await p.waitForTimeout(8000);
}
function isSplash(body, url) {
  const officeChrome = /People|Manage|Classes|Responsibilities|School name|Dismissal curb|Activity|Jordan Lee|Roster/i.test(
    body,
  );
  if (officeChrome) return false;
  if (/Sign in/i.test(body) && /Spring Baptist|Get started|Welcome to Kelyra/i.test(body)) return true;
  if (/sign-in/i.test(url || '') && /Sign in/i.test(body) && !officeChrome) return true;
  return /Sign in/i.test(body) && !officeChrome;
}
async function apiProbe(handle, pass) {
  const URL = env('EXPO_PUBLIC_SUPABASE_URL');
  const ANON = env('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  const r = await fetch(URL + '/functions/v1/sign-in-handle', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON,
      Authorization: 'Bearer ' + ANON,
    },
    body: JSON.stringify({ handle, password: pass }),
  });
  const j = await r.json().catch(() => ({}));
  const out = {
    status: r.status,
    hasToken: Boolean(j.access_token),
    err: j.error || j.msg || j.message || null,
  };
  if (!j.access_token) return { ...out, profile: null, feeds: null, teacher: null, classes: null, s1: null };
  const sb = createClient(URL, ANON, {
    global: { headers: { Authorization: 'Bearer ' + j.access_token } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await sb.auth.setSession({ access_token: j.access_token, refresh_token: j.refresh_token });
  const uid = j.user?.id || (await sb.auth.getUser()).data.user?.id;
  const { data: profile } = await sb
    .from('profiles')
    .select('id, username, display_name, role, also_teacher, also_parent, also_admin')
    .eq('id', uid)
    .maybeSingle();
  const { data: teacher } = await sb.from('teachers').select('id, profile_id').eq('profile_id', uid).maybeSingle();
  let feeds = null;
  try {
    const { data: f } = await sb.rpc('list_my_feeds');
    feeds = f;
  } catch {
    feeds = 'rpc_fail';
  }
  let classes = null;
  try {
    const { data: c } = await sb.from('classes').select('id, name, school_id').ilike('name', '%math%').limit(10);
    classes = c;
  } catch {
    classes = 'query_fail';
  }
  let s1 = null;
  try {
    const { data: st } = await sb
      .from('students')
      .select('id, display_name, metadata')
      .ilike('display_name', '%Jordan%Lee%')
      .limit(5);
    s1 = st;
  } catch {
    s1 = 'query_fail';
  }
  return { ...out, profile, teacher, feeds, classes, s1 };
}

async function writeOut(result) {
  const out = {
    case: 'DITL-O-02-UI-01',
    result,
    lane: 'C',
    browser: 'Chromium persistent /tmp/ditl-pw-lane-c',
    app: BASE,
    evidence,
    findings,
    gaps,
  };
  fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(out, null, 2));
  fs.writeFileSync(
    path.join(A, 'SUMMARY.txt'),
    [
      `DITL-O-02-UI-01 RESULT=${result} lane=C Chromium /tmp/ditl-pw-lane-c`,
      ...evidence,
      'FINDINGS:',
      ...(findings.length ? findings : ['none (parked splash P0 not re-filed)']),
      'GAPS:',
      ...(gaps.length ? gaps : ['none']),
    ].join('\n'),
  );
  log('RESULT', result);
}

async function main() {
  log('START DITL-O-02-UI-01');
  const browser = await openCtx();
  const p = browser.pages()[0] || (await browser.newPage());
  let result = 'FAIL';
  try {
    const adminApi = await apiProbe(ADMIN_USER, ADMIN_PASS);
    note(
      'api-admin',
      adminApi.hasToken && adminApi.status === 200,
      `status=${adminApi.status} role=${adminApi.profile?.role} name=${adminApi.profile?.display_name} teacherRow=${Boolean(adminApi.teacher)} classes=${JSON.stringify(adminApi.classes)?.slice(0, 200)} s1=${JSON.stringify(adminApi.s1)?.slice(0, 200)}`,
    );

    await uiSignIn(p, ADMIN_USER, ADMIN_PASS);
    let body = await shot(p, '01-admin-after-signin');
    const splashAfterSignIn = isSplash(body, p.url());
    note(1, adminApi.hasToken && !splashAfterSignIn, `url=${p.url()} splashish=${splashAfterSignIn}`);

    const mathClassId = Array.isArray(adminApi.classes) && adminApi.classes[0] ? adminApi.classes[0].id : null;
    const rosterRoutes = [
      mathClassId ? `/admin/class/${mathClassId}` : null,
      '/?tab=people',
      '/?tab=classes',
      '/admin/roster',
      '/people',
    ].filter(Boolean);

    let leftSplash = !splashAfterSignIn;
    let rosterBody = body;
    let rosterUrl = p.url();
    let reachedRoster = false;

    if (splashAfterSignIn) {
      const r = rosterRoutes[0];
      await p.goto(BASE + r, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(4000);
      rosterBody = await shot(p, '02-roster-once-' + r.replace(/[/?=]/g, '_'));
      rosterUrl = p.url();
      leftSplash = !isSplash(rosterBody, rosterUrl);
      reachedRoster =
        leftSplash && /Jordan|Roster|People|Class|parent|bio|Student|Math/i.test(rosterBody);
      note(2, leftSplash, `one roster attempt route=${r} url=${rosterUrl} leftSplash=${leftSplash} reachedRoster=${reachedRoster}`);
      if (!leftSplash) {
        evidence.push('SAME-AS-SEQ55/56: ditl-admin auth OK but SplashLanding; roster route also stuck');
        evidence.push('PARKED-P0: splash wall already on t_3191917a — not filed again');
        result = 'FAIL';
        await clearSession(p);
        body = await shot(p, '99-signout', 600);
        note('teardown', /sign-in|Sign in/i.test(body + p.url()), `url=${p.url()}`);
        await writeOut(result);
        return;
      }
    } else {
      for (const r of rosterRoutes.slice(0, 3)) {
        await p.goto(BASE + r, { waitUntil: 'domcontentloaded' });
        await p.waitForTimeout(3500);
        const b = await shot(p, '02-' + r.replace(/[/?=]/g, '_'));
        if (/Jordan|Roster|People|parent/i.test(b) && !isSplash(b, p.url())) {
          rosterBody = b;
          rosterUrl = p.url();
          reachedRoster = true;
          break;
        }
      }
      note(2, reachedRoster, `rosterUrl=${rosterUrl}`);
    }

    let linkedP1 = false;
    let linkedP2 = false;
    let bioEdited = false;
    if (reachedRoster) {
      const jordan = p.getByText(/Jordan Lee/i).first();
      if (await jordan.count()) {
        await jordan.click().catch(() => {});
        await p.waitForTimeout(2500);
        body = await shot(p, '03-s1-person');
      } else {
        body = rosterBody;
      }
      const addParent = p.getByText(/Add parent|Link parent|Parents/i).first();
      if (await addParent.count()) {
        await addParent.click().catch(() => {});
        await p.waitForTimeout(1500);
        body = await shot(p, '04-parents-panel');
      }
      const search = p.locator('input').first();
      if (await search.count()) {
        await search.fill('ditl-parent-1').catch(() => {});
        await p.waitForTimeout(1000);
        const p1 = p.getByText(/ditl-parent-1|Parent 1/i).first();
        if (await p1.count()) {
          await p1.click().catch(() => {});
          linkedP1 = true;
        }
        await search.fill('ditl-parent-2').catch(() => {});
        await p.waitForTimeout(1000);
        const p2 = p.getByText(/ditl-parent-2|Parent 2/i).first();
        if (await p2.count()) {
          await p2.click().catch(() => {});
          linkedP2 = true;
        }
      }
      const preferred = p.locator('input[placeholder*="preferred" i], input[name*="preferred" i]').first();
      if (await preferred.count()) {
        await preferred.fill('Jordy-DITL').catch(() => {});
        bioEdited = true;
        const save = p.getByText(/^Save$/i).first();
        if (await save.count()) await save.click().catch(() => {});
        await p.waitForTimeout(1500);
        body = await shot(p, '05-bio-save');
      }
      note(3, linkedP1, `link ditl-parent-1=${linkedP1}`);
      note(4, linkedP2, `link ditl-parent-2=${linkedP2}`);
      note(5, bioEdited, `bio edit=${bioEdited}`);
      if (linkedP1 && linkedP2 && bioEdited) result = 'PASS';
      else if (reachedRoster) result = 'PARTIAL';
      else result = 'FAIL';
    } else {
      note(3, false, 'could not reach roster UI for parent links');
      note(4, false, 'skipped parent-2 link');
      note(5, false, 'skipped bio edit');
      result = 'FAIL';
    }

    await clearSession(p);
    body = await shot(p, '99-signout', 600);
    note('teardown', /sign-in|Sign in/i.test(body + p.url()), `url=${p.url()}`);
    await writeOut(result);
  } catch (e) {
    log('FATAL', String(e));
    evidence.push('FATAL: ' + String(e).slice(0, 400));
    await writeOut('FAIL');
    process.exitCode = 1;
  } finally {
    await browser.close().catch(() => {});
  }
}
main();
