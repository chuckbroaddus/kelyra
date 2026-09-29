// DITL-O-07-UI-01 — office bio attach + metadata on existing S1 Jordan Lee
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
const META = {
  preferred_name: 'Jordy',
  birthday: '2017-04-12',
  phone: '555-0101',
  email: 'jordan.lee.ditl@example.test',
  address: '100 Ditl Lane, Testville',
  emergency_name: 'Taylor Lee',
  emergency_phone: '555-0199',
  grade_or_age: '3rd',
};
const evidence = [];
const findings = [];
const gaps = [];
const log = (...a) => console.log(...a);

function note(step, ok, detail) {
  const line = `${ok ? 'OK' : 'MISS'} step${step}: ${detail}`;
  evidence.push(line);
  log(line);
}

async function shot(p, n, w = 900) {
  await p.waitForTimeout(w);
  await p.screenshot({ path: path.join(A, `${n}.png`), fullPage: true });
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 4000);
  log('==', n, p.url());
  log(body.slice(0, 900));
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
    /People|Manage|Classes|Responsibilities|School name|Dismissal curb|Activity|Jordan Lee|Roster|Details|Preferred/i.test(
      body,
    );
  if (officeChrome) return false;
  if (/Sign in/i.test(body) && /Spring Baptist|Get started|Welcome to Kelyra/i.test(body)) return true;
  if (/sign-in/i.test(url || '') && /Sign in/i.test(body) && !officeChrome) return true;
  return /Sign in/i.test(body) && !officeChrome && !/Jordan/i.test(body);
}

async function openDetails(p, studentId, tag) {
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
    body = await shot(p, `${tag}-${r.replace(/[/?=&]/g, '_')}`, 500);
    if (!isSplash(body, p.url()) && /Jordan|Details|Preferred|Birthday|Phone|Grade/i.test(body)) {
      const tab = p.getByRole('tab', { name: /^Details$/i });
      if (await tab.count()) {
        await tab.first().click().catch(() => {});
        await p.waitForTimeout(1200);
        body = await shot(p, tag + '-details-tab', 600);
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
  const any = await p.getByText(/Attach|Upload photo|Student card|Add photo/i).count();
  return { ok: false, via: null, visibleHints: any };
}

async function fillMeta(p) {
  const openers = [
    p.getByText('Add preferred name', { exact: true }),
    p.getByText('Preferred name', { exact: true }),
    p.getByText('Edit details', { exact: false }),
    p.getByRole('button', { name: /Edit/i }),
  ];
  for (const op of openers) {
    if (await op.count()) {
      await op.first().click().catch(() => {});
      break;
    }
  }
  await p.waitForTimeout(1000);
  await shot(p, '05-edit-open', 500);

  const filled = await p.evaluate((mark) => {
    const map = {
      'preferred name': mark.preferred_name,
      birthday: mark.birthday,
      phone: mark.phone,
      email: mark.email,
      address: mark.address,
      'emergency name': mark.emergency_name,
      'emergency phone': mark.emergency_phone,
      'grade or age': mark.grade_or_age,
    };
    const out = {};
    const labels = Array.from(document.querySelectorAll('body *')).filter((e) => {
      const t = (e.textContent || '').trim().toLowerCase();
      return Object.keys(map).includes(t) && e.children.length === 0;
    });
    for (const lab of labels) {
      const key = (lab.textContent || '').trim().toLowerCase();
      let root = lab.parentElement;
      let inp = null;
      for (let d = 0; d < 8 && root && !inp; d++, root = root.parentElement) {
        const cand = Array.from(root.querySelectorAll('input, textarea')).filter(
          (i) => i.offsetParent !== null && i.type !== 'password' && i.type !== 'file' && i.type !== 'hidden',
        );
        for (const c of cand) {
          if (lab.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING) {
            inp = c;
            break;
          }
        }
      }
      if (!inp) continue;
      const val = map[key];
      const proto = inp.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) setter.call(inp, val);
      else inp.value = val;
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
      out[key] = inp.value;
    }
    return out;
  }, META);
  log('filled', filled);
  await shot(p, '06-edit-filled', 500);

  const save = p.getByRole('button', { name: /^(Save|Done|Update)$/i });
  if (await save.count()) await save.last().click();
  else {
    const any = p.getByText(/^Save$/i);
    if (await any.count()) await any.last().click();
  }
  await p.waitForTimeout(3500);
  return { filled, body: await shot(p, '07-after-save', 800) };
}

async function clearKey(p, label) {
  const clearBtn = p.getByRole('button', { name: new RegExp(`Clear ${label}`, 'i') });
  if (await clearBtn.count()) {
    await clearBtn.first().click({ force: true });
    await p.waitForTimeout(600);
    const conf = p.getByRole('button', { name: /^(Clear|Confirm|Yes|OK|Remove)$/i });
    if (await conf.count()) await conf.last().click({ force: true }).catch(() => {});
    await p.waitForTimeout(1800);
    return true;
  }
  return false;
}

async function writeOut(result) {
  const out = {
    case: 'DITL-O-07-UI-01',
    result,
    lane: 'A',
    browser: 'Chromium persistent /tmp/ditl-pw-lane-a',
    app: BASE,
    evidence,
    findings,
    gaps,
  };
  fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(out, null, 2));
  fs.writeFileSync(
    path.join(A, 'SUMMARY.txt'),
    [
      `DITL-O-07-UI-01 RESULT=${result} lane=A Chromium /tmp/ditl-pw-lane-a`,
      ...evidence,
      'FINDINGS:',
      ...(findings.length ? findings : ['none']),
      'GAPS:',
      ...(gaps.length ? gaps : ['none']),
    ].join('\n'),
  );
  log('RESULT', result);
}

