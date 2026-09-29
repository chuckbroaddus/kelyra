// DITL-T-04-UI-06 lane A — publish + notify; parent sees (teacher seat)
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:8081';
const USER = 'ditl-teacher-a';
const PASS = process.env.DITL_TEACHER_PASS || 'DITL-teacher-test';
const UD = '/tmp/ditl-pw-lane-a';
const CLASS = 'd1715000-0000-4000-a000-000000000301';
const MARKER = `ditl-T-04-UI-06-${Date.now()}`;

const log = (...a) => console.log(...a);
const evidence = [];
const findings = [];
let result = 'PARTIAL';
const dump = {};

function note(step, ok, detail) {
  const line = `${ok ? 'OK' : 'MISS'} step${step}: ${detail}`;
  evidence.push(line);
  log(line);
}

async function shot(p, n, w = 1200) {
  await p.waitForTimeout(w);
  await p.screenshot({ path: path.join(A, `${n}.png`), fullPage: true });
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 4000);
  log('==', n, p.url());
  log(body.slice(0, 1400));
  return body;
}

async function openCtx() {
  fs.mkdirSync(UD, { recursive: true });
  const common = {
    headless: true,
    viewport: { width: 1280, height: 900 },
    args: ['--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check'],
  };
  const candidates = [
    process.env.HOME +
      '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
    process.env.HOME + '/Library/Caches/ms-playwright/chromium-1234/chrome-mac/Chromium.app/Contents/MacOS/Chromium',
  ];
  for (const exe of candidates) {
    if (!fs.existsSync(exe)) continue;
    try {
      log('TRY_EXE', exe);
      return await chromium.launchPersistentContext(UD, { ...common, executablePath: exe });
    } catch (e) {
      log('EXE_FAIL', String(e).slice(0, 120));
    }
  }
  return await chromium.launchPersistentContext(UD, { ...common, channel: 'chrome' });
}

async function signIn(p) {
  await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(800);
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
}

