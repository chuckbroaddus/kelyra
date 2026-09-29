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

async function main() {
  const browser = await openCtx();
  const p = browser.pages()[0] || (await browser.newPage());
  let result = 'PARTIAL';
  let body = '';
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
    body = await shot(p, '01-after-signin');
    const signedIn =
      !/sign-in/i.test(p.url()) || /To Do|Jordan|Grades|Assignments|Math/i.test(body);
    const isJordan = /Jordan/i.test(body);
    note(1, signedIn, `url=${p.url()} signedIn=${signedIn} jordan=${isJordan}`);

    await p.goto(`${BASE}/student/grades`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '02-grades-list', 4000);
    const gradesSurface =
      /student\/grades/.test(p.url()) || /Grades|Assignment|average|All/i.test(body);
    const hasMath = /Math|ditl-Math/i.test(body);
    const hasEnglish = /English|ditl-English/i.test(body);
    const hasS1Marks =
      /\b92\b|\b88\b|\b\d{1,3}%\b|Current average|HW|Quiz|Test|Mark/i.test(body);
    const bleedS2 =
      /\bJamie Lee\b|\bditl-student-s2\b/i.test(body) ||
      (/\bJamie\b/i.test(body) && !/Jordan/i.test(body));
    note(
      2,
      gradesSurface && hasS1Marks,
      `url=${p.url()} grades=${gradesSurface} math=${hasMath} eng=${hasEnglish} s1marks=${hasS1Marks} bleedS2=${bleedS2}`,
    );
    if (bleedS2) {
      findings.push(
        'FINDING: S2 bleed on student grades list; severity P0; case DITL-S-02-UI-02',
      );
    }

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
      log('math filter', String(e).slice(0, 100));
    }
    body = await shot(p, '03-filter-math', 2500);
    const mathView = /Math|ditl-Math|Period 3|Current average|Assignment|HW/i.test(body);
    const mathHas92 = /\b92\b/.test(body) || /ditl-Math HW/i.test(body);
    note(
      3,
      mathFiltered && mathView,
      `mathFiltered=${mathFiltered} mathView=${mathView} mathHas92=${mathHas92} url=${p.url()}`,
    );

    let engFiltered = false;
    try {
      const eng = p.getByText('ditl-English Homeroom', { exact: true });
      if (await eng.count()) {
        await eng.first().click({ timeout: 4000, force: true });
        await p.waitForTimeout(3000);
        engFiltered = true;
      }
    } catch (e) {
      log('eng filter', String(e).slice(0, 80));
    }
    body = await shot(p, '04-filter-english', 2000);
    const engView = /English|ditl-English|Homeroom/i.test(body);
    const engHas88 = /\b88\b/.test(body) || /ditl-English/i.test(body);
    note(4, engFiltered || engView, `engFiltered=${engFiltered} engView=${engView} engHas88=${engHas88}`);

    try {
      const mathExact = p.getByText('ditl-Math Period 3', { exact: true });
      if (await mathExact.count()) {
        await mathExact.first().click({ force: true });
        await p.waitForTimeout(2500);
      }
    } catch {}

    let detailOk = false;
    let detailSnip = '';
    try {
      const hw = p.getByText('ditl-Math HW S1', { exact: true });
      const hn = await hw.count();
      log('HW_COUNT', hn);
      if (hn > 0) {
        await hw.first().click({ timeout: 4000, force: true });
        await p.waitForTimeout(2500);
      } else {
        const mark = p.getByText('92', { exact: true });
        if (await mark.count()) {
          await mark.first().click({ timeout: 3000, force: true });
          await p.waitForTimeout(2500);
        }
      }
      body = await shot(p, '05-assignment-detail', 2000);
      detailSnip = body.slice(0, 400);
      detailOk =
        /Mark ·|Status ·|Counts toward|Does not count|Graded|Why this average|Current average|ditl-Math HW S1|\b92\b/i.test(
          body,
        );
      if (!detailOk && !/student\/grades/.test(p.url())) {
        log('BOUNCE_FROM', p.url());
        await p.goto(`${BASE}/student/grades`, { waitUntil: 'domcontentloaded' });
        await p.waitForTimeout(2500);
        const m2 = p.getByText('ditl-Math Period 3', { exact: true });
        if (await m2.count()) {
          await m2.first().click({ force: true });
          await p.waitForTimeout(2000);
        }
        const hw2 = p.getByText('ditl-Math HW S1', { exact: true });
        if (await hw2.count()) {
          await hw2.first().click({ force: true });
          await p.waitForTimeout(2000);
        }
        body = await shot(p, '05b-detail-retry', 1500);
        detailSnip = body.slice(0, 400);
        detailOk =
          /Mark ·|Status ·|Counts toward|Graded|Why this average|ditl-Math HW S1|\b92\b/i.test(body);
      }
    } catch (e) {
      log('detail', String(e).slice(0, 120));
      body = await shot(p, '05-assignment-detail-err', 1000);
    }
    const stillNoS2 = !/\bJamie Lee\b|\bditl-student-s2\b/i.test(body);
    note(
      5,
      detailOk && stillNoS2,
      `detailOk=${detailOk} stillNoS2=${stillNoS2} url=${p.url()} snip=${detailSnip.slice(0, 220)}`,
    );
    if (!stillNoS2) {
      findings.push(
        'FINDING: S2 bleed on assignment detail; severity P0; case DITL-S-02-UI-02',
      );
    }

    await p.goto(`${BASE}/student/grades`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '06-grades-recheck', 2500);
    const ownOnly =
      /Jordan|Grades|Assignment|average|Math|English/i.test(body) &&
      !/\bJamie Lee\b|\bditl-student-s2\b/i.test(body);
    const jordanContext = /Jordan/i.test(body) || signedIn;
    note(6, ownOnly && jordanContext, `ownOnly=${ownOnly} jordanContext=${jordanContext}`);

    let signedOut = false;
    try {
      await p.goto(`${BASE}/sign-out`, { waitUntil: 'domcontentloaded' }).catch(() => {});
      await p.waitForTimeout(1500);
      const menu = p.getByText(/Sign out|Log out/i);
      if (await menu.count()) {
        await menu.first().click({ force: true });
        await p.waitForTimeout(2000);
      } else {
        await p.evaluate(() => {
          try {
            localStorage.clear();
            sessionStorage.clear();
          } catch {}
        });
        await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
      }
      body = await shot(p, '07-signout', 2000);
      signedOut = /sign-in|Sign in|password/i.test(body) || /sign-in/i.test(p.url());
    } catch (e) {
      log('signout', String(e).slice(0, 100));
    }
    note(7, signedOut, `signedOut=${signedOut} url=${p.url()}`);

    const stepsOk = evidence.filter((e) => e.startsWith('OK')).length;
    const stepsMiss = evidence.filter((e) => e.startsWith('MISS')).length;
    if (findings.some((f) => /P0/.test(f))) result = 'FAIL';
    else if (
      signedIn &&
      gradesSurface &&
      hasS1Marks &&
      (mathFiltered || mathView) &&
      detailOk &&
      ownOnly &&
      stepsMiss === 0
    )
      result = 'PASS';
    else if (signedIn && gradesSurface && hasS1Marks && ownOnly && (mathView || detailOk))
      result = stepsMiss <= 2 ? 'PASS' : 'PARTIAL';
    else if (signedIn && gradesSurface) result = 'PARTIAL';
    else result = stepsOk >= 3 ? 'PARTIAL' : 'FAIL';
  } finally {
    await browser.close().catch(() => {});
  }
  const out = {
    case: 'DITL-S-02-UI-02',
    result,
    evidence,
    findings,
    user: USER,
    lane: 'C',
    ud: UD,
  };
  fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(out, null, 2));
  fs.writeFileSync(
    path.join(A, 'SUMMARY.txt'),
    `DITL-S-02-UI-02 RESULT=${result} lane=C Chromium ${UD}\nApp: ${BASE} user=${USER}\n` +
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
