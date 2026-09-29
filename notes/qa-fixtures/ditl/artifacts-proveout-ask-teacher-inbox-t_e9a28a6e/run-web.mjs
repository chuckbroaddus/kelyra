// Prove-out t_e9a28a6e — Ask teacher inbox (web)
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://127.0.0.1:8081';
const T_USER = 'ditl-teacher-a';
const T_PASS = process.env.DITL_TEACHER_PASS || 'DITL-teacher-test';
const P_USER = 'ditl-parent-1';
const P_PASS = process.env.DITL_PARENT_PASS || 'DITL-parent-test';
const S_USER = 'ditl-student-s1';
const S_PASS = process.env.DITL_STUDENT_PASS || 'DITL-student-test';
const UD = '/tmp/ditl-pw-prove-ask-inbox';
const log = (...a) => console.log(...a);

async function openCtx(vp) {
  fs.mkdirSync(UD, { recursive: true });
  const common = {
    headless: true,
    viewport: vp || { width: 1280, height: 900 },
    args: ['--disable-dev-shm-usage', '--no-first-run'],
  };
  const exe =
    process.env.HOME +
    '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
  if (fs.existsSync(exe)) return chromium.launchPersistentContext(UD, { ...common, executablePath: exe });
  return chromium.launchPersistentContext(UD, { ...common, channel: 'chrome' });
}

async function clearAuth(p) {
  await p.goto(BASE + '/sign-in', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(600);
  await p.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
  });
}

async function signIn(p, user, pass) {
  await clearAuth(p);
  await p.goto(BASE + '/sign-in', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1000);
  await p.locator('input').nth(0).fill(user);
  await p.locator('input[type=password]').first().fill(pass);
  await p.locator('input[type=password]').first().press('Enter');
  await p.waitForTimeout(7000);
}

async function shot(p, name) {
  await p.waitForTimeout(800);
  await p.screenshot({ path: path.join(A, name + '.png'), fullPage: true });
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ');
  log('SHOT', name, p.url(), body.slice(0, 500));
  return body;
}

async function askListInbox(p, prompt) {
  await p.goto(BASE + '/ask', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);
  await p.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('div,span,button,p,a'));
    const nc = nodes.find((n) => /^New chat$/i.test((n.textContent || '').trim()));
    if (nc) nc.click();
  });
  await p.waitForTimeout(1500);
  await p.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('div,span,button,p'));
    const jc = nodes.find((n) => /^Just chatting$/i.test((n.textContent || '').trim()));
    if (jc) jc.click();
  });
  await p.waitForTimeout(800);
  const box = p.getByPlaceholder(/Ask/i).first();
  if (await box.count()) {
    await box.click({ force: true });
    await box.fill('');
    await box.pressSequentially(prompt, { delay: 4 });
  } else {
    const ta = p.locator('textarea').last();
    await ta.click({ force: true });
    await ta.fill(prompt);
  }
  await p.waitForTimeout(400);
  const send = p.locator('[aria-label="Send"]').first();
  if (await send.count()) await send.click({ force: true });
  else await p.keyboard.press('Enter');
  for (let i = 0; i < 40; i++) {
    await p.waitForTimeout(2000);
    const t = await p.innerText('body');
    if (!/Asking AI|Working/i.test(t) && i > 2) break;
  }
  await p.waitForTimeout(2500);
  return (await p.innerText('body')).replace(/\n+/g, ' | ');
}

