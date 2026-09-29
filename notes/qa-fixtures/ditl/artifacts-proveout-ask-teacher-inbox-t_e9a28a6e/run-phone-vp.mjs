// Phone viewport + teacher/parent/student Ask inbox t_e9a28a6e
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://127.0.0.1:8081';
const UD = '/tmp/ditl-pw-prove-ask-inbox-phone';
const log = (...a) => console.log(...a);
async function open() {
  fs.mkdirSync(UD, { recursive: true });
  const exe =
    process.env.HOME +
    '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
  const common = {
    headless: true,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    args: ['--disable-dev-shm-usage'],
  };
  if (fs.existsSync(exe)) return chromium.launchPersistentContext(UD, { ...common, executablePath: exe });
  return chromium.launchPersistentContext(UD, { ...common, channel: 'chrome' });
}

async function signIn(p, user, pass) {
  await p.goto(BASE + '/sign-in', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(500);
  await p.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
  });
  await p.goto(BASE + '/sign-in');
  await p.waitForTimeout(800);
  await p.locator('input').nth(0).fill(user);
  await p.locator('input[type=password]').first().fill(pass);
  await p.locator('input[type=password]').first().press('Enter');
  await p.waitForTimeout(7000);
}

async function ask(p, prompt) {
  await p.goto(BASE + '/ask', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2000);
  await p.evaluate(() => {
    const n = [...document.querySelectorAll('div,span,button,p,a')].find((x) =>
      /^New chat$/i.test((x.textContent || '').trim())
    );
    if (n) n.click();
  });
  await p.waitForTimeout(1200);
  await p.evaluate(() => {
    const n = [...document.querySelectorAll('div,span,button,p')].find((x) =>
      /^Just chatting$/i.test((x.textContent || '').trim())
    );
    if (n) n.click();
  });
  await p.waitForTimeout(500);
  const box = p.getByPlaceholder(/Ask/i).first();
  if (await box.count()) {
    await box.click({ force: true }).catch(() => {});
    await box.fill('');
    await box.pressSequentially(prompt, { delay: 4 });
  }
  await p.locator('[aria-label="Send"]').first().click({ force: true }).catch(() => p.keyboard.press('Enter'));
  for (let i = 0; i < 35; i++) {
    await p.waitForTimeout(2000);
    const t = await p.innerText('body');
    if (!/Asking AI|Working/i.test(t) && i > 2) break;
  }
  await p.waitForTimeout(2000);
  return (await p.innerText('body')).replace(/\n+/g, ' | ');
}

async function main() {
  const report = { surface: 'phone-vp' };
  const ctx = await open();
  const p = ctx.pages()[0] || (await ctx.newPage());
  try {
    const TP = process.env.DITL_TEACHER_PASS || 'DITL-teacher-test';
    await signIn(p, 'ditl-teacher-a', TP);
    await p.goto(BASE + '/inbox');
    await p.waitForTimeout(2000);
    await p.screenshot({ path: path.join(A, 'phone-01-inbox.png'), fullPage: true });
    let body = (await p.innerText('body')).replace(/\n+/g, ' | ');
    report.inboxSnip = body.slice(0, 900);
    report.inboxHasJordan = /Jordan/i.test(body);

    body = await ask(
      p,
      'Call list_inbox for the open class. Return id/status or empty. No Approve.'
    );
    await p.screenshot({ path: path.join(A, 'phone-02-teacher-ask.png'), fullPage: true });
    report.teacherAsk = body.slice(-1200);
    report.seatRefuse = /Teacher seat required|teacher seat required/i.test(body);
    report.listed = /1d937e5a|draft|items|empty|Inbox items|Needs inbox/i.test(body) && !report.seatRefuse;
    report.ac1 = report.listed && report.inboxHasJordan;
    report.ac2 = !report.seatRefuse;

    const PP = process.env.DITL_PARENT_PASS || 'DITL-parent-test';
    await signIn(p, 'ditl-parent-1', PP);
    body = await ask(p, 'Call list_inbox for teacher Needs inbox. Return tool result.');
    await p.screenshot({ path: path.join(A, 'phone-03-parent-ask.png'), fullPage: true });
    report.parentAsk = body.slice(-900);
    report.ac3_parent = !/1d937e5a|status:\s*`?draft/i.test(body);

    const SP = process.env.DITL_STUDENT_PASS || 'DITL-student-test';
    await signIn(p, 'ditl-student-s1', SP);
    body = await ask(p, 'Call list_inbox for teacher Needs inbox. Return tool result.');
    await p.screenshot({ path: path.join(A, 'phone-04-student-ask.png'), fullPage: true });
    report.studentAsk = body.slice(-900);
    report.ac3_student = !/1d937e5a|status:\s*`?draft/i.test(body);

    report.ac = {
      'AC-ASK-INBOX-1': report.ac1 ? 'PASS' : 'FAIL',
      'AC-ASK-INBOX-2': report.ac2 ? 'PASS' : 'FAIL',
      'AC-ASK-INBOX-3_parent': report.ac3_parent ? 'PASS' : 'FAIL',
      'AC-ASK-INBOX-3_student': report.ac3_student ? 'PASS' : 'FAIL',
    };
  } catch (e) {
    report.error = String(e).slice(0, 400);
  }
  fs.writeFileSync(path.join(A, 'result-phone-vp.json'), JSON.stringify(report, null, 2));
  log(JSON.stringify(report, null, 2));
  await ctx.close().catch(() => {});
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