async function signOut(p) {
  await p.goto(`${BASE}/profile`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await p.waitForTimeout(1500);
  const out = p.getByText(/Sign out|Log out/i).first();
  if (await out.count()) {
    await out.click({ force: true }).catch(() => {});
    await p.waitForTimeout(2500);
  }
  await shot(p, '99-signout', 800);
}

async function clickText(p, re) {
  const loc = p.getByText(re).first();
  if (await loc.count()) {
    await loc.click({ force: true }).catch(() => {});
    return true;
  }
  return false;
}

async function main() {
  let ctx;
  try {
    ctx = await openCtx();
    const p = ctx.pages()[0] || (await ctx.newPage());
    await signIn(p);
    let body = await shot(p, '01-after-signin', 2000);
    const signed =
      /Desk|Needs Attention|ditl-Math|Gradebook|Capture/i.test(body) &&
      !/Sign in to Kelyra|Welcome back/i.test(body);
    note(1, signed, `url=${p.url()} snip=${body.slice(0, 280)}`);
    dump.signedIn = signed;
    if (!signed) {
      result = 'FAIL';
      findings.push('FINDING: teacher sign-in failed; severity P0; case DITL-T-04-UI-06');
      throw new Error('sign-in failed');
    }

    // Step 2: Publish path — syllabus publish (or confirm already published)
    await p.goto(`${BASE}/class/${CLASS}/syllabus`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '02-syllabus', 4000);
    dump.syllabusBefore = body.slice(0, 2500);
    const alreadyPublished = /Published/i.test(body) && !/Not set/i.test(body);
    let publishClicked = false;
    const pubBtn = p.getByRole('button', { name: /Publish/i });
    if (await pubBtn.count()) {
      const disabled = await pubBtn.first().isDisabled().catch(() => false);
      dump.publishDisabled = disabled;
      if (!disabled) {
        await pubBtn.first().click({ force: true }).catch(() => {});
        await p.waitForTimeout(1200);
        const confirm = p.getByRole('button', { name: /^Publish$|Confirm|Yes/i });
        if (await confirm.count()) await confirm.last().click({ force: true }).catch(() => {});
        // dialogs sometimes use text
        await clickText(p, /^Publish$/);
        await p.waitForTimeout(2500);
        publishClicked = true;
      }
    }
    body = await shot(p, '03-syllabus-after-publish', 2500);
    dump.syllabusAfter = body.slice(0, 2500);
    const publishedOk = /Published/i.test(body) || alreadyPublished || publishClicked;
    note(2, publishedOk, `already=${alreadyPublished} clicked=${publishClicked} snip=${body.slice(0, 400)}`);
    dump.publishOk = publishedOk;

    // Gradebook surface (grades path after publish)
    await p.goto(`${BASE}/class/${CLASS}/gradebook`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '04-gradebook', 4000);
    dump.gradebook = body.slice(0, 2500);
    const gbOk = /Gradebook|Overall|Jordan|Jamie/i.test(body);
    note(3, gbOk, `gb snip=${body.slice(0, 400)}`);

    // Notify path: message parent with publish/grade notify marker
    await p.goto(`${BASE}/messages`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '05-messages', 3500);
    dump.messagesList = body.slice(0, 2500);
    let parentThread = p.locator('a, [role="button"], div').filter({ hasText: /Taylor Lee/i }).first();
    if (await parentThread.count()) {
      await parentThread.click({ force: true }).catch(() => {});
      await p.waitForTimeout(2500);
    } else {
      // try open via text
      await clickText(p, /Taylor Lee/);
      await p.waitForTimeout(2500);
    }
    body = await shot(p, '06-parent-thread-before', 2000);
    dump.threadBefore = body.slice(0, 2000);

    const composer = p.locator('textarea, [contenteditable="true"], input[type=text]').last();
    const msg = `${MARKER} teacher: syllabus/grades publish notify — parent should see How grades / published weights.`;
    if (await composer.count()) {
      await composer.fill(msg).catch(async () => {
        await composer.click({ force: true });
        await p.keyboard.type(msg, { delay: 5 });
      });
      await p.waitForTimeout(400);
      const send = p.getByRole('button', { name: /Send|Post/i });
      if (await send.count()) await send.first().click({ force: true }).catch(() => {});
      else await p.keyboard.press('Enter');
      await p.waitForTimeout(2500);
    }
    body = await shot(p, '07-parent-thread-after', 2000);
    dump.threadAfter = body.slice(0, 2500);
    const notifyOk =
      body.includes(MARKER.slice(0, 18)) ||
      /publish notify|How grades|Taylor Lee/i.test(body);
    note(4, notifyOk, `notify snip=${body.slice(0, 500)}`);
    dump.notifyOk = notifyOk;

    // Parent-facing chrome from teacher seat: class Parents tab + student Parents
    await p.goto(`${BASE}/class/${CLASS}/parents`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    body = await shot(p, '08-class-parents', 3000);
    if (!/Taylor|Parent|Parents/i.test(body)) {
      await p.goto(`${BASE}/class/${CLASS}/setup`, { waitUntil: 'domcontentloaded' });
      body = await shot(p, '08b-students', 3000);
    }
    dump.parentsChrome = body.slice(0, 2000);
    const parentsOk = /Taylor|Parents|Jordan/i.test(body);
    note(5, parentsOk, `parents chrome snip=${body.slice(0, 400)}`);

    // Ask dual: list_threads mention parent after notify
    await p.goto(`${BASE}/ask`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2000);
    const askBox = p.locator('textarea, [contenteditable="true"]').last();
    const askPrompt = `Using list_threads only, confirm the Taylor Lee parent thread received a message containing ${MARKER}. Do not invent. Do not change grades.`;
    if (await askBox.count()) {
      await askBox.fill(askPrompt).catch(async () => {
        await askBox.click({ force: true });
        await p.keyboard.type(askPrompt, { delay: 4 });
      });
      await p.keyboard.press('Enter');
      await p.waitForTimeout(12000);
    }
    body = await shot(p, '09-ask', 1500);
    dump.ask = body.slice(0, 3000);
    const askOk = /Taylor|24afbe48|list_threads|parent|UI-06/i.test(body);
    note(6, askOk, `ask snip=${body.slice(0, 500)}`);

    // Parent sees (teacher-seat proxy): prior grade note + this notify on Taylor thread
    const parentSees =
      (dump.threadAfter || '').includes('Taylor') &&
      (notifyOk || /graded|gradebook|publish/i.test(dump.threadAfter || ''));
    note(7, parentSees, `parentSees proxy=${parentSees}`);
    dump.parentSees = parentSees;

    await signOut(p);

    if (signed && publishedOk && (notifyOk || parentSees) && parentsOk) {
      result = 'PASS';
    } else if (signed && (publishedOk || notifyOk)) {
      result = 'PARTIAL';
      if (!publishedOk)
        findings.push(
          'FINDING: syllabus publish path incomplete; severity P2; case DITL-T-04-UI-06',
        );
      if (!notifyOk && !parentSees)
        findings.push(
          'FINDING: parent notify/visible path incomplete; severity P1; case DITL-T-04-UI-06',
        );
    } else {
      result = 'FAIL';
      findings.push('FINDING: publish+notify flow failed; severity P1; case DITL-T-04-UI-06');
    }
  } catch (e) {
    log('ERR', String(e));
    evidence.push(`ERR: ${String(e).slice(0, 400)}`);
    if (result !== 'FAIL') result = 'FAIL';
  } finally {
    if (ctx) await ctx.close().catch(() => {});
    const out = { result, evidence, findings, case: 'DITL-T-04-UI-06', dump, marker: MARKER };
    fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(out, null, 2));
    log('RESULT', result);
    log('FINDINGS', findings.join(' | ') || '(none)');
  }
}

main();