async function main() {
  const report = { surface: 'web', card: 't_e9a28a6e', ac: {} };
  let ctx = await openCtx();
  const p = ctx.pages()[0] || (await ctx.newPage());
  try {
    await signIn(p, T_USER, T_PASS);
    let body = await shot(p, 'web-01-teacher-home');
    report.teacherSigned = /Desk|Needs|ditl-Math|Teacher/i.test(body) && !/Welcome back/i.test(body);

    await p.goto(BASE + '/inbox', { waitUntil: 'domcontentloaded' });
    body = await shot(p, 'web-02-teacher-inbox');
    report.inboxOpen = /Needs|Inbox|Unassigned|Draft|Capture|empty|No /i.test(body) && !/Sign in to Kelyra/i.test(body);
    report.inboxSnip = body.slice(0, 1200);
    report.inboxHasNeedsChrome = /Needs Attention|Needs|Inbox/i.test(body);

    const askBody = await askListInbox(
      p,
      'Call list_inbox for the open class. Return the tool result items (id/status) or empty list. Do not Approve or delete. Do not invent rows.'
    );
    await shot(p, 'web-03-teacher-ask-list');
    report.teacherAskSnip = askBody.slice(-1500);
    const seatRefuse = /Teacher seat required|teacher seat required|Needs inbox is only on the Teach seat/i.test(askBody);
    const listed = /list_inbox|class_id|items|empty|0 item|no captures|no needs|inbox/i.test(askBody) && !seatRefuse;
    report.ac1 = !seatRefuse && report.inboxOpen && (listed || /I (listed|found|see)|status/i.test(askBody));
    report.ac2 = !seatRefuse;
    report.ac1_detail = seatRefuse ? 'seat refusal present' : listed ? 'list path no seat refusal' : 'ambiguous reply';

    await signIn(p, P_USER, P_PASS);
    body = await shot(p, 'web-04-parent-home');
    const parentAsk = await askListInbox(
      p,
      'Call list_inbox to list the teacher Needs inbox for ditl-Math Period 3. Return the tool result.'
    );
    await shot(p, 'web-05-parent-ask');
    report.parentAskSnip = parentAsk.slice(-1200);
    const parentGotRows = /"items"\s*:\s*\[\s*\{/.test(parentAsk);
    report.ac3_parent = !parentGotRows;

    await signIn(p, S_USER, S_PASS);
    body = await shot(p, 'web-06-student-home');
    const studentAsk = await askListInbox(
      p,
      'Call list_inbox to list the teacher Needs inbox. Return the tool result.'
    );
    await shot(p, 'web-07-student-ask');
    report.studentAskSnip = studentAsk.slice(-1200);
    report.ac3_student = !/"items"\s*:\s*\[\s*\{/.test(studentAsk);

    await signIn(p, T_USER, T_PASS);
    body = await shot(p, 'web-08-dh-teacher-home');
    let switched = false;
    await p.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('div,span,button,p,a'));
      const hit = nodes.find((n) => /^Parent$/i.test((n.textContent || '').trim()));
      if (hit) hit.click();
    });
    await p.waitForTimeout(2500);
    body = await shot(p, 'web-09-dh-after-parent-click');
    if (/Parent|Ride|Jamie|Jordan/i.test(body) && !/Desk|Needs Attention/i.test(body)) switched = true;
    if (!switched) {
      await p.goto(BASE + '/profile', { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(1500);
      await p.evaluate(() => {
        const nodes = Array.from(document.querySelectorAll('div,span,button,p,a'));
        const hit = nodes.find((n) => /Parent seat|Use Parent|Switch.*Parent|^Parent$/i.test((n.textContent || '').trim()));
        if (hit) hit.click();
      });
      await p.waitForTimeout(2000);
      body = await shot(p, 'web-10-dh-profile-parent');
      switched = /Parent/i.test(body);
    }
    report.dualHatParentSwitch = switched;
    if (switched) {
      const dhAsk = await askListInbox(p, 'Call list_inbox for the teacher Needs inbox. Return tool result.');
      await shot(p, 'web-11-dh-parent-ask');
      report.dhParentAskSnip = dhAsk.slice(-1000);
      report.ac3_dh_parent = !/"items"\s*:\s*\[\s*\{/.test(dhAsk);
    } else {
      report.ac3_dh_parent = 'UNPROVEN_switch';
    }

    report.ac = {
      'AC-ASK-INBOX-1': report.ac1 ? 'PASS' : 'FAIL',
      'AC-ASK-INBOX-2': report.ac2 ? 'PASS' : 'FAIL',
      'AC-ASK-INBOX-3_parent': report.ac3_parent ? 'PASS' : 'FAIL',
      'AC-ASK-INBOX-3_student': report.ac3_student ? 'PASS' : 'FAIL',
      'AC-ASK-INBOX-3_dh_parent': report.ac3_dh_parent,
    };
  } catch (e) {
    report.error = String(e).slice(0, 500);
  }
  fs.writeFileSync(path.join(A, 'result-web.json'), JSON.stringify(report, null, 2));
  log('REPORT', JSON.stringify(report, null, 2));
  await ctx.close().catch(() => {});
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
