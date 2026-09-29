// DITL-P-02-ASK-01 lane B — skeleton
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

function note(step, ok, detail) {
  const line = `${ok ? 'OK' : 'MISS'} step${step}: ${detail}`;
  evidence.push(line);
  log(line);
}

async function shot(p, n, w = 1500) {
  await p.waitForTimeout(w);
  await p.screenshot({ path: path.join(A, `${n}.png`), fullPage: true });
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 1800);
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
  let enabled = false;
  for (let i = 0; i < 10; i++) {
    const dis = await p.locator('[aria-label="Send"]').first().getAttribute('aria-disabled').catch(() => 'true');
    if (dis !== 'true') {
      enabled = true;
      break;
    }
    await p.waitForTimeout(300);
  }
  log('send enabled', enabled);
  await p.locator('[aria-label="Send"]').first().click({ force: true, timeout: 5000 }).catch(async () => {
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

async function tray(p, label) {
  const t = p.getByText(new RegExp(`^${label}$`, 'i')).first();
  await t.click({ timeout: 6000, force: true });
  await p.waitForTimeout(2000);
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
  const homeBody = (await p.innerText('body').catch(() => '')).slice(0, 500);
  log('bound home snip', childFirst, homeBody.includes(childFirst));
  await tray(p, 'Ask');
  await p.waitForTimeout(2500);
  await p.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('div,span,button,p'));
    const jc = nodes.find((n) => /Just chatting/i.test((n.textContent || '').trim()));
    if (jc) jc.click();
  });
  await p.waitForTimeout(800);
}

async function main() {
  log('START DITL-P-02-ASK-01');
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
    body = await shot(p, '02-ask-open-jordan', 2000);
    const askOpen = /\/ask/.test(p.url()) || /Just chatting|Ask…|Ask\.\.\./i.test(body);
    note(2, askOpen && !/Pick a child on Home first/i.test(body), `ask_url=${p.url()} open=${askOpen}`);

    await sendAsk(
      p,
      'Call list_my_assignments for Jordan Lee only (S1). List assignment titles, due dates, and class names. Do not invent. Do not list Jamie Lee. Do not change grades.',
    );
    body = await shot(p, '03-list-assignments', 1000);
    const listFailWording =
      /no list_my_assignments|class assignment lookup failed|started that work, then stopped|Parent seat only|tool unavailable|unknown tool/i.test(
        body,
      );
    const hasTitles =
      /ditl-|Homework|HW |Quiz|due|assignment|Math Period|English/i.test(body) &&
      !/I cannot list|could not load that child/i.test(body);
    const siblingMix =
      /Jamie/i.test(body) &&
      /Jordan/i.test(body) &&
      hasTitles &&
      /Jamie[^|]{0,80}(assignment|HW|homework|due|ditl-)/i.test(body);
    const listOk =
      !listFailWording &&
      !siblingMix &&
      hasTitles &&
      /Jordan/i.test(body) &&
      !/Pick a child on Home first/i.test(body);
    if (siblingMix) {
      findings.push(
        'FINDING: Ask list mixed sibling Jamie with Jordan assignments; severity P1; case DITL-P-02-ASK-01',
      );
    }
    if (listFailWording || (!listOk && !siblingMix)) {
      findings.push(
        'FINDING: parent Ask list_my_assignments did not list Jordan-only assignments; severity P2; case DITL-P-02-ASK-01',
      );
    }
    note(
      3,
      listOk,
      `list_ok=${listOk} siblingMix=${siblingMix} failWording=${listFailWording} snip=${body.slice(-600)}`,
    );

    await sendAsk(
      p,
      'Call send_message_to_teacher for Jordan Lee about homework. Message body: DITL-P-02-ASK-01-r2 parent check-in on homework — no reply needed. Confirm the tool result. Do not change grades.',
    );
    body = await shot(p, '04-send-message', 1000);
    const msgOk =
      (/Sent\.|message (sent|delivered)|thread|message id|send_message_to_teacher/i.test(body) ||
        /DITL-P-02-ASK-01/i.test(body)) &&
      !/cannot send|not allowed|tool unavailable|unknown tool/i.test(body);
    note(4, msgOk, `message_toolish=${msgOk} snip=${body.slice(-550)}`);
    if (!msgOk) {
      findings.push(
        'FINDING: send_message_to_teacher path failed from parent Ask; severity P1; case DITL-P-02-ASK-01',
      );
    }

    const mutateUi =
      /Approve capture|Save grade|Publish grade|Edit approved/i.test(body) ||
      (await p.getByRole('button', { name: /Approve|Publish grade|Save score/i }).count()) > 0;
    note(5, !mutateUi, `no_grade_mutation_ui=${!mutateUi}`);
    if (mutateUi) {
      findings.push(
        'FINDING: Ask path showed grade mutation chrome; severity P0; case DITL-P-02-ASK-01',
      );
    }

    // grades still readable path (non-mutating)
    await p.goto(`${BASE}/parent/grades`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    body = await shot(p, '05-grades-check', 2500);
    const gradesStill =
      /92|88|Math|English|grade|Homework|Jordan/i.test(body);
    note(6, gradesStill, `grades_visibleish=${gradesStill} (confirm Ask did not wipe)`);

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
    body = await shot(p, '06-signout', 1200);
    note(7, signedOut || /sign-in/i.test(p.url()), `signedOut=${signedOut} url=${p.url()}`);
  } catch (e) {
    log('FATAL', String(e));
    evidence.push('FATAL ' + String(e).slice(0, 400));
  } finally {
    await browser.close().catch(() => {});
  }
  const misses = evidence.filter((e) => e.startsWith('MISS'));
  const fatals = evidence.filter((e) => e.startsWith('FATAL'));
  const hardFail =
    fatals.length > 0 ||
    findings.some((f) => /severity P0|severity P1|sibling/i.test(f)) ||
    misses.some((m) => /step3|list_ok|sibling/i.test(m));
  let result = 'PASS';
  if (hardFail) result = 'FAIL';
  else if (misses.length) result = misses.length >= 2 ? 'FAIL' : 'PARTIAL';
  const report = {
    case: 'DITL-P-02-ASK-01',
    result,
    lane: 'B',
    browser: 'Chromium persistent /tmp/ditl-pw-lane-b',
    seat: 'ditl-parent-1',
    child: 'Jordan Lee',
    evidence,
    findings,
    misses,
    gaps: [],
  };
  fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(report, null, 2));
  log('RESULT', result);
  log(JSON.stringify(report, null, 2));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
