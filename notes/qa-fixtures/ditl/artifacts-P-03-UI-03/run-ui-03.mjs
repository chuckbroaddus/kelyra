// DITL-P-03-UI-03 — restricted child fail-closed check-in (lane B)
// skeleton — body patched below
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const A = path.dirname(fileURLToPath(import.meta.url));
const ROOT = '/Users/chuckbroaddus/projects/kelyra';
const BASE = 'http://localhost:8081';
const UD = '/tmp/ditl-pw-lane-b';
const USER = 'ditl-parent-1';
const PASS = process.env.DITL_PARENT_PASS || 'DITL-parent-test';
const ADMIN_USER = 'ditl-admin';
const ADMIN_PASS = process.env.DITL_ADMIN_PASS || 'DITL-admin-test';
const evidence = [];
const log = (...a) => console.log(...a);
function note(step, ok, detail) {
  const line = `${ok ? 'OK' : 'MISS'} step${step}: ${detail}`;
  evidence.push(line);
  log(line);
}
function env(k) {
  const envText = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
  const m = envText.match(new RegExp(`^${k}=(.*)$`, 'm'));
  if (!m) throw new Error('missing ' + k);
  return m[1].trim().replace(/^['\"]|['\"]$/g, '');
}
const URL = env('EXPO_PUBLIC_SUPABASE_URL');
const ANON = env('EXPO_PUBLIC_SUPABASE_ANON_KEY');

async function shot(p, n, w = 1200) {
  await p.waitForTimeout(w);
  await p.screenshot({ path: path.join(A, `${n}.png`), fullPage: true });
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 1800);
  log('==', n, p.url());
  log(body);
  return body;
}
async function gotoRetry(p, url, tries = 4) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      return;
    } catch (e) {
      last = e;
      log('gotoRetry', url, i, String(e).slice(0, 80));
      await p.waitForTimeout(2000 * (i + 1));
    }
  }
  throw last;
}
async function leaveIfInLine(p) {
  for (let i = 0; i < 4; i++) {
    const leaveBtns = p.getByText(/^Leave line$/i);
    const n = await leaveBtns.count();
    if (!n) break;
    try {
      await leaveBtns.first().click({ timeout: 3000 });
      await p.waitForTimeout(800);
      const conf = p.getByText(/^Leave line$/i);
      if (await conf.count()) await conf.last().click({ timeout: 3000 });
      await p.waitForTimeout(2500);
    } catch (e) {
      log('leaveIf', String(e).slice(0, 100));
      break;
    }
  }
}

async function adminSignIn() {
  const c = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const emails = [`${ADMIN_USER}@ditl.test`, `${ADMIN_USER}@ditl-sandbox.test`, ADMIN_USER];
  let last = null;
  for (const email of emails) {
    const { data: sess, error: se } = await c.auth.signInWithPassword({ email, password: ADMIN_PASS });
    if (!se && sess?.session) return c;
    last = se?.message || 'no_session';
  }
  throw new Error('admin_signin_failed:' + last);
}

async function ensureRestrictionFixture() {
  const c = await adminSignIn();
  const { data: parents, error: pe } = await c.from('parents').select('id, display_name').limit(50);
  if (pe) log('parents_err', pe.message);
  const { data: students, error: ste } = await c.from('students').select('id, display_name').limit(80);
  if (ste) log('students_err', ste.message);

  let studentId = (students || []).find((s) => /Jordan/i.test(s.display_name || ''))?.id;
  let parentId = (parents || []).find((p) => /Taylor/i.test(p.display_name || ''))?.id;

  if (!studentId || !parentId) {
    const { data: links, error: le } = await c.from('parent_students').select('student_id, parent_id').limit(100);
    if (le) log('links_err', le.message);
    log('links_n', (links || []).length);
    if (!parentId && links?.length) parentId = links[0].parent_id;
    if (!studentId && links?.length) studentId = links[0].student_id;
  }

  if (!studentId) throw new Error('no_jordan_student_id');
  log('fixture ids student=', String(studentId).slice(0, 8), 'parent=', parentId ? String(parentId).slice(0, 8) : 'null');

  const { data: setData, error: setErr } = await c.rpc('office_set_pickup_restriction', {
    p_id: null,
    p_student_id: studentId,
    p_parent_id: parentId || null,
    p_vehicle_id: null,
    p_reason: 'DITL-P-03-UI-03 fixture ban — do not show to parent',
    p_active: true,
  });
  if (setErr) {
    log('set_restrict_err', setErr.message, setErr.code);
    throw new Error('set_restrict_failed:' + setErr.message);
  }
  log('set_restrict ok', setData ? 'data' : 'void');
  await c.auth.signOut().catch(() => {});
  return { studentId, parentId };
}

async function clearRestriction(studentId, parentId) {
  try {
    const c = await adminSignIn();
    const { data: rows } = await c.from('pickup_restrictions').select('id, active, student_id, parent_id').eq('active', true);
    for (const r of rows || []) {
      if (r.student_id === studentId || (parentId && r.parent_id === parentId)) {
        await c.rpc('office_set_pickup_restriction', {
          p_id: r.id,
          p_student_id: r.student_id,
          p_parent_id: r.parent_id,
          p_vehicle_id: null,
          p_reason: null,
          p_active: false,
        });
        log('cleared restriction', String(r.id).slice(0, 8));
      }
    }
    await c.auth.signOut().catch(() => {});
  } catch (e) {
    log('clear_restrict', String(e).slice(0, 120));
  }
}

