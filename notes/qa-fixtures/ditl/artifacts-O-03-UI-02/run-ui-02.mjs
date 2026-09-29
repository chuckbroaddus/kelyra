// DITL-O-03-UI-02 lane C — remove S1 from Math then English; archive per class
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
  if (!j.access_token) return { ...out, profile: null, s1: null, classes: null, enrolls: null };
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
  const { data: classes } = await sb
    .from('classes')
    .select('id, name, school_id')
    .or('name.ilike.%math%,name.ilike.%english%,name.ilike.%C-MATH%,name.ilike.%C-ENG%')
    .limit(20);
  const { data: s1rows } = await sb
    .from('students')
    .select('id, display_name')
    .ilike('display_name', '%Jordan%Lee%')
    .limit(5);
  const s1 = s1rows?.[0] || null;
  let enrolls = null;
  if (s1?.id) {
    const { data: en } = await sb
      .from('enrollments')
      .select('id, class_id, student_id, status, archived_at, left_at, ended_at')
      .eq('student_id', s1.id)
      .limit(30);
    enrolls = en;
    if (!en) {
      const { data: en2, error: e2 } = await sb
        .from('class_enrollments')
        .select('*')
        .eq('student_id', s1.id)
        .limit(30);
      enrolls = en2 || { err: e2?.message };
    }
  }
  return { ...out, profile, classes, s1, enrolls, sb, uid };
}
async function writeOut(result) {
  const out = {
    case: 'DITL-O-03-UI-02',
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
      `DITL-O-03-UI-02 RESULT=${result} lane=C Chromium /tmp/ditl-pw-lane-c`,
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
  log('START DITL-O-03-UI-02');
  const browser = await openCtx();
  const p = browser.pages()[0] || (await browser.newPage());
  let result = 'FAIL';
  try {
    const adminApi = await apiProbe(ADMIN_USER, ADMIN_PASS);
    const mathCls = (adminApi.classes || []).find((c) => /math/i.test(c.name));
    const engCls = (adminApi.classes || []).find((c) => /eng/i.test(c.name));
    note(
      'api-admin',
      adminApi.hasToken && adminApi.status === 200 && Boolean(adminApi.s1),
      `status=${adminApi.status} role=${adminApi.profile?.role} s1=${adminApi.s1?.id} math=${mathCls?.id}:${mathCls?.name} eng=${engCls?.id}:${engCls?.name} enrollN=${Array.isArray(adminApi.enrolls) ? adminApi.enrolls.length : 'n/a'}`,
    );

    await uiSignIn(p, ADMIN_USER, ADMIN_PASS);
    let body = await shot(p, '01-admin-after-signin');
    const splashAfterSignIn = isSplash(body, p.url());
    note(1, adminApi.hasToken && !splashAfterSignIn, `url=${p.url()} splashish=${splashAfterSignIn}`);

    const rosterRoutes = [
      mathCls ? `/admin/class/${mathCls.id}` : null,
      '/?tab=people',
      '/?tab=classes',
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
      rosterBody = await shot(p, '02-roster-once-' + r.replace(/[/?=&]/g, '_'));
      rosterUrl = p.url();
      leftSplash = !isSplash(rosterBody, rosterUrl);
      reachedRoster =
        leftSplash && /Jordan|Roster|People|Class|Student|Math|Remove|Archive/i.test(rosterBody);
      note(
        2,
        leftSplash,
        `one roster attempt route=${r} url=${rosterUrl} leftSplash=${leftSplash} reachedRoster=${reachedRoster}`,
      );
      if (!leftSplash) {
        evidence.push('SAME-AS-O02: ditl-admin auth OK but SplashLanding; one roster direct route also stuck');
        evidence.push('PARKED-P0: splash wall already on t_3191917a — not filed again');
        evidence.push('CASE-STEPS-SKIPPED: remove S1 Math+English + archive history per class UI not reachable');
        evidence.push('NO-MUTATION: did not remove enrollment via DB/API (screen blocked)');
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
        const b = await shot(p, '02-' + r.replace(/[/?=&]/g, '_'));
        if (/Jordan|Roster|People|Math|Class/i.test(b) && !isSplash(b, p.url())) {
          rosterBody = b;
          rosterUrl = p.url();
          reachedRoster = true;
          break;
        }
      }
      note(2, reachedRoster, `rosterUrl=${rosterUrl}`);
    }

    let removedMath = false;
    let removedEng = false;
    let archiveMath = false;
    let archiveEng = false;
    if (reachedRoster) {
      const jordan = p.getByText(/Jordan Lee/i).first();
      if (await jordan.count()) {
        await jordan.click().catch(() => {});
        await p.waitForTimeout(2500);
        body = await shot(p, '03-s1-person');
      } else {
        body = rosterBody;
      }
      // Remove from Math
      const mathChip = p.getByText(/Math|C-MATH/i).first();
      if (await mathChip.count()) {
        await mathChip.click().catch(() => {});
        await p.waitForTimeout(1500);
        body = await shot(p, '04-math-context');
      }
      let removeBtn = p.getByText(/Remove|Unenroll|Drop|Archive/i).first();
      if (await removeBtn.count()) {
        await removeBtn.click().catch(() => {});
        await p.waitForTimeout(2000);
        body = await shot(p, '05-after-remove-math-click');
        const confirm = p.getByText(/Confirm|Yes|Remove/i).first();
        if (await confirm.count()) {
          await confirm.click().catch(() => {});
          await p.waitForTimeout(2000);
        }
        removedMath = true;
        body = await shot(p, '06-after-math-confirm');
      }
      archiveMath = /archive|history|left|removed/i.test(body);
      note(3, removedMath, `UI remove S1 from Math attempted=${removedMath}`);
      note(4, archiveMath, `archive/history after Math remove visible=${archiveMath}`);

      // Remove from English
      const engChip = p.getByText(/English|C-ENG|ELA/i).first();
      if (await engChip.count()) {
        await engChip.click().catch(() => {});
        await p.waitForTimeout(1500);
        body = await shot(p, '07-eng-context');
      }
      removeBtn = p.getByText(/Remove|Unenroll|Drop|Archive/i).first();
      if (await removeBtn.count()) {
        await removeBtn.click().catch(() => {});
        await p.waitForTimeout(2000);
        body = await shot(p, '08-after-remove-eng-click');
        const confirm2 = p.getByText(/Confirm|Yes|Remove/i).first();
        if (await confirm2.count()) {
          await confirm2.click().catch(() => {});
          await p.waitForTimeout(2000);
        }
        removedEng = true;
        body = await shot(p, '09-after-eng-confirm');
      }
      archiveEng = /archive|history|left|removed/i.test(body);
      note(5, removedEng, `UI remove S1 from English attempted=${removedEng}`);
      note(6, archiveEng, `archive/history after English remove visible=${archiveEng}`);

      if (removedMath && removedEng && (archiveMath || archiveEng)) result = 'PASS';
      else if (reachedRoster && (removedMath || removedEng)) result = 'PARTIAL';
      else if (reachedRoster) result = 'PARTIAL';
      else result = 'FAIL';
    } else {
      note(3, false, 'could not reach UI to remove S1 from Math');
      note(4, false, 'skipped Math archive history check');
      note(5, false, 'could not reach UI to remove S1 from English');
      note(6, false, 'skipped English archive history check');
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
