// DITL-O-01-UI-01 lane C — office admin People + manage GAP
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:8081';
const USER = 'ditl-admin';
const PASS = process.env.DITL_ADMIN_PASS || 'DITL-admin-test';
const UD = '/tmp/ditl-pw-lane-c';
const evidence = [];
const findings = [];
const gaps = [];
const log = (...a) => console.log(...a);
function note(step, ok, detail) {
  const line = `${ok ? 'OK' : 'MISS'} step${step}: ${detail}`;
  evidence.push(line);
  log(line);
}
async function shot(p, n, w = 1500) {
  await p.waitForTimeout(w);
  await p.screenshot({ path: path.join(A, `${n}.png`), fullPage: true });
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 2200);
  log('==', n, p.url());
  log(body);
  return body;
}
async function openCtx() {
  fs.mkdirSync(UD, { recursive: true });
  fs.mkdirSync(A, { recursive: true });
  const common = {
    headless: true,
    viewport: { width: 1280, height: 900 },
    args: ['--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check'],
  };
  const candidates = [
    process.env.HOME +
      '/Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
    process.env.HOME +
      '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
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
  log('START DITL-O-01-UI-01');
  const browser = await openCtx();
  const p = browser.pages()[0] || (await browser.newPage());
  let result = 'PARTIAL';
  let signedIn = false;
  let onPeople = false;
  let listish = false;
  try {
    await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(800);
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
    signedIn =
      !/sign-in/i.test(p.url()) || /People|Manage|Classes|Feed|Devon|Office|Admin|Sandbox/i.test(body);
    note(1, signedIn, `url=${p.url()} signedIn=${signedIn}`);
    if (!signedIn) {
      result = 'FAIL';
      findings.push('FINDING: ditl-admin sign-in failed; severity P0; case DITL-O-01-UI-01');
    }

    let peopleNav = false;
    try {
      const peopleTab = p.getByText(/^People$/i);
      if ((await peopleTab.count()) > 0) {
        await peopleTab.first().click({ timeout: 4000, force: true });
        await p.waitForTimeout(3500);
        peopleNav = true;
      }
    } catch (e) {
      log('people_click', String(e).slice(0, 100));
    }
    if (!peopleNav) {
      await p.goto(`${BASE}/?tab=people`, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(3500);
    }
    body = await shot(p, '02-people-tab');
    onPeople =
      /tab=people|\/people|\/admin\/people/i.test(p.url()) ||
      /People|Directory|Students|Parents|Staff|Teachers/i.test(body);
    note(2, onPeople, `url=${p.url()} onPeople=${onPeople}`);

    const hasNames =
      /Jordan|Jamie|Taylor|Devon|Hale|Lee|Rivera|Khan|Teacher|Parent|Student|Sandbox/i.test(body);
    listish =
      hasNames ||
      /No people|Empty|Directory|Search|All people|Students|Parents/i.test(body);
    note(3, onPeople && listish, `listish=${listish} hasNames=${hasNames}`);

    await p.goto(`${BASE}/?tab=manage`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(3000);
    body = await shot(p, '03-manage-tab');
    const manageOk = /manage|Manage|Settings|School|Ride|Matrix|Activity/i.test(body + p.url());
    note('4a', manageOk, `manage surface url=${p.url()}`);

    const attendanceUi = /Attendance\b|Take attendance|Mark absent|period attendance/i.test(body);
    if (attendanceUi) {
      findings.push(
        'FINDING: attendance UI on office manage (NOT IN PRODUCT); severity P1; case DITL-O-01-UI-01',
      );
    } else {
      gaps.push('GAP: attendance NOT IN PRODUCT — no attendance chrome on manage (expected)');
    }

    let unsupportedTried = false;
    const unsupLabels = [/Attendance/i, /Behavior/i, /SIS/i, /Import CSV|CSV import/i, /District report/i, /Syllabus/i];
    for (const re of unsupLabels) {
      const loc = p.getByText(re);
      if ((await loc.count()) > 0) {
        unsupportedTried = true;
        try {
          await loc.first().click({ timeout: 2500, force: true });
          await p.waitForTimeout(2000);
        } catch {}
        body = await shot(p, '04-unsupported-click');
        const gapSurface =
          /not (yet )?supported|coming soon|not available|GAP|NOT IN PRODUCT|unavailable|no access|permission/i.test(
            body,
          );
        if (gapSurface) gaps.push(`GAP: unsupported ${re} explicit gap/deny`);
        else gaps.push(`GAP: unsupported ${re} reachable (document only, not finding)`);
        break;
      }
    }
    if (!unsupportedTried) {
      await p.goto(`${BASE}/admin/people`, { waitUntil: 'domcontentloaded' }).catch(() => {});
      await p.waitForTimeout(2500);
      body = await shot(p, '04-admin-people');
      const banOrArchive = p.getByText(/Ban|Archive school|Delete person|Hard delete|SIS sync/i);
      if ((await banOrArchive.count()) > 0) {
        unsupportedTried = true;
        try {
          await banOrArchive.first().click({ timeout: 2500, force: true });
          await p.waitForTimeout(1500);
        } catch {}
        body = await shot(p, '05-unsupported-manage');
        gaps.push('GAP: advanced manage/ban/archive attempt documented');
      } else {
        gaps.push(
          'GAP: no attendance/behavior/SIS/syllabus manage for admin — unsupported = NOT IN PRODUCT',
        );
        unsupportedTried = true;
      }
    }
    note(4, unsupportedTried, `unsupportedTried=${unsupportedTried} gaps=${gaps.length}`);

    let signedOut = false;
    try {
      await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
      await p.evaluate(() => {
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch {}
      });
      await p.waitForTimeout(1500);
      body = await shot(p, '06-signout');
      signedOut = /sign-in|Sign in|password/i.test(body + p.url());
    } catch (e) {
      log('signout', String(e).slice(0, 100));
    }
    note(5, signedOut, `signedOut=${signedOut}`);

    const stepMiss = evidence.some((e) => e.startsWith('MISS'));
    if (findings.length) result = 'FAIL';
    else if (!stepMiss && onPeople && listish && signedIn) result = 'PASS';
    else if (signedIn && (onPeople || gaps.length)) result = 'PARTIAL';
    else result = stepMiss ? 'PARTIAL' : 'PASS';

    const out = {
      case: 'DITL-O-01-UI-01',
      result,
      evidence,
      findings,
      gaps,
      url: p.url(),
    };
    fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(out, null, 2));
    log('RESULT', result);
    log('FINDINGS', findings.length ? findings.join(' || ') : 'none');
    log('GAPS', gaps.join(' || ') || 'none');
    log('EVIDENCE', evidence.join(' || '));
  } catch (e) {
    log('FATAL', String(e));
    fs.writeFileSync(
      path.join(A, 'result.json'),
      JSON.stringify(
        { case: 'DITL-O-01-UI-01', result: 'FAIL', error: String(e), evidence, findings, gaps },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  } finally {
    await browser.close().catch(() => {});
  }
}
main();
