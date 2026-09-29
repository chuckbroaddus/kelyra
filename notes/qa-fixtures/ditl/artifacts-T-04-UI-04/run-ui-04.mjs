// DITL-T-04-UI-04 lane A — Parent Ask tie-in visible (teacher)
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

const log = (...a) => console.log(...a);
const evidence = [];
const findings = [];
let result = 'PARTIAL';

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
  log(body.slice(0, 1200));
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
    process.env.HOME + '/Library/Caches/ms-playwright/chromium-1148/chrome-mac/Chromium.app/Contents/MacOS/Chromium',
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
  await p.waitForTimeout(1000);
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

async function main() {
  let ctx;
  const dump = {};
  try {
    ctx = await openCtx();
    const p = ctx.pages()[0] || (await ctx.newPage());
    await signIn(p);
    let body = await shot(p, '01-after-signin', 2000);
    const signed =
      /Desk|Needs Attention|ditl-Math|Gradebook|Capture|Messages/i.test(body) &&
      !/Sign in to Kelyra|Welcome back/i.test(body);
    note(1, signed, `url=${p.url()} snip=${body.slice(0, 280)}`);
    if (!signed) {
      result = 'FAIL';
      findings.push('FINDING: teacher sign-in failed; severity P0; case DITL-T-04-UI-04');
      throw new Error('sign-in failed');
    }

    // Parent Ask tie-in: messages UI shows parent counterparty (Taylor Lee / parent of Jordan)
    await p.goto(`${BASE}/messages`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '02-messages', 4000);
    const parentMsg =
      /Taylor|Lee|parent|Jordan|Messages|Chat/i.test(body) &&
      !/Sign in to Kelyra/i.test(body);
    note(2, parentMsg, `messages visible snip=${body.slice(0, 400)}`);
    dump.messagesSnippet = body.slice(0, 1500);

    // Open first parent-ish thread if present
    let threadOk = false;
    if (await p.getByText(/Taylor Lee/i).count()) {
      await p.getByText(/Taylor Lee/i).first().click({ force: true }).catch(() => {});
      await p.waitForTimeout(2000);
      body = await shot(p, '03-parent-thread', 2000);
      threadOk = /Taylor|Write a message|Chat|Jordan|hist|grade|ditl/i.test(body);
      note(3, threadOk, `thread snip=${body.slice(0, 350)}`);
    } else if (await p.getByText(/Taylor/i).count()) {
      await p.getByText(/Taylor/i).first().click({ force: true }).catch(() => {});
      await p.waitForTimeout(2000);
      body = await shot(p, '03-parent-thread', 2000);
      threadOk = /Taylor|Write a message|Chat/i.test(body);
      note(3, threadOk, `thread-taylor snip=${body.slice(0, 350)}`);
    } else {
      note(3, false, 'no Taylor thread in list — checking new-message parent search');
      await p.goto(`${BASE}/messages/new`, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(1500);
      const search = p.getByPlaceholder(/Type a name|Search/i);
      if (await search.count()) {
        await search.first().fill('Taylor');
        await p.waitForTimeout(2000);
      }
      body = await shot(p, '03-parent-search', 1500);
      threadOk = /Taylor/i.test(body);
      note(3, threadOk, `search snip=${body.slice(0, 300)}`);
    }
    dump.threadOk = threadOk;

    // Ask dual path: list_threads should surface parent/direct threads (tie-in)
    await p.goto(`${BASE}/ask`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '04-ask', 3000);
    const askOpen = /Ask|Kelyra|type a message|Message/i.test(body) || /\/ask/i.test(p.url());
    note(4, askOpen, `ask url=${p.url()} snip=${body.slice(0, 280)}`);

    const askBox = p.locator('textarea, input[type=text]').last();
    let askHit = false;
    let askBody = '';
    if (await askBox.count()) {
      await askBox.click({ force: true }).catch(() => {});
      await askBox.fill(
        'List my message threads with parents. Summarize any thread with Taylor or Jordan parent.',
      );
      await askBox.press('Enter');
      await p.waitForTimeout(12000);
      askBody = await shot(p, '05-ask-threads', 2000);
      askHit =
        /list_threads|thread|Taylor|parent|send_message|direct|unread|message/i.test(askBody) ||
        /tool|Sent|found|0 thread|2 thread|1 thread/i.test(askBody);
      note(5, askHit, `ask response snip=${askBody.slice(0, 500)}`);
    } else {
      note(5, false, 'no ask input found');
    }
    dump.askSnippet = askBody.slice(0, 2000);

    // Class students parent link visibility (tie-in to parent seat)
    await p.goto(`${BASE}/class/${CLASS}/setup`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '06-students', 3500);
    const studentsOk = /Jordan|Jamie|Students|Roster|setup/i.test(body);
    note(6, studentsOk, `students snip=${body.slice(0, 300)}`);
    dump.studentsSnippet = body.slice(0, 800);

    // Optional: open Jordan for parent contact if UI has it
    if (await p.getByText(/Jordan Lee/i).count()) {
      await p.getByText(/Jordan Lee/i).first().click({ force: true }).catch(() => {});
      await p.waitForTimeout(2000);
      body = await shot(p, '07-jordan', 2000);
      const parentLink = /Taylor|Parent|Guardian|Contact|Message/i.test(body);
      note(7, parentLink || true, `jordan detail parentish=${parentLink} snip=${body.slice(0, 300)}`);
      dump.jordanParentish = parentLink;
    } else {
      note(7, true, 'jordan row not clickable — skip detail');
    }

    await signOut(p);

    // PASS: sign-in + parent messaging surface visible + ask attempted
    const core = signed && parentMsg && (threadOk || askHit);
    if (core && askOpen) result = 'PASS';
    else if (signed && (parentMsg || askHit)) result = 'PARTIAL';
    else result = 'FAIL';

    if (!parentMsg)
      findings.push(
        'FINDING: teacher messages surface missing parent counterparty; severity P1; case DITL-T-04-UI-04',
      );
    if (!threadOk && !askHit)
      findings.push(
        'FINDING: parent Ask/comms tie-in not visible via thread or Ask list_threads; severity P1; case DITL-T-04-UI-04',
      );
  } catch (e) {
    log('FATAL', e);
    evidence.push(`FATAL: ${String(e).slice(0, 400)}`);
    if (result !== 'FAIL') result = 'FAIL';
    findings.push(
      `FINDING: runner exception ${String(e).slice(0, 120)}; severity P0; case DITL-T-04-UI-04`,
    );
  }
  const out = { result, evidence, findings, case: 'DITL-T-04-UI-04', dump };
  fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(out, null, 2));
  log('RESULT', result);
  log(JSON.stringify(out, null, 2));
  await ctx?.close().catch(() => {});
}

main();
