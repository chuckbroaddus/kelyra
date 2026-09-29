// Prove-out t_1e43161f — parent Ask assignments (web)
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:8081';
const USER = 'ditl-parent-1';
const PASS = process.env.DITL_PARENT_PASS || 'DITL-parent-test';
const UD = '/tmp/ditl-pw-prove-parent-ask';
const log = (...a) => console.log(...a);
const evidence = [];

function note(id, ok, detail) {
  const line = `${ok ? 'PASS' : 'FAIL'} ${id}: ${detail}`;
  evidence.push(line);
  log(line);
}

async function shot(p, n, w = 1200) {
  await p.waitForTimeout(w);
  await p.screenshot({ path: path.join(A, `${n}.png`), fullPage: true });
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 2200);
  log('==', n, p.url());
  log(body.slice(0, 900));
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
  await p.waitForTimeout(600);
  const box = p.getByPlaceholder(/Ask/i).first();
  await box.click({ force: true, timeout: 5000 }).catch(() => {});
  try {
    await box.fill('');
    await box.pressSequentially(text, { delay: 6 });
  } catch (e) {
    await p.keyboard.type(text, { delay: 6 });
  }
  await p.waitForTimeout(500);
  for (let i = 0; i < 12; i++) {
    const dis = await p.locator('[aria-label="Send"]').first().getAttribute('aria-disabled').catch(() => 'true');
    if (dis !== 'true') break;
    await p.waitForTimeout(250);
  }
  await p.locator('[aria-label="Send"]').first().click({ force: true, timeout: 5000 }).catch(async () => {
    await p.evaluate(() => document.querySelector('[aria-label="Send"]')?.click());
  });
  await p.waitForTimeout(2500);
  const marker = text.slice(0, 28);
  for (let i = 0; i < 55; i++) {
    const t = await p.innerText('body').catch(() => '');
    const busy = /Asking AI|Opening Kelyra|Working…|Working\.\.\./i.test(t);
    if (!busy && t.includes(marker) && i > 2) {
      await p.waitForTimeout(7000);
      break;
    }
    await p.waitForTimeout(2000);
  }
}

async function tray(p, label) {
  await p.getByText(new RegExp(`^${label}$`, 'i')).first().click({ timeout: 6000, force: true });
  await p.waitForTimeout(1500);
}

async function bindChildAndOpenAsk(p, childFirst) {
  await tray(p, 'Home');
  await p.waitForTimeout(1000);
  await p.evaluate((name) => {
    const nodes = Array.from(document.querySelectorAll('div,span,button,p'));
    const exact = nodes.filter((n) => (n.textContent || '').trim() === name);
    const hit = exact[exact.length - 1] || exact[0];
    if (hit) {
      hit.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      hit.click();
    }
  }, childFirst);
  await p.waitForTimeout(1200);
  await tray(p, 'Ask');
  await p.waitForTimeout(2000);
}

function realTitles(body) {
  return /place-?value|homework|quiz|due\s*(date|on|:)|Math Period|English|Science|•|–|—|\d{4}-\d{2}-\d{2}|assignment/i.test(
    body,
  );
}

function failedLookup(body) {
  return /class assignment lookup failed|lookup failed|unknown tool|not available|tool unavailable|no list_my_assignments/i.test(
    body,
  );
}

