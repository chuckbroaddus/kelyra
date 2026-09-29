// DITL-O-04-UI-04 lane C — set/clear ban + audit/history preserve
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const A = path.dirname(fileURLToPath(import.meta.url));
const OUT = '/tmp/ditl-o04-ui04-out';
const ROOT = '/Users/chuckbroaddus/projects/kelyra';
const BASE = 'http://localhost:8081';
const UD = '/tmp/ditl-pw-lane-c';
const ADMIN_USER = 'ditl-admin';
const ADMIN_PASS = process.env.DITL_ADMIN_PASS || 'DITL-admin-test';
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
  log(body.slice(0, 800));
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
function isSplash(body) {
  return (
    /Account creation is performed by the school office|SplashLanding|Welcome to Kelyra/i.test(body) &&
    !/Ride office|Pickup restriction|Save restriction|Jordan Lee|Devon Hale/i.test(body)
  );
}
async function adminToken() {
  const URL = env('EXPO_PUBLIC_SUPABASE_URL');
  const ANON = env('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  const r = await fetch(URL + '/functions/v1/sign-in-handle', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON,
      Authorization: 'Bearer ' + ANON,
    },
    body: JSON.stringify({ handle: ADMIN_USER, password: ADMIN_PASS }),
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, token: j.access_token || null, URL, ANON };
}
let RESULT = 'FAIL';
let ctx;
try {
  log('START DITL-O-04-UI-04');
  const auth = await adminToken();
  log('OK api-admin: status=' + auth.status + ' hasToken=' + Boolean(auth.token));
  // Read-only: active bans + any history-ish rows (no mutate)
  let banActiveN = -1;
  let auditN = -1;
  let restrictHist = [];
  if (auth.token) {
    const q =
      auth.URL +
      '/rest/v1/pickup_restrictions?select=id,active,student_id,parent_id,reason,created_at,updated_at&student_id=eq.' +
      S1_ID +
      '&parent_id=eq.' +
      P1_PARENT_ID +
      '&order=created_at.desc';
    const rr = await fetch(q, {
      headers: {
        apikey: auth.ANON,
        Authorization: 'Bearer ' + auth.token,
        Prefer: 'count=exact',
      },
    });
    restrictHist = await rr.json().catch(() => []);
    banActiveN = Array.isArray(restrictHist)
      ? restrictHist.filter((r) => r.active === true).length
      : -1;
    log(
      'DB_RESTRICT_HIST status=' +
        rr.status +
        ' n=' +
        (Array.isArray(restrictHist) ? restrictHist.length : -1) +
        ' activeN=' +
        banActiveN,
    );
    if (Array.isArray(restrictHist) && restrictHist[0]) {
      log(
        'DB_RESTRICT_TOP active=' +
          restrictHist[0].active +
          ' reason=' +
          String(restrictHist[0].reason || '').slice(0, 80),
      );
    }
    // audit_events if readable
    const aq =
      auth.URL +
      '/rest/v1/audit_events?select=id,action,entity_type,created_at&or=(action.ilike.*restrict*,action.ilike.*pickup*,entity_type.ilike.*restrict*)&order=created_at.desc&limit=10';
    const ar = await fetch(aq, {
      headers: { apikey: auth.ANON, Authorization: 'Bearer ' + auth.token },
    });
    const arows = await ar.json().catch(() => []);
    auditN = Array.isArray(arows) ? arows.length : -1;
    log('DB_AUDIT status=' + ar.status + ' n=' + auditN);
    if (Array.isArray(arows) && arows[0]) {
      log(
        'DB_AUDIT_TOP action=' +
          arows[0].action +
          ' entity=' +
          arows[0].entity_type +
          ' at=' +
          arows[0].created_at,
      );
    }
  }
  ctx = await openCtx();
  const p = ctx.pages()[0] || (await ctx.newPage());
  await uiSignIn(p, ADMIN_USER, ADMIN_PASS);
  const b1 = await shot(p, '01-admin-after-signin');
  if (isSplash(b1)) log('HAS_SPLASH_ADMIN true (parked t_3191917a — not refiled)');
  await p.goto(BASE + '/admin/ride', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch((e) =>
    log('GOTO_ERR', e.message),
  );
  await p.waitForTimeout(4000);
  const b2 = await shot(p, '02-admin-ride');
  const hasRestrictUi =
    /Pickup restriction|Save restriction|Ride office|Student id/i.test(b2) && !isSplash(b2);
  log('ADMIN_RIDE_OK ' + hasRestrictUi + ' url=' + p.url());
  const hasClear =
    /Clear restriction|Remove ban|Deactivate restriction|Lift ban|End restriction|Unban/i.test(b2);
  const hasAuditUi =
    /Audit|History|restriction log|past restrictions|Previous bans/i.test(b2);
  log('HAS_CLEAR_CONTROL ' + hasClear);
  log('HAS_AUDIT_UI ' + hasAuditUi);
  let banSetUi = false;
  let banClearedUi = false;
  if (hasRestrictUi) {
    // Attempt clear only if control exists; do not DB-mutate
    if (hasClear) {
      await p.getByText(/Clear restriction|Remove ban|Deactivate|Lift ban|Unban/i).first().click().catch(() => {});
      await p.waitForTimeout(2500);
      const bc = await shot(p, '03-after-clear-attempt');
      banClearedUi = /cleared|removed|deactivated|inactive|Restriction cleared/i.test(bc);
      log('BAN_CLEARED_UI ' + banClearedUi);
    } else {
      log('PARKED_NO_CLEAR_CONTROL same as t_ba828734 — stop looking; do not DB clear');
      await shot(p, '03-no-clear-control');
    }
    // Set path: only if no active ban — else leave fixture (card: ban still active)
    if (banActiveN === 0) {
      const fields = p.locator('input');
      const fc = await fields.count();
      log('FIELD_COUNT ' + fc);
      if (fc >= 3) {
        await fields.nth(0).fill(S1_ID);
        await fields.nth(1).fill(P1_PARENT_ID);
        await fields.nth(2).fill('DITL-O-04-UI-04 audit set');
        await shot(p, '04-restrict-filled');
        await p.getByText('Save restriction', { exact: false }).first().click();
        await p.waitForTimeout(3000);
        const bs = await shot(p, '05-after-save');
        banSetUi = /Restriction saved/i.test(bs);
        log('BAN_SET_UI ' + banSetUi);
      }
    } else {
      log('BAN_ALREADY_ACTIVE n=' + banActiveN + ' — skip set (preserve fixture; no API clear)');
      await shot(p, '04-ban-active-skip-set');
    }
  } else {
    log('MISS restrict UI');
  }
  // UI audit/history probe: common office routes (read-only nav)
  const auditRoutes = ['/admin/ride', '/admin/people', '/messages', '/admin'];
  let auditUiFound = hasAuditUi;
  for (const r of auditRoutes) {
    await p.goto(BASE + r, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await p.waitForTimeout(1500);
    const bx = await p.innerText('body').catch(() => '');
    if (/Audit|restriction history|pickup_restrictions|ban history/i.test(bx) && !isSplash(bx)) {
      auditUiFound = true;
      await shot(p, '06-audit-route-' + r.replace(/\//g, '_'));
      log('AUDIT_UI_ROUTE ' + r);
      break;
    }
  }
  log('AUDIT_UI_FOUND ' + auditUiFound);
  // Re-read DB preserve (read-only)
  if (auth.token) {
    const q2 =
      auth.URL +
      '/rest/v1/pickup_restrictions?select=id,active,reason,created_at&student_id=eq.' +
      S1_ID +
      '&parent_id=eq.' +
      P1_PARENT_ID +
      '&order=created_at.desc';
    const rr2 = await fetch(q2, {
      headers: { apikey: auth.ANON, Authorization: 'Bearer ' + auth.token },
    });
    const rows2 = await rr2.json().catch(() => []);
    const act2 = Array.isArray(rows2) ? rows2.filter((r) => r.active).length : -1;
    log('DB_RESTRICT_POST status=' + rr2.status + ' n=' + (Array.isArray(rows2) ? rows2.length : -1) + ' activeN=' + act2);
  }
  await clearSession(p);
  await shot(p, '99-signout');
  await ctx.close();
  ctx = null;
  // Grade: Expected audit log intact; set/clear on screen
  // Parked no-clear is NOT a new finding (t_ba828734)
  if (!hasRestrictUi) {
    RESULT = 'FAIL';
    log('RESULT FAIL — could not reach Ride office Pickup restriction');
  } else if (!hasClear && banActiveN >= 1) {
    RESULT = 'PARTIAL';
    log(
      'RESULT PARTIAL — ban fixture active; Ride office has Save only (no clear); audit UI=' +
        auditUiFound +
        ' audit_events n=' +
        auditN +
        ' restrict hist n=' +
        (Array.isArray(restrictHist) ? restrictHist.length : -1) +
        ' — parked no-clear t_ba828734 not refiled; splash parked t_3191917a',
    );
  } else if (hasClear && (banClearedUi || banSetUi) && (auditUiFound || auditN >= 0)) {
    RESULT = 'PASS';
    log('RESULT PASS — clear/set + audit path exercised');
  } else {
    RESULT = 'PARTIAL';
    log(
      'RESULT PARTIAL — restrict UI ok clear=' +
        hasClear +
        ' set=' +
        banSetUi +
        ' cleared=' +
        banClearedUi +
        ' auditUi=' +
        auditUiFound +
        ' auditN=' +
        auditN,
    );
  }
} catch (e) {
  log('FATAL', String(e).slice(0, 500));
  RESULT = 'FAIL';
  try {
    if (ctx) await ctx.close();
  } catch {}
}
const summary = { case: 'DITL-O-04-UI-04', RESULT, evidence, findings, out: OUT };
fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(summary, null, 2));
fs.writeFileSync(path.join(OUT, 'log.txt'), evidence.join('\n'));
fs.writeFileSync(path.join(A, 'SUMMARY.txt'), evidence.join('\n') + '\nRESULT ' + RESULT + '\n');
console.log('RESULT', RESULT);
