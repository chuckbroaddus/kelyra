// DITL-P-03-ASK-01 lane B — parent Ask vehicle/line tools (expected GAP)
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
const findings = [];
const gaps = [];

function note(step, ok, detail) {
  const line = `${ok ? 'OK' : 'MISS'} step${step}: ${detail}`;
  evidence.push(line);
  log(line);
}

async function shot(p, n, w = 1500) {
  await p.waitForTimeout(w);
  await p.screenshot({ path: path.join(A, `${n}.png`), fullPage: true });
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 2200);
  log('==', n, p.url());
  log(body);
  return body;
}

async function openCtx() {
  fs.mkdirSync(UD, { recursive: true });
  const common = {
    headless: true,
    viewport: { width: 1280, height: 900 },
    args: ['--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check'],
  };
  const exe =
    process.env.HOME +
    '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
  if (fs.existsSync(exe)) {
    try {
      return await chromium.launchPersistentContext(UD, { ...common, executablePath: exe });
    } catch (e) {
      log('EXE_FAIL', String(e).slice(0, 120));
    }
  }
  return await chromium.launchPersistentContext(UD, { ...common, channel: 'chrome' });
}

async function tray(p, label) {
  const t = p.getByText(new RegExp(`^${label}$`, 'i')).first();
  await t.click({ timeout: 6000, force: true });
  await p.waitForTimeout(2000);
}

async function sendAsk(p, text) {
  await p.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('div,span,button,p,a'));
    const nc = nodes.find((n) => /^New chat$/i.test((n.textContent || '').trim()));
    if (nc) nc.click();
  });
  await p.waitForTimeout(2500);
  await p.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('div,span,button,p'));
    const jc = nodes.find((n) => /^Just chatting$/i.test((n.textContent || '').trim()));
    if (jc) jc.click();
  });
  await p.waitForTimeout(800);
  const box = p.getByPlaceholder(/Ask/i).first();
  await box.click({ force: true, timeout: 5000 }).catch(() => {});
  try {
    await box.fill('');
    await box.pressSequentially(text, { delay: 8 });
  } catch (e) {
    log('pressSeq fail', String(e).slice(0, 80));
    await p.keyboard.type(text, { delay: 8 });
  }
  await p.waitForTimeout(600);
  for (let i = 0; i < 10; i++) {
    const dis = await p
      .locator('[aria-label="Send"]')
      .first()
      .getAttribute('aria-disabled')
      .catch(() => 'true');
    if (dis !== 'true') break;
    await p.waitForTimeout(300);
  }
  await p
    .locator('[aria-label="Send"]')
    .first()
    .click({ force: true, timeout: 5000 })
    .catch(async () => {
      await p.evaluate(() => document.querySelector('[aria-label="Send"]')?.click());
    });
  await p.waitForTimeout(3000);
  const marker = text.slice(0, 36);
  for (let i = 0; i < 50; i++) {
    const t = await p.innerText('body').catch(() => '');
    const busy = /Asking AI|Opening Kelyra|Working…|Working\.\.\./i.test(t);
    if (!busy && t.includes(marker) && i > 2) {
      await p.waitForTimeout(8000);
      break;
    }
    await p.waitForTimeout(2000);
  }
}

async function bindChildAndOpenAsk(p, childFirst) {
  await tray(p, 'Home');
  await p.waitForTimeout(1500);
  await p.evaluate((name) => {
    const nodes = Array.from(document.querySelectorAll('div,span,button,p'));
    const exact = nodes.filter((n) => (n.textContent || '').trim() === name);
    const hit = exact[exact.length - 1] || exact[0];
    if (hit) {
      hit.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      hit.click();
    }
  }, childFirst);
  await p.waitForTimeout(1500);
  await tray(p, 'Ask');
  await p.waitForTimeout(2500);
  await p.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('div,span,button,p'));
    const jc = nodes.find((n) => /Just chatting/i.test((n.textContent || '').trim()));
    if (jc) jc.click();
  });
  await p.waitForTimeout(800);
}

function gapish(body) {
  return /no (such )?tool|unknown tool|not available|cannot|don't have|do not have|doesn't support|not support|unsupported|no way to|I can't|I cannot|unable to (list|check|call)|tool (is )?missing|not a (valid )?tool|vehicles? (UI|screen|page)|use (the )?Ride|\/parent\/(ride|vehicles)|physical|check[- ]?in (is )?(only )?(via|on) (the )?app|no Ask tool/i.test(
    body,
  );
}

function toolSuccessish(body) {
  return /DITL-AAA1|DITL-BBB2|check[- ]?in (succeeded|complete|ok)|position\s*\d+|you are \d+|ride_event|checked in/i.test(
    body,
  );
}

