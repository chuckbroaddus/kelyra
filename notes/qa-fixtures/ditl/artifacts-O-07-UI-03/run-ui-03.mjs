// DITL-O-07-UI-03 — clear one metadata key on S1 Jordan Lee
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:8081';
const USER = 'ditl-admin';
const PASS = process.env.DITL_ADMIN_PASS || 'DITL-admin-test';
const UD = '/tmp/ditl-pw-lane-a';
const CLASS = 'd1715000-0000-4000-a000-000000000301';
const S1 = '2bcee429-11ce-4f84-b2de-9aab349f03cc';
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
    /People|Manage|Classes|Responsibilities|School name|Dismissal curb|Activity|Jordan Lee|Roster|Details|Preferred|Birthday/i.test(
      body,
    );
  if (officeChrome) return false;
  if (/Sign in/i.test(body) && /Spring Baptist|Get started|Welcome to Kelyra/i.test(body)) return true;
  if (/sign-in/i.test(url || '') && /Sign in/i.test(body) && !officeChrome) return true;
  return /Sign in/i.test(body) && !officeChrome && !/Jordan/i.test(body);
}

async function openDetails(p, tag) {
  const routes = [
    `/class/${CLASS}/student/${S1}`,
    `/admin/class/${CLASS}/student/${S1}`,
    `/office/student/${S1}`,
    `/people/student/${S1}`,
  ];
  let body = '';
  for (const r of routes) {
    await p.goto(BASE + r, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await p.waitForTimeout(2200);
    body = await shot(p, `${tag}-${r.replace(/[/?=&]/g, '_')}`, 400);
    if (!isSplash(body, p.url()) && /Jordan|Details|Preferred|Birthday|Phone|Grade/i.test(body)) {
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

function inventory(body) {
  const keys = [];
  const probes = [
    { id: 'birthday', label: 'Birthday', present: /Birthday/i.test(body) && /Mar|Apr|2012|2017|\d{4}/i.test(body) },
    { id: 'phone', label: 'Phone', present: /Phone/i.test(body) && /\d{3}/.test(body) },
    { id: 'email', label: 'Email', present: /Email/i.test(body) && /@/.test(body) },
    { id: 'address', label: 'Address', present: /Address/i.test(body) && /[A-Za-z].{4,}/.test(body) },
    {
      id: 'emergency_name',
      label: 'Emergency name',
      present: /Emergency name/i.test(body) && !/Add emergency name/i.test(body),
    },
    {
      id: 'emergency_phone',
      label: 'Emergency phone',
      present: /Emergency phone/i.test(body) && !/Add emergency phone/i.test(body),
    },
    {
      id: 'grade_or_age',
      label: 'Grade or age',
      present: /Grade or age/i.test(body) && !/Add grade/i.test(body),
    },
    {
      id: 'preferred_name',
      label: 'Preferred name',
      present: /Preferred name/i.test(body) && !/Add preferred name/i.test(body),
    },
    { id: 'notes', label: 'Notes', present: /Notes/i.test(body) && !/Add notes/i.test(body) },
  ];
  for (const pr of probes) {
    if (pr.present) keys.push(pr);
  }
  return keys;
}

async function dismissPhotoSheet(p) {
  const cancel = p.getByRole('button', { name: /^Cancel$/i });
  if (await cancel.count()) {
    await cancel.first().click({ force: true }).catch(() => {});
    await p.waitForTimeout(500);
  }
  const body = (await p.innerText('body').catch(() => '')).slice(0, 500);
  if (/Take photo|Choose from library/i.test(body)) {
    await p.keyboard.press('Escape').catch(() => {});
    await p.waitForTimeout(400);
  }
}

async function clearKeyPath(p, label) {
  const clearBtn = p.getByRole('button', { name: new RegExp('Clear\\s+' + label, 'i') });
  if (await clearBtn.count()) {
    await clearBtn.first().click({ force: true });
    await p.waitForTimeout(600);
    const conf = p.getByRole('button', { name: /^(Clear|Confirm|Yes|OK|Remove)$/i });
    if (await conf.count()) await conf.last().click({ force: true }).catch(() => {});
    await p.waitForTimeout(2000);
    await dismissPhotoSheet(p);
    return { ok: true, via: 'Clear button' };
  }

  const row = p.getByText(label, { exact: true });
  if (await row.count()) {
    await row.first().click({ force: true }).catch(() => {});
    await p.waitForTimeout(900);
    await shot(p, '03-after-open-' + label.replace(/\s+/g, '_'), 300);
    const bodyMid = await p.innerText('body').catch(() => '');
    if (/Take photo|Choose from library|Use this homework/i.test(bodyMid)) {
      await dismissPhotoSheet(p);
      return { ok: false, via: 'PHOTO_SHEET', parked: label === 'Preferred name' };
    }
    const cleared = await p.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, textarea')).filter(
        (i) => i.offsetParent !== null && i.type !== 'password' && i.type !== 'file' && i.type !== 'hidden',
      );
      let n = 0;
      for (const inp of inputs) {
        const proto = inp.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) setter.call(inp, '');
        else inp.value = '';
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
        n++;
      }
      return n;
    });
    log('clearedInputs', cleared);
    const save = p.getByRole('button', { name: /^(Save|Done|Update|Clear)$/i });
    if (await save.count()) await save.last().click({ force: true }).catch(() => {});
    await p.waitForTimeout(2500);
    return { ok: cleared > 0, via: 'open+empty+save', inputs: cleared };
  }
  return { ok: false, via: 'no control' };
}

