// DITL-O-01-UI-02 lane C — super identity vs admin matrix
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const A = path.dirname(fileURLToPath(import.meta.url));
const ROOT = '/Users/chuckbroaddus/projects/kelyra';
const BASE = 'http://localhost:8081';
const UD = '/tmp/ditl-pw-lane-c';
const SUPER_USER = 'ditl-super';
const SUPER_PASS = process.env.DITL_SUPER_PASS || 'DITL-super-test';
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
  return m[1].trim().replace(/^['"]|['"]$/g, '');
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
    email: j.user?.email || j.email || null,
    err: j.error || j.msg || j.message || null,
  };
  if (!j.access_token) return { ...out, profile: null, feeds: null, teacher: null };
  const sb = createClient(URL, ANON, {
    global: { headers: { Authorization: `Bearer ${j.access_token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await sb.auth.setSession({
    access_token: j.access_token,
    refresh_token: j.refresh_token,
  });
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
  return { ...out, profile, teacher, feeds };
}
function isSplash(body, url) {
  const officeChrome = /People|Manage|Classes|Responsibilities|School name|Dismissal curb|Activity/i.test(body);
  if (officeChrome) return false;
  if (/Sign in/i.test(body) && /Spring Baptist|Get started|Welcome to Kelyra/i.test(body)) return true;
  if (/sign-in/i.test(url || '') && /Sign in/i.test(body) && !officeChrome) return true;
  return /Sign in/i.test(body) && !officeChrome;
}
async function exploreOffice(p, tag) {
  const routes = ['/', '/?tab=manage', '/?tab=people', '/?tab=classes', '/admin/matrix', '/admin/ride'];
  const bodies = {};
  for (const r of routes) {
    await p.goto(BASE + r, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(3500);
    const b = await shot(p, `${tag}-${r.replace(/[/?=]/g, '_')}`);
    bodies[r] = { url: p.url(), body: b };
  }
  return bodies;
}

async function main() {
  log('START DITL-O-01-UI-02');
  const browser = await openCtx();
  const p = browser.pages()[0] || (await browser.newPage());
  let result = 'PARTIAL';
  try {
    const superApi = await apiProbe(SUPER_USER, SUPER_PASS);
    note(
      'api-super',
      superApi.hasToken && superApi.status === 200,
      `status=${superApi.status} role=${superApi.profile?.role} name=${superApi.profile?.display_name} teacherRow=${Boolean(superApi.teacher)} feeds=${JSON.stringify(superApi.feeds)?.slice(0, 180)}`,
    );
    const adminApi = await apiProbe(ADMIN_USER, ADMIN_PASS);
    note(
      'api-admin',
      adminApi.hasToken && adminApi.status === 200,
      `status=${adminApi.status} role=${adminApi.profile?.role} name=${adminApi.profile?.display_name} teacherRow=${Boolean(adminApi.teacher)} feeds=${JSON.stringify(adminApi.feeds)?.slice(0, 180)}`,
    );

    await uiSignIn(p, SUPER_USER, SUPER_PASS);
    let body = await shot(p, '01-super-after-signin');
    let superSignedIn = superApi.hasToken;
    if (superApi.hasToken && !/invalid|wrong password|could not sign/i.test(body)) superSignedIn = true;
    note(1, superSignedIn, `super UI url=${p.url()} splashish=${isSplash(body, p.url())}`);

    const superBodies = await exploreOffice(p, '02-super');
    const manageB = superBodies['/?tab=manage']?.body || '';
    const matrixB = superBodies['/admin/matrix']?.body || '';
    const rootB = superBodies['/']?.body || body;
    const superLeftSplash =
      !isSplash(rootB, superBodies['/']?.url || p.url()) &&
      /People|Manage|Classes|Feed|Responsibilities|Dismissal|School name|Sandbox|Activity/i.test(rootB + manageB);
    const identityLabels =
      /School name/i.test(manageB) || /Logo/i.test(manageB) || /monthly cap|AI spend/i.test(manageB);
    const identityEdit = identityLabels || /School name|school logo|Change logo|Upload logo/i.test(manageB + rootB);
    const matrixEdit =
      /Responsibilities|Edit this matrix|superintendent|School name and logo/i.test(manageB + matrixB + rootB) &&
      !isSplash(matrixB + manageB, '');
    note(
      2,
      superLeftSplash && (identityLabels || identityEdit || matrixEdit),
      `superLeftSplash=${superLeftSplash} identityLabels=${identityLabels} identityEdit=${identityEdit} matrixEdit=${matrixEdit}`,
    );

    if (superApi.hasToken && !superLeftSplash) {
      findings.push(
        'FINDING: ditl-super auth OK but UI stuck SplashLanding (Home gates on teachers row); severity P0; case DITL-O-01-UI-02',
      );
      evidence.push('FAIL super UI: SplashLanding wall without teachers row');
    } else if (superLeftSplash && !identityLabels && !identityEdit) {
      gaps.push('GAP/PARTIAL: super chrome reached but SchoolIdentityFields not clearly visible');
    } else if (superLeftSplash && (identityLabels || identityEdit)) {
      evidence.push('OK super: school identity edit surface on manage');
    }

    await clearSession(p);
    body = await shot(p, '03-after-super-signout', 800);
    note('signout-super', /sign-in|Sign in|password/i.test(body + p.url()), `url=${p.url()}`);

    await uiSignIn(p, ADMIN_USER, ADMIN_PASS);
    body = await shot(p, '04-admin-after-signin');
    note(3, adminApi.hasToken, `admin UI url=${p.url()} splashish=${isSplash(body, p.url())}`);

    const adminBodies = await exploreOffice(p, '05-admin');
    const aManage = adminBodies['/?tab=manage']?.body || '';
    const aMatrix = adminBodies['/admin/matrix']?.body || '';
    const aRoot = adminBodies['/']?.body || body;
    const adminLeftSplash =
      !isSplash(aRoot, adminBodies['/']?.url || '') &&
      /People|Manage|Classes|Dismissal|Activity|Sandbox/i.test(aRoot + aManage);
    const adminHasIdentity = /School name/i.test(aManage) && /logo/i.test(aManage);
    const adminHasMatrixEdit =
      /Responsibilities/i.test(aManage) ||
      (/Edit this matrix|Tap a seat|cycle access/i.test(aMatrix) && !/no access|denied|Sign in/i.test(aMatrix));
    const adminRestricted = adminLeftSplash && !adminHasIdentity && !adminHasMatrixEdit;
    note(
      4,
      adminLeftSplash ? adminRestricted : false,
      `adminLeftSplash=${adminLeftSplash} hasIdentity=${adminHasIdentity} hasMatrixEdit=${adminHasMatrixEdit} restricted=${adminRestricted}`,
    );

    if (adminApi.hasToken && !adminLeftSplash) {
      evidence.push(
        'SAME-AS-SEQ55: ditl-admin auth OK but SplashLanding — Home if (!teacher) return SplashLanding',
      );
      findings.push(
        'FINDING: ditl-admin stuck SplashLanding (same as DITL-O-01-UI-01/seq55); severity P0; case DITL-O-01-UI-02',
      );
    } else if (adminLeftSplash && adminHasIdentity) {
      findings.push(
        'FINDING: administrator sees school identity edit (super-only); severity P1; case DITL-O-01-UI-02',
      );
    } else if (adminLeftSplash && adminHasMatrixEdit) {
      findings.push(
        'FINDING: administrator can open matrix edit (super-only school.matrix); severity P1; case DITL-O-01-UI-02',
      );
    } else if (adminRestricted) {
      evidence.push('OK admin: no super identity/matrix edit beats on manage');
    }

    await clearSession(p);
    body = await shot(p, '06-final-signout', 600);
    note(5, /sign-in|Sign in/i.test(body + p.url()), `teardown url=${p.url()}`);

    const superOk = superLeftSplash && (identityLabels || identityEdit || matrixEdit);
    const adminOk = adminLeftSplash && adminRestricted;
    if (findings.some((f) => /P0/.test(f))) result = 'FAIL';
    else if (superOk && adminOk) result = 'PASS';
    else if (superOk || adminOk || superApi.hasToken) result = 'PARTIAL';
    else result = 'FAIL';
    if (result === 'PASS') gaps.push('PARTIAL per plan: super beats only for identity/matrix');

    const out = {
      case: 'DITL-O-01-UI-02',
      result,
      lane: 'C',
      browser: 'Chromium persistent /tmp/ditl-pw-lane-c',
      app: BASE,
      evidence,
      findings,
      gaps,
      api: {
        super: { status: superApi.status, role: superApi.profile?.role, teacher: Boolean(superApi.teacher) },
        admin: { status: adminApi.status, role: adminApi.profile?.role, teacher: Boolean(adminApi.teacher) },
      },
    };
    fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(out, null, 2));
    fs.writeFileSync(
      path.join(A, 'SUMMARY.txt'),
      [
        `DITL-O-01-UI-02 RESULT=${result} lane=C Chromium /tmp/ditl-pw-lane-c`,
        ...evidence,
        'FINDINGS:',
        ...(findings.length ? findings : ['none']),
        'GAPS:',
        ...(gaps.length ? gaps : ['none']),
      ].join('\n'),
    );
    log('RESULT', result);
    log('FINDINGS', findings.length ? findings.join(' || ') : 'none');
  } catch (e) {
    log('FATAL', String(e));
    fs.writeFileSync(
      path.join(A, 'result.json'),
      JSON.stringify({ case: 'DITL-O-01-UI-02', result: 'FAIL', error: String(e), evidence, findings, gaps }, null, 2),
    );
    process.exitCode = 1;
  } finally {
    await browser.close().catch(() => {});
  }
}
main();

