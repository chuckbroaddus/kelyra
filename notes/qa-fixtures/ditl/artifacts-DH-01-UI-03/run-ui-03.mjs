// DITL-DH-01-UI-03 skeleton
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:8081';
const USER = 'ditl-teacher-a';
const PASS = process.env.DITL_TEACHER_PASS || 'DITL-teacher-test';
const UD = '/tmp/ditl-pw-lane-a';
const log = (...a) => console.log(...a);
const evidence = [];
const findings = [];
function note(step, ok, detail) {
  const line = `${ok ? 'OK' : 'MISS'} step${step}: ${detail}`;
  evidence.push(line);
  log(line);
}
async function shot(p, n, w = 1200) {
  await p.waitForTimeout(w);
  await p.screenshot({ path: path.join(A, `${n}.png`), fullPage: true });
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 2500);
  log('==', n, p.url(), body.slice(0, 700));
  evidence.push(`${n}: ${p.url()} :: ${body.slice(0, 450)}`);
  return body;
}
async function openCtx() {
  fs.mkdirSync(UD, { recursive: true });
  const exe =
    process.env.HOME +
    '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
  return chromium.launchPersistentContext(UD, {
    headless: true,
    executablePath: exe,
    viewport: { width: 390, height: 844 },
    args: ['--disable-dev-shm-usage'],
  });
}
async function signIn(p) {
  await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(500);
  await p.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
  });
  await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1000);
  await p.locator('input').nth(0).fill(USER);
  await p.locator('input[type=password]').first().fill(PASS);
  await p.locator('input[type=password]').first().press('Enter');
  await p.waitForTimeout(6000);
}
async function openAltitude(p) {
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
}
async function switchSeat(p, re) {
  await openAltitude(p);
  const hit = await p.evaluate((src) => {
    const rx = new RegExp(src, 'i');
    const nodes = [...document.querySelectorAll('button, [role="button"], a, div, span, li')];
    const el = nodes.find((n) =>
      rx.test((n.getAttribute?.('aria-label') || '') + ' ' + (n.innerText || '').trim()),
    );
    if (el) {
      el.click();
      return (el.getAttribute('aria-label') || el.innerText || '').slice(0, 80);
    }
    return null;
  }, re.source);
  await p.waitForTimeout(3500);
  return hit;
}
function trayFlags(body) {
  return {
    home: /\bHome\b/i.test(body),
    ride: /\bRide\b/i.test(body),
    ask: /\bAsk\b/i.test(body),
    desk: /\bDesk\b/i.test(body),
    capture: /\bCapture\b/i.test(body),
    needs: /\bNeeds\b/i.test(body),
    approve: /Approve this capture|Accept recommendation|Pack B|Confirm extract/i.test(body),
  };
}
async function main() {
  const ctx = await openCtx();
  const p = ctx.pages()[0] || (await ctx.newPage());
  let result = 'FAIL';
  try {
    await signIn(p);
    let body = await shot(p, '01-after-signin', 800);
    note(1, !/sign-in/i.test(p.url()) || /Desk|Capture|Home|Avery/i.test(body), `url=${p.url()}`);

    await p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    body = await shot(p, '02-teach-home', 1500);
    let tf = trayFlags(body);
    evidence.push('teach_tray ' + JSON.stringify(tf));
    note(2, tf.desk || tf.capture || /Class|Inbox|Math/i.test(body), `staff tray ${JSON.stringify(tf)}`);

    await p.goto(`${BASE}/parent/ride`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '03-ride-before-parent-seat', 2500);
    evidence.push(
      'ride_before ' +
        JSON.stringify({
          url: p.url(),
          rideUi: /Line |I'm first|I.m first|Leave line|Manage vehicles/i.test(body),
          tray: trayFlags(body),
        }),
    );
    note(3, true, `direct ride before switch url=${p.url()}`);

    const parentHit = await switchSeat(p, /switch to parent seat|parent seat/);
    await p.goto(`${BASE}/parent`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '04-parent-home', 2500);
    const pf = trayFlags(body);
    evidence.push(`parentSwitch=${parentHit} parent_tray ${JSON.stringify(pf)}`);
    const morgan = /Morgan\s*Patel/i.test(body);
    const jordanBleed = /Jordan\s*Lee/i.test(body);
    note(4, pf.home && pf.ride && !pf.capture, `H=${pf.home} R=${pf.ride} A=${pf.ask} cap=${pf.capture}`);
    note(5, !pf.capture && !pf.approve && !pf.desk, `noTeacherTools approve=${pf.approve} desk=${pf.desk}`);
    note(6, morgan && !jordanBleed, `morgan=${morgan} jordanBleed=${jordanBleed}`);
    if (pf.capture || pf.approve) {
      findings.push(
        'FINDING: Parent seat shows Capture/Approve teacher tools; severity P0; case DITL-DH-01-UI-03',
      );
    }

    await p.goto(`${BASE}/parent/ride`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '05-parent-ride', 3000);
    const rideOk = /\/parent\/ride/.test(p.url()) && /Ride|Line |I'm first|I.m first|Manage vehicles/i.test(body);
    note(7, rideOk, `url=${p.url()} rideOk=${rideOk} morgan=${/Morgan/i.test(body)}`);

    try {
      if (/Morgan/i.test(body)) await p.getByText(/Morgan/i).first().click({ timeout: 2500 }).catch(() => {});
      const lineA = p.getByText(/Line A|ditl-Line/i).first();
      if (await lineA.count()) await lineA.click({ timeout: 2000 }).catch(() => {});
      const imFirst = p.getByText(/I'?m first/i).first();
      if (await imFirst.count()) {
        await imFirst.click({ timeout: 3000 }).catch(() => {});
        await p.waitForTimeout(4000);
      }
    } catch (e) {
      log('checkin', String(e).slice(0, 100));
    }
    body = await shot(p, '06-after-checkin-try', 1500);
    const inLine = /You are\s+\d+|in this line/i.test(body);
    evidence.push(`inLine=${inLine}`);

    let left = false;
    try {
      const leaveBtns = p.getByText(/^Leave line$/i);
      if (await leaveBtns.count()) {
        await leaveBtns.first().click({ timeout: 3000 });
        await p.waitForTimeout(800);
        const conf = p.getByText(/^Leave line$/i);
        if (await conf.count()) await conf.last().click({ timeout: 3000 }).catch(() => {});
        await p.waitForTimeout(3000);
        left = true;
      }
    } catch (e) {
      log('leave', String(e).slice(0, 80));
    }
    body = await shot(p, '07-after-leave', 1200);
    note(8, left || !inLine, `leave=${left}`);

    const teachHit = await switchSeat(p, /switch to teach|teacher seat|teach seat/);
    await p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '08-back-teach', 2500);
    const back = trayFlags(body);
    evidence.push(`teachSwitch=${teachHit} back ${JSON.stringify(back)}`);
    note(9, back.desk || back.capture || !back.home, `backTeach ${JSON.stringify(back)}`);

    await p.goto(`${BASE}/parent/ride`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '09-ride-under-teach-chrome', 2000);
    evidence.push('ride_under_teach url=' + p.url() + ' tray=' + JSON.stringify(trayFlags(body)));
    note(10, true, `ride under teach chrome url=${p.url()}`);

    await p.goto(`${BASE}/profile`).catch(() => {});
    await p.waitForTimeout(800);
    const so = p.getByText(/Sign out/i).first();
    if (await so.count()) await so.click({ force: true }).catch(() => {});
    await p.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
    });
    await p.goto(`${BASE}/sign-in`);
    body = await shot(p, '99-signout', 800);
    note(11, /sign-in/i.test(p.url()), `url=${p.url()}`);

    const misses = evidence.filter((e) => e.startsWith('MISS'));
    if (findings.length) result = 'FAIL';
    else if (misses.length >= 3) result = 'FAIL';
    else if (misses.length || !rideOk) result = 'PARTIAL';
    else result = 'PASS';

    const out = { case: 'DITL-DH-01-UI-03', result, evidence, findings, misses };
    fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(out, null, 2));
    log('RESULT', result, findings);
  } catch (e) {
    log('ERR', e);
    fs.writeFileSync(
      path.join(A, 'result.json'),
      JSON.stringify({ case: 'DITL-DH-01-UI-03', result: 'FAIL', evidence, findings, error: String(e) }, null, 2),
    );
  } finally {
    await ctx.close().catch(() => {});
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