async function writeOut(result, extra = {}) {
  const out = {
    case: 'DITL-O-07-UI-03',
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
      `DITL-O-07-UI-03 RESULT=${result} lane=A Chromium /tmp/ditl-pw-lane-a`,
      ...evidence,
      'FINDINGS:',
      ...(findings.length ? findings : ['none']),
      'GAPS:',
      ...(gaps.length ? gaps : ['none']),
      'SHOTS: notes/qa-fixtures/ditl/artifacts-O-07-UI-03/*.png',
    ].join('\n'),
  );
  log('RESULT', result);
}

async function main() {
  log('START DITL-O-07-UI-03');
  try {
    const r = await fetch(BASE + '/');
    note(0, r.ok, `app HTTP ${r.status}`);
  } catch (e) {
    note(0, false, `app refused ${String(e).slice(0, 80)}`);
    evidence.push('CASE STOP: app refused; no alternate port');
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
    const signedIn =
      !/sign-in/i.test(p.url()) || /Devon|ditl-admin|People|Home|Office|Spring Baptist/i.test(body);
    note(1, signedIn, `ditl-admin url=${p.url()} splash=${splash}`);
    if (splash) evidence.push('PARKED-P0: Home splash wall already on t_3191917a — not filed again');

    body = await openDetails(p, '02-s1');
    const onS1 =
      /Jordan/i.test(body) &&
      !isSplash(body, p.url()) &&
      (/Details|Preferred|Birthday|Phone|student\//i.test(body + p.url()) || /2bcee429/i.test(p.url()));
    note(2, onS1, `S1 Details url=${p.url()} splash=${isSplash(body, p.url())}`);
    if (!onS1) {
      evidence.push('CASE-STOP: could not reach S1 Details after direct routes');
      result = 'FAIL';
      await clearSession(p, browser);
      await shot(p, '99-signout', 400);
      await writeOut(result);
      await browser.close().catch(() => {});
      return;
    }

    const before = body;
    const inv = inventory(before);
    evidence.push('INVENTORY keys present: ' + (inv.map((k) => k.id).join(',') || '(none detected)'));
    log('INVENTORY', inv);

    let clearedKey = null;
    let clearResult = null;
    for (const k of inv) {
      log('TRY_CLEAR', k.label);
      clearResult = await clearKeyPath(p, k.label);
      await shot(p, '04-after-clear-attempt-' + k.id, 500);
      if (clearResult.parked || clearResult.via === 'PHOTO_SHEET') {
        evidence.push(`PARKED preferred-name PHOTO sheet (t_87f01316) on ${k.label} — try next`);
        await dismissPhotoSheet(p);
        continue;
      }
      if (clearResult.ok) {
        clearedKey = k;
        break;
      }
      evidence.push(`clear attempt ${k.label} via=${clearResult.via} ok=${clearResult.ok}`);
    }

    if (!clearedKey) {
      for (const lab of ['Birthday', 'Phone', 'Email', 'Notes', 'Address']) {
        clearResult = await clearKeyPath(p, lab);
        await shot(p, '04b-force-' + lab.replace(/\s+/g, '_'), 400);
        if (clearResult.ok) {
          clearedKey = { id: lab.toLowerCase().replace(/\s+/g, '_'), label: lab };
          break;
        }
        if (clearResult.via === 'PHOTO_SHEET') {
          evidence.push(`PARKED PHOTO sheet on ${lab}`);
          await dismissPhotoSheet(p);
        }
      }
    }

    body = await openDetails(p, '05-s1-after-clear');
    let keyGone = false;
    if (clearedKey) {
      const lab = clearedKey.label;
      if (lab === 'Birthday') {
        keyGone =
          /Add birthday/i.test(body) ||
          (/Mar 15|2012/i.test(before) && !/Mar 15|2012/i.test(body));
      } else if (lab === 'Phone') {
        keyGone = /Add phone/i.test(body);
      } else if (lab === 'Preferred name') {
        keyGone = /Add preferred name/i.test(body);
      } else {
        keyGone = new RegExp('Add ' + lab, 'i').test(body);
      }
      note(
        3,
        !!clearedKey && clearResult?.ok,
        `cleared key=${clearedKey.id} via=${clearResult?.via}`,
      );
      note(4, keyGone, `verify removed key=${clearedKey.id} keyGone=${keyGone}`);
    } else {
      note(3, false, `no metadata key clear path succeeded; last=${JSON.stringify(clearResult)}`);
      note(4, false, 'verify skipped — nothing cleared');
      findings.push(
        'FINDING: S1 Details has no working clear-one-metadata-key path; severity P1; case DITL-O-07-UI-03',
      );
    }

    await p.goto(`${BASE}/profile`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await p.waitForTimeout(1200);
    const so = p.getByRole('button', { name: /Sign out/i });
    if (await so.count()) {
      await so.first().click({ force: true });
      await p.waitForTimeout(2000);
    } else {
      await clearSession(p, browser);
    }
    body = await shot(p, '99-signout', 400);
    note(5, /sign-in|Sign in/i.test(body + p.url()), `signout url=${p.url()}`);

    if (onS1 && clearedKey && keyGone && findings.length === 0) result = 'PASS';
    else if (onS1 && clearedKey && clearResult?.ok && findings.length === 0) result = 'PARTIAL';
    else if (onS1 && findings.length) result = 'FAIL';
    else result = 'FAIL';

    await writeOut(result, {
      clearedKey: clearedKey?.id || null,
      keyGone,
      clearVia: clearResult?.via || null,
    });
  } catch (e) {
    log('FATAL', String(e));
    evidence.push('FATAL ' + String(e).slice(0, 500));
    findings.push('FINDING: runner exception; severity P1; case DITL-O-07-UI-03');
    await writeOut('FAIL');
  } finally {
    await browser.close().catch(() => {});
  }
}

main();
