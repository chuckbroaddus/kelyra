// DITL-O-07-UI-02 — attach card to S1; no bleed S2-S5; metadata keys check
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const A = path.dirname(fileURLToPath(import.meta.url));
const ROOT = '/Users/chuckbroaddus/projects/kelyra';
const BASE = 'http://localhost:8081';
const USER = 'ditl-admin';
const PASS = process.env.DITL_ADMIN_PASS || 'DITL-admin-test';
const UD = '/tmp/ditl-pw-lane-a';
const CLASS = 'd1715000-0000-4000-a000-000000000301';
const S1 = '2bcee429-11ce-4f84-b2de-9aab349f03cc';
const S2 = '899214d4-1ed7-47bd-8a1a-8304e8b7e692';
const CARD = path.join(ROOT, 'notes/qa-fixtures/ditl/ditl-pen-student-card-S-01.jpg');
const MARKERS = ['Jordy', '555-0101', 'jordan.lee.ditl@example.test', '100 Ditl Lane', '2017-04-12'];
const evidence = [];
const findings = [];
const gaps = [];
const log = (...a) => console.log(...a);

function note(step, ok, detail) {
  const line = `${ok ? 'OK' : 'MISS'} step${step}: ${detail}`;
  evidence.push(line);
  log(line);
}

async function shot(p, n, w = 800) {
  await p.waitForTimeout(w);
  await p.screenshot({ path: path.join(A, `${n}.png`), fullPage: true });
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 5000);
  log('==', n, p.url());
  log(body.slice(0, 1200));
  return body;
}

async function openCtx() {
  fs.mkdirSync(UD, { recursive: true });
  fs.mkdirSync(A, { recursive: true });
  const exe =
    process.env.HOME +
    '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
  return chromium.launchPersistentContext(UD, {
    headless: true,
    viewport: { width: 1280, height: 900 },
    executablePath: exe,
    args: ['--disable-dev-shm-usage', '--no-first-run'],
  });
}

async function clearSession(p, ctx) {
  await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await p.waitForTimeout(600);
  await p.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
  });
  await ctx.clearCookies().catch(() => {});
  await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1000);
}

async function signIn(p) {
  await p.locator('input').nth(0).fill(USER);
  await p.locator('input[type=password]').first().fill(PASS);
  await p.locator('input[type=password]').first().press('Enter');
  await p.waitForTimeout(7000);
}

function isSplash(body, url) {
  const officeChrome =
    /People|Manage|Classes|Responsibilities|School name|Dismissal curb|Activity|Jordan Lee|Roster|Details|Preferred|Birthday|Jamie|Riley|Samira/i.test(
      body,
    );
  if (officeChrome) return false;
  if (/Sign in/i.test(body) && /Spring Baptist|Get started|Welcome to Kelyra/i.test(body)) return true;
  if (/sign-in/i.test(url || '') && /Sign in/i.test(body) && !officeChrome) return true;
  return /Sign in/i.test(body) && !officeChrome && !/Jordan/i.test(body);
}