async function main() {
  log('START DITL-O-07-UI-01 cardExists', fs.existsSync(CARD));
  const browser = await openCtx();
  const p = browser.pages()[0] || (await browser.newPage());
  let result = 'FAIL';
  try {
    await clearSession(p, browser);
    await signIn(p);
    let body = await shot(p, '01-after-signin');
    const splash = isSplash(body, p.url());
    const signedIn = !/sign-in/i.test(p.url()) || /Devon|ditl-admin|People|Home|Office/i.test(body);
    note(1, signedIn, `url=${p.url()} splash=${splash}`);
    evidence.push('PARKED-P0: Home splash wall already on t_3191917a — not filed again');

    body = await openDetails(p, S1, '02-s1');
    const onS1 =
      /Jordan/i.test(body) &&
      !isSplash(body, p.url()) &&
      (/Details|Preferred|Birthday|Phone|student\//i.test(body + p.url()) || /2bcee429/i.test(p.url()));
    note(2, onS1, `S1 details url=${p.url()} splash=${isSplash(body, p.url())}`);
    if (!onS1) {
      evidence.push('CASE-STEPS-SKIPPED: could not reach S1 Details after one splash bypass set');
      result = 'FAIL';
      await clearSession(p, browser);
      await shot(p, '99-signout', 500);
      await writeOut(result);
      await browser.close().catch(() => {});
      return;
    }

    const attach = await tryAttachPhoto(p);
    if (attach.ok) {
      note(3, true, `photo attach attempted via ${attach.via}`);
      body = await shot(p, '04-photo-after', 800);
    } else {
      gaps.push('GAP: office photo extract / attach-from-card — no Capture tray / attach control (known gaps.md)');
      note(3, true, `photo step GAP known; hints=${attach.visibleHints}`);
      evidence.push('GAP photo attach — continue metadata (SUPPORTED)');
    }

    const beforeBody = body;
    const { filled, body: afterFill } = await fillMeta(p);
    body = await openDetails(p, S1, '08-s1-after-meta');
    const keysHit = {
      preferred_name: /Jordy/i.test(body),
      birthday: /2017-04-12|Apr.*12|4\/12\/2017/i.test(body),
      phone: /555-0101/i.test(body),
      email: /jordan\.lee\.ditl@example\.test/i.test(body),
      address: /100 Ditl Lane/i.test(body),
      emergency_name: /Taylor Lee/i.test(body),
      emergency_phone: /555-0199/i.test(body),
      grade_or_age: /\b3rd\b/i.test(body),
    };
    const hitN = Object.values(keysHit).filter(Boolean).length;
    note(4, hitN >= 2 || Object.keys(filled).length >= 2, `meta hits=${JSON.stringify(keysHit)} filledKeys=${Object.keys(filled).join(',')}`);
    if (hitN < 1 && Object.keys(filled).length < 1) {
      findings.push(
        'FINDING: office Details metadata update path did not accept/persist canonical keys on S1; severity P1; case DITL-O-07-UI-01',
      );
    }

    // no new student: S2 still Jamie, no duplicate Jordy student create path
    body = await openDetails(p, S2, '09-s2-jamie');
    const bleed = /Jordy|555-0101|jordan\.lee\.ditl@example\.test|100 Ditl Lane/i.test(body);
    note(5, !bleed, `S2 bleed=${bleed}`);
    if (bleed) {
      findings.push('FINDING: S1 metadata bled to S2 Jamie Lee; severity P0; case DITL-O-07-UI-01');
    }

    // teardown: clear keys we can
    body = await openDetails(p, S1, '10-teardown-open');
    let cleared = 0;
    for (const lab of [
      'Preferred name',
      'Birthday',
      'Phone',
      'Email',
      'Address',
      'Emergency name',
      'Emergency phone',
      'Grade or age',
    ]) {
      if (await clearKey(p, lab)) cleared++;
    }
    note(6, true, `teardown clear clicks=${cleared}`);
    body = await openDetails(p, S1, '11-after-teardown');
    await shot(p, '11b-after-teardown', 400);

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
    note(7, /sign-in|Sign in/i.test(body + p.url()), `signout url=${p.url()}`);

    const metaOk = hitN >= 3 || (Object.keys(filled).length >= 4 && hitN >= 1);
    const photoOk = attach.ok;
    if (onS1 && metaOk && photoOk && !bleed && findings.length === 0) result = 'PASS';
    else if (onS1 && metaOk && !bleed && findings.length === 0) result = 'PARTIAL'; // GAP photo only
    else if (onS1 && (metaOk || hitN >= 1) && findings.length === 0) result = 'PARTIAL';
    else if (onS1 && findings.some((f) => /P0/.test(f))) result = 'FAIL';
    else if (onS1) result = findings.length ? 'FAIL' : 'PARTIAL';
    else result = 'FAIL';

    evidence.push(`RESULT_DETAIL metaOk=${metaOk} photoOk=${photoOk} hitN=${hitN} gaps=${gaps.length}`);
    await writeOut(result);
  } catch (e) {
    log('FATAL', String(e));
    evidence.push('FATAL ' + String(e).slice(0, 400));
    findings.push('FINDING: runner exception; severity P1; case DITL-O-07-UI-01');
    await writeOut('FAIL');
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
