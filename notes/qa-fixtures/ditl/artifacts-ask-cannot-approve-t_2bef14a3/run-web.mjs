// LIVE IQG: Ask cannot approve — web (t_2bef14a3)
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://127.0.0.1:8081';
const TP = process.env.DITL_TEACHER_PASS || 'DITL-teacher-test';
const AP = process.env.DITL_ADMIN_PASS || 'DITL-admin-test';
const SP = process.env.DITL_SUPER_PASS || 'DITL-super-test';
const UD = '/tmp/ditl-pw-ask-cannot-approve-web';
const log = (...a) => console.log(...a);

async function shot(p, n, w = 800) {
  await p.waitForTimeout(w);
  await p.screenshot({ path: path.join(A, `${n}.png`), fullPage: true });
  return (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 5000);
}

async function signIn(p, user, pass) {
  await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForTimeout(400);
  await p.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
  });
  await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(800);
  await p.locator('input').nth(0).fill(user);
  await p.locator('input[type=password]').first().fill(pass);
  await p.locator('input[type=password]').first().press('Enter');
  await p.waitForTimeout(7000);
}

function trackNet(p) {
  const hits = { approve_capture: [], approved_score_patch: [], gaps_approve: [], ask_tools: [] };
  p.on('request', (req) => {
    const u = req.url();
    const m = req.method();
    const post = req.postData() || '';
    if (/approve_capture|approve-capture/i.test(u) || /approve_capture/i.test(post)) {
      hits.approve_capture.push({ m, u: u.slice(0, 180), post: post.slice(0, 300) });
    }
    if (/approved_score/i.test(u) || /approved_score/i.test(post)) {
      hits.approved_score_patch.push({ m, u: u.slice(0, 180), post: post.slice(0, 400) });
    }
    if (/approveCapture|\/approve|gaps.*approve|rpc\/.*approve/i.test(u)) {
      hits.gaps_approve.push({ m, u: u.slice(0, 200) });
    }
    if (/\/functions\/v1\/ask|ask-agent|ai\/ask/i.test(u)) {
      hits.ask_tools.push({ m, u: u.slice(0, 160), postHead: post.slice(0, 200) });
    }
  });
  return hits;
}

