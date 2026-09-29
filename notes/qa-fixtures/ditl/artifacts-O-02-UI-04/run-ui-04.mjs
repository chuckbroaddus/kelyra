// DITL-O-02-UI-04 lane C — bio fields on S1 (preferred_name, birthday, phone)
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
  const officeChrome = /People|Manage|Classes|Responsibilities|School name|Dismissal curb|Activity|Jordan Lee|Roster|preferred/i.test(
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
  if (!j.access_token) return { ...out, profile: null, classes: null, s1: null, metaBefore: null };
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
  return { ...out, profile, classes, s1, access_token: j.access_token, refresh_token: j.refresh_token };
}

async function readS1Meta(token, refresh) {
  const URL = env('EXPO_PUBLIC_SUPABASE_URL');
  const ANON = env('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  const sb = createClient(URL, ANON, {
    global: { headers: { Authorization: 'Bearer ' + token } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await sb.auth.setSession({ access_token: token, refresh_token: refresh });
  const { data: st } = await sb
    .from('students')
    .select('id, display_name, metadata')
    .ilike('display_name', '%Jordan%Lee%')
    .limit(5);
  return st;
}

async function writeOut(result) {
  const out = {
    case: 'DITL-O-02-UI-04',
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
      `DITL-O-02-UI-04 RESULT=${result} lane=C Chromium /tmp/ditl-pw-lane-c`,
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
  log('START DITL-O-02-UI-04');
  const browser = await openCtx();
  const p = browser.pages()[0] || (await browser.newPage());
  let result = 'FAIL';
  try {
    const adminApi = await apiProbe(ADMIN_USER, ADMIN_PASS);
    const s1id = Array.isArray(adminApi.s1) && adminApi.s1[0] ? adminApi.s1[0].id : null;
    const metaBefore = Array.isArray(adminApi.s1) && adminApi.s1[0] ? adminApi.s1[0].metadata : null;
    const mathClassId = Array.isArray(adminApi.classes) && adminApi.classes[0] ? adminApi.classes[0].id : null;
    note(
      'api-admin',
      adminApi.hasToken && adminApi.status === 200,
      `status=${adminApi.status} role=${adminApi.profile?.role} name=${adminApi.profile?.display_name} s1id=${s1id} math=${mathClassId} metaKeys=${metaBefore ? Object.keys(metaBefore).join(',') : 'n/a'}`,
    );

    await uiSignIn(p, ADMIN_USER, ADMIN_PASS);
    let body = await shot(p, '01-admin-after-signin');
    const splashAfterSignIn = isSplash(body, p.url());
    note(1, adminApi.hasToken && !splashAfterSignIn, `url=${p.url()} splashish=${splashAfterSignIn}`);

    // One direct bio-edit route attempt (card: if Home splash, try one direct route then stop)
    const bioRoute =
      mathClassId && s1id
        ? `/class/${mathClassId}/student/${s1id}`
        : s1id
          ? `/?tab=person&studentId=${s1id}`
          : '/?tab=people';

    await p.goto(BASE + bioRoute, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(4500);
    body = await shot(p, '02-bio-route-' + bioRoute.replace(/[/?=&]/g, '_'));
    const leftSplash = !isSplash(body, p.url());
    const onStudent =
      leftSplash &&
      (/Jordan|preferred|birthday|phone|Student|Bio|Details|Save/i.test(body) || /student\//i.test(p.url()));
    note(2, leftSplash && onStudent, `route=${bioRoute} url=${p.url()} leftSplash=${leftSplash} onStudent=${onStudent}`);

    if (!leftSplash) {
      evidence.push('SAME-AS-SEQ57/58/59: ditl-admin auth OK but SplashLanding; bio direct route also stuck');
      evidence.push('PARKED-P0: splash wall already on t_3191917a — not filed again');
      evidence.push('CASE-STEPS-SKIPPED: preferred_name/birthday/phone UI edit not reachable');
      result = 'FAIL';
      await clearSession(p);
      body = await shot(p, '99-signout', 600);
      note('teardown', /sign-in|Sign in/i.test(body + p.url()), `url=${p.url()}`);
      await writeOut(result);
      return;
    }

    // Attempt bio field edits
    let filledPreferred = false;
    let filledBirthday = false;
    let filledPhone = false;
    let saved = false;

    const pref = p
      .locator(
        'input[placeholder*="preferred" i], input[name*="preferred" i], input[aria-label*="preferred" i], textarea[placeholder*="preferred" i]',
      )
      .first();
    if (await pref.count()) {
      await pref.fill('Jordy-DITL-UI04').catch(() => {});
      filledPreferred = true;
    } else {
      // try labeled rows
      const labels = p.getByText(/Preferred name|preferred name/i);
      if (await labels.count()) {
        const row = labels.first();
        const input = row.locator('xpath=ancestor::*[self::div or self::label][1]//input').first();
        if (await input.count()) {
          await input.fill('Jordy-DITL-UI04').catch(() => {});
          filledPreferred = true;
        }
      }
    }

    const bday = p
      .locator(
        'input[placeholder*="birth" i], input[name*="birth" i], input[aria-label*="birth" i], input[type=date]',
      )
      .first();
    if (await bday.count()) {
      await bday.fill('2017-03-14').catch(async () => {
        await bday.fill('3/14/2017').catch(() => {});
      });
      filledBirthday = true;
    }

    const phone = p
      .locator('input[placeholder*="phone" i], input[name*="phone" i], input[aria-label*="phone" i], input[type=tel]')
      .first();
    if (await phone.count()) {
      await phone.fill('555-0104').catch(() => {});
      filledPhone = true;
    }

    // generic fill by scanning labels if nothing found
    if (!filledPreferred || !filledBirthday || !filledPhone) {
      const inputs = p.locator('input:not([type=password]):not([type=hidden])');
      const n = await inputs.count();
      evidence.push(`INPUT_SCAN count=${n}`);
      for (let i = 0; i < Math.min(n, 12); i++) {
        const el = inputs.nth(i);
        const ph = ((await el.getAttribute('placeholder').catch(() => '')) || '').toLowerCase();
        const nm = ((await el.getAttribute('name').catch(() => '')) || '').toLowerCase();
        const al = ((await el.getAttribute('aria-label').catch(() => '')) || '').toLowerCase();
        const blob = ph + ' ' + nm + ' ' + al;
        if (!filledPreferred && /prefer|nick|name/.test(blob)) {
          await el.fill('Jordy-DITL-UI04').catch(() => {});
          filledPreferred = true;
        }
        if (!filledBirthday && /birth|dob|date/.test(blob)) {
          await el.fill('2017-03-14').catch(() => {});
          filledBirthday = true;
        }
        if (!filledPhone && /phone|mobile|tel/.test(blob)) {
          await el.fill('555-0104').catch(() => {});
          filledPhone = true;
        }
      }
    }

    const saveBtn = p.getByRole('button', { name: /^Save$/i }).or(p.getByText(/^Save$/i)).first();
    if (await saveBtn.count()) {
      await saveBtn.click().catch(() => {});
      saved = true;
      await p.waitForTimeout(2000);
    }
    body = await shot(p, '03-after-bio-attempt');
    note(
      3,
      filledPreferred || filledBirthday || filledPhone,
      `filled preferred=${filledPreferred} birthday=${filledBirthday} phone=${filledPhone} saved=${saved}`,
    );

    // DB assert metadata
    let metaAfter = null;
    try {
      const st = await readS1Meta(adminApi.access_token, adminApi.refresh_token);
      metaAfter = Array.isArray(st) && st[0] ? st[0].metadata : null;
      const keys = metaAfter && typeof metaAfter === 'object' ? Object.keys(metaAfter) : [];
      const hasPref = metaAfter && /Jordy-DITL-UI04/i.test(String(metaAfter.preferred_name || ''));
      const hasBday = metaAfter && Boolean(metaAfter.birthday);
      const hasPhone = metaAfter && Boolean(metaAfter.phone);
      note(
        4,
        Boolean(metaAfter),
        `metaAfter keys=${keys.join(',')} preferred=${hasPref} birthday=${hasBday} phone=${hasPhone} raw=${JSON.stringify(metaAfter)?.slice(0, 300)}`,
      );
      if (hasPref && (hasBday || hasPhone) && filledPreferred) result = 'PASS';
      else if (onStudent && (filledPreferred || filledBirthday || filledPhone)) result = 'PARTIAL';
      else if (onStudent) result = 'PARTIAL';
      else result = 'FAIL';
    } catch (e) {
      note(4, false, 'meta read fail ' + String(e).slice(0, 120));
      result = onStudent ? 'PARTIAL' : 'FAIL';
    }

    // teardown: do not wipe shared seed; only clear session keys
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
