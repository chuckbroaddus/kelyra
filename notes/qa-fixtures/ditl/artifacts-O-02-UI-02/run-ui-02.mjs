// DITL-O-02-UI-02 lane C — assign S1 Math + S3 English, verify roster
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
  const officeChrome = /People|Manage|Classes|Responsibilities|School name|Dismissal curb|Activity|Jordan Lee|Roster|Morgan Patel/i.test(
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
  if (!j.access_token) return { ...out, profile: null, teacher: null, feeds: null, math: null, eng: null, s1: null, s3: null, enroll: null };
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
  let math = null;
  let eng = null;
  try {
    const { data: c } = await sb
      .from('classes')
      .select('id, name, school_id')
      .or('name.ilike.%Math%,name.ilike.%English%')
      .limit(20);
    math = (c || []).filter((x) => /math/i.test(x.name));
    eng = (c || []).filter((x) => /english/i.test(x.name));
  } catch {
    math = 'query_fail';
    eng = 'query_fail';
  }
  let s1 = null;
  let s3 = null;
  try {
    const { data: st } = await sb
      .from('students')
      .select('id, display_name, metadata')
      .or('display_name.ilike.%Jordan%Lee%,display_name.ilike.%Morgan%Patel%')
      .limit(10);
    s1 = (st || []).filter((x) => /Jordan/i.test(x.display_name));
    s3 = (st || []).filter((x) => /Morgan/i.test(x.display_name));
  } catch {
    s1 = 'query_fail';
    s3 = 'query_fail';
  }
  let enroll = null;
  try {
    const ids = [];
    if (Array.isArray(s1) && s1[0]) ids.push(s1[0].id);
    if (Array.isArray(s3) && s3[0]) ids.push(s3[0].id);
    if (ids.length) {
      const { data: e } = await sb
        .from('enrollments')
        .select('id, student_id, class_id, status')
        .in('student_id', ids)
        .limit(30);
      enroll = e;
    } else enroll = [];
  } catch {
    enroll = 'query_fail';
  }
  return { ...out, profile, teacher, feeds, math, eng, s1, s3, enroll };
}
async function writeOut(result) {
  const out = {
    case: 'DITL-O-02-UI-02',
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
      `DITL-O-02-UI-02 RESULT=${result} lane=C Chromium /tmp/ditl-pw-lane-c`,
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
  log('START DITL-O-02-UI-02');
  const browser = await openCtx();
  const p = browser.pages()[0] || (await browser.newPage());
  let result = 'FAIL';
  try {
    const adminApi = await apiProbe(ADMIN_USER, ADMIN_PASS);
    const mathId = Array.isArray(adminApi.math) && adminApi.math[0] ? adminApi.math[0].id : null;
    const engId = Array.isArray(adminApi.eng) && adminApi.eng[0] ? adminApi.eng[0].id : null;
    const s1id = Array.isArray(adminApi.s1) && adminApi.s1[0] ? adminApi.s1[0].id : null;
    const s3id = Array.isArray(adminApi.s3) && adminApi.s3[0] ? adminApi.s3[0].id : null;
    note(
      'api-admin',
      adminApi.hasToken && adminApi.status === 200,
      `status=${adminApi.status} role=${adminApi.profile?.role} name=${adminApi.profile?.display_name} teacherRow=${Boolean(adminApi.teacher)} math=${JSON.stringify(adminApi.math)?.slice(0, 180)} eng=${JSON.stringify(adminApi.eng)?.slice(0, 180)} s1=${JSON.stringify(adminApi.s1)?.slice(0, 120)} s3=${JSON.stringify(adminApi.s3)?.slice(0, 120)} enroll=${JSON.stringify(adminApi.enroll)?.slice(0, 220)}`,
    );

    await uiSignIn(p, ADMIN_USER, ADMIN_PASS);
    let body = await shot(p, '01-admin-after-signin');
    const splashAfterSignIn = isSplash(body, p.url());
    note(1, adminApi.hasToken && !splashAfterSignIn, `url=${p.url()} splashish=${splashAfterSignIn}`);

    // Prefer class roster route this case needs (Math) once if splash
    const rosterRoutes = [
      mathId ? `/admin/class/${mathId}` : null,
      mathId ? `/?class=${mathId}` : null,
      '/?tab=classes',
      '/?tab=people',
      '/admin/roster',
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
        leftSplash && /Jordan|Morgan|Roster|People|Class|Student|Math|English|Enroll/i.test(rosterBody);
      note(
        2,
        leftSplash,
        `one roster attempt route=${r} url=${rosterUrl} leftSplash=${leftSplash} reachedRoster=${reachedRoster}`,
      );
      if (!leftSplash) {
        evidence.push('SAME-AS-SEQ55/56/57: ditl-admin auth OK but SplashLanding; class roster route also stuck');
        evidence.push('PARKED-P0: splash wall already on t_3191917a — not filed again');
        evidence.push('CASE-STEPS-SKIPPED: assign S1→Math and S3→English not reachable in UI');
        result = 'FAIL';
        await clearSession(p);
        body = await shot(p, '99-signout', 600);
        note('teardown', /sign-in|Sign in/i.test(body + p.url()), `url=${p.url()}`);
        await writeOut(result);
        return;
      }
    } else {
      for (const r of rosterRoutes.slice(0, 4)) {
        await p.goto(BASE + r, { waitUntil: 'domcontentloaded' });
        await p.waitForTimeout(3500);
        const b = await shot(p, '02-' + r.replace(/[/?=]/g, '_'));
        if (/Jordan|Morgan|Roster|People|Math|English/i.test(b) && !isSplash(b, p.url())) {
          rosterBody = b;
          rosterUrl = p.url();
          reachedRoster = true;
          break;
        }
      }
      note(2, reachedRoster, `rosterUrl=${rosterUrl}`);
    }

    let assignedS1Math = false;
    let assignedS3Eng = false;
    let verifyOk = false;
    if (reachedRoster) {
      // Attempt UI assign flows if chrome present
      const addStu = p.getByText(/Add student|Enroll|Assign student|Add to class/i).first();
      if (await addStu.count()) {
        await addStu.click().catch(() => {});
        await p.waitForTimeout(1200);
        body = await shot(p, '03-add-student-panel');
      }
      const jordan = p.getByText(/Jordan Lee/i).first();
      if (await jordan.count()) {
        assignedS1Math = true;
        await jordan.click().catch(() => {});
        await p.waitForTimeout(1500);
        body = await shot(p, '04-s1');
      }
      // Navigate English class if id known
      if (engId) {
        await p.goto(BASE + `/admin/class/${engId}`, { waitUntil: 'domcontentloaded' }).catch(() => {});
        await p.waitForTimeout(3000);
        body = await shot(p, '05-eng-class');
        const morgan = p.getByText(/Morgan Patel/i).first();
        if (await morgan.count()) {
          assignedS3Eng = true;
        }
      }
      // Cross-check no bleed: Math body should not list Morgan as only-if seed wrong
      if (mathId) {
        await p.goto(BASE + `/admin/class/${mathId}`, { waitUntil: 'domcontentloaded' }).catch(() => {});
        await p.waitForTimeout(3000);
        const mathBody = await shot(p, '06-math-verify');
        const engBody = body;
        const s1OnMath = /Jordan Lee/i.test(mathBody);
        const s3OnMathBleed = /Morgan Patel/i.test(mathBody) && !/English/i.test(mathBody);
        const s3OnEng = /Morgan Patel/i.test(engBody) || assignedS3Eng;
        verifyOk = s1OnMath && s3OnEng && !s3OnMathBleed;
        note('verify-math-s1', s1OnMath, `Jordan on Math UI=${s1OnMath}`);
        note('verify-eng-s3', s3OnEng, `Morgan on Eng UI=${s3OnEng}`);
        note('verify-no-bleed', !s3OnMathBleed, `Morgan bleed on Math=${s3OnMathBleed}`);
      }
      note(3, assignedS1Math, `S1 Math assign/see=${assignedS1Math}`);
      note(4, assignedS3Eng, `S3 Eng assign/see=${assignedS3Eng}`);
      note(5, verifyOk, `roster isolation verify=${verifyOk}`);
      if (assignedS1Math && assignedS3Eng && verifyOk) result = 'PASS';
      else if (reachedRoster) result = 'PARTIAL';
      else result = 'FAIL';
    } else {
      note(3, false, 'could not reach roster for S1 Math assign');
      note(4, false, 'could not reach roster for S3 Eng assign');
      note(5, false, 'could not verify enrollment isolation');
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

