// DITL-O-04-UI-01 lane C skeleton
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const A = path.dirname(fileURLToPath(import.meta.url));
const OUT = '/tmp/ditl-o04-ui01-out';
const ROOT = '/Users/chuckbroaddus/projects/kelyra';
const BASE = 'http://localhost:8081';
const UD = '/tmp/ditl-pw-lane-c';
const ADMIN_USER = 'ditl-admin';
const ADMIN_PASS = process.env.DITL_ADMIN_PASS || 'DITL-admin-test';
const S1_ID = '2bcee429-11ce-4f84-b2de-9aab349f03cc';
// parent_id for ditl-parent-1 (Taylor Lee) — resolved read-only from profile JWT sub
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
  return m[1].trim().replace(/^['"]|['"]$/g, '');
}
async function shot(p, n) {
  const f = path.join(OUT, n + '.png');
  await p.screenshot({ path: f, fullPage: true }).catch(() => {});
  try {
    fs.copyFileSync(f, path.join(A, n + '.png'));
  } catch {}
  const body = (await p.innerText('body').catch(() => '')).replace(/\s+/g, ' ').trim();
  log('==', n, p.url());
  log(body.slice(0, 700));
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
  log('INPUT_COUNT', n);
  if (n < 2) throw new Error('no sign-in inputs');
  await p.locator('input').nth(0).fill(user);
  await p.locator('input[type=password]').first().fill(pass);
  await p.locator('input[type=password]').first().press('Enter');
  await p.waitForTimeout(8000);
}
async function apiAdminProbe() {
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
  return { status: r.status, hasToken: Boolean(j.access_token), userId: j.user?.id || null };
}
function isSplash(body) {
  return (
    /Account creation is performed by the school office|SplashLanding|Welcome to Kelyra/i.test(body) &&
    !/Ride office|Pickup restriction|Save restriction|Jordan Lee|Devon Hale/i.test(body)
  );
}
let RESULT = 'FAIL';
let ctx;
try {
  log('START DITL-O-04-UI-01');
  const probe = await apiAdminProbe();
  log(
    'OK stepapi-admin: status=' +
      probe.status +
      ' hasToken=' +
      probe.hasToken +
      ' uid=' +
      (probe.userId || '').slice(0, 8),
  );
  ctx = await openCtx();
  const p = ctx.pages()[0] || (await ctx.newPage());
  await uiSignIn(p, ADMIN_USER, ADMIN_PASS);
  const b1 = await shot(p, '01-admin-after-signin');
  const hasTok = await p.evaluate(() =>
    Object.keys(localStorage).some((k) => /auth-token|supabase/i.test(k)),
  );
  log('HAS_LS_TOKEN', hasTok, 'URL', p.url());
  if (isSplash(b1)) log('SPLASH_AFTER_SIGNIN true — one direct route /admin/ride only');
  await p.goto(BASE + '/admin/ride', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch((e) =>
    log('GOTO_ERR', e.message),
  );
  await p.waitForTimeout(4000);
  const b2 = await shot(p, '02-admin-ride-once');
  const leftSplash = !isSplash(b2);
  const hasRestrictUi =
    /Pickup restriction|Save restriction|Ride office|Student id/i.test(b2) && leftSplash;
  log(
    'ROUTE /admin/ride leftSplash=' +
      leftSplash +
      ' hasRestrictUi=' +
      hasRestrictUi +
      ' url=' +
      p.url(),
  );
  let banSet = false;
  let notifySeen = false;
  let restrictionConfirmed = false;
  let banCleared = false;
  if (hasRestrictUi) {
    const fields = p.locator('input');
    const fc = await fields.count();
    log('FIELD_COUNT', fc);
    // 0 student, 1 parent, 2 reason, 3 archive date
    await fields.nth(0).fill(S1_ID);
    await fields.nth(1).fill(P1_PARENT_ID);
    await fields.nth(2).fill('DITL-O-04-UI-01 ban fixture');
    await shot(p, '03-restrict-filled');
    await p.getByText('Save restriction', { exact: false }).first().click();
    await p.waitForTimeout(3000);
    const b3 = await shot(p, '04-after-save');
    banSet = /Restriction saved/i.test(b3);
    log('BAN_SET_UI', banSet, 'statusHint', /Restriction saved|Failed|error/i.test(b3));
    // Confirm via rest as admin session token in browser
    const conf = await p.evaluate(
      async ({ s1, p1 }) => {
        try {
          const keys = Object.keys(localStorage);
          const tokKey = keys.find((k) => /auth-token/i.test(k));
          if (!tokKey) return { err: 'no-token' };
          const raw = JSON.parse(localStorage.getItem(tokKey) || '{}');
          const access =
            raw?.access_token ||
            raw?.currentSession?.access_token ||
            (typeof raw === 'string' ? null : raw?.access_token);
          // supabase stores nested
          let at = access;
          if (!at && raw) {
            try {
              const inner = typeof raw === 'string' ? JSON.parse(raw) : raw;
              at = inner.access_token || inner?.currentSession?.access_token;
            } catch {}
          }
          // parse sb storage shape
          if (!at) {
            const v = localStorage.getItem(tokKey);
            const m = v && v.match(/"access_token"\s*:\s*"([^"]+)"/);
            if (m) at = m[1];
          }
          if (!at) return { err: 'no-access' };
          const urlMatch = Object.keys(localStorage).join(' ');
          // hardcode project from known env path not available — use meta from page
          const base = (window.__EXPO_PUBLIC_SUPABASE_URL || '').toString();
          return { hasAt: true, atLen: at.length, s1, p1, base: base.slice(0, 40) };
        } catch (e) {
          return { err: String(e).slice(0, 120) };
        }
      },
      { s1: S1_ID, p1: P1_PARENT_ID },
    );
    log('CONF_PROBE', JSON.stringify(conf));
    // Server-side confirm with admin handle (read only select)
    try {
      const URL = env('EXPO_PUBLIC_SUPABASE_URL');
      const ANON = env('EXPO_PUBLIC_SUPABASE_ANON_KEY');
      const ar = await fetch(URL + '/functions/v1/sign-in-handle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: ANON,
          Authorization: 'Bearer ' + ANON,
        },
        body: JSON.stringify({ handle: ADMIN_USER, password: ADMIN_PASS }),
      });
      const aj = await ar.json();
      const at = aj.access_token;
      const q =
        URL +
        '/rest/v1/pickup_restrictions?select=id,active,student_id,parent_id,reason&student_id=eq.' +
        S1_ID +
        '&parent_id=eq.' +
        P1_PARENT_ID +
        '&active=eq.true';
      const rr = await fetch(q, {
        headers: { apikey: ANON, Authorization: 'Bearer ' + at, Prefer: 'count=exact' },
      });
      const rows = await rr.json().catch(() => []);
      restrictionConfirmed = Array.isArray(rows) && rows.length > 0;
      log(
        'DB_RESTRICT',
        rr.status,
        'n=' + (Array.isArray(rows) ? rows.length : -1),
        'confirmed=' + restrictionConfirmed,
      );
    } catch (e) {
      log('DB_RESTRICT_ERR', String(e).slice(0, 200));
    }
    // Notify path: look for messages/alerts chrome from ride screen
    await p.goto(BASE + '/messages', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await p.waitForTimeout(2000);
    const bm = await shot(p, '05-messages-notify');
    notifySeen = /ban|restrict|pickup|Taylor|ditl-parent/i.test(bm) && !isSplash(bm);
    log('NOTIFY_SEEN', notifySeen);
    if (!notifySeen) log('GAP notify path to P1 not visible in Messages after save (plan PARTIAL/GAP ok)');
    // Teardown: clear ban on screen only if we set it
    if (banSet || restrictionConfirmed) {
      await p.goto(BASE + '/admin/ride', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await p.waitForTimeout(2500);
      const f2 = p.locator('input');
      await f2.nth(0).fill(S1_ID);
      await f2.nth(1).fill(P1_PARENT_ID);
      await f2.nth(2).fill('DITL-O-04-UI-01 teardown clear');
      // Clear: product Save with active true only — need inactive?
      // Screen only has Save restriction active:true. No clear button.
      // Try Save again won't clear. Check for Clear / deactivate control.
      const bodyClear = await p.innerText('body');
      const hasClear = /Clear restriction|Remove ban|Deactivate|active/i.test(bodyClear);
      log('HAS_CLEAR_CONTROL', hasClear);
      if (!hasClear) {
        log(
          'GAP teardown: UI has Save restriction (active true) only — no clear control; leaving ban active would pollute — attempt RPC-free note',
        );
        // Card: remove only a ban this case set on screen. If no clear UI, document and use
        // opposite: cannot leave ban. office_set with active false is API — forbidden.
        // Attempt: fill and look for any Ghost status to toggle — none.
        banCleared = false;
        findings.push(
          'FINDING: Ride office has no clear/deactivate restriction control after Save; severity P2; case DITL-O-04-UI-01',
        );
      }
      await shot(p, '06-teardown-attempt');
    }
  } else {
    log('MISS restrict UI blocked by splash or missing route content');
  }
  await clearSession(p);
  await shot(p, '99-signout');
  await ctx.close();
  ctx = null;
  if (!leftSplash && isSplash(b1) && !hasRestrictUi) {
    RESULT = 'FAIL';
    log(
      'RESULT FAIL — ditl-admin auth OK but UI splash wall; one direct /admin/ride did not reach Pickup restriction; no ban mutated',
    );
  } else if (hasRestrictUi && banSet && restrictionConfirmed) {
    RESULT = notifySeen ? 'PASS' : 'PARTIAL';
    log(
      'RESULT ' +
        RESULT +
        ' — ban set via UI + DB active row; notify=' +
        notifySeen +
        ' cleared=' +
        banCleared,
    );
  } else if (hasRestrictUi && (banSet || restrictionConfirmed)) {
    RESULT = 'PARTIAL';
    log('RESULT PARTIAL — partial ban path banSet=' + banSet + ' db=' + restrictionConfirmed);
  } else if (hasRestrictUi) {
    RESULT = 'FAIL';
    log('RESULT FAIL — form reached but Save did not stick');
  } else {
    RESULT = 'FAIL';
    log('RESULT FAIL');
  }
} catch (e) {
  log('FATAL', String(e).slice(0, 400));
  RESULT = 'FAIL';
  try {
    if (ctx) await ctx.close();
  } catch {}
}
const summary = { case: 'DITL-O-04-UI-01', RESULT, evidence, findings, out: OUT };
fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(summary, null, 2));
fs.writeFileSync(path.join(OUT, 'log.txt'), evidence.join('\n'));
fs.writeFileSync(path.join(A, 'SUMMARY.txt'), evidence.join('\n') + '\nRESULT ' + RESULT + '\n');
console.log('RESULT', RESULT);