async function main() {
  fs.mkdirSync(UD, { recursive: true });
  fs.mkdirSync(A, { recursive: true });
  let fixture = null;
  try {
    fixture = await ensureRestrictionFixture();
    note(0, true, 'restriction fixture set for Jordan');
  } catch (e) {
    note(0, false, 'fixture_failed ' + String(e).slice(0, 200));
  }

  const browser = await chromium.launchPersistentContext(UD, {
    channel: 'chrome',
    headless: true,
    viewport: { width: 1280, height: 900 },
    args: ['--disable-dev-shm-usage'],
  });
  const p = browser.pages()[0] || (await browser.newPage());
  try {
    await gotoRetry(p, `${BASE}/sign-in`);
    await p.waitForTimeout(2000);
    // clear stale session
    await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} });
    await gotoRetry(p, `${BASE}/sign-in`);
    await p.waitForTimeout(1500);
    await p.locator('input').nth(0).fill(USER);
    await p.locator('input[type=password]').first().fill(PASS);
    await p.locator('input[type=password]').first().press('Enter');
    await p.waitForTimeout(7000);
    let body = await shot(p, '01-after-signin');
    const onParent = /\/parent/.test(p.url()) || /Jordan|Jamie|Home|Ride|Ask/i.test(body);
    note(1, onParent, `url=${p.url()} parentish=${onParent}`);

    await gotoRetry(p, `${BASE}/parent/ride`);
    await p.waitForTimeout(2500);
    await leaveIfInLine(p);
    body = await shot(p, '02-ride-hub', 2000);
    note(2, /\/parent\/ride/.test(p.url()) && /Ride/i.test(body), `url=${p.url()}`);

    // Select Jordan only + Line A + V1
    try {
      const jordan = p.getByText(/Jordan(\s+Lee)?/i);
      if (await jordan.count()) {
        await jordan.first().click({ timeout: 4000 });
        await p.waitForTimeout(400);
      }
    } catch (e) {
      log('jordan pick', String(e).slice(0, 80));
    }
    try {
      const jamie = p.getByText(/^Jamie(\s+Lee)?$/i);
      for (let i = 0; i < (await jamie.count()); i++) {
        const el = jamie.nth(i);
        const cls = (await el.getAttribute('class').catch(() => '')) || '';
        const aria = (await el.getAttribute('aria-pressed').catch(() => '')) || '';
        if (/selected|active|pressed|true/i.test(cls + aria)) {
          await el.click({ timeout: 2000 }).catch(() => {});
          await p.waitForTimeout(300);
        }
      }
    } catch {}
    try {
      const v1 = p.getByText(/DITL-AAA1|AAA1/i).first();
      if (await v1.count()) await v1.click({ timeout: 2000 }).catch(() => {});
    } catch {}
    try {
      const lineA = p.getByText(/Line A|ditl-Line A/i).first();
      if (await lineA.count()) await lineA.click({ timeout: 2000 }).catch(() => {});
    } catch {}
    body = await shot(p, '03-picks', 1200);
    note(3, /Jordan/i.test(body), 'picks Jordan visible');

    try {
      await p.getByText(/I'?m first/i).first().click({ timeout: 5000 });
      await p.waitForTimeout(5000);
    } catch (e) {
      log('im first', String(e).slice(0, 120));
      try {
        await p.getByText(/Check in|Join line|Enter line/i).first().click({ timeout: 3000 });
        await p.waitForTimeout(5000);
      } catch (e2) {
        log('checkin alt', String(e2).slice(0, 100));
      }
    }
    body = await shot(p, '04-after-checkin', 2500);
    const failClosed = /Check in failed/i.test(body);
    const reasonLeak = /DITL-P-03-UI-03 fixture ban|blacklist|banned|do not show|messy divorce|custody/i.test(body);
    const pos = /You are\s+\d+/i.test(body);
    note(4, failClosed && !pos, `fail_closed=${failClosed} position=${pos}`);
    note(5, !reasonLeak, `no_reason_shown leak=${reasonLeak}`);

    await leaveIfInLine(p);
    body = await shot(p, '05-after-leave-guard', 1500);

    let signedOut = false;
    try {
      await gotoRetry(p, `${BASE}/parent`);
      await p.waitForTimeout(1500);
      const so = p.getByText(/Sign out|Log out/i).first();
      if (await so.count()) {
        await so.click();
        await p.waitForTimeout(3000);
        signedOut = true;
      }
    } catch (e) {
      log('signout', String(e).slice(0, 100));
    }
    if (!signedOut) {
      await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} });
      await gotoRetry(p, `${BASE}/sign-in`);
      await p.waitForTimeout(2000);
      signedOut = /sign-in/i.test(p.url());
    }
    body = await shot(p, '06-signout', 1500);
    note(6, signedOut || /sign-in/i.test(p.url()), `signedOut=${signedOut} url=${p.url()}`);
  } catch (e) {
    log('FATAL', String(e));
    evidence.push('FATAL ' + String(e).slice(0, 300));
  } finally {
    await browser.close().catch(() => {});
    if (fixture?.studentId) await clearRestriction(fixture.studentId, fixture.parentId);
  }
  const misses = evidence.filter((e) => e.startsWith('MISS'));
  const fatals = evidence.filter((e) => e.startsWith('FATAL'));
  let result = 'PASS';
  if (fatals.length) result = 'FAIL';
  else if (misses.length) result = misses.some((m) => /step4|step0|fixture/.test(m)) ? 'FAIL' : 'PARTIAL';
  const findings = [];
  // unexpected product breaks only
  const report = {
    case: 'DITL-P-03-UI-03',
    result,
    evidence,
    findings,
    misses,
    fatals,
    lane: 'B',
    ud: UD,
  };
  fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(report, null, 2));
  log('RESULT', result);
  log(JSON.stringify(report, null, 2));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