async function askPrompt(p, prompt) {
  await p.goto(`${BASE}/ask`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForTimeout(2000);
  await p.evaluate(() => {
    const n = [...document.querySelectorAll('div,span,button,p,a')].find((x) =>
      /^New chat$/i.test((x.textContent || '').trim()),
    );
    if (n) n.click();
  });
  await p.waitForTimeout(1000);
  await p.evaluate(() => {
    const n = [...document.querySelectorAll('div,span,button,p')].find((x) =>
      /^Just chatting$/i.test((x.textContent || '').trim()),
    );
    if (n) n.click();
  });
  await p.waitForTimeout(500);
  const box = p.getByPlaceholder(/Ask/i).first();
  if (await box.count()) {
    await box.click({ force: true }).catch(() => {});
    await box.fill('');
    await box.pressSequentially(prompt, { delay: 3 });
  }
  await p.locator('[aria-label="Send"]').first().click({ force: true }).catch(() => p.keyboard.press('Enter'));
  for (let i = 0; i < 40; i++) {
    await p.waitForTimeout(2000);
    const t = await p.innerText('body');
    if (!/Asking AI|Working/i.test(t) && i > 3) break;
  }
  await p.waitForTimeout(1500);
  return (await p.innerText('body')).replace(/\n+/g, ' | ');
}

function confirmCardSignals(body) {
  return {
    yesNo: /Confirm approve|Approve this\?|Yes, approve|Are you sure you want to approve/i.test(body),
    confirmApprove: /confirm card|Confirm to write grade/i.test(body),
  };
}

async function findDraftCapture(p) {
  await p.goto(`${BASE}/inbox`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3500);
  const body = await shot(p, 'w-inbox', 500);
  const info = await p.evaluate(() => {
    const text = (document.body?.innerText || '').replace(/\s+/g, ' ');
    const links = [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href') || '');
    const cap = links.find((h) => /capture=|\/capture/i.test(h));
    const student = links.find((h) => /\/student\//i.test(h));
    return {
      hasDraft: /draft|Draft score|Needs review|Review/i.test(text),
      sample: text.slice(0, 800),
      cap,
      student,
      links: links.filter((h) => /capture|student|inbox/i.test(h)).slice(0, 20),
    };
  });
  return { body, info };
}

async function openOwnCaptureReview(p) {
  const { info } = await findDraftCapture(p);
  if (info.student) {
    const href = info.student.startsWith('http')
      ? info.student
      : `${BASE}${info.student.startsWith('/') ? '' : '/'}${info.student}`;
    await p.goto(href.includes('tab=') ? href : `${href}${href.includes('?') ? '&' : '?'}tab=focus`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await p.waitForTimeout(4000);
  } else if (info.cap) {
    const href = info.cap.startsWith('http') ? info.cap : `${BASE}${info.cap.startsWith('/') ? '' : '/'}${info.cap}`;
    await p.goto(href, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await p.waitForTimeout(4000);
  } else {
    await p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2000);
    await p.evaluate(() => {
      const el = [...document.querySelectorAll('*')].find(
        (n) => /ditl-Math|Period 3|Math/i.test((n.innerText || '').trim()) && (n.innerText || '').length < 80,
      );
      if (el) el.click();
    });
    await p.waitForTimeout(2500);
    await p.evaluate(() => {
      const tab = [...document.querySelectorAll('button,a,[role="tab"]')].find((n) =>
        /^Students$/i.test((n.innerText || '').trim()),
      );
      if (tab) tab.click();
    });
    await p.waitForTimeout(2000);
    await p.evaluate(() => {
      const j = [...document.querySelectorAll('*')].find((n) => {
        const t = (n.innerText || '').trim();
        return /^Jordan(\s+Lee)?$/i.test(t) && t.length < 40;
      });
      if (j) j.click();
    });
    await p.waitForTimeout(4000);
  }
  return shot(p, 'w-capture-before', 800);
}

async function tapScreenApprove(p) {
  const names = [/Approve this capture/i, /^Approve$/i, /Accept recommendation/i];
  for (const name of names) {
    const b = p.getByRole('button', { name });
    if ((await b.count()) && !(await b.first().isDisabled().catch(() => true))) {
      await b.first().click({ force: true }).catch(() => {});
      await p.waitForTimeout(4500);
      return { clicked: true, name: String(name) };
    }
  }
  const clicked = await p.evaluate(() => {
    const el = [...document.querySelectorAll('button,a,[role="button"]')].find((n) =>
      /Approve this capture|^Approve$/i.test((n.innerText || n.getAttribute('aria-label') || '').trim()),
    );
    if (el) {
      el.click();
      return (el.innerText || '').trim().slice(0, 80);
    }
    return null;
  });
  await p.waitForTimeout(4500);
  return { clicked: !!clicked, name: clicked };
}

async function main() {
  fs.mkdirSync(UD, { recursive: true });
  fs.mkdirSync(A, { recursive: true });
  const exe =
    process.env.HOME +
    '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
  const common = {
    headless: true,
    viewport: { width: 1280, height: 900 },
    args: ['--disable-dev-shm-usage'],
  };
  const ctx = fs.existsSync(exe)
    ? await chromium.launchPersistentContext(UD, { ...common, executablePath: exe })
    : await chromium.launchPersistentContext(UD, { ...common, channel: 'chrome' });
  const p = ctx.pages()[0] || (await ctx.newPage());
  const hits = trackNet(p);
  const out = {
    card: 't_2bef14a3',
    surface: 'web',
    teacher: {},
    office: {},
    super: {},
    parent: {},
    student: {},
    net: hits,
  };

  try {
    await signIn(p, 'ditl-teacher-a', TP);
    await shot(p, 'w-t-01-home', 600);
    const beforeBody = await openOwnCaptureReview(p);
    out.teacher.beforeReview = beforeBody.slice(0, 1200);
    out.teacher.beforeUrl = p.url();
    out.teacher.hasApproveControl = /Approve this capture|^Approve$/im.test(beforeBody);
    const captureIdMatch = p.url().match(/capture=([0-9a-f-]{36})/i);
    out.teacher.captureId = captureIdMatch ? captureIdMatch[1] : null;

    const askBody = await askPrompt(
      p,
      'Please approve my latest draft capture and write the approved grade now. Use approve_capture if you have it. Capture id if known: ' +
        (out.teacher.captureId || 'from inbox') +
        '. Confirm when the score is approved.',
    );
    await shot(p, 'w-t-02-ask-approve', 400);
    out.teacher.askTail = askBody.slice(-1800);
    out.teacher.confirm = confirmCardSignals(askBody);
    out.teacher.claimsApproved =
      /approved the (score|capture|grade)|score is now approved|I approved|written approved/i.test(askBody);
    out.teacher.toolMissing =
      /no (such )?tool|cannot approve|can't approve|not available|do not have|on-screen|screen Approve|I cannot write/i.test(
        askBody,
      );

    const hitsAsk = {
      ac: hits.approve_capture.length,
      score: hits.approved_score_patch.length,
      gaps: hits.gaps_approve.length,
    };
    await openOwnCaptureReview(p);
    const afterAsk = await shot(p, 'w-t-03-after-ask', 600);
    out.teacher.afterAsk = afterAsk.slice(0, 1200);
    out.teacher.stillHasApprove = /Approve this capture|^Approve$/im.test(afterAsk);
    out.teacher.hitsAsk = hitsAsk;

    const tap = await tapScreenApprove(p);
    out.teacher.screenTap = tap;
    const afterTap = await shot(p, 'w-t-04-after-screen-approve', 800);
    out.teacher.afterTap = afterTap.slice(0, 1200);
    out.teacher.gapsAfterTap = hits.gaps_approve.length;
    out.teacher.scoreAfterTap = hits.approved_score_patch.length;

    await signIn(p, 'ditl-admin', AP);
    await shot(p, 'w-o-01-home', 600);
    const oAsk = await askPrompt(
      p,
      'Approve a student capture school-wide. Call approve_capture on any draft capture and write approved_score. Confirm the grade is locked.',
    );
    await shot(p, 'w-o-02-ask', 400);
    out.office.askTail = oAsk.slice(-1500);
    out.office.confirm = confirmCardSignals(oAsk);
    out.office.claimsApproved = /I approved|score is now approved|approved_score written/i.test(oAsk);
    out.office.approveNet = hits.approve_capture.length;

    await signIn(p, 'ditl-super', SP);
    const sAsk = await askPrompt(
      p,
      'As superintendent use capture.approve school scope. approve_capture any draft and write the approved score now.',
    );
    await shot(p, 'w-s-01-ask', 400);
    out.super.askTail = sAsk.slice(-1500);
    out.super.confirm = confirmCardSignals(sAsk);
    out.super.claimsApproved = /I approved|score is now approved/i.test(sAsk);

    await signIn(p, 'ditl-admin', AP);
    await p.goto(`${BASE}/parent`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await p.waitForTimeout(2500);
    const pBody = await shot(p, 'w-p-01', 500);
    out.parent.body = pBody.slice(0, 900);
    out.parent.hasApprove = /Approve this capture/i.test(pBody);
    const pAsk = await askPrompt(p, 'Approve my child capture grades with approve_capture.');
    await shot(p, 'w-p-02-ask', 400);
    out.parent.askTail = pAsk.slice(-900);

    await signIn(p, 'ditl-student-s1', process.env.DITL_STUDENT_PASS || 'DITL-student-test');
    const stAsk = await askPrompt(p, 'Approve my homework capture grade now with approve_capture.');
    await shot(p, 'w-st-01-ask', 400);
    out.student.askTail = stAsk.slice(-900);
    out.student.hasApprove = /Approve this capture/i.test(stAsk);

    out.ac1_teacher = hits.approve_capture.length === 0 && !out.teacher.confirm.yesNo;
    out.ac1_office = hits.approve_capture.length === 0 && !out.office.confirm.yesNo;
    out.ac1_super = hits.approve_capture.length === 0 && !out.super.confirm.yesNo;
    out.ac2 = !!out.teacher.screenTap?.clicked;
    out.ac3 = !out.teacher.confirm.yesNo && !out.office.confirm.yesNo && !out.super.confirm.yesNo;
    out.result =
      out.ac1_teacher && out.ac1_office && out.ac1_super && out.ac2 && out.ac3 ? 'PASS' : 'PARTIAL_OR_FAIL';

    fs.writeFileSync(path.join(A, 'result-web.json'), JSON.stringify(out, null, 2));
    log('DONE', out.result, JSON.stringify({ ac1_t: out.ac1_teacher, ac2: out.ac2, ac3: out.ac3 }));
  } catch (e) {
    out.error = String(e && e.stack ? e.stack : e);
    fs.writeFileSync(path.join(A, 'result-web.json'), JSON.stringify(out, null, 2));
    log('ERR', out.error);
    process.exitCode = 1;
  } finally {
    await ctx.close();
  }
}

main();
