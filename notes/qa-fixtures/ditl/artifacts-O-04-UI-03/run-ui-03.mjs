// DITL-O-04-UI-03 lane C — allowed co-parent P2 pickup on S1
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const A = path.dirname(fileURLToPath(import.meta.url));
const OUT = '/tmp/ditl-o04-ui03-out';
const ROOT = '/Users/chuckbroaddus/projects/kelyra';
const BASE = 'http://localhost:8081';
const UD = '/tmp/ditl-pw-lane-c';
const ADMIN_USER = 'ditl-admin';
const ADMIN_PASS = process.env.DITL_ADMIN_PASS || 'DITL-admin-test';
const PARENT_USER = 'ditl-parent-2';
const PARENT_PASS = process.env.DITL_PARENT_PASS || 'DITL-parent-test';
const S1_ID = '2bcee429-11ce-4f84-b2de-9aab349f03cc';
const evidence = [];
const findings = [];
const log = (...a) => {
  const s = a.map(String).join(' ');
  evidence.push(s);
  console.log(s);
};
fs.mkdirSync(A, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(UD, { recursive: true });
function env(k) {
  const envText = fs.readFileSync(ROOT + '/.env', 'utf8');
  const m = envText.match(new RegExp('^' + k + '=(.*)$', 'm'));
  if (!m) throw new Error('missing ' + k);
  return m[1].trim().replace(/^['\"]|['\"]$/g, '');
}
async function shot(p, n) {
  const f = path.join(OUT, n + '.png');
  await p.screenshot({ path: f, fullPage: true }).catch(() => {});
  try {
    fs.copyFileSync(f, path.join(A, n + '.png'));
  } catch {}
  const body = (await p.innerText('body').catch(() => '')).replace(/\s+/g, ' ').trim();
  log('==', n, p.url());
  log(body.slice(0, 900));
  return body;
}
async function openCtx() {
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
  await p.goto(BASE + '/sign-in', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(800);
  await p.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
  });
  await p.goto(BASE + '/sign-in', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForTimeout(1500);
}
async function uiSignIn(p, user, pass) {
  await clearSession(p);
  const n = await p.locator('input').count();
  log('INPUT_COUNT', n, 'user', user);
  if (n < 2) throw new Error('no sign-in inputs');
  await p.locator('input').nth(0).fill(user);
  await p.locator('input[type=password]').first().fill(pass);
  await p.locator('input[type=password]').first().press('Enter');
  await p.waitForTimeout(8000);
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
function isSplash(body) {
  return (
    /Account creation is performed by the school office|SplashLanding|Welcome to Kelyra/i.test(body) &&
    !/Ride office|Pickup restriction|Save restriction|Jordan Lee|Check in|I'm first|Cameron|Leave line/i.test(body)
  );
}
async function handleSignIn(handle, pass) {
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
  const token = j.access_token || j.session?.access_token || null;
  function sub(t) {
    try {
      const p = JSON.parse(Buffer.from(String(t).split('.')[1], 'base64url').toString());
      return p.sub || p.user_id || null;
    } catch {
      return null;
    }
  }
  const userId = j.user?.id || j.id || j.session?.user?.id || (token ? sub(token) : null);
  return { status: r.status, token, userId, URL, ANON, rawKeys: Object.keys(j) };
}
async function resolveParentId(token, URL, ANON, userId) {
  const pr = await fetch(URL + '/rest/v1/profiles?id=eq.' + userId + '&select=id,role,parent_id,display_name', {
    headers: { apikey: ANON, Authorization: 'Bearer ' + token },
  });
  const pj = await pr.json().catch(() => []);
  return { status: pr.status, row: Array.isArray(pj) ? pj[0] : null };
}
async function dbP2Ban(token, URL, ANON, parentId) {
  const q =
    URL +
    '/rest/v1/pickup_restrictions?select=id,active,student_id,parent_id,reason&student_id=eq.' +
    S1_ID +
    '&parent_id=eq.' +
    parentId +
    '&active=eq.true';
  const rr = await fetch(q, {
    headers: { apikey: ANON, Authorization: 'Bearer ' + token, Prefer: 'count=exact' },
  });
  const rows = await rr.json().catch(() => []);
  return { status: rr.status, n: Array.isArray(rows) ? rows.length : -1, rows };
}
let RESULT = 'FAIL';
let ctx;
try {
  log('START DITL-O-04-UI-03');
  const probe = await handleSignIn(ADMIN_USER, ADMIN_PASS);
  log('OK api-admin: status=' + probe.status + ' hasToken=' + Boolean(probe.token));
  if (!probe.token) throw new Error('admin auth failed');
  const p2auth = await handleSignIn(PARENT_USER, PARENT_PASS);
  log('OK api-parent2: status=' + p2auth.status + ' hasToken=' + Boolean(p2auth.token) + ' uid=' + p2auth.userId);
  if (!p2auth.token || !p2auth.userId) throw new Error('parent-2 auth failed');
  const prof = await resolveParentId(p2auth.token, p2auth.URL, p2auth.ANON, p2auth.userId);
  const P2_PARENT_ID = prof.row?.parent_id || null;
  log('P2_PROFILE status=' + prof.status + ' parent_id=' + P2_PARENT_ID + ' name=' + (prof.row?.display_name || ''));
  if (!P2_PARENT_ID) throw new Error('parent-2 parent_id missing');
  let banP2 = await dbP2Ban(probe.token, probe.URL, probe.ANON, P2_PARENT_ID);
  if (banP2.status === 401) {
    const a2 = await handleSignIn(ADMIN_USER, ADMIN_PASS);
    banP2 = await dbP2Ban(a2.token, a2.URL, a2.ANON, P2_PARENT_ID);
  }
  log('DB_P2_BAN_PRE status=' + banP2.status + ' n=' + banP2.n);
  const p2HasBan = banP2.n > 0;
  if (p2HasBan) {
    log('NOTE: unexpected active ban on P2×S1 — expected none for allowed co-parent');
  }
  ctx = await openCtx();
  const p = ctx.pages()[0] || (await ctx.newPage());
  await uiSignIn(p, ADMIN_USER, ADMIN_PASS);
  const b1 = await shot(p, '01-admin-after-signin');
  log('HAS_SPLASH_ADMIN', isSplash(b1));
  await p.goto(BASE + '/admin/ride', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch((e) =>
    log('GOTO_ADMIN_RIDE', e.message),
  );
  await p.waitForTimeout(3500);
  const b2 = await shot(p, '02-admin-ride');
  const adminRideOk = /Pickup restriction|Ride office/i.test(b2) && !isSplash(b2);
  log('ADMIN_RIDE_OK', adminRideOk, 'url=' + p.url());
  await uiSignIn(p, PARENT_USER, PARENT_PASS);
  const b3 = await shot(p, '03-parent2-after-signin');
  await p.goto(BASE + '/parent/ride', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch((e) =>
    log('GOTO_PARENT_RIDE', e.message),
  );
  await p.waitForTimeout(3000);
  await leaveIfInLine(p);
  const b4 = await shot(p, '04-parent2-ride-hub');
  const parentRideOk = /\/parent\/ride/.test(p.url()) || /Ride|Line|Jordan|I'm first|Check in/i.test(b4);
  log('PARENT2_RIDE_OK', parentRideOk, 'url=' + p.url());
  try {
    const jordan = p.getByText(/Jordan(\s+Lee)?/i);
    if (await jordan.count()) {
      await jordan.first().click({ timeout: 4000 });
      await p.waitForTimeout(400);
    }
  } catch (e) {
    log('jordan_pick', String(e).slice(0, 80));
  }
  try {
    const others = p.getByText(/^(Jamie|Avery)(\s+Lee)?$/i);
    for (let i = 0; i < (await others.count()); i++) {
      const el = others.nth(i);
      const cls = (await el.getAttribute('class').catch(() => '')) || '';
      const aria = (await el.getAttribute('aria-pressed').catch(() => '')) || '';
      if (/selected|active|pressed|true/i.test(cls + aria)) {
        await el.click({ timeout: 2000 }).catch(() => {});
        await p.waitForTimeout(300);
      }
    }
  } catch {}
  try {
    const v = p.getByText(/DITL-|AAA|plate/i).first();
    if (await v.count()) await v.click({ timeout: 2000 }).catch(() => {});
  } catch {}
  try {
    const lineA = p.getByText(/Line A|ditl-Line A|K–2|K-2/i).first();
    if (await lineA.count()) await lineA.click({ timeout: 2000 }).catch(() => {});
  } catch {}
  await shot(p, '05-picks');
  try {
    await p.getByText(/I'?m first/i).first().click({ timeout: 5000 });
    await p.waitForTimeout(6000);
  } catch (e) {
    log('im_first', String(e).slice(0, 120));
    try {
      await p.getByText(/Check in|Join line|Enter line/i).first().click({ timeout: 3000 });
      await p.waitForTimeout(6000);
    } catch (e2) {
      log('checkin_alt', String(e2).slice(0, 100));
    }
  }
  const b5 = await shot(p, '06-after-checkin');
  const failClosed = /Check in failed/i.test(b5);
  const gotPosition = /You are\s+\d+|Position\s+\d+|Leave line|in line|Waiting/i.test(b5);
  const reasonLeak = /DITL-O-04|blacklist|messy divorce|custody|office reason/i.test(b5);
  log('FAIL_CLOSED', failClosed, 'POS_OR_WAITING', gotPosition, 'LEAK', reasonLeak);
  await leaveIfInLine(p);
  await shot(p, '07-after-leave');
  let banPost = await dbP2Ban(probe.token, probe.URL, probe.ANON, P2_PARENT_ID);
  if (banPost.status === 401) {
    const a3 = await handleSignIn(ADMIN_USER, ADMIN_PASS);
    banPost = await dbP2Ban(a3.token, a3.URL, a3.ANON, P2_PARENT_ID);
  }
  log('DB_P2_BAN_POST status=' + banPost.status + ' n=' + banPost.n);
  await clearSession(p);
  await shot(p, '99-signout');
  await ctx.close();
  ctx = null;
  const granted = gotPosition && !failClosed;
  if (p2HasBan) {
    RESULT = 'FAIL';
    findings.push(
      'FINDING: ditl-parent-2 has active pickup ban on S1 (expected allowed); severity P1; case DITL-O-04-UI-03',
    );
    log('RESULT FAIL — P2 unexpectedly banned in DB');
  } else if (granted && !reasonLeak && banPost.n === 0) {
    RESULT = 'PASS';
    log('RESULT PASS — allowed P2 check-in granted; no P2 restriction; left line');
  } else if (failClosed && !p2HasBan) {
    RESULT = 'FAIL';
    findings.push(
      'FINDING: allowed ditl-parent-2 check-in fail-closed on S1; severity P0; case DITL-O-04-UI-03',
    );
    log('RESULT FAIL — allowed co-parent denied');
  } else if (!parentRideOk || isSplash(b3) || isSplash(b4)) {
    RESULT = 'PARTIAL';
    log('RESULT PARTIAL — splash/nav blocked parent-2 Ride path');
  } else if (!failClosed && !gotPosition) {
    RESULT = 'PARTIAL';
    log('RESULT PARTIAL — no fail-closed and no clear position/waiting UI after check-in');
  } else {
    RESULT = 'FAIL';
    log('RESULT FAIL — unclear grant state fail=' + failClosed + ' pos=' + gotPosition);
  }
} catch (e) {
  log('FATAL', String(e).slice(0, 400));
  RESULT = 'FAIL';
  try {
    if (ctx) await ctx.close();
  } catch {}
}
const summary = { case: 'DITL-O-04-UI-03', RESULT, evidence, findings, out: OUT };
fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(summary, null, 2));
fs.writeFileSync(path.join(OUT, 'log.txt'), evidence.join('\n'));
fs.writeFileSync(path.join(A, 'SUMMARY.txt'), evidence.join('\n') + '\nRESULT ' + RESULT + '\n');
console.log('RESULT', RESULT);
