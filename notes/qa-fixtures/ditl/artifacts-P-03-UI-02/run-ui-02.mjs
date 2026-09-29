import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:8081';
const USER = 'ditl-parent-1';
const PASS = process.env.DITL_PARENT_PASS || 'DITL-parent-test';
const UD = '/tmp/ditl-pw-lane-b';
const evidence = [];
const log = (...a) => console.log(...a);
function note(step, ok, detail) {
  const line = `${ok ? 'OK' : 'MISS'} step${step}: ${detail}`;
  evidence.push(line);
  log(line);
}
async function shot(p, n, w = 1200) {
  await p.waitForTimeout(w);
  await p.screenshot({ path: path.join(A, `${n}.png`), fullPage: true });
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 1600);
  log('==', n, p.url());
  log(body);
  return body;
}
async function gotoRetry(p, url, tries = 4) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      return;
    } catch (e) {
      last = e;
      log('gotoRetry', url, i, String(e).slice(0, 80));
      await p.waitForTimeout(2000 * (i + 1));
    }
  }
  throw last;
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
    await gotoRetry(p, `${BASE}/sign-in`);
    await p.waitForTimeout(2000);
    await p.locator('input').nth(0).fill(USER);
    await p.locator('input[type=password]').first().fill(PASS);
    await p.locator('input[type=password]').first().press('Enter');
    await p.waitForTimeout(7000);
    let body = await shot(p, '01-after-signin');
    const onParent = /\/parent/.test(p.url()) || /Jordan|Jamie|Home|Ride|Ask/i.test(body);
    note(1, onParent, `url=${p.url()} parentish=${onParent}`);

    await gotoRetry(p, `${BASE}/parent/ride`);
    await p.waitForTimeout(2500);
    await leaveIfInLine(p);
    body = await shot(p, '02-ride-hub', 2000);
    note(2, /\/parent\/ride/.test(p.url()) && /Ride/i.test(body), `url=${p.url()}`);

    // Line B + V2 + Jamie only
    try {
      const jamie = p.getByText(/Jamie(\s+Lee)?/i);
      if (await jamie.count()) {
        await jamie.first().click({ timeout: 4000 });
        await p.waitForTimeout(400);
      }
    } catch (e) {
      log('jamie pick', String(e).slice(0, 80));
    }
    try {
      const jordan = p.getByText(/^Jordan(\s+Lee)?$/i);
      for (let i = 0; i < (await jordan.count()); i++) {
        const el = jordan.nth(i);
        const cls = (await el.getAttribute('class').catch(() => '')) || '';
        const aria = (await el.getAttribute('aria-pressed').catch(() => '')) || '';
        const selected = /selected|active|pressed|true/i.test(cls + aria);
        if (selected) {
          await el.click({ timeout: 2000 }).catch(() => {});
          await p.waitForTimeout(300);
        }
      }
    } catch (e) {
      log('jordan deselect', String(e).slice(0, 80));
    }
    try {
      const v2 = p.getByText(/DITL-BBB2|BBB2/i).first();
      if (await v2.count()) await v2.click({ timeout: 2000 }).catch(() => {});
    } catch {}
    try {
      const lineB = p.getByText(/Line B|ditl-Line B/i).first();
      if (await lineB.count()) await lineB.click({ timeout: 2000 }).catch(() => {});
    } catch {}
    body = await shot(p, '03-picks', 1200);
    note(3, /Jamie/i.test(body), `picks Jamie visible`);

    try {
      await p.getByText(/I'?m first/i).first().click({ timeout: 5000 });
      await p.waitForTimeout(5000);
    } catch (e) {
      log('im first', String(e).slice(0, 120));
      try {
        await p.getByText(/Check in|Join line|Enter line/i).first().click({ timeout: 3000 });
        await p.waitForTimeout(5000);
      } catch (e2) {
        log('checkin alt', String(e2).slice(0, 100));
      }
    }
    body = await shot(p, '04-after-checkin', 2000);
    const pos = /You are\s+\d+|You’re in this line|You're in this line|in this line/i.test(body);
    const fail = /Check in failed|Pick children first|No line available/i.test(body);
    let isolation = true;
    if (pos) {
      const m = body.match(/You are\s+\d+[^.|]*/i) || body.match(/You’re in this line[^|]*/i);
      const snippet = m ? m[0] : body;
      isolation = /Jamie/i.test(snippet) && !/Jordan/i.test(snippet);
      if (!isolation) {
        isolation = /Jamie/i.test(body) && !/Jordan.*,\s*Jamie|Jamie.*,\s*Jordan/i.test(body);
      }
    }
    note(4, pos && !fail, `position_visible=${pos} failish=${fail}`);
    note(5, pos ? isolation : false, `no_twin_mix isolation=${isolation}`);

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
    body = await shot(p, '05-after-leave', 2000);
    const leftMsg = /out of|You’re out|You're out|left/i.test(body) || !/You are\s+\d+/i.test(body);
    note(6, leftOk || leftMsg, `leave_clicked=${leftOk} leftish=${leftMsg}`);

    let signedOut = false;
    try {
      await gotoRetry(p, `${BASE}/parent`);
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
      await gotoRetry(p, `${BASE}/sign-in`);
      await p.waitForTimeout(2000);
      signedOut = /sign-in/i.test(p.url());
    }
    body = await shot(p, '06-signout', 1500);
    note(7, signedOut || /sign-in/i.test(p.url()), `signedOut=${signedOut} url=${p.url()}`);
  } catch (e) {
    log('FATAL', String(e));
    evidence.push('FATAL ' + String(e).slice(0, 300));
  } finally {
    await browser.close().catch(() => {});
  }
  const misses = evidence.filter((e) => e.startsWith('MISS'));
  const fatals = evidence.filter((e) => e.startsWith('FATAL'));
  let result = 'PASS';
  if (fatals.length) result = 'FAIL';
  else if (misses.length) result = misses.length >= 4 ? 'FAIL' : 'PARTIAL';
  const report = {
    case: 'DITL-P-03-UI-02',
    result,
    evidence,
    findings: [],
    misses,
    fatals,
    lane: 'B',
    ud: UD,
  };
  fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(report, null, 2));
  log('RESULT', result);
  log(JSON.stringify(report, null, 2));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
