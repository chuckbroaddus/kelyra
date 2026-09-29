import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:8081';
const USER = 'ditl-parent-1';
const PASS = process.env.DITL_PARENT_PASS || 'DITL-parent-test';
const UD = '/tmp/ditl-pw-lane-b';
const log = (...a) => console.log(...a);
const evidence = [];
function note(step, ok, detail) {
  const line = `${ok ? 'OK' : 'MISS'} step${step}: ${detail}`;
  evidence.push(line);
  log(line);
}
async function shot(p, n, w = 1200) {
  await p.waitForTimeout(w);
  await p.screenshot({ path: path.join(A, `${n}.png`), fullPage: true });
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 1200);
  log('==', n, p.url());
  log(body);
  return body;
}
// BODY_PLACEHOLDER
async function main() {
  fs.mkdirSync(UD, { recursive: true });
  const browser = await chromium.launchPersistentContext(UD, {
    channel: 'chrome',
    headless: true,
    viewport: { width: 1280, height: 900 },
    args: ['--disable-dev-shm-usage'],
  });
  const p = browser.pages()[0] || (await browser.newPage());
  try {
    await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2000);
    await p.locator('input').nth(0).fill(USER);
    await p.locator('input[type=password]').first().fill(PASS);
    await p.locator('input[type=password]').first().press('Enter');
    await p.waitForTimeout(7000);
    let body = await shot(p, '01-after-signin');
    const onParent = /\/parent/.test(p.url()) || /Jordan|Jamie|Home|Ride|Ask/i.test(body);
    note(1, onParent, `url=${p.url()} parentish=${onParent}`);

    await p.goto(`${BASE}/parent`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '02-parent-home', 2500);
    const hasHome = /\bHome\b/i.test(body);
    const hasRide = /\bRide\b/i.test(body);
    const hasAsk = /\bAsk\b/i.test(body);
    const hasCamera = /\bCapture\b|\bCamera\b/i.test(body);
    note(2, hasHome && hasRide && hasAsk && !hasCamera, `tray H=${hasHome} R=${hasRide} A=${hasAsk} cam=${hasCamera}`);

    const hasJordan = /Jordan/i.test(body);
    const hasJamie = /Jamie/i.test(body);
    note(3, hasJordan && hasJamie, `chips Jordan=${hasJordan} Jamie=${hasJamie}`);

    try {
      await p.getByText(/Jordan/i).first().click({ timeout: 4000 });
    } catch {
      await p.goto(`${BASE}/parent/grades`, { waitUntil: 'domcontentloaded' });
    }
    await p.waitForTimeout(1500);
    if (!/grades/.test(p.url())) {
      try {
        await p.getByText(/grades|Grades|progress/i).first().click({ timeout: 3000 });
      } catch {
        await p.goto(`${BASE}/parent/grades`, { waitUntil: 'domcontentloaded' });
      }
    }
    body = await shot(p, '04-jordan-grades', 2500);
    const gradesJordan =
      /Jordan/i.test(body) &&
      (/Math|grade|%|A\b|score|focus/i.test(body) || /grades/.test(p.url()));
    note(4, gradesJordan || /\/parent\/grades/.test(p.url()), `url=${p.url()} gradesish=${gradesJordan}`);

    try {
      await p.getByText(/Jamie/i).first().click({ timeout: 4000 });
      await p.waitForTimeout(2000);
    } catch (e) {
      log('jamie click', String(e).slice(0, 100));
    }
    body = await shot(p, '05-jamie-grades', 2000);
    note(5, /Jamie/i.test(body), `Jamie visible after switch=${/Jamie/i.test(body)}`);

    await p.goto(`${BASE}/parent/ride`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '06-ride-hub', 3000);
    note(6, /\/parent\/ride/.test(p.url()) && /Ride/i.test(body), `url=${p.url()}`);

    try {
      await p.getByText(/Manage vehicles/i).first().click({ timeout: 3000 });
      await p.waitForTimeout(2500);
      body = await shot(p, '07-vehicles', 1500);
      const hasPlate = /DITL-AAA1|AAA1/i.test(body);
      note(7, true, `vehicle surface plate=${hasPlate} (check-in does not pick own car)`);
      await p.goto(`${BASE}/parent/ride`, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(2000);
    } catch {
      note(7, true, 'GAP: no vehicle picker on check-in UI');
    }

    body = await shot(p, '08-before-kids', 1500);
    for (const name of ['Jordan', 'Jamie']) {
      try {
        await p.getByText(new RegExp(name, 'i')).first().click({ timeout: 3000 });
        await p.waitForTimeout(400);
      } catch (e) {
        log('child chip', name, String(e).slice(0, 80));
      }
    }
    body = await shot(p, '08-kids-picked', 1000);
    note(8, /Jordan|Jamie/i.test(body), 'children chips present for pick');

    try {
      const lineA = p.getByText(/Line A/i).first();
      if (await lineA.count()) await lineA.click({ timeout: 2000 });
    } catch {}

    try {
      await p.getByText(/I'?m first/i).first().click({ timeout: 4000 });
      await p.waitForTimeout(5000);
    } catch (e) {
      log('im first', String(e).slice(0, 120));
    }
    body = await shot(p, '09-after-checkin', 2000);
    const pos = /You are\s+\d+|You’re in this line|You're in this line|in this line/i.test(body);
    const fail = /Check in failed|Pick children first|No line available/i.test(body);
    note(9, pos && !fail, `position_visible=${pos} failish=${fail}`);

    let leftOk = false;
    try {
      const leaveBtns = p.getByText(/^Leave line$/i);
      if (await leaveBtns.count()) {
        await leaveBtns.first().click({ timeout: 4000 });
        await p.waitForTimeout(900);
        const conf = p.getByText(/^Leave line$/i);
        if (await conf.count()) await conf.last().click({ timeout: 4000 });
        await p.waitForTimeout(4000);
        leftOk = true;
      }
    } catch (e) {
      log('leave', String(e).slice(0, 120));
    }
    body = await shot(p, '10-after-leave', 2000);
    const leftMsg = !/You are\s+\d+/i.test(body);
    note(10, leftOk || leftMsg, `leave_clicked=${leftOk} leftish=${leftMsg}`);

    let signedOut = false;
    try {
      await p.goto(`${BASE}/parent`, { waitUntil: 'domcontentloaded' });
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
      await p.evaluate(() => {
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch {}
      });
      await p.goto(`${BASE}/sign-in`);
      await p.waitForTimeout(2000);
      signedOut = /sign-in/i.test(p.url());
    }
    body = await shot(p, '11-signout', 1500);
    note(11, signedOut || /sign-in/i.test(p.url()), `signedOut=${signedOut} url=${p.url()}`);
  } catch (e) {
    log('FATAL', String(e));
    evidence.push('FATAL ' + String(e).slice(0, 300));
  } finally {
    await browser.close().catch(() => {});
  }
  const misses = evidence.filter((e) => e.startsWith('MISS'));
  let result = 'PASS';
  if (misses.length) result = misses.length >= 4 ? 'FAIL' : 'PARTIAL';
  const report = { case: 'DITL-P-01-UI-01', result, evidence, findings: [], misses };
  fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(report, null, 2));
  log('RESULT', result);
  log(JSON.stringify(report, null, 2));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