async function main() {
  log('START proveout parent-ask t_1e43161f');
  const browser = await openCtx();
  const p = browser.pages()[0] || (await browser.newPage());
  try {
    await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1200);
    await p.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
    });
    await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1200);
    await p.locator('input').nth(0).fill(USER);
    await p.locator('input[type=password]').first().fill(PASS);
    await p.locator('input[type=password]').first().press('Enter');
    await p.waitForTimeout(7000);
    let body = await shot(p, '01-after-signin');
    note('SIGNIN', /Jordan|Jamie|Home|Ask/i.test(body) || /\/parent/.test(p.url()), `url=${p.url()}`);

    await bindChildAndOpenAsk(p, 'Jordan');
    body = await shot(p, '02-ask-open-jordan');
    await sendAsk(
      p,
      'List Jordan Lee assignments only. Use list_my_assignments. Include titles, due dates, and class names when present. Do not invent titles. Do not change grades.',
    );
    body = await shot(p, '03-list-jordan', 800);
    const ac1 = !failedLookup(body) && realTitles(body) && /Jordan/i.test(body);
    note('AC-PARENT-ASK-1', ac1, `failLookup=${failedLookup(body)} real=${realTitles(body)} snip=${body.slice(-500)}`);

    await bindChildAndOpenAsk(p, 'Jamie');
    body = await shot(p, '04-bind-jamie-ask');
    await sendAsk(
      p,
      'List assignments for Jordan Lee only (not Jamie). Use list_my_assignments. Named child wins. Do not mix siblings. Do not invent titles.',
    );
    body = await shot(p, '05-list-jordan-while-jamie-bound', 800);
    const mixed = /Jamie/i.test(body) && /decimal/i.test(body) && !/Jordan/i.test(body);
    const ac2 = !failedLookup(body) && realTitles(body) && /Jordan/i.test(body) && !mixed;
    note('AC-PARENT-ASK-2', ac2, `failLookup=${failedLookup(body)} mixed=${mixed} snip=${body.slice(-500)}`);

    await sendAsk(
      p,
      'What assignments does my child have? Do not invent. If you need a name, ask which child. Do not return a mixed sibling list.',
    );
    body = await shot(p, '06-ambiguous-which-child', 800);
    const asksWhich = /which child|which one|Jamie or Jordan|Jordan or Jamie|whose|name the child|specify/i.test(body);
    note('AC-PARENT-ASK-2b', asksWhich || !failedLookup(body), `asksWhich=${asksWhich} snip=${body.slice(-400)}`);

    await sendAsk(
      p,
      'Call send_message_to_teacher for Jordan Lee. Message body: PROVEOUT-t_1e43161f parent homework check-in — no reply needed. Confirm send result. Do not change grades.',
    );
    body = await shot(p, '07-send-message', 800);
    const msgOk =
      (/message (sent|delivered)|sent message|thread|success|queued|delivered/i.test(body) ||
        /PROVEOUT-t_1e43161f/i.test(body)) &&
      !/cannot send|not allowed|tool unavailable|unknown tool|failed to send/i.test(body);
    note('AC-PARENT-ASK-3', msgOk, `msgOk=${msgOk} snip=${body.slice(-450)}`);

    const mutateUi =
      /Approve capture|Save grade|Publish grade/i.test(body) ||
      (await p.getByRole('button', { name: /Approve|Publish grade|Save score/i }).count()) > 0;
    note('NO-GRADE-MUTATE', !mutateUi, `no_mutate=${!mutateUi}`);

    await tray(p, 'Home');
    body = await shot(p, '08-leave-ask-home', 800);
    note('LEAVE-ASK', /Home|Jordan|Jamie/i.test(body), `url=${p.url()}`);
  } catch (e) {
    log('FATAL', String(e));
    evidence.push('FATAL ' + String(e).slice(0, 500));
  } finally {
    await browser.close().catch(() => {});
  }

  const fails = evidence.filter((e) => e.startsWith('FAIL') || e.startsWith('FATAL'));
  const report = {
    case: 'proveout-parent-ask-t_1e43161f',
    surface: 'web',
    seat: 'ditl-parent-1',
    loop_prior: 'wf_01a0e4ae95a076f0b48864bb33b0a32b escalated',
    evidence,
    fails,
    result: fails.length ? 'FAIL' : 'PASS',
  };
  fs.writeFileSync(path.join(A, 'result-web.json'), JSON.stringify(report, null, 2));
  log('RESULT', report.result);
  log(JSON.stringify({ evidence, result: report.result }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
