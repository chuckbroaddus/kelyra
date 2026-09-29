// DITL-T-05-UI-03 — field update + clear on existing S1 Jordan Lee only
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
const S1 = '2bcee429-11ce-4f84-b2de-9aab349f03cc';
const S2 = '899214d4-1ed7-47bd-8a1a-8304e8b7e692';
const MARK = {
  preferred_name: 'DITL-UI03-Pref',
  grade_or_age: 'UI03-G4',
};
const log = (...a) => console.log(...a);
const evidence = [];
const findings = [];
let result = 'PARTIAL';

function note(step, ok, detail) {
  const line = `${ok ? 'OK' : 'MISS'} step${step}: ${detail}`;
  evidence.push(line);
  log(line);
}

async function shot(p, n, w = 900) {
  await p.waitForTimeout(w);
  await p.screenshot({ path: path.join(A, `${n}.png`), fullPage: true });
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 3500);
  log('==', n, p.url());
  log(body.slice(0, 700));
  return body;
}

async function openCtx() {
  fs.mkdirSync(UD, { recursive: true });
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

async function signIn(p) {
  await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(700);
  await p.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
  });
  await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1000);
  await p.locator('input').nth(0).fill(USER);
  await p.locator('input[type=password]').first().fill(PASS);
  await p.locator('input[type=password]').first().press('Enter');
  await p.waitForTimeout(6500);
}

async function openDetails(p, studentId, tag) {
  await p.goto(`${BASE}/class/${CLASS}/student/${studentId}`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2000);
  const tab = p.getByRole('tab', { name: /^Details$/i });
  if (await tab.count()) {
    await tab.first().click();
    await p.waitForTimeout(1500);
  }
  return shot(p, tag, 800);
}

async function fillAndSave(p) {
  // Open full edit sheet via Preferred name row (or Add preferred name)
  const openers = [
    p.getByText('Add preferred name', { exact: true }),
    p.getByText('Preferred name', { exact: true }),
  ];
  for (const op of openers) {
    if (await op.count()) {
      await op.first().click();
      break;
    }
  }
  await p.waitForTimeout(1200);
  await shot(p, '03-edit-open', 600);

  // Sheet labels sit above inputs — fill by walking label→input pairs in evaluate
  const filled = await p.evaluate((mark) => {
    const map = {
      'preferred name': mark.preferred_name,
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
        // pick input after this label in DOM
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
      // React native web often needs nativeInputValueSetter
      out[key] = inp.value;
    }
    return out;
  }, MARK);
  log('filled', filled);
  await p.waitForTimeout(400);
  await shot(p, '04-edit-filled', 500);

  const save = p.getByRole('button', { name: /^(Save|Done|Update)$/i });
  if (await save.count()) await save.last().click();
  else {
    const any = p.getByText(/^Save$/i);
    if (await any.count()) await any.last().click();
  }
  await p.waitForTimeout(3500);
  return shot(p, '05-after-save', 800);
}

async function clearKey(p, label) {
  const clearBtn = p.getByRole('button', { name: new RegExp(`Clear ${label}`, 'i') });
  if (await clearBtn.count()) {
    await clearBtn.first().click({ force: true });
    await p.waitForTimeout(800);
    const conf = p.getByRole('button', { name: /^(Clear|Confirm|Yes|OK|Remove)$/i });
    if (await conf.count()) {
      await conf.last().click({ force: true }).catch(() => {});
      await p.waitForTimeout(2000);
    }
    return true;
  }
  const row = p.getByText(new RegExp(label, 'i')).first();
  if (await row.count()) {
    const box = await row.boundingBox();
    if (box) {
      const clr = p.getByText(/^Clear$/i);
      const c = await clr.count();
      for (let i = 0; i < c; i++) {
        const b = await clr.nth(i).boundingBox();
        if (b && Math.abs(b.y - box.y) < 40) {
          await clr.nth(i).click({ force: true });
          await p.waitForTimeout(800);
          const conf = p.getByRole('button', { name: /^(Clear|Confirm|Yes|OK)$/i });
          if (await conf.count()) await conf.last().click({ force: true }).catch(() => {});
          await p.waitForTimeout(2000);
          return true;
        }
      }
    }
  }
  return false;
}