async function main() {
  log('START DITL-P-03-ASK-01');
  const browser = await openCtx();
  const p = browser.pages()[0] || (await browser.newPage());
  try {
    await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1500);
    await p.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
    });
    await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1500);
    await p.locator('input').nth(0).fill(USER);
    await p.locator('input[type=password]').first().fill(PASS);
    await p.locator('input[type=password]').first().press('Enter');
    await p.waitForTimeout(7000);
    let body = await shot(p, '01-after-signin');
    const onParent = /\/parent/.test(p.url()) || /Jordan|Jamie|Home|Ride|Ask/i.test(body);
    note(1, onParent, `url=${p.url()} parentish=${onParent}`);

    await bindChildAndOpenAsk(p, 'Jordan');
    body = await shot(p, '02-ask-open', 2000);
    const askOpen = /\/ask/.test(p.url()) || /Just chatting|Ask…|Ask\.\.\./i.test(body);
    note(2, askOpen && !/Pick a child on Home first/i.test(body), `ask_url=${p.url()} open=${askOpen}`);

    await sendAsk(
      p,
      'Call list_my_vehicles or list_vehicles for this parent. Return plate codes for DITL-AAA1 and DITL-BBB2 if a tool exists. Do not invent plates. If no vehicle tool exists, say so clearly.',
    );
    body = await shot(p, '03-ask-vehicles', 1000);
    const vehToolWorked = toolSuccessish(body) && /DITL-AAA1|DITL-BBB2/i.test(body) && !gapish(body);
    const vehGap = gapish(body) || (!/DITL-AAA1|DITL-BBB2/i.test(body) && !vehToolWorked);
    if (vehGap) {
      gaps.push('GAP: parent Ask has no vehicle list/CRUD tool (expected PARTIAL/GAP)');
      note(3, true, `vehicle_ask_gap=true snip=${body.slice(-600)}`);
    } else if (vehToolWorked) {
      note(3, true, `UNEXPECTED vehicle tool worked snip=${body.slice(-400)}`);
      findings.push('FINDING: parent Ask unexpectedly listed vehicles; severity P2; case DITL-P-03-ASK-01');
    } else {
      note(3, false, `vehicle_ask ambiguous snip=${body.slice(-600)}`);
    }

    await sendAsk(
      p,
      'Call check_in_to_line or ride_check_in: Line A, vehicle DITL-AAA1, child Jordan Lee only. If no line check-in Ask tool exists, say clearly that check-in is UI/PHYSICAL only. Do not invent a successful check-in.',
    );
    body = await shot(p, '04-ask-line-checkin', 1000);
    const lineToolWorked = toolSuccessish(body) && !gapish(body);
    if (lineToolWorked) {
      note(4, true, `UNEXPECTED line check-in via Ask snip=${body.slice(-400)}`);
      findings.push('FINDING: parent Ask unexpectedly checked into line; severity P1; case DITL-P-03-ASK-01');
    } else {
      gaps.push('GAP: parent Ask has no line check-in/leave tools (expected PARTIAL/GAP; PHYSICAL-ONLY)');
      note(4, true, `line_checkin_ask_gap=true snip=${body.slice(-600)}`);
    }

    const releasedMint = /released (event|ok|success)|mint(ed)? released|status.?released/i.test(body);
    note(5, !releasedMint, `no_released_mint=${!releasedMint}`);
    if (releasedMint) {
      findings.push('FINDING: Ask appeared to mint released; severity P0; case DITL-P-03-ASK-01');
    }

    let signedOut = false;
    try {
      await tray(p, 'Home');
      await p.waitForTimeout(1000);
      const so = p.getByText(/Sign out|Log out/i).first();
      if (await so.count()) {
        await so.click({ force: true });
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
    body = await shot(p, '05-signout', 1200);
    note(6, signedOut || /sign-in/i.test(p.url()), `signedOut=${signedOut} url=${p.url()}`);
  } catch (e) {
    log('FATAL', String(e));
    evidence.push('FATAL ' + String(e).slice(0, 400));
  } finally {
    await browser.close().catch(() => {});
  }

  const misses = evidence.filter((e) => e.startsWith('MISS'));
  const fatals = evidence.filter((e) => e.startsWith('FATAL'));
  let result = 'PARTIAL';
  if (fatals.length) result = 'FAIL';
  else if (findings.length) result = 'FAIL';
  else if (gaps.length >= 1 && misses.length === 0) result = 'PARTIAL';
  else if (misses.length >= 3) result = 'FAIL';
  else if (misses.length) result = 'PARTIAL';

  const report = {
    case: 'DITL-P-03-ASK-01',
    result,
    evidence,
    findings,
    gaps,
    misses,
    ud: UD,
    lane: 'B',
  };
  fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(report, null, 2));
  log('RESULT', result);
  log(JSON.stringify(report, null, 2));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
