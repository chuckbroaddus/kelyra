// DITL-O-04-UI-02 lane C — banned parent fail-closed check-in (skeleton)
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const A = path.dirname(fileURLToPath(import.meta.url));
const OUT = '/tmp/ditl-o04-ui02-out';
const ROOT = '/Users/chuckbroaddus/projects/kelyra';
const BASE = 'http://localhost:8081';
const UD = '/tmp/ditl-pw-lane-c';
const ADMIN_USER = 'ditl-admin';
const ADMIN_PASS = process.env.DITL_ADMIN_PASS || 'DITL-admin-test';
const PARENT_USER = 'ditl-parent-1';
const PARENT_PASS = process.env.DITL_PARENT_PASS || 'DITL-parent-test';
const S1_ID = '2bcee429-11ce-4f84-b2de-9aab349f03cc';
const P1_PARENT_ID = '08a3d52d-132d-451e-971c-e1ac3b3cfc29';
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
    !/Ride office|Pickup restriction|Save restriction|Jordan Lee|Check in|I'm first/i.test(body)
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
  return { status: r.status, token: j.access_token || null, URL, ANON };
}
async function dbActiveBan(token, URL, ANON) {
  const q =
    URL +
    '/rest/v1/pickup_restrictions?select=id,active,student_id,parent_id,reason&student_id=eq.' +
    S1_ID +
    '&parent_id=eq.' +
    P1_PARENT_ID +
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
  log('START DITL-O-04-UI-02');
  const probe = await handleSignIn(ADMIN_USER, ADMIN_PASS);
  log('OK api-admin: status=' + probe.status + ' hasToken=' + Boolean(probe.token));
  if (!probe.token) throw new Error('admin auth failed');
  const banPre = await dbActiveBan(probe.token, probe.URL, probe.ANON);
  log('DB_BAN_PRE status=' + banPre.status + ' n=' + banPre.n);
  const banActive = banPre.n > 0;
  if (!banActive) {
    log('PRECONDITION MISS: no active ban P1×S1 from seq65 — cannot invent ban via API');
  }
  ctx = await openCtx();
  const p = ctx.pages()[0] || (await ctx.newPage());
  // Step 1: admin UI
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
  // Do not set/clear ban — only observe form present
  // Step 2: parent attempt as banned P1
  await uiSignIn(p, PARENT_USER, PARENT_PASS);
  const b3 = await shot(p, '03-parent-after-signin');
  await p.goto(BASE + '/parent/ride', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch((e) =>
    log('GOTO_PARENT_RIDE', e.message),
  );
  await p.waitForTimeout(3000);
  await leaveIfInLine(p);
  const b4 = await shot(p, '04-parent-ride-hub');
  const parentRideOk = /\/parent\/ride/.test(p.url()) || /Ride|Line|Jordan|I'm first|Check in/i.test(b4);
  log('PARENT_RIDE_OK', parentRideOk, 'url=' + p.url());
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
    const lineA = p.getByText(/Line A|ditl-Line A|K–2|K-2/i).first();
    if (await lineA.count()) await lineA.click({ timeout: 2000 }).catch(() => {});
  } catch {}
  await shot(p, '05-picks');
  try {
    await p.getByText(/I'?m first/i).first().click({ timeout: 5000 });
    await p.waitForTimeout(5000);
  } catch (e) {
    log('im_first', String(e).slice(0, 120));
    try {
      await p.getByText(/Check in|Join line|Enter line/i).first().click({ timeout: 3000 });
      await p.waitForTimeout(5000);
    } catch (e2) {
      log('checkin_alt', String(e2).slice(0, 100));
    }
  }
  const b5 = await shot(p, '06-after-checkin');
  const failClosed = /Check in failed/i.test(b5);
  const reasonLeak = /DITL-O-04|blacklist|messy divorce|custody|office reason|do not show/i.test(b5);
  const gotPosition = /You are\s+\d+|Position\s+\d+/i.test(b5);
  log('FAIL_CLOSED', failClosed, 'POS', gotPosition, 'LEAK', reasonLeak);
  await leaveIfInLine(p);
  // DB still active after attempt
  const banPost = await dbActiveBan(probe.token, probe.URL, probe.ANON);
  // refresh admin token if needed
  let banPostN = banPost.n;
  if (banPost.status === 401 || banPost.n < 0) {
    const p2 = await handleSignIn(ADMIN_USER, ADMIN_PASS);
    const bp = await dbActiveBan(p2.token, p2.URL, p2.ANON);
    banPostN = bp.n;
    log('DB_BAN_POST_REFRESH status=' + bp.status + ' n=' + bp.n);
  } else {
    log('DB_BAN_POST status=' + banPost.status + ' n=' + banPost.n);
  }
  await clearSession(p);
  await shot(p, '99-signout');
  await ctx.close();
  ctx = null;
  const denied = failClosed && !gotPosition;
  if (!banActive) {
    RESULT = 'FAIL';
    log('RESULT FAIL — precondition ban missing; did not set ban');
  } else if (denied && !reasonLeak && banPostN > 0) {
    RESULT = 'PASS';
    log('RESULT PASS — banned P1 check-in fail-closed; ban still active; no reason leak');
  } else if (denied && banPostN > 0) {
    RESULT = reasonLeak ? 'PARTIAL' : 'PASS';
    if (reasonLeak) {
      findings.push(
        'FINDING: ban reason leaked on parent Ride after fail-closed; severity P1; case DITL-O-04-UI-02',
      );
    }
    log('RESULT ' + RESULT + ' denied=' + denied + ' leak=' + reasonLeak);
  } else if (gotPosition) {
    RESULT = 'FAIL';
    findings.push(
      'FINDING: banned ditl-parent-1 obtained line position on S1; severity P0; case DITL-O-04-UI-02',
    );
    log('RESULT FAIL — pickup not denied');
  } else if (!parentRideOk || isSplash(b3) || isSplash(b4)) {
    RESULT = 'PARTIAL';
    log('RESULT PARTIAL — splash/nav blocked parent Ride attempt path');
  } else {
    RESULT = 'FAIL';
    log('RESULT FAIL — no Check in failed and no position; unclear UI state');
  }
} catch (e) {
  log('FATAL', String(e).slice(0, 400));
  RESULT = 'FAIL';
  try {
    if (ctx) await ctx.close();
  } catch {}
}
const summary = { case: 'DITL-O-04-UI-02', RESULT, evidence, findings, out: OUT };
fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(summary, null, 2));
fs.writeFileSync(path.join(OUT, 'log.txt'), evidence.join('\n'));
fs.writeFileSync(path.join(A, 'SUMMARY.txt'), evidence.join('\n') + '\nRESULT ' + RESULT + '\n');
console.log('RESULT', RESULT);
