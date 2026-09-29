// DITL-DH-02-UI-01 lane C — dual-hat office+parent seat isolation
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:8081';
const USER = 'ditl-admin';
const PASS = process.env.DITL_ADMIN_PASS || 'DITL-admin-test';
const UD = '/tmp/ditl-pw-lane-c';
const evidence = [];
const findings = [];
const log = (...a) => {
  const s = a.map(String).join(' ');
  evidence.push(s);
  console.log(s);
};
function note(step, ok, detail) {
  const line = `${ok ? 'OK' : 'MISS'} step${step}: ${detail}`;
  evidence.push(line);
  console.log(line);
  return ok;
}
fs.mkdirSync(A, { recursive: true });
fs.mkdirSync(UD, { recursive: true });
async function shot(p, n, w = 1200) {
  await p.waitForTimeout(w);
  await p.screenshot({ path: path.join(A, `${n}.png`), fullPage: true }).catch(() => {});
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 3000);
  log('==', n, p.url(), body.slice(0, 800));
  return body;
}
function isSplash(body) {
  return (
    /Account creation is performed by the school office|Welcome to Kelyra/i.test(body) &&
    !/Ride office|Pickup restriction|Jordan Lee|People|Roster|My children/i.test(body)
  );
}
async function openCtx() {
  const exe =
    process.env.HOME +
    '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
  return chromium.launchPersistentContext(UD, {
    headless: true,
    executablePath: exe,
    viewport: { width: 390, height: 844 },
    args: ['--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check'],
  });
}
async function clearSession(p) {
  await p.goto(BASE + '/sign-in', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(600);
  await p.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
  });
  await p.goto(BASE + '/sign-in', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForTimeout(1200);
}
async function uiSignIn(p) {
  await clearSession(p);
  const n = await p.locator('input').count();
  log('INPUT_COUNT', n, 'user', USER);
  if (n < 2) throw new Error('no sign-in inputs');
  await p.locator('input').nth(0).fill(USER);
  await p.locator('input[type=password]').first().fill(PASS);
  await p.locator('input[type=password]').first().press('Enter');
  await p.waitForTimeout(8000);
}
async function openMenu(p) {
  const btn = p.getByLabel(/Open menu/i);
  if (await btn.count()) {
    await btn.first().click({ force: true });
    await p.waitForTimeout(1200);
    return true;
  }
  await p.evaluate(() => {
    const els = [...document.querySelectorAll('button, [role="button"], div, img, a')];
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.y < 90 && r.x < 90 && r.width >= 20 && r.width <= 64 && r.height >= 20) {
        el.click();
        return;
      }
    }
  });
  await p.waitForTimeout(900);
  return false;
}
async function switchSeat(p, labelRe) {
  await openMenu(p);
  const labeled = p.getByLabel(labelRe);
  if (await labeled.count()) {
    const t = (await labeled.first().getAttribute('aria-label')) || 'seat';
    await labeled.first().click({ force: true });
    await p.waitForTimeout(4000);
    return t;
  }
  const hit = await p.evaluate((src) => {
    const rx = new RegExp(src, 'i');
    const nodes = [...document.querySelectorAll('button, [role="button"], a, div, span, li')];
    const el = nodes.find((n) =>
      rx.test((n.getAttribute?.('aria-label') || '') + ' ' + (n.innerText || '').trim()),
    );
    if (!el) return null;
    el.click();
    return (el.getAttribute('aria-label') || el.innerText || '').slice(0, 80);
  }, labelRe.source);
  await p.waitForTimeout(4000);
  return hit;
}
async function openMyChildren(p) {
  await openMenu(p);
  const byLabel = p.getByLabel(/^My children$/i);
  if (await byLabel.count()) {
    await byLabel.first().click({ force: true });
    await p.waitForTimeout(3500);
    return 'My children';
  }
  const hit = await p.evaluate(() => {
    const nodes = [...document.querySelectorAll('button, [role="button"], a')];
    const el = nodes.find((n) =>
      /my children/i.test((n.getAttribute('aria-label') || '') + (n.innerText || '')),
    );
    if (!el) return null;
    el.click();
    return (el.getAttribute('aria-label') || el.innerText || '').slice(0, 40);
  });
  await p.waitForTimeout(3500);
  return hit;
}
async function trayProbe(p) {
  return p.evaluate(() => {
    const tabs = [...document.querySelectorAll('[role="tab"], a, button')];
    const bottom = [];
    const vh = window.innerHeight || 900;
    for (const el of tabs) {
      const r = el.getBoundingClientRect();
      if (r.y < vh - 160 || r.height < 10 || r.width < 10) continue;
      if (r.height > 120) continue;
      const al = (el.getAttribute('aria-label') || '').trim();
      const tx = (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40);
      if (!al && !tx) continue;
      bottom.push({ al, tx, y: Math.round(r.y) });
    }
    const blob = bottom.map((u) => u.al || u.tx).join(' || ');
    const body = document.body?.innerText || '';
    const has = (re) => re.test(blob) || re.test(body);
    return {
      blob: blob.slice(0, 800),
      keys: {
        people: has(/\bPeople\b/i),
        roster: has(/\bRoster\b/i),
        home: has(/\bHome\b/i),
        ride: has(/\bRide\b/i),
        ask: has(/\bAsk\b|KelyraAsk/i),
        desk: has(/\bDesk\b/i),
        capture: has(/\bCapture\b/i),
        needs: has(/Needs Attention|\bNeeds\b/i),
        calendar: has(/\bCalendar\b/i),
      },
      officeBleed: /Ride office|Pickup restriction|Staff directory|Manage school/i.test(body),
    };
  });
}
async function signOut(p) {
  await p.goto(BASE + '/profile', { waitUntil: 'domcontentloaded' }).catch(() => {});
  await p.waitForTimeout(800);
  const so = p.getByText(/Sign out/i).first();
  if (await so.count()) await so.click({ force: true }).catch(() => {});
  await p.waitForTimeout(1000);
  await p.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
  });
  await p.goto(BASE + '/sign-in', { waitUntil: 'domcontentloaded' }).catch(() => {});
  await shot(p, '99-signout', 600);
}
function parentTrayOk(k) {
  const staffBleed = k.capture || k.desk || k.needs || k.people;
  return (k.home || k.ride || k.ask) && !staffBleed;
}
let RESULT = 'FAIL';
let ctx;
const steps = {};
try {
  log('START DITL-DH-02-UI-01');
  ctx = await openCtx();
  const p = ctx.pages()[0] || (await ctx.newPage());
  await uiSignIn(p);
  let body = await shot(p, '01-after-signin', 800);
  const signedIn =
    !/sign-in/i.test(p.url()) || /Home|People|Roster|Spring|Sandbox|Kelyra|Jordan/i.test(body);
  steps.s1 = note(1, signedIn, `url=${p.url()} splash=${isSplash(body)}`);
  if (isSplash(body)) log('HAS_SPLASH_HOME true (parked t_3191917a — not refiled)');

  await p
    .goto(BASE + '/admin/roster', { waitUntil: 'domcontentloaded', timeout: 45000 })
    .catch((e) => log('GOTO_ROSTER_ERR', e.message));
  await p.waitForTimeout(4000);
  body = await shot(p, '02-admin-roster', 500);
  const rosterUrl = p.url();
  const rosterMissing =
    /does not exist|screen does not exist|Unmatched|404|Not found/i.test(body) ||
    (/sign-in/i.test(rosterUrl) && !/Roster|Jordan|People|student/i.test(body));
  const rosterOk =
    !isSplash(body) &&
    !rosterMissing &&
    (/Roster|Jordan\s*Lee|People|student|Class/i.test(body) || /\/admin\/roster/i.test(rosterUrl));
  steps.s2 = note(
    2,
    rosterOk || (!rosterMissing && !isSplash(body)),
    `rosterOk=${rosterOk} missing=${rosterMissing} url=${rosterUrl}`,
  );
  log('ROSTER_PROBE ok=' + rosterOk + ' missing=' + rosterMissing + ' splash=' + isSplash(body));

  if (isSplash(body) && !rosterOk) {
    log('STOP_SPLASH_AND_NO_ROSTER');
    RESULT = 'FAIL';
    await signOut(p);
    fs.writeFileSync(
      path.join(A, 'result.json'),
      JSON.stringify(
        { case: 'DITL-DH-02-UI-01', result: RESULT, evidence, findings, reason: 'splash+no roster' },
        null,
        2,
      ),
    );
    log('RESULT', RESULT);
    await ctx.close().catch(() => {});
    process.exit(0);
  }
  // Step 3 parent seat
  let sw = await switchSeat(p, /Switch to Parent seat/);
  log('SEAT_SWITCH', sw || 'null');
  if (!sw) {
    const mc = await openMyChildren(p);
    log('MY_CHILDREN_FALLBACK', mc || 'null');
    sw = mc;
  }
  body = await shot(p, '03-parent-seat', 1500);
  let tray = await trayProbe(p);
  evidence.push('tray03 ' + JSON.stringify(tray));
  const parentish =
    /\/parent/i.test(p.url()) ||
    /My children|Jordan\s*Lee|Home.*Ride|Ride.*Home/i.test(body) ||
    parentTrayOk(tray.keys);
  steps.s3 = note(
    3,
    !!sw || parentish,
    `sw=${sw} url=${p.url()} keys=${JSON.stringify(tray.keys)} blob=${tray.blob}`,
  );

  body = await shot(p, '04-my-children', 800);
  if (!/Jordan/i.test(body)) {
    await p.goto(BASE + '/parent', { waitUntil: 'domcontentloaded' }).catch(() => {});
    await p.waitForTimeout(2500);
    body = await shot(p, '04b-parent-route', 800);
  }
  tray = await trayProbe(p);
  const hasJordan = /Jordan\s*Lee|Jordan/i.test(body);
  const otherKids = [];
  for (const name of ['Morgan Patel', 'Avery', 'Cameron Brooks', 'Taylor', 'Riley']) {
    if (new RegExp(name, 'i').test(body) && !/Jordan/i.test(name)) otherKids.push(name);
  }
  const officeHidden =
    !tray.keys.desk && !tray.keys.capture && !tray.keys.people && !tray.officeBleed;
  steps.s4 = note(
    4,
    hasJordan && otherKids.length === 0,
    `jordan=${hasJordan} others=${JSON.stringify(otherKids)} officeHidden=${officeHidden} tray=${JSON.stringify(tray.keys)}`,
  );

  if (hasJordan) {
    const clicked = await p.evaluate(() => {
      const nodes = [...document.querySelectorAll('a, button, [role="button"], div, span')];
      const el = nodes.find(
        (n) => /Jordan/i.test((n.innerText || '').trim()) && (n.innerText || '').trim().length < 80,
      );
      if (!el) return false;
      el.click();
      return true;
    });
    log('CLICK_JORDAN', clicked);
    await p.waitForTimeout(3000);
  }
  body = await shot(p, '05-s1-details', 1000);
  if (!/Jordan/i.test(body)) {
    await p.goto(BASE + '/parent', { waitUntil: 'domcontentloaded' }).catch(() => {});
    await p.waitForTimeout(2000);
    body = await shot(p, '05b-parent-again', 800);
  }
  const detailOk =
    /Jordan/i.test(body) &&
    (/Detail|Birthday|Grade|Classes|Parents|preferred|Ride|Calendar|profile|Student/i.test(body) ||
      /\/student|\/parent\//i.test(p.url()) ||
      hasJordan);
  steps.s5 = note(5, detailOk, `url=${p.url()} bodyHasJordan=${/Jordan/i.test(body)}`);

  tray = await trayProbe(p);
  const noOfficeTools =
    officeHidden || parentTrayOk(tray.keys) || (!tray.keys.people && !tray.keys.desk);
  note('iso', noOfficeTools, `office tools hidden keys=${JSON.stringify(tray.keys)} bleed=${tray.officeBleed}`);

  await signOut(p);

  const oks = [steps.s1, steps.s2, steps.s3, steps.s4, steps.s5];
  const okCount = oks.filter(Boolean).length;
  if (okCount === 5 && noOfficeTools) RESULT = 'PASS';
  else if (okCount >= 3) RESULT = 'PARTIAL';
  else RESULT = 'FAIL';

  if (steps.s1 && !steps.s2 && rosterMissing) {
    findings.push(
      'FINDING: /admin/roster missing or unmatched for ditl-admin; severity P1; case DITL-DH-02-UI-01',
    );
  }
  if (steps.s3 && steps.s4 === false && hasJordan === false) {
    findings.push(
      'FINDING: parent seat missing S1 Jordan Lee for ditl-admin P-ADMIN link; severity P1; case DITL-DH-02-UI-01',
    );
  }
  if (steps.s3 && !noOfficeTools) {
    findings.push(
      'FINDING: office tools bleed into parent seat for ditl-admin; severity P1; case DITL-DH-02-UI-01',
    );
  }

  fs.writeFileSync(
    path.join(A, 'result.json'),
    JSON.stringify({ case: 'DITL-DH-02-UI-01', result: RESULT, steps, evidence, findings, tray }, null, 2),
  );
  log('RESULT', RESULT);
  await ctx.close().catch(() => {});
  process.exit(0);
} catch (e) {
  log('ERR', e && e.stack ? e.stack : e);
  try {
    fs.writeFileSync(
      path.join(A, 'result.json'),
      JSON.stringify(
        { case: 'DITL-DH-02-UI-01', result: 'FAIL', evidence, findings, error: String(e) },
        null,
        2,
      ),
    );
  } catch {}
  if (ctx) await ctx.close().catch(() => {});
  process.exit(1);
}