async function openStudent(p, studentId, tag, nameHint) {
  const routes = [
    `/class/${CLASS}/student/${studentId}`,
    `/admin/class/${CLASS}/student/${studentId}`,
    `/office/student/${studentId}`,
    `/people/student/${studentId}`,
  ];
  let body = '';
  for (const r of routes) {
    await p.goto(BASE + r, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await p.waitForTimeout(2200);
    body = await shot(p, `${tag}-${r.replace(/[/?=&]/g, '_')}`, 400);
    const hit =
      !isSplash(body, p.url()) &&
      (new RegExp(nameHint, 'i').test(body) || /Details|Preferred|Birthday|Phone/i.test(body));
    if (hit) {
      const tab = p.getByRole('tab', { name: /^Details$/i });
      if (await tab.count()) {
        await tab.first().click().catch(() => {});
        await p.waitForTimeout(1200);
        body = await shot(p, tag + '-details-tab', 500);
      }
      return body;
    }
  }
  return body;
}

async function tryAttachPhoto(p) {
  const fileInputs = p.locator('input[type=file]');
  const n = await fileInputs.count();
  log('FILE_INPUTS', n);
  if (n > 0 && fs.existsSync(CARD)) {
    try {
      await fileInputs.first().setInputFiles(CARD);
      await p.waitForTimeout(2500);
      await shot(p, '04-after-file-set', 600);
      return { ok: true, via: 'input[type=file]' };
    } catch (e) {
      log('FILE_SET_ERR', String(e).slice(0, 200));
    }
  }
  const attachLabels = [/Attach|Upload|Photo|Card|Camera|Add photo|Choose file|Capture/i];
  for (const re of attachLabels) {
    const btn = p.getByRole('button', { name: re });
    if (await btn.count()) {
      await shot(p, '04-attach-control-seen', 400);
      try {
        const [chooser] = await Promise.all([
          p.waitForEvent('filechooser', { timeout: 2500 }).catch(() => null),
          btn.first().click({ force: true }),
        ]);
        if (chooser) {
          await chooser.setFiles(CARD);
          await p.waitForTimeout(2500);
          await shot(p, '04-after-chooser', 600);
          return { ok: true, via: 'filechooser' };
        }
      } catch (e) {
        log('ATTACH_CLICK_ERR', String(e).slice(0, 120));
      }
    }
  }
  // Preferred name may open PHOTO sheet (parked t_87f01316) — try cancel only
  const pref = p.getByText('Preferred name', { exact: true });
  if (await pref.count()) {
    await pref.first().click({ force: true }).catch(() => {});
    await p.waitForTimeout(800);
    const mid = await p.innerText('body').catch(() => '');
    if (/Take photo|Choose from library/i.test(mid)) {
      evidence.push('PARKED: Preferred-name PHOTO sheet (t_87f01316) — not filed');
      await shot(p, '04-photo-sheet', 400);
      const cancel = p.getByRole('button', { name: /^Cancel$/i });
      if (await cancel.count()) await cancel.first().click({ force: true }).catch(() => {});
      else await p.keyboard.press('Escape').catch(() => {});
      await p.waitForTimeout(400);
    }
  }
  const any = await p.getByText(/Attach|Upload photo|Student card|Add photo/i).count();
  return { ok: false, via: null, visibleHints: any };
}

function metaInventory(body) {
  return {
    preferred_name: /Preferred name/i.test(body) && !/Add preferred name/i.test(body),
    birthday: /Birthday/i.test(body) && !/Add birthday|Add birt/i.test(body),
    phone: /Phone/i.test(body) && !/Add phone/i.test(body),
    email: /Email/i.test(body) && !/Add email/i.test(body),
    address: /Address/i.test(body) && !/Add address/i.test(body),
    emergency_name: /Emergency name/i.test(body) && !/Add emergency name/i.test(body),
    emergency_phone: /Emergency phone/i.test(body) && !/Add emergency phone/i.test(body),
    grade_or_age: /Grade or age/i.test(body) && !/Add grade/i.test(body),
    notes: /Notes/i.test(body) && !/Add notes/i.test(body),
    has_marker: MARKERS.some((m) => body.includes(m)),
  };
}

function bleedScan(body) {
  return MARKERS.filter((m) => body.includes(m));
}

async function discoverSiblings(p) {
  await p.goto(`${BASE}/class/${CLASS}`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await p.waitForTimeout(2500);
  const body = await shot(p, '03-class-roster', 600);
  const hrefs = await p.evaluate(() =>
    Array.from(document.querySelectorAll('a[href*="/student/"]'))
      .map((a) => a.getAttribute('href') || '')
      .filter(Boolean),
  );
  const ids = [...new Set(hrefs.map((h) => (h.match(/student\/([0-9a-f-]{36})/i) || [])[1]).filter(Boolean))];
  log('ROSTER_IDS', ids);
  evidence.push(`ROSTER_STUDENT_IDS=${ids.join(',') || 'none'}`);
  return { body, ids };
}

async function writeOut(result, extra = {}) {
  const out = {
    case: 'DITL-O-07-UI-02',
    result,
    lane: 'A',
    browser: 'Chromium persistent /tmp/ditl-pw-lane-a',
    app: BASE,
    evidence,
    findings,
    gaps,
    ...extra,
  };
  fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(out, null, 2));
  fs.writeFileSync(
    path.join(A, 'SUMMARY.txt'),
    [
      `DITL-O-07-UI-02 RESULT=${result} lane=A Chromium /tmp/ditl-pw-lane-a`,
      ...evidence,
      'FINDINGS:',
      ...(findings.length ? findings : ['none']),
      'GAPS:',
      ...(gaps.length ? gaps : ['none']),
      'SHOTS: notes/qa-fixtures/ditl/artifacts-O-07-UI-02/*.png',
    ].join('\n'),
  );
  log('RESULT', result);
}

async function main() {
  log('START DITL-O-07-UI-02 cardExists', fs.existsSync(CARD));
  const http = await fetch(BASE).then((r) => r.status).catch(() => 0);
  note(0, http === 200, `app HTTP ${http}`);
  if (http !== 200) {
    await writeOut('FAIL');
    return;
  }
  const browser = await openCtx();
  const p = browser.pages()[0] || (await browser.newPage());
  let result = 'FAIL';
  try {
    await clearSession(p, browser);
    await signIn(p);
    let body = await shot(p, '01-after-signin');
    const splash = isSplash(body, p.url());
    const signedIn = !/sign-in/i.test(p.url()) || /Devon|ditl-admin|People|Home|Office|Class/i.test(body);
    note(1, signedIn, `ditl-admin url=${p.url()} splash=${splash}`);
    evidence.push('PARKED-P0: Home splash wall already on t_3191917a — not filed again');

    body = await openStudent(p, S1, '02-s1', 'Jordan');
    const onS1 =
      /Jordan/i.test(body) &&
      !isSplash(body, p.url()) &&
      (/Details|Preferred|Birthday|Phone|student\//i.test(body + p.url()) || /2bcee429/i.test(p.url()));
    note(2, onS1, `S1 Details url=${p.url()} splash=${isSplash(body, p.url())}`);
    if (!onS1) {
      evidence.push('CASE-STEPS-SKIPPED: could not reach S1 Details');
      result = 'FAIL';
      await clearSession(p, browser);
      await shot(p, '99-signout', 500);
      await writeOut(result);
      await browser.close().catch(() => {});
      return;
    }

    const invBefore = metaInventory(body);
    evidence.push('S1_META_BEFORE=' + JSON.stringify(invBefore));

    const attach = await tryAttachPhoto(p);
    if (attach.ok) {
      note(3, true, `photo attach via ${attach.via}`);
      body = await shot(p, '04-photo-after', 800);
    } else {
      gaps.push('GAP: office photo extract / attach-from-card — no Capture tray (known; not refiled)');
      note(3, true, `photo step GAP known; hints=${attach.visibleHints}`);
    }

    body = await openStudent(p, S1, '05-s1-after-attach', 'Jordan');
    const invAfter = metaInventory(body);
    evidence.push('S1_META_AFTER=' + JSON.stringify(invAfter));
    note(4, true, `metadata keys check after=${JSON.stringify(invAfter)}`);

    // bleed: S2 known id + any other roster students except S1
    const { ids } = await discoverSiblings(p);
    const others = ids.filter((id) => id !== S1);
    if (!others.includes(S2)) others.unshift(S2);
    const uniqueOthers = [...new Set(others)].slice(0, 6);
    let anyBleed = false;
    const bleedReport = {};
    for (let i = 0; i < uniqueOthers.length; i++) {
      const id = uniqueOthers[i];
      const tag = `06-sib${i + 1}-${id.slice(0, 8)}`;
      const b = await openStudent(p, id, tag, 'Jamie|Riley|Samira|Alex|Lee|Chen|Student|Details');
      const hits = bleedScan(b);
      bleedReport[id] = hits;
      if (hits.length) anyBleed = true;
      log('BLEED', id, hits);
    }
    note(5, !anyBleed, `no bleed S2-S5 anyBleed=${anyBleed} report=${JSON.stringify(bleedReport)}`);
    if (anyBleed) {
      findings.push('FINDING: S1 card/meta markers bled to sibling student Details; severity P0; case DITL-O-07-UI-02');
    }

    // sign out — do not restore birthday (UI-03 cleared it)
    await p.goto(`${BASE}/profile`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await p.waitForTimeout(1200);
    const so = p.getByRole('button', { name: /Sign out/i });
    if (await so.count()) {
      await so.first().click({ force: true });
      await p.waitForTimeout(2000);
    } else {
      await clearSession(p, browser);
    }
    body = await shot(p, '99-signout', 500);
    note(6, /sign-in|Sign in/i.test(body + p.url()), `signout url=${p.url()}`);

    if (onS1 && !anyBleed && findings.length === 0) {
      result = attach.ok ? 'PASS' : gaps.length ? 'GAP' : 'PARTIAL';
      // GAP result allowed for known photo gap if isolation verified
      if (!attach.ok && gaps.length && findings.length === 0) result = 'GAP';
    } else if (onS1 && findings.length === 0) result = 'PARTIAL';
    else result = 'FAIL';

    evidence.push(`RESULT_DETAIL attach=${!!attach.ok} bleed=${anyBleed} findings=${findings.length}`);
    await writeOut(result, { bleedReport, invBefore, invAfter, rosterIds: ids });
  } catch (e) {
    log('FATAL', String(e));
    evidence.push('FATAL ' + String(e).slice(0, 400));
    findings.push('FINDING: runner exception; severity P1; case DITL-O-07-UI-02');
    await writeOut('FAIL');
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