async function main() {
  log('START DITL-T-05-UI-03');
  const browser = await openCtx();
  const p = browser.pages()[0] || (await browser.newPage());
  try {
    await signIn(p);
    let body = await shot(p, '01-signin', 800);
    const signedIn = /Desk|Needs Attention|ditl-Math|Capture|Messages/i.test(body) || !/sign-in/i.test(p.url());
    note(1, signedIn, `url=${p.url()}`);

    body = await openDetails(p, S1, '02-jordan-details-before');
    const onS1 = /Jordan/i.test(body) && /student\/2bcee429/i.test(p.url());
    note(2, onS1, `S1 details url=${p.url()}`);
    note(3, true, `before markers pref=${/DITL-UI03-Pref/i.test(body)} grade=${/UI03-G4/i.test(body)}`);

    body = await fillAndSave(p);
    body = await openDetails(p, S1, '06-jordan-details-after-update');
    const hasPref = /DITL-UI03-Pref/i.test(body);
    const hasGrade = /UI03-G4/i.test(body);
    const updated = hasPref || hasGrade;
    note(4, updated, `after update pref=${hasPref} grade=${hasGrade}`);
    if (!updated) {
      findings.push(
        'FINDING: field update path did not persist case markers on S1 Details; severity P1; case DITL-T-05-UI-03',
      );
    }

    let cleared = 0;
    for (const lab of ['Preferred name', 'Grade or age']) {
      const ok = await clearKey(p, lab);
      if (ok) cleared++;
      body = await openDetails(p, S1, `07-clear-${lab.replace(/\s+/g, '-').toLowerCase()}`);
    }
    note(5, cleared > 0, `clear actions fired=${cleared}`);

    body = await openDetails(p, S1, '08-jordan-after-clear');
    const stillPref = /DITL-UI03-Pref/i.test(body);
    const stillGrade = /UI03-G4/i.test(body);
    const clearWorks = !(stillPref || stillGrade);
    note(6, clearWorks || !updated, `after clear still pref=${stillPref} grade=${stillGrade}`);
    if (updated && !clearWorks) {
      findings.push(
        'FINDING: Clear did not remove case-set metadata keys on S1; severity P1; case DITL-T-05-UI-03',
      );
    }

    body = await openDetails(p, S2, '09-jamie-no-bleed');
    const bleed = /DITL-UI03-Pref|UI03-G4/i.test(body);
    note(7, !bleed, `jamie bleed=${bleed}`);
    if (bleed) {
      findings.push('FINDING: case markers bled to Jamie Lee S2; severity P0; case DITL-T-05-UI-03');
    }

    await p.goto(`${BASE}/profile`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1200);
    await shot(p, '10-profile', 500);
    const so = p.getByRole('button', { name: /Sign out/i });
    if (await so.count()) {
      await so.first().click({ force: true });
      await p.waitForTimeout(2500);
    } else {
      await p.evaluate(() => {
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch {}
      });
      await p.goto(`${BASE}/sign-in`);
      await p.waitForTimeout(1000);
    }
    body = await shot(p, '11-signout', 800);
    note(8, /sign-in/i.test(p.url()) || /Sign in/i.test(body), `signout url=${p.url()}`);

    if (findings.length === 0 && updated && (clearWorks || cleared > 0)) result = 'PASS';
    else if (findings.length === 0) result = 'PARTIAL';
    else result = 'FAIL';
  } catch (e) {
    result = 'FAIL';
    findings.push(`FINDING: driver exception ${e?.message || e}; severity P1; case DITL-T-05-UI-03`);
    log('ERR', e);
  } finally {
    const out = { result, evidence, findings, case: 'DITL-T-05-UI-03' };
    fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(out, null, 2));
    log('RESULT', result);
    log(JSON.stringify(out, null, 2));
    await browser.close().catch(() => {});
  }
}

main();
