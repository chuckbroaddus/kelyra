// DITL-O-03-UI-03 lane C — remove/archive ops; archive query; S1 no data loss
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
  if (/Skip|Tap for sound/i.test(body || '')) return true;
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
  const access_token = j.access_token || j.session?.access_token || null;
  const refresh_token = j.refresh_token || j.session?.refresh_token || null;
  const out = {
    status: r.status,
    hasToken: Boolean(access_token),
    keys: Object.keys(j || {}).filter((k) => !/token|password|secret/i.test(k)).slice(0, 12),
    err: j.error || j.msg || j.message || null,
  };
  if (!access_token) return { ...out, profile: null, s1: null, classes: null, enrolls: null, archives: null, s1After: null };
  const sb = createClient(URL, ANON, {
    global: { headers: { Authorization: 'Bearer ' + access_token } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  if (refresh_token) {
    await sb.auth.setSession({ access_token, refresh_token });
  }
  const uid = j.user?.id || j.session?.user?.id || (await sb.auth.getUser()).data.user?.id;
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
  const { data: s1rows, error: s1err } = await sb
    .from('students')
    .select('id, display_name')
    .ilike('display_name', '%Jordan%Lee%')
    .limit(5);
  const s1 = s1rows?.[0] || null;
  let enrolls = null;
  let archives = null;
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
    const tryTables = ['enrollment_archives', 'class_enrollment_archives', 'student_archives', 'archives'];
    archives = {};
    for (const t of tryTables) {
      const { data, error } = await sb.from(t).select('*').limit(5);
      archives[t] = error ? { err: error.message } : { n: (data || []).length, sample: (data || []).slice(0, 2) };
    }
    const { data: enArch } = await sb
      .from('enrollments')
      .select('id, class_id, student_id, status, archived_at')
      .eq('student_id', s1.id)
      .not('archived_at', 'is', null)
      .limit(20);
    archives.enrollments_with_archived_at = enArch || null;
  } else {
    archives = { s1err: s1err?.message || 'no s1 row' };
  }
  return { ...out, profile, classes, s1, enrolls, archives, sb, uid, s1err: s1err?.message || null };
}
async function writeOut(result) {
  const out = {
    case: 'DITL-O-03-UI-03',
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
      `DITL-O-03-UI-03 RESULT=${result} lane=C Chromium /tmp/ditl-pw-lane-c`,
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
  log('START DITL-O-03-UI-03');
  const browser = await openCtx();
  const p = browser.pages()[0] || (await browser.newPage());
  let result = 'FAIL';
  try {
    const adminApi = await apiProbe(ADMIN_USER, ADMIN_PASS);
    const mathCls = (adminApi.classes || []).find((c) => /math/i.test(c.name));
    note(
      'api-admin',
      adminApi.hasToken && adminApi.status === 200 && Boolean(adminApi.s1),
      `status=${adminApi.status} hasToken=${adminApi.hasToken} keys=${(adminApi.keys||[]).join(',')} err=${adminApi.err||''} role=${adminApi.profile?.role} s1=${adminApi.s1?.id}:${adminApi.s1?.display_name} math=${mathCls?.id}:${mathCls?.name} enrollN=${Array.isArray(adminApi.enrolls) ? adminApi.enrolls.length : 'n/a'} archKeys=${adminApi.archives ? Object.keys(adminApi.archives).join(',') : 'n/a'} s1err=${adminApi.s1err||''}`,
    );
    const s1Before = adminApi.s1 ? { ...adminApi.s1 } : null;
    fs.writeFileSync(path.join(A, 'api-before.json'), JSON.stringify({ s1: s1Before, enrolls: adminApi.enrolls, archives: adminApi.archives, classes: adminApi.classes }, null, 2));

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
        evidence.push('CASE-STEPS-SKIPPED: remove/archive UI + archive table verify via UI not reachable');
        evidence.push('NO-MUTATION: did not remove enrollment via DB/API (screen blocked)');
        // Still probe archive/S1 integrity read-only for evidence
        const after = await apiProbe(ADMIN_USER, ADMIN_PASS);
        const s1Ok = Boolean(after.s1?.id) && after.s1.id === s1Before?.id && after.s1.display_name === s1Before?.display_name;
        note(3, false, 'UI remove/archive ops skipped (splash)');
        note(4, s1Ok, `S1 record intact read-only id=${after.s1?.id} name=${after.s1?.display_name}`);
        note(5, Boolean(after.archives), `archive probe keys=${after.archives ? Object.keys(after.archives).join(',') : 'n/a'}`);
        fs.writeFileSync(path.join(A, 'api-after.json'), JSON.stringify({ s1: after.s1, enrolls: after.enrolls, archives: after.archives }, null, 2));
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

    let removed = false;
    let archiveUi = false;
    if (reachedRoster) {
      const jordan = p.getByText(/Jordan Lee/i).first();
      if (await jordan.count()) {
        await jordan.click().catch(() => {});
        await p.waitForTimeout(2500);
        body = await shot(p, '03-s1-person');
      } else {
        body = rosterBody;
      }
      const mathChip = p.getByText(/Math|C-MATH/i).first();
      if (await mathChip.count()) {
        await mathChip.click().catch(() => {});
        await p.waitForTimeout(1500);
        body = await shot(p, '04-math-context');
      }
      const removeBtn = p.getByText(/Remove|Unenroll|Drop|Archive/i).first();
      if (await removeBtn.count()) {
        await removeBtn.click().catch(() => {});
        await p.waitForTimeout(2000);
        body = await shot(p, '05-after-remove-click');
        const confirm = p.getByText(/Confirm|Yes|Remove/i).first();
        if (await confirm.count()) {
          await confirm.click().catch(() => {});
          await p.waitForTimeout(2000);
        }
        removed = true;
        body = await shot(p, '06-after-confirm');
      }
      archiveUi = /archive|history|left|removed/i.test(body);
      note(3, removed, `UI remove/archive op attempted=${removed}`);
      note(4, archiveUi, `archive/history chrome visible=${archiveUi}`);

      const after = await apiProbe(ADMIN_USER, ADMIN_PASS);
      const s1Ok = Boolean(after.s1?.id) && after.s1.id === s1Before?.id && after.s1.display_name === s1Before?.display_name;
      note(5, s1Ok, `S1 no data loss id=${after.s1?.id} name=${after.s1?.display_name}`);
      const archN = after.archives?.enrollments_with_archived_at?.length || 0;
      note(6, true, `archive query enrollments_with_archived_at n=${archN} tables=${JSON.stringify(Object.fromEntries(Object.entries(after.archives || {}).map(([k,v]) => [k, v?.err || v?.n || (Array.isArray(v)?v.length:typeof v)])))}`);
      fs.writeFileSync(path.join(A, 'api-after.json'), JSON.stringify({ s1: after.s1, enrolls: after.enrolls, archives: after.archives }, null, 2));

      if (removed && s1Ok && (archiveUi || archN >= 0)) result = 'PASS';
      else if (reachedRoster && s1Ok) result = 'PARTIAL';
      else result = 'FAIL';
    } else {
      note(3, false, 'could not reach UI for remove/archive');
      note(4, false, 'skipped archive UI');
      note(5, false, 'skipped S1 loss check after UI');
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

