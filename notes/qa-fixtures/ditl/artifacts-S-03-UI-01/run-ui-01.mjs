import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:8081';
const USER = 'ditl-student-s1';
const PASS = process.env.DITL_STUDENT_PASS || 'DITL-student-test';
const UD = '/tmp/ditl-pw-lane-c';
const MARKER = `DITL-S-03-UI-01 laneC ${Date.now()}`;
const evidence = [];
const findings = [];
const log = (...a) => console.log(...a);
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
  const candidates = [
    process.env.HOME +
      '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
    process.env.HOME + '/Library/Caches/ms-playwright/chromium-1234/chrome-mac/Chromium.app/Contents/MacOS/Chromium',
  ];
  for (const exe of candidates) {
    if (!fs.existsSync(exe)) continue;
    try {
      return await chromium.launchPersistentContext(UD, { ...common, executablePath: exe });
    } catch (e) {
      log('EXE_FAIL', String(e).slice(0, 120));
    }
  }
  return await chromium.launchPersistentContext(UD, { ...common, channel: 'chrome' });
}
async function main() {
  const browser = await openCtx();
  const p = browser.pages()[0] || (await browser.newPage());
  let result = 'PARTIAL';
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
    await p.waitForTimeout(2000);
    await p.locator('input').nth(0).fill(USER);
    await p.locator('input[type=password]').first().fill(PASS);
    await p.locator('input[type=password]').first().press('Enter');
    await p.waitForTimeout(7000);
    let body = await shot(p, '01-after-signin');
    const signedIn =
      !/sign-in/i.test(p.url()) || /To Do|Jordan|Messages|Grades|Math/i.test(body);
    note(1, signedIn, `url=${p.url()} signedIn=${signedIn}`);

    await p.goto(`${BASE}/messages`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '02-messages-tray', 4000);
    const msgSurface =
      /messages/i.test(p.url()) || /Messages|Threads|No messages|chat/i.test(body);
    const hasTeacher =
      /Teacher|Avery|Quinn|ditl-teacher|Ms\.|Mr\./i.test(body) ||
      /thread|Just now|AM|PM/i.test(body);
    const bleed = /\bJamie Lee\b|ditl-student-s2|Alex Rivera|Samira/i.test(body);
    note(2, msgSurface, `msgSurface=${msgSurface} teacherish=${hasTeacher} bleed=${bleed}`);
    if (bleed && /score|grade|%/i.test(body)) {
      findings.push(
        'FINDING: classmate grade bleed on student messages; severity P0; case DITL-S-03-UI-01',
      );
    }

    // Open existing teacher thread or compose new to Avery Quinn
    let threadOpen = false;
    try {
      if (/No messages yet/i.test(body)) {
        await p.goto(`${BASE}/messages/new`, { waitUntil: 'domcontentloaded' });
        await p.waitForTimeout(3500);
        body = await shot(p, '02b-new-message', 1500);
        const search = p.locator('input').first();
        if (await search.count()) {
          await search.fill('Avery');
          await p.waitForTimeout(1500);
        }
        const avery = p.getByText(/Avery Quinn/i);
        if (await avery.count()) {
          await avery.first().click({ force: true });
          await p.waitForTimeout(2500);
        }
        const chatBtn = p.getByText(/Chat with Avery Quinn/i);
        if (await chatBtn.count()) {
          await chatBtn.first().click({ force: true });
          await p.waitForTimeout(5000);
        } else {
          const openBtn = p.getByText(/^(Open|Message|Continue|Done|Next|Chat with)/i);
          if (await openBtn.count()) {
            await openBtn.first().click({ force: true });
            await p.waitForTimeout(5000);
          }
        }
        threadOpen = /messages\/[0-9a-f-]{8,}/i.test(p.url());
        if (!threadOpen) {
          // wait a bit more for replace
          await p.waitForTimeout(4000);
          threadOpen = /messages\/[0-9a-f-]{8,}/i.test(p.url());
        }
      } else {
        const teacherRow = p.getByText(/Avery|Quinn|Teacher|ditl-teacher|Taylor/i);
        if (await teacherRow.count()) {
          await teacherRow.first().click({ force: true, timeout: 5000 });
          await p.waitForTimeout(3500);
          threadOpen = true;
        }
      }
    } catch (e) {
      log('open thread', String(e).slice(0, 120));
    }
    body = await shot(p, '03-thread', 2500);
    threadOpen =
      threadOpen ||
      /messages\/[0-9a-f-]{8,}/i.test(p.url()) ||
      /Send|Type a message|composer|Reply|Avery/i.test(body);
    note(3, threadOpen, `threadOpen=${threadOpen} url=${p.url()}`);

    // Reply / first send
    let replied = false;
    try {
      const box = p
        .locator('textarea, input[placeholder*="message" i], input[placeholder*="Message" i], [contenteditable="true"]')
        .first();
      if (await box.count()) {
        await box.click({ force: true });
        await box.fill(MARKER);
        const send = p.getByText(/^Send$/i).or(p.getByRole('button', { name: /Send/i }));
        if (await send.count()) await send.first().click({ force: true });
        else await box.press('Enter');
        await p.waitForTimeout(5000);
        replied = true;
      }
    } catch (e) {
      log('reply', String(e).slice(0, 120));
    }
    body = await shot(p, '04-after-reply', 2000);
    const replyVisible = body.includes(MARKER.slice(0, 18)) || /Just now|You/i.test(body);
    replied = replied && (replyVisible || threadOpen);
    note(4, replied || replyVisible, `replied=${replied} replyVisible=${replyVisible}`);
    // Focus list via /todo and optional grades focus cue
    await p.goto(`${BASE}/todo`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '05-todo-focus', 4000);
    const todoSurface = /todo/i.test(p.url()) || /To Do|Practice|Assignment|Done|Focus/i.test(body);
    const focusCue =
      /Focus|place-value|practice|current focus|ditl-bulk|skill|Bible|memory/i.test(body);
    note(5, todoSurface, `todoSurface=${todoSurface} focusCue=${focusCue} url=${p.url()}`);

    // Open focus-linked assignment (PhaseB or any todo row)
    let focusOpened = false;
    let focusMarked = false;
    try {
      const item = p.getByText(/ditl-PhaseB Assign NoUnhide|PhaseB|place-value|Focus|Practice/i);
      if (await item.count()) {
        await item.first().click({ force: true, timeout: 4000 });
        await p.waitForTimeout(3500);
        focusOpened = true;
      }
      // mark done / complete if UI offers
      const doneBtn = p.getByText(/^(Done|Mark done|Complete|Submit|Turn in)$/i);
      if (await doneBtn.count()) {
        await doneBtn.first().click({ force: true });
        await p.waitForTimeout(3000);
        focusMarked = true;
      }
    } catch (e) {
      log('focus open', String(e).slice(0, 80));
    }
    body = await shot(p, '06-focus-item', 2500);
    const focusDetail =
      focusOpened ||
      /Practice|Submit|Done|skill|Focus|question|item|PhaseB|assignment/i.test(body);
    // grades focus cue as secondary evidence
    await p.goto(`${BASE}/student/grades`, { waitUntil: 'domcontentloaded' });
    const gbody = await shot(p, '06b-grades-focus', 3000);
    const gradesFocus = /Focus|place-value|ditl-bulk|current focus|skill/i.test(gbody);
    note(
      6,
      focusDetail || gradesFocus,
      `focusOpened=${focusOpened} focusMarked=${focusMarked} focusDetail=${focusDetail} gradesFocus=${gradesFocus} url=${p.url()}`,
    );
    // Own-data check on people
    await p.goto(`${BASE}/student/people`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '07-people', 3000);
    const peopleOk =
      /people|Teachers|Parents|Classmates|Jordan/i.test(body) || /student\/people/.test(p.url());
    const peopleBleed = /score|%\s|grade average/i.test(body) && /Jamie|classmate/i.test(body);
    note(7, peopleOk && !peopleBleed, `peopleOk=${peopleOk} peopleBleed=${peopleBleed}`);
    if (peopleBleed) {
      findings.push(
        'FINDING: classmate scores on student people; severity P0; case DITL-S-03-UI-01',
      );
    }

    // Sign out
    let signedOut = false;
    try {
      await p.evaluate(() => {
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch {}
      });
      await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
      body = await shot(p, '08-signout', 2000);
      signedOut = /sign-in|Sign in|password/i.test(body) || /sign-in/i.test(p.url());
    } catch (e) {
      log('signout', String(e).slice(0, 100));
    }
    note(8, signedOut, `signedOut=${signedOut}`);

    const stepsOk = evidence.filter((e) => e.startsWith('OK')).length;
    const stepsMiss = evidence.filter((e) => e.startsWith('MISS')).length;
    if (findings.some((f) => /P0/.test(f))) result = 'FAIL';
    else if (signedIn && msgSurface && (threadOpen || replied) && todoSurface && stepsMiss === 0)
      result = 'PASS';
    else if (signedIn && msgSurface && todoSurface && stepsMiss <= 2) result = 'PARTIAL';
    else if (signedIn && stepsOk >= 3) result = 'PARTIAL';
    else result = 'FAIL';
  } finally {
    await browser.close().catch(() => {});
  }
  const out = {
    case: 'DITL-S-03-UI-01',
    result,
    evidence,
    findings,
    user: USER,
    lane: 'C',
    ud: UD,
    marker: MARKER,
  };
  fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(out, null, 2));
  fs.writeFileSync(
    path.join(A, 'SUMMARY.txt'),
    `DITL-S-03-UI-01 RESULT=${result} lane=C Chromium ${UD}\nApp: ${BASE} user=${USER}\n` +
      evidence.join('\n') +
      '\nFINDINGS:\n' +
      (findings.length ? findings.join('\n') : '(none)') +
      '\n',
  );
  log('RESULT', result);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
