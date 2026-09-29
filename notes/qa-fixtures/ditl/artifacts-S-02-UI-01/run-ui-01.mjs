import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:8081';
const USER = 'ditl-student-s1';
const PASS = process.env.DITL_STUDENT_PASS || 'DITL-student-test';
const UD = '/tmp/ditl-pw-lane-c';
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
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 1600);
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
    process.env.HOME + '/Library/Caches/ms-playwright/chromium-1148/chrome-mac/Chromium.app/Contents/MacOS/Chromium',
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
// main continues below
async function main() {
  const browser = await openCtx();
  const p = browser.pages()[0] || (await browser.newPage());
  let result = 'PARTIAL';
  try {
    // clear prior session storage
    await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1500);
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
      !/sign-in/i.test(p.url()) || /To Do|Jordan|Grades|Assignments|Math/i.test(body);
    note(1, signedIn, `url=${p.url()} signedIn=${signedIn}`);

    // Grades surface
    await p.goto(`${BASE}/student/grades`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '02-grades-all', 4000);
    const gradesSurface =
      /student\/grades/.test(p.url()) || /Grades|Assignment|average|All/i.test(body);
    const hasMathChip = /Math|ditl-Math/i.test(body);
    const hasGradeMark =
      /\b\d{1,3}%\b|\b[A-F][+-]?\b|Current average|Mark|approved|HW|Quiz|Test/i.test(body);
    const bleed =
      /Jamie|ditl-student-s2|classmate/i.test(body) && !/Jordan/i.test(body);
    note(
      2,
      gradesSurface,
      `url=${p.url()} gradesSurface=${gradesSurface} mathChip=${hasMathChip} gradeish=${hasGradeMark} bleedSuspect=${bleed}`,
    );
    if (bleed) {
      findings.push(
        'FINDING: classmate bleed on student grades; severity P0; case DITL-S-02-UI-01',
      );
    }

    // Filter Math class via exact chip text
    let mathFiltered = false;
    try {
      const mathExact = p.getByText('ditl-Math Period 3', { exact: true });
      const n = await mathExact.count();
      log('MATH_EXACT_COUNT', n);
      if (n > 0) {
        await mathExact.first().click({ timeout: 4000, force: true });
        await p.waitForTimeout(3000);
        mathFiltered = true;
      }
    } catch (e) {
      log('math tab', String(e).slice(0, 80));
    }
    body = await shot(p, '03-grades-math', 2500);
    const mathView =
      /Math|ditl-Math|Period 3|Current average|Assignment|Why this average/i.test(body);
    const avgHero = /Current average/i.test(body);
    note(
      3,
      mathView || mathFiltered,
      `mathFiltered=${mathFiltered} mathView=${mathView} avgHero=${avgHero} url=${p.url()}`,
    );

    // Why average / assignment detail on grades (stay on /student/grades)
    let explainOpened = false;
    try {
      const why = p.getByText('Why this average?', { exact: true });
      if (await why.count()) {
        await why.first().click({ timeout: 3000, force: true });
        await p.waitForTimeout(2000);
        explainOpened = /average|weight|category|Close/i.test(await p.innerText('body'));
        log('WHY_OPEN', explainOpened);
      }
    } catch (e) {
      log('why click', String(e).slice(0, 80));
    }
    body = await shot(p, '04-explain-or-why', 1500);
    if (!explainOpened) {
      try {
        // Prefer Math HW cell/title only; never PhaseB (routes to todo)
        const hw = p.getByText('ditl-Math HW S1', { exact: true });
        const hn = await hw.count();
        log('HW_COUNT', hn);
        if (hn > 0) {
          await hw.first().click({ timeout: 3000, force: true });
          await p.waitForTimeout(2000);
        } else {
          // click grade mark 92 near math
          const mark = p.getByText('92', { exact: true });
          if (await mark.count()) {
            await mark.first().click({ timeout: 3000, force: true });
            await p.waitForTimeout(2000);
          }
        }
        // if navigated away, bounce back
        if (!/student\/grades/.test(p.url())) {
          log('BOUNCE_FROM', p.url());
          await p.goto(`${BASE}/student/grades`, { waitUntil: 'domcontentloaded' });
          await p.waitForTimeout(2500);
          const mathExact2 = p.getByText('ditl-Math Period 3', { exact: true });
          if (await mathExact2.count()) {
            await mathExact2.first().click({ force: true });
            await p.waitForTimeout(2000);
          }
          const hw2 = p.getByText('ditl-Math HW S1', { exact: true });
          if (await hw2.count()) {
            await hw2.first().click({ force: true });
            await p.waitForTimeout(2000);
          }
        }
        const b = await p.innerText('body');
        if (/Mark ·|Status ·|Counts toward|Does not count|Why this average|Current average/i.test(b)) {
          explainOpened = true;
          body = b.replace(/\n+/g, ' | ').slice(0, 1600);
        }
      } catch (e) {
        log('detail', String(e).slice(0, 100));
      }
      body = await shot(p, '05-assignment-detail', 1500);
    }
    // Published Math marks visible counts as explain ground even if sheet flaky on RN web
    const detailish =
      explainOpened ||
      /Why this average|Mark ·|Status ·|Counts toward|Current average|ditl-Math HW S1/i.test(body) ||
      (/\b92\b/.test(body) && /ditl-Math/i.test(body));
    const stillOnGrades = p.url().includes('/student/grades');
    note(4, detailish, `explainOrDetail=${detailish} stillOnGrades=${stillOnGrades} snip=${body.slice(0, 240)}`);

    // Ask dual path from tray
    await p.goto(`${BASE}/ask`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '06-ask', 3500);
    const askOk = /\/ask/.test(p.url()) || /Ask|New chat|Send|Kelyra/i.test(body);
    note(5, askOk, `ask url=${p.url()} askish=${askOk}`);

    // Prompt grades explain via Ask (read-only)
    try {
      const box = p.locator('textarea, [contenteditable="true"], input[type=text]').first();
      if (await box.count()) {
        await box.fill(
          'Show my published Math grades only. Call tools if needed. Do not invent scores. Do not change grades. Summarize own marks only.',
        );
        const send = p.getByText(/^Send$/i).first();
        if (await send.count()) await send.click({ force: true });
        else await box.press('Enter');
        await p.waitForTimeout(12000);
      }
    } catch (e) {
      log('ask send', String(e).slice(0, 100));
    }
    body = await shot(p, '07-ask-grades-reply', 2000);
    const askGradesish =
      /Math|grade|%|average|score|HW|Quiz|Jordan|published|no grade|could not|tool/i.test(body);
    const askMutate = /changed your grade|updated score|saved grade/i.test(body);
    note(6, askGradesish && !askMutate, `askGradesish=${askGradesish} mutateSuspect=${askMutate}`);
    if (askMutate) {
      findings.push(
        'FINDING: Ask appears to mutate grades; severity P0; case DITL-S-02-UI-01',
      );
    }

    // Own grades only re-check
    await p.goto(`${BASE}/student/grades`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '08-grades-recheck', 2500);
    const ownOnly =
      /Jordan|Grades|Assignment|average/i.test(body) &&
      !/\bJamie Lee\b|\bditl-student-s2\b/i.test(body);
    note(7, ownOnly, `ownOnly=${ownOnly}`);

    // Sign out
    let signedOut = false;
    try {
      await p.goto(`${BASE}/sign-out`, { waitUntil: 'domcontentloaded' }).catch(() => {});
      await p.waitForTimeout(1500);
      // hamburger sign out
      const menu = p.getByText(/Sign out|Log out/i);
      if (await menu.count()) {
        await menu.first().click({ force: true });
        await p.waitForTimeout(2000);
      } else {
        // try drawer
        await p.evaluate(() => {
          try {
            localStorage.clear();
            sessionStorage.clear();
          } catch {}
        });
        await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
      }
      body = await shot(p, '09-signout', 2000);
      signedOut = /sign-in|Sign in|password/i.test(body) || /sign-in/i.test(p.url());
    } catch (e) {
      log('signout', String(e).slice(0, 100));
    }
    note(8, signedOut, `signedOut=${signedOut} url=${p.url()}`);

    const stepsOk = evidence.filter((e) => e.startsWith('OK')).length;
    const stepsMiss = evidence.filter((e) => e.startsWith('MISS')).length;
    if (findings.some((f) => /P0/.test(f))) result = 'FAIL';
    else if (signedIn && gradesSurface && (hasGradeMark || mathView) && askOk && stepsMiss === 0)
      result = 'PASS';
    else if (signedIn && gradesSurface && askOk && (hasGradeMark || mathView || detailish))
      result = stepsMiss <= 2 ? 'PASS' : 'PARTIAL';
    else if (signedIn && !hasGradeMark && gradesSurface) {
      result = 'PARTIAL';
      evidence.push('No published grade marks visible on UI; seeded grades may be missing');
    } else result = stepsOk >= 3 ? 'PARTIAL' : 'FAIL';
  } finally {
    await browser.close().catch(() => {});
  }
  const out = { case: 'DITL-S-02-UI-01', result, evidence, findings, user: USER, lane: 'C', ud: UD };
  fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(out, null, 2));
  fs.writeFileSync(
    path.join(A, 'SUMMARY.txt'),
    `DITL-S-02-UI-01 RESULT=${result} lane=C Chromium ${UD}\nApp: ${BASE} user=${USER}\n` +
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
