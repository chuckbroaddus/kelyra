// Prove-out t_1e43161f v2 — strict assistant-reply scoring
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:8081';
const USER = 'ditl-parent-1';
const PASS = process.env.DITL_PARENT_PASS || 'DITL-parent-test';
const UD = '/tmp/ditl-pw-prove-parent-ask-v2';
const log = (...a) => console.log(...a);
const evidence = [];

function note(id, ok, detail) {
  const line = `${ok ? 'PASS' : 'FAIL'} ${id}: ${detail}`;
  evidence.push(line);
  log(line);
}

async function shot(p, n, w = 800) {
  await p.waitForTimeout(w);
  await p.screenshot({ path: path.join(A, `${n}.png`), fullPage: true });
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ');
  log('==', n, p.url(), body.slice(0, 500));
  return body;
}

function assistantAfter(body, promptStart) {
  const i = body.lastIndexOf(promptStart.slice(0, 40));
  if (i < 0) return body.slice(-600);
  return body.slice(i + 40);
}

function listQuality(reply) {
  const stopped = /started that work, then stopped|then stopped|check People or the class card/i.test(reply);
  const cant = /can'?t list|cannot list|could not load|lookup failed|unknown tool|not available/i.test(reply);
  const titles = /ditl-Math HW|ditl-English HW|ditl-Hist|ditl-Multi|ditl-PhaseB|place-?value|HW S1/i.test(reply);
  return { stopped, cant, titles, ok: titles && !stopped && !cant };
}

async function openCtx() {
  fs.mkdirSync(UD, { recursive: true });
  const common = {
    headless: true,
    viewport: { width: 1280, height: 900 },
    args: ['--disable-dev-shm-usage', '--no-first-run'],
  };
  const exe =
    process.env.HOME +
    '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
  if (fs.existsSync(exe)) {
    try {
      return await chromium.launchPersistentContext(UD, { ...common, executablePath: exe });
    } catch {}
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
  await p.waitForTimeout(700);
  const box = p.getByPlaceholder(/Ask/i).first();
  await box.click({ force: true, timeout: 5000 }).catch(() => {});
  try {
    await box.fill('');
    await box.pressSequentially(text, { delay: 5 });
  } catch {
    await p.keyboard.type(text, { delay: 5 });
  }
  await p.waitForTimeout(400);
  for (let i = 0; i < 15; i++) {
    const dis = await p.locator('[aria-label="Send"]').first().getAttribute('aria-disabled').catch(() => 'true');
    if (dis !== 'true') break;
    await p.waitForTimeout(200);
  }
  await p.locator('[aria-label="Send"]').first().click({ force: true }).catch(async () => {
    await p.evaluate(() => document.querySelector('[aria-label="Send"]')?.click());
  });
  const marker = text.slice(0, 24);
  for (let i = 0; i < 60; i++) {
    await p.waitForTimeout(2000);
    const t = await p.innerText('body').catch(() => '');
    const busy = /Asking AI|Opening Kelyra|Working…|Working\.\.\./i.test(t);
    if (!busy && t.includes(marker) && i > 3) {
      await p.waitForTimeout(5000);
      break;
    }
  }
}

async function tray(p, label) {
  await p.getByText(new RegExp(`^${label}$`, 'i')).first().click({ timeout: 6000, force: true });
  await p.waitForTimeout(1200);
}

async function bind(p, name) {
  await tray(p, 'Home');
  await p.evaluate((n) => {
    const nodes = Array.from(document.querySelectorAll('div,span,button,p'));
    const exact = nodes.filter((el) => (el.textContent || '').trim() === n);
    const hit = exact[exact.length - 1] || exact[0];
    if (hit) {
      hit.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      hit.click();
    }
  }, name);
  await p.waitForTimeout(1000);
  await tray(p, 'Ask');
  await p.waitForTimeout(1800);
}

async function main() {
  log('START v2');
  const browser = await openCtx();
  const p = browser.pages()[0] || (await browser.newPage());
  try {
    await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1000);
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
    await p.waitForTimeout(6500);
    let body = await shot(p, 'v2-01-signin');
    note('SIGNIN', /Jordan|Jamie/i.test(body), p.url());

    await bind(p, 'Jordan');
    body = await shot(p, 'v2-02-ask-jordan');
    note('ASK-CHIPS-VISIBLE', /ditl-Math HW S1|ditl-English HW S1/i.test(body), 'chips aid only');

    const q1 =
      'List Jordan Lee assignments only. Use list_my_assignments. Titles, due dates, class names. Do not invent. No grade changes.';
    await sendAsk(p, q1);
    body = await shot(p, 'v2-03-list-jordan', 500);
    let reply = assistantAfter(body, q1);
    let q = listQuality(reply);
    note('AC-PARENT-ASK-1', q.ok, `stopped=${q.stopped} cant=${q.cant} titles=${q.titles} reply=${reply.slice(0, 450)}`);

    await bind(p, 'Jamie');
    const q2 =
      'List assignments for Jordan Lee only not Jamie. list_my_assignments. Named child wins. No sibling mix. No invent.';
    await sendAsk(p, q2);
    body = await shot(p, 'v2-04-jordan-named-jamie-bound', 500);
    reply = assistantAfter(body, q2);
    q = listQuality(reply);
    const jamieOnly = /jamie/i.test(reply) && /decimal|bulk-jamie/i.test(reply) && !/jordan/i.test(reply);
    note('AC-PARENT-ASK-2', q.ok && !jamieOnly, `stopped=${q.stopped} titles=${q.titles} jamieOnly=${jamieOnly} reply=${reply.slice(0, 450)}`);

    const q3 =
      'Call send_message_to_teacher for Jordan Lee. Body: PROVEOUT-t_1e43161f-v2 homework check-in no reply needed. Confirm send. No grades.';
    await sendAsk(p, q3);
    body = await shot(p, 'v2-05-message', 500);
    reply = assistantAfter(body, q3);
    const msg =
      /sent|delivered|thread|message id|success|queued/i.test(reply) &&
      !/cannot send|not allowed|unknown tool|failed to send/i.test(reply);
    note('AC-PARENT-ASK-3', msg, `reply=${reply.slice(0, 400)}`);

    await tray(p, 'Home');
    body = await shot(p, 'v2-06-home', 500);
    note('LEAVE', /Home|Jamie|Jordan/i.test(body), p.url());
  } catch (e) {
    evidence.push('FATAL ' + String(e).slice(0, 400));
    log('FATAL', e);
  } finally {
    await browser.close().catch(() => {});
  }
  const fails = evidence.filter((e) => e.startsWith('FAIL') || e.startsWith('FATAL'));
  const report = {
    case: 'proveout-parent-ask-t_1e43161f-v2',
    surface: 'web',
    evidence,
    fails,
    result: fails.length ? 'FAIL' : 'PASS',
  };
  fs.writeFileSync(path.join(A, 'result-web-v2.json'), JSON.stringify(report, null, 2));
  log('RESULT', report.result);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
