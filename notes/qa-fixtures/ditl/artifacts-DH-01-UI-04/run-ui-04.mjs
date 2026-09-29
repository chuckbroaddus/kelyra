// DITL-DH-01-UI-04 — dual-hat chrome altitude tray + My children deep-link
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
  evidence.push(`${n}: ${p.url()} :: ${body.slice(0, 500)}`);
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
  await p.waitForTimeout(400);
  await p.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
  });
  await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(900);
  await p.locator('input').nth(0).fill(USER);
  await p.locator('input[type=password]').first().fill(PASS);
  await p.locator('input[type=password]').first().press('Enter');
  await p.waitForTimeout(6500);
}
async function trayProbe(p) {
  return p.evaluate(() => {
    const tabs = [...document.querySelectorAll('[role="tab"], a, button')];
    const bottom = [];
    const vh = window.innerHeight || 844;
    for (const el of tabs) {
      const r = el.getBoundingClientRect();
      if (r.y < vh - 140 || r.height < 10 || r.width < 10) continue;
      if (r.height > 100) continue;
      const al = (el.getAttribute('aria-label') || '').trim();
      const tx = (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40);
      if (!al && !tx) continue;
      bottom.push({ al, tx, y: Math.round(r.y) });
    }
    const blob = bottom.map((u) => u.al || u.tx).join(' || ');
    const has = (re) => re.test(blob);
    return {
      blob: blob.slice(0, 800),
      keys: {
        desk: has(/\bDesk\b/i),
        capture: has(/\bCapture\b/i),
        needs: has(/Needs Attention|\bNeeds\b|Inbox/i),
        classTab: has(/\bClass\b/i),
        ask: has(/\bAsk\b|\bKelyra\b/i),
        home: has(/\bHome\b/i),
        ride: has(/\bRide\b/i),
        diary: has(/\bDiary\b/i),
        calendar: has(/\bCalendar\b/i),
      },
      approveChrome: /Approve this capture|Accept recommendation|Pack B/i.test(document.body?.innerText || ''),
    };
  });
}
async function openMenu(p) {
  const btn = p.getByLabel(/Open menu/i);
  if (await btn.count()) {
    await btn.first().click({ force: true });
    await p.waitForTimeout(1200);
    return true;
  }
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
    const nodes = [...document.querySelectorAll('button, [role="button"], a')];
    const el = nodes.find((n) => rx.test(n.getAttribute('aria-label') || ''));
    if (!el) return null;
    el.click();
    return (el.getAttribute('aria-label') || '').slice(0, 80);
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
    const el = nodes.find((n) => (n.getAttribute('aria-label') || '').trim() === 'My children');
    if (!el) return null;
    el.click();
    return 'My children';
  });
  await p.waitForTimeout(3500);
  return hit;
}
function teachTrayOk(k) {
  const staffish = k.desk || k.capture || k.needs || k.diary || k.calendar;
  const parentPair = k.home && k.ride;
  return staffish && !parentPair;
}
function parentTrayOk(k) {
  const parentish = k.home || k.ride || k.ask;
  const staffBleed = k.capture || k.desk || k.needs;
  // Parent tray is Home · Ride · Ask — must not show Desk/Capture/Needs
  return (k.home || k.ride) && !staffBleed;
}
async function main() {
  const ctx = await openCtx();
  const p = ctx.pages()[0] || (await ctx.newPage());
  let result = 'FAIL';
  try {
    await signIn(p);
    let body = await shot(p, '01-after-signin', 800);
    note(1, !/sign-in/i.test(p.url()) || /Desk|Capture|Home|Avery|Classes|Math/i.test(body), `url=${p.url()}`);

    await p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    body = await shot(p, '02-teach-home', 2000);
    let t0 = await trayProbe(p);
    evidence.push('tray02 ' + JSON.stringify(t0));
    note(2, teachTrayOk(t0.keys), `teach tray keys=${JSON.stringify(t0.keys)} blob=${t0.blob}`);

    // Toggle 1: Teach -> Parent
    const sw1 = await switchSeat(p, /Switch to Parent seat/);
    await p.waitForTimeout(1000);
    body = await shot(p, '03-parent-after-sw1', 2000);
    let t1 = await trayProbe(p);
    evidence.push(`sw1=${sw1} tray03 ${JSON.stringify(t1)} bodyHasMorgan=${/Morgan/i.test(body)}`);
    note(3, !!sw1 && parentTrayOk(t1.keys), `parent1 sw=${sw1} keys=${JSON.stringify(t1.keys)} blob=${t1.blob}`);

    // Toggle 2: Parent -> Teach
    const sw2 = await switchSeat(p, /Switch to Teach seat/);
    body = await shot(p, '04-teach-after-sw2', 2000);
    let t2 = await trayProbe(p);
    evidence.push(`sw2=${sw2} tray04 ${JSON.stringify(t2)}`);
    note(4, !!sw2 && teachTrayOk(t2.keys), `teach2 sw=${sw2} keys=${JSON.stringify(t2.keys)} blob=${t2.blob}`);

    // Toggle 3: Teach -> Parent again
    const sw3 = await switchSeat(p, /Switch to Parent seat/);
    body = await shot(p, '05-parent-after-sw3', 2000);
    let t3 = await trayProbe(p);
    evidence.push(`sw3=${sw3} tray05 ${JSON.stringify(t3)}`);
    note(5, !!sw3 && parentTrayOk(t3.keys), `parent2 sw=${sw3} keys=${JSON.stringify(t3.keys)} blob=${t3.blob}`);

    // Toggle 4: Parent -> Teach
    const sw4 = await switchSeat(p, /Switch to Teach seat/);
    body = await shot(p, '06-teach-after-sw4', 2000);
    let t4 = await trayProbe(p);
    evidence.push(`sw4=${sw4} tray06 ${JSON.stringify(t4)}`);
    note(6, !!sw4 && teachTrayOk(t4.keys), `teach3 sw=${sw4} keys=${JSON.stringify(t4.keys)} blob=${t4.blob}`);

    // My children deep-link under staff chrome
    const mc = await openMyChildren(p);
    body = await shot(p, '07-my-children-deeplink', 2500);
    let t5 = await trayProbe(p);
    evidence.push(`myChildren=${mc} url=${p.url()} tray07 ${JSON.stringify(t5)}`);
    const onParentRoute = /\/parent/i.test(p.url()) || /Morgan\s*Patel/i.test(body);
    const noApprove = !t5.approveChrome && !/Approve this capture/i.test(body);
    // Without flipping tray to parent: staff tray should remain (Desk/Needs) OR not become pure Home+Ride without staff
    const fullParentTray = t5.keys.home && t5.keys.ride && !t5.keys.desk && !t5.keys.needs && !t5.keys.capture;
    const staffTrayRemains = teachTrayOk(t5.keys);
    note(7, !!mc && onParentRoute, `myChildren hit=${mc} onParent=${onParentRoute} url=${p.url()}`);
    note(8, noApprove, `no Approve on deeplink approve=${t5.approveChrome}`);
    note(
      9,
      staffTrayRemains || !fullParentTray,
      `deeplink tray no full parent flip staffRemains=${staffTrayRemains} fullParent=${fullParentTray} keys=${JSON.stringify(t5.keys)} blob=${t5.blob}`,
    );

    const concat =
      (t1.keys.capture && t1.keys.ride) ||
      (t3.keys.capture && t3.keys.ride) ||
      (t1.keys.desk && t1.keys.ride) ||
      (t3.keys.desk && t3.keys.ride);
    note(10, !concat, `no concatenated trays concat=${concat}`);
    if (concat) {
      findings.push(
        'FINDING: Concatenated Teach+Parent tray after seat switch; severity P1; case DITL-DH-01-UI-04',
      );
    }
    if (t5.approveChrome) {
      findings.push(
        'FINDING: Approve chrome on My children deep-link under staff; severity P0; case DITL-DH-01-UI-04',
      );
    }
    if (fullParentTray && mc) {
      // My children flipped seat — product miss vs expected
      findings.push(
        'FINDING: My children deep-link flipped tray to full Parent seat (Home·Ride); severity P1; case DITL-DH-01-UI-04',
      );
    }

    // Teardown end on Teach
    if (fullParentTray || parentTrayOk(t5.keys)) {
      await switchSeat(p, /Switch to Teach seat/);
    }
    await p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    body = await shot(p, '08-end-teach', 1500);
    const endT = await trayProbe(p);
    note(11, teachTrayOk(endT.keys) || /Classes|Math|Desk|Needs/i.test(body), `end teach keys=${JSON.stringify(endT.keys)}`);

    await p.goto(`${BASE}/profile`).catch(() => {});
    await p.waitForTimeout(500);
    const so = p.getByText(/Sign out/i).first();
    if (await so.count()) await so.click({ force: true }).catch(() => {});
    await openMenu(p).catch(() => {});
    const so2 = p.getByLabel(/Sign out/i).first();
    if (await so2.count()) await so2.click({ force: true }).catch(() => {});
    await p.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
    });
    await p.goto(`${BASE}/sign-in`);
    await shot(p, '99-signout', 600);

    const misses = evidence.filter((e) => e.startsWith('MISS'));
    if (findings.length) result = 'FAIL';
    else if (misses.length >= 4) result = 'FAIL';
    else if (misses.length) result = 'PARTIAL';
    else result = 'PASS';

    const out = { case: 'DITL-DH-01-UI-04', result, evidence, findings, misses };
    fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(out, null, 2));
    log('RESULT', result, 'misses', misses.length, findings);
  } catch (e) {
    log('ERR', e);
    fs.writeFileSync(
      path.join(A, 'result.json'),
      JSON.stringify({ case: 'DITL-DH-01-UI-04', result: 'FAIL', evidence, findings, error: String(e) }, null, 2),
    );
  } finally {
    await ctx.close().catch(() => {});
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
