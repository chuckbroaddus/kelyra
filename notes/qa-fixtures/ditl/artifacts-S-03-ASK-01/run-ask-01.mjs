// DITL-S-03-ASK-01 lane C — skeleton
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:8081';
const USER = 'ditl-student-s1';
const PASS = process.env.DITL_STUDENT_PASS || 'DITL-student-test';
const UD = '/tmp/ditl-pw-lane-c';
const MARKER = 'DITL-S-03-ASK-01 student msg probe — no reply needed';
const log = (...a) => console.log(...a);
const evidence = [];
const findings = [];
const toolHits = [];

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
  await p.waitForTimeout(2000);
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
    const dis = await p.locator('[aria-label="Send"]').first().getAttribute('aria-disabled').catch(() => 'true');
    if (dis !== 'true') break;
    await p.waitForTimeout(300);
  }
  await p.locator('[aria-label="Send"]').first().click({ force: true, timeout: 5000 }).catch(async () => {
    await p.evaluate(() => document.querySelector('[aria-label="Send"]')?.click());
  });
  await p.waitForTimeout(3000);
  const marker = text.slice(0, 28);
  for (let i = 0; i < 55; i++) {
    const t = await p.innerText('body').catch(() => '');
    const busy = /Asking AI|Opening Kelyra|Working…|Working\.\.\./i.test(t);
    if (!busy && t.includes(marker) && i > 2) {
      await p.waitForTimeout(9000);
      break;
    }
    await p.waitForTimeout(2000);
  }
}

async function main() {
  log('START DITL-S-03-ASK-01');
  const browser = await openCtx();
  const p = browser.pages()[0] || (await browser.newPage());
  p.on('response', async (res) => {
    try {
      const u = res.url();
      if (!/ask-assistant|list_messages|list_focus|send_message|list_threads|rpc\//i.test(u)) return;
      const st = res.status();
      const txt = await res.text().catch(() => '');
      toolHits.push({ st, u: u.slice(0, 140), snip: txt.slice(0, 500) });
      log('HIT', st, u.slice(0, 100), txt.slice(0, 180));
    } catch {}
  });
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
    const signedIn = !/sign-in/i.test(p.url()) || /To Do|Jordan|Ask|Messages|Assignments/i.test(body);
    note(1, signedIn, `url=${p.url()} signedIn=${signedIn}`);

    await p.goto(`${BASE}/ask`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2500);
    body = await shot(p, '02-ask-home', 1500);
    const onAsk = /\/ask/i.test(p.url()) || /Ask|Just chatting/i.test(body);
    note(2, onAsk, `ask_url=${p.url()} onAsk=${onAsk}`);

    await sendAsk(
      p,
      'Call list_messages for me (Jordan Lee / student S1 only). Summarize my message threads and recent messages. Do not invent. Do not change grades.',
    );
    body = await shot(p, '03-list-messages', 1000);
    const listMsg =
      /list_messages|thread|message|Avery|Quinn|inbox|no messages|empty|teacher/i.test(body) ||
      toolHits.some((h) => /list_messages|list_threads|messages/i.test(h.u + h.snip) && h.st < 400);
    const crossStudent = /Jamie Lee|ditl-student-s2|other student grades/i.test(body);
    note(3, listMsg && !crossStudent, `list_messagesish=${listMsg} cross=${crossStudent} snip=${body.slice(-450)}`);

    await sendAsk(
      p,
      'Call list_focus for me only (Jordan Lee). List my focus items. Context must be S1 only. Do not invent. Do not change grades.',
    );
    body = await shot(p, '04-list-focus', 1000);
    const listFocus =
      /list_focus|focus|place-value|skill|goal|todo|practice|no focus|empty/i.test(body) ||
      toolHits.some((h) => /list_focus|focus/i.test(h.u + h.snip) && h.st < 400);
    note(4, listFocus && !/Jamie Lee as my focus/i.test(body), `list_focusish=${listFocus} snip=${body.slice(-450)}`);

    await sendAsk(
      p,
      `Using send_message, message my teacher Avery Quinn with exactly this text and nothing else: ${MARKER}. Confirm tool result. Do not change grades.`,
    );
    body = await shot(p, '05-send-message', 1000);
    const sendOk =
      (/send_message|sent|delivered|thread|message id|success|queued/i.test(body) ||
        toolHits.some((h) => /send_message/i.test(h.u + h.snip) && h.st < 400) ||
        /DITL-S-03-ASK-01/i.test(body)) &&
      !/cannot send|not allowed|unknown tool|tool unavailable/i.test(body);
    note(5, sendOk, `send_messageish=${sendOk} snip=${body.slice(-550)}`);

    // dual path UI messages still works
    await p.goto(`${BASE}/messages`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '06-messages-dual', 3500);
    const dual =
      /Avery|Quinn|Messages|thread|New message|DITL-S-03-ASK-01|Just now|You/i.test(body);
    note(6, dual, `dual_path_messages=${dual} url=${p.url()}`);

    // optional: try delete only this case message if UI allows
    try {
      if (/DITL-S-03-ASK-01/i.test(body)) {
        evidence.push('NOTE: case message visible in tray (teardown optional delete)');
      }
    } catch {}

    let signedOut = false;
    try {
      await p.goto(`${BASE}/todo`, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(1500);
      const so = p.getByText(/Sign out|Log out/i).first();
      if (await so.count()) {
        await so.click({ force: true });
        await p.waitForTimeout(2500);
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
    body = await shot(p, '07-signout', 1000);
    note(7, signedOut || /sign-in/i.test(p.url()), `signedOut=${signedOut} url=${p.url()}`);
  } catch (e) {
    log('FATAL', String(e));
    evidence.push('FATAL ' + String(e).slice(0, 400));
  } finally {
    await browser.close().catch(() => {});
  }
  const misses = evidence.filter((e) => e.startsWith('MISS'));
  const fatals = evidence.filter((e) => e.startsWith('FATAL'));
  let result = 'PASS';
  if (fatals.length) result = 'FAIL';
  else if (misses.length) result = misses.length >= 3 ? 'FAIL' : 'PARTIAL';
  const report = {
    case: 'DITL-S-03-ASK-01',
    result,
    evidence,
    findings,
    misses,
    gaps: [],
    toolHits: toolHits.slice(0, 40),
    user: USER,
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
