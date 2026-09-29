// DITL-O-02-UI-05 lane C — roster ops on S1; no bleed to S2-S5
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
async function sbClient(token, refresh) {
  const URL = env('EXPO_PUBLIC_SUPABASE_URL');
  const ANON = env('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  const sb = createClient(URL, ANON, {
    global: { headers: { Authorization: 'Bearer ' + token } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await sb.auth.setSession({ access_token: token, refresh_token: refresh });
  return sb;
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
  if (!j.access_token) return { ...out, students: null };
  const sb = await sbClient(j.access_token, j.refresh_token);
  const names = ['Jordan Lee', 'Jamie Lee', 'Morgan Patel', 'Sam Ortiz', 'Riley Quinn'];
  const students = [];
  for (const name of names) {
    const parts = name.split(' ');
    const { data: st } = await sb
      .from('students')
      .select('id, display_name, metadata')
      .ilike('display_name', '%' + parts[0] + '%' + parts[1] + '%')
      .limit(3);
    students.push({ name, rows: st || [] });
  }
  // broader roster snapshot (no order — RLS/order can empty)
  const { data: all, error: allErr } = await sb
    .from('students')
    .select('id, display_name, metadata')
    .limit(80);
  if (allErr) log('all_students_err', allErr.message);
  // ensure S1 present in snapshot
  const byId = new Map((all || []).map((s) => [s.id, s]));
  for (const block of students) {
    for (const row of block.rows) byId.set(row.id, row);
  }
  return {
    ...out,
    students,
    all: [...byId.values()],
    access_token: j.access_token,
    refresh_token: j.refresh_token,
  };
}
function snapMeta(all) {
  const m = {};
  for (const s of all || []) {
    m[s.id] = {
      display_name: s.display_name,
      metadata: s.metadata ? JSON.stringify(s.metadata) : null,
    };
  }
  return m;
}
async function writeOut(result) {
  const out = {
    case: 'DITL-O-02-UI-05',
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
      `DITL-O-02-UI-05 RESULT=${result} lane=C Chromium /tmp/ditl-pw-lane-c`,
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
  log('START DITL-O-02-UI-05');
  const browser = await openCtx();
  const p = browser.pages()[0] || (await browser.newPage());
  let result = 'FAIL';
  try {
    const adminApi = await apiProbe(ADMIN_USER, ADMIN_PASS);
    const s1 =
      (adminApi.students || []).find((x) => /Jordan/i.test(x.name) && x.rows[0])?.rows[0] || null;
    const sOthers = (adminApi.all || []).filter((s) => s1 && s.id !== s1.id);
    const before = snapMeta(adminApi.all || []);
    note(
      'api-admin',
      adminApi.hasToken && adminApi.status === 200,
      `status=${adminApi.status} s1=${s1?.id || 'n/a'} rosterN=${(adminApi.all || []).length} names=${(adminApi.students || [])
        .map((x) => x.name + ':' + (x.rows[0]?.id || 'miss').slice(0, 8))
        .join(',')}`,
    );

    await uiSignIn(p, ADMIN_USER, ADMIN_PASS);
    let body = await shot(p, '01-admin-after-signin');
    const splashAfterSignIn = isSplash(body, p.url());
    note(1, adminApi.hasToken && !splashAfterSignIn, `url=${p.url()} splashish=${splashAfterSignIn}`);

    // One direct roster route (card instruction)
    const rosterRoute = s1 ? `/?tab=person&studentId=${s1.id}` : '/?tab=people';
    await p.goto(BASE + rosterRoute, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(4500);
    body = await shot(p, '02-roster-once-' + rosterRoute.replace(/[/?=&]/g, '_'));
    const leftSplash = !isSplash(body, p.url());
    const onRoster =
      leftSplash &&
      (/Jordan|People|Classes|Roster|Student|Alex|Morgan|Casey|Riley/i.test(body) ||
        /tab=person|tab=people|student/i.test(p.url()));
    note(2, leftSplash && onRoster, `route=${rosterRoute} url=${p.url()} leftSplash=${leftSplash} onRoster=${onRoster}`);

    if (!leftSplash) {
      evidence.push('SAME-AS-SEQ57-60: ditl-admin auth OK but SplashLanding; one roster direct route also stuck');
      evidence.push('PARKED-P0: splash wall already on t_3191917a — not filed again');
      evidence.push('CASE-STEPS-SKIPPED: roster ops on S1 + bleed check UI not reachable');
      // Still DB snapshot: no UI mutation possible — isolation N/A for this run path
      const afterApi = await apiProbe(ADMIN_USER, ADMIN_PASS);
      const after = snapMeta(afterApi.all || []);
      let bleed = 0;
      for (const id of Object.keys(before)) {
        if (!after[id]) continue;
        if (before[id].metadata !== after[id].metadata || before[id].display_name !== after[id].display_name) {
          if (s1 && id !== s1.id) bleed++;
        }
      }
      note(3, true, `no-UI-mutation DB delta bleedOthers=${bleed} (expect 0; no ops performed)`);
      result = 'FAIL';
      await clearSession(p);
      body = await shot(p, '99-signout', 600);
      note('teardown', /sign-in|Sign in/i.test(body + p.url()), `url=${p.url()}`);
      await writeOut(result);
      return;
    }

    // Roster ops attempt on S1: open person, try a harmless notes/phone touch if editable
    let opAttempted = false;
    const notes = p
      .locator('textarea, input[placeholder*="note" i], input[name*="note" i], input[aria-label*="note" i]')
      .first();
    if (await notes.count()) {
      const cur = (await notes.inputValue().catch(() => '')) || '';
      const tag = ' DITL-UI05-S1';
      if (!cur.includes('DITL-UI05-S1')) {
        await notes.fill((cur + tag).slice(0, 200)).catch(() => {});
        opAttempted = true;
      } else {
        opAttempted = true;
      }
    }
    const saveBtn = p.getByRole('button', { name: /^Save$/i }).or(p.getByText(/^Save$/i)).first();
    if (opAttempted && (await saveBtn.count())) {
      await saveBtn.click().catch(() => {});
      await p.waitForTimeout(2000);
    }
    body = await shot(p, '03-after-s1-op');
    note(3, onRoster, `opAttempted=${opAttempted} bodyHasJordan=${/Jordan/i.test(body)}`);

    // Visit people list if possible
    await p.goto(BASE + '/?tab=people', { waitUntil: 'domcontentloaded' }).catch(() => {});
    await p.waitForTimeout(3500);
    body = await shot(p, '04-people-list');
    const othersVisible = /Alex|Morgan|Casey|Riley/i.test(body);
    note(4, leftSplash, `peopleList othersVisible=${othersVisible} splash=${isSplash(body, p.url())}`);

    // DB assert isolation
    const afterApi = await apiProbe(ADMIN_USER, ADMIN_PASS);
    const after = snapMeta(afterApi.all || []);
    const changed = [];
    const bleedIds = [];
    for (const id of Object.keys(before)) {
      if (!after[id]) continue;
      const b = before[id];
      const a = after[id];
      if (b.metadata !== a.metadata || b.display_name !== a.display_name) {
        changed.push({ id, name: a.display_name });
        if (s1 && id !== s1.id) bleedIds.push(id);
      }
    }
    note(
      5,
      bleedIds.length === 0,
      `changedN=${changed.length} bleedOthers=${bleedIds.length} changed=${JSON.stringify(changed).slice(0, 400)}`,
    );

    if (onRoster && opAttempted && bleedIds.length === 0) result = 'PASS';
    else if (onRoster && bleedIds.length === 0) result = 'PARTIAL';
    else if (bleedIds.length > 0) {
      result = 'FAIL';
      findings.push(
        'FINDING: roster op on S1 bled metadata/updated_at to other students; severity P1; case DITL-O-02-UI-05',
      );
    } else result = 'FAIL';

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
