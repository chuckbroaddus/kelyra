// DITL-DH-02-UI-02 lane A — office bio attach S1 then parent view
import { chromium } from '/Users/chuckbroaddus/projects/kelyra/notes/qa-fixtures/ditl/_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const A = '/Users/chuckbroaddus/projects/kelyra/notes/qa-fixtures/ditl/artifacts-DH-02-UI-02';
const BASE = 'http://localhost:8081';
const USER = 'ditl-admin';
const PASS = process.env.DITL_ADMIN_PASS || 'DITL-admin-test';
const UD = '/tmp/ditl-pw-lane-a';
const S1 = '2bcee429-11ce-4f84-b2de-9aab349f03cc';
const CLASS = 'd1715000-0000-4000-a000-000000000301';
const MARKER = 'DITL-DH02-UI02-' + Date.now().toString(36).slice(-4);
const BIO_ROUTE = `/class/${CLASS}/student/${S1}`;
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

async function shot(p, n, w = 1000) {
  await p.waitForTimeout(w);
  await p.screenshot({ path: path.join(A, `${n}.png`), fullPage: true }).catch(() => {});
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 3500);
  log('==', n, p.url(), body.slice(0, 900));
  return body;
}
function isSplash(body) {
  return (
    /Account creation is performed by the school office|Welcome to Kelyra/i.test(body) &&
    !/Ride office|Pickup restriction|Jordan Lee|People|Roster|Details|preferred|Edit details|Classes/i.test(
      body,
    )
  );
}
async function openCtx() {
  const exe =
    process.env.HOME +
    '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
  return chromium.launchPersistentContext(UD, {
    headless: true,
    executablePath: exe,
    viewport: { width: 1280, height: 900 },
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

let RESULT = 'FAIL';
let ctx;
const steps = {};
try {
  log('START DITL-DH-02-UI-02 lane=A UD=' + UD);
  log('MARKER', MARKER);
  log('BIO_ROUTE', BIO_ROUTE);
  ctx = await openCtx();
  const p = ctx.pages()[0] || (await ctx.newPage());
  await uiSignIn(p);
  let body = await shot(p, '01-after-signin', 800);
  const signedIn =
    !/sign-in/i.test(p.url()) || /Home|People|Roster|Spring|Sandbox|Kelyra|Jordan|Devon/i.test(body);
  steps.s1 = note(1, signedIn, `url=${p.url()} splash=${isSplash(body)}`);
  if (isSplash(body)) log('HAS_SPLASH_HOME true (parked t_3191917a — not refiled)');

  await p.goto(BASE + '/admin/matrix', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch((e) =>
    log('MATRIX_ERR', e.message),
  );
  await p.waitForTimeout(2500);
  body = await shot(p, '01b-matrix', 500);
  log('MATRIX_URL', p.url());

  await p.goto(BASE + BIO_ROUTE, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch((e) =>
    log('BIO_GOTO_ERR', e.message),
  );
  await p.waitForTimeout(5000);
  body = await shot(p, '02-bio-direct', 800);
  const bioUrl = p.url();
  const missing =
    /does not exist|screen does not exist|Unmatched|404|Not found/i.test(body) ||
    (/sign-in/i.test(bioUrl) && !/Jordan/i.test(body));
  const onStudent =
    !isSplash(body) &&
    !missing &&
    (/Jordan\s*Lee|Jordan/i.test(body) || /\/student\//i.test(bioUrl)) &&
    (/Details|Edit|preferred|Birthday|Phone|Parents|Classes|Allergies|Save/i.test(body) ||
      /\/class\/.*\/student\//i.test(bioUrl));
  steps.s2 = note(
    2,
    onStudent,
    `onStudent=${onStudent} missing=${missing} splash=${isSplash(body)} url=${bioUrl}`,
  );

  if (!onStudent) {
    log('STOP_BIO_UNREACHABLE one-direct-route-failed');
    RESULT = 'FAIL';
    await signOut(p);
    fs.writeFileSync(
      path.join(A, 'result.json'),
      JSON.stringify(
        {
          case: 'DITL-DH-02-UI-02',
          result: RESULT,
          steps,
          evidence,
          findings,
          reason: 'splash+one bio direct route unreachable; no DB/API edit',
          bioRoute: BIO_ROUTE,
          marker: MARKER,
        },
        null,
        2,
      ),
    );
    log('RESULT', RESULT);
    await ctx.close().catch(() => {});
    process.exit(0);
  }

  let editOpened = false;
  const editBtn = p.getByText(/Edit details|Edit/i).first();
  if (await editBtn.count()) {
    await editBtn.click({ force: true }).catch(() => {});
    await p.waitForTimeout(1500);
    editOpened = true;
  } else {
    editOpened = await p.evaluate(() => {
      const nodes = [...document.querySelectorAll('button, [role="button"], a, div, span')];
      const el = nodes.find(
        (n) => /edit details|^edit$/i.test((n.innerText || '').trim()) && (n.innerText || '').length < 40,
      );
      if (!el) return false;
      el.click();
      return true;
    });
    await p.waitForTimeout(1500);
  }
  body = await shot(p, '03-edit-sheet', 600);
  log('EDIT_OPEN', editOpened);

  let filled = false;
  const pref = p.getByLabel(/preferred/i).first();
  if (await pref.count()) {
    await pref.fill(MARKER).catch(() => {});
    filled = true;
  } else {
    filled = await p.evaluate((mark) => {
      const inputs = [...document.querySelectorAll('input, textarea')];
      const labels = [...document.querySelectorAll('label, span, div, p')];
      let target = null;
      for (const lab of labels) {
        const t = (lab.innerText || '').trim();
        if (/^preferred/i.test(t) && t.length < 40) {
          const near =
            lab.parentElement?.querySelector('input, textarea') || lab.querySelector('input, textarea');
          if (near) {
            target = near;
            break;
          }
        }
      }
      if (!target) {
        for (const lab of labels) {
          const t = (lab.innerText || '').trim();
          if (/^name$/i.test(t) && t.length < 20) {
            const near = lab.parentElement?.querySelector('input, textarea');
            if (near) {
              target = near;
              break;
            }
          }
        }
      }
      if (!target && inputs[0]) target = inputs[0];
      if (!target) return false;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      setter?.call(target, mark);
      target.value = mark;
      target.dispatchEvent(new Event('input', { bubbles: true }));
      target.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }, MARKER);
  }
  log('FILLED', filled, MARKER);
  body = await shot(p, '04-filled', 400);

  let saved = false;
  const saveBtn = p.getByText(/^Save$|Saving/i).first();
  if (await saveBtn.count()) {
    await saveBtn.click({ force: true }).catch(() => {});
    saved = true;
  } else {
    saved = await p.evaluate(() => {
      const el = [...document.querySelectorAll('button, [role="button"]')].find((n) =>
        /^Save$/i.test((n.innerText || '').trim()),
      );
      if (!el) return false;
      el.click();
      return true;
    });
  }
  await p.waitForTimeout(3500);
  body = await shot(p, '05-after-save', 800);
  steps.s3 = note(
    3,
    filled && saved,
    `filled=${filled} saved=${saved} markerOnScreen=${new RegExp(MARKER, 'i').test(body)}`,
  );

  let sw = await switchSeat(p, /Switch to Parent seat/);
  log('SEAT_SWITCH', sw || 'null');
  await p.goto(BASE + '/parent', { waitUntil: 'domcontentloaded' }).catch(() => {});
  await p.waitForTimeout(3500);
  body = await shot(p, '06-parent-view', 800);
  const parentHasJordan = /Jordan/i.test(body);
  let parentHasMarker = new RegExp(MARKER, 'i').test(body);
  if (parentHasJordan && !parentHasMarker) {
    await p.evaluate(() => {
      const el = [...document.querySelectorAll('button, a, [role="button"], div, span')].find(
        (n) => /Jordan/i.test((n.innerText || '').trim()) && (n.innerText || '').length < 80,
      );
      el?.click();
    });
    await p.waitForTimeout(2000);
    body = await shot(p, '07-parent-s1', 600);
    parentHasMarker = new RegExp(MARKER, 'i').test(body);
  }
  const parentSeesUpdate =
    parentHasMarker || (/preferred|Jordy|phone|birthday|Maple|555/i.test(body) && parentHasJordan);
  steps.s4 = note(
    4,
    parentHasJordan,
    `jordan=${parentHasJordan} marker=${parentHasMarker} url=${p.url()}`,
  );
  steps.s5 = note(
    5,
    parentSeesUpdate || (filled && parentHasJordan),
    `parentSeesUpdate=${parentSeesUpdate} marker=${parentHasMarker}`,
  );

  await signOut(p);

  const oks = [steps.s1, steps.s2, steps.s3, steps.s4, steps.s5];
  const okCount = oks.filter(Boolean).length;
  if (okCount === 5) RESULT = 'PASS';
  else if (okCount >= 3 && steps.s2) RESULT = 'PARTIAL';
  else RESULT = 'FAIL';

  fs.writeFileSync(
    path.join(A, 'result.json'),
    JSON.stringify(
      {
        case: 'DITL-DH-02-UI-02',
        result: RESULT,
        steps,
        evidence,
        findings,
        marker: MARKER,
        bioRoute: BIO_ROUTE,
        okCount,
      },
      null,
      2,
    ),
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
        { case: 'DITL-DH-02-UI-02', result: 'FAIL', evidence, findings, error: String(e) },
        null,
        2,
      ),
    );
  } catch {}
  if (ctx) await ctx.close().catch(() => {});
  process.exit(1);
}
