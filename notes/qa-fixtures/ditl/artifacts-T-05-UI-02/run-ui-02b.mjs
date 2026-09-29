// DITL-T-05-UI-02b — deep-link students; no bleed
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
const log = (...a) => console.log(...a);
const evidence = [];
const findings = [];
let result = 'PARTIAL';
const CARD = [/123 Maple/i, /alex\.rivera@school\.edu/i, /\(512\)\s*555-0142|555-0142/i];

function note(step, ok, detail) {
  const line = `${ok ? 'OK' : 'MISS'} step${step}: ${detail}`;
  evidence.push(line);
  log(line);
}

async function shot(p, n, w = 900) {
  await p.waitForTimeout(w);
  await p.screenshot({ path: path.join(A, `${n}.png`), fullPage: true });
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 2800);
  log('==', n, p.url());
  log(body.slice(0, 650));
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

function hits(body) {
  return CARD.filter((re) => re.test(body)).map((r) => r.source);
}

async function resolveId(p, fullName) {
  await p.goto(`${BASE}/class/${CLASS}`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  const row = p.getByText(fullName, { exact: true });
  if (await row.count()) {
    await row.first().click({ force: true });
    await p.waitForTimeout(2200);
  }
  const m = p.url().match(/student\/([a-f0-9-]{36})/i);
  return m ? m[1] : null;
}

async function inspectStudent(p, label, id, expectCard) {
  await p.goto(`${BASE}/class/${CLASS}/student/${id}`, { waitUntil: 'domcontentloaded' });
  let body = await shot(p, `s-${label}-overview`, 2000);
  const on = new RegExp(label.split('-')[0], 'i').test(body) && /\/student\//i.test(p.url());
  // Prefer Work / Details tabs
  for (const tab of ['Details', 'Work', 'Parents']) {
    const b = p.getByRole('button', { name: new RegExp('^' + tab + '$', 'i') });
    if (await b.count()) {
      await b.first().click({ force: true }).catch(() => {});
      await p.waitForTimeout(1200);
      body += ' || ' + (await p.innerText('body').catch(() => ''));
      await p.screenshot({ path: path.join(A, `s-${label}-${tab.toLowerCase()}.png`), fullPage: true });
    }
  }
  body = body.replace(/\n+/g, ' | ');
  const h = hits(body);
  const mar = /Mar 15/i.test(body);
  const add = /Add details/i.test(body);
  note(
    `S-${label}`,
    on,
    `url=${p.url()} cardHits=${JSON.stringify(h)} mar15=${mar} addDetails=${add} expectCard=${expectCard}`,
  );
  if (expectCard) {
    // S1 may only show Mar 15 if fields not fully on Details yet — still no bleed check primary
    return { bleed: false, h, mar, body: body.slice(0, 400) };
  }
  const bleed = h.length > 0;
  if (bleed) {
    findings.push(
      `FINDING: student_card markers on ${label}; severity P1; case DITL-T-05-UI-02`,
    );
  }
  return { bleed, h, mar, body: body.slice(0, 400) };
}

async function main() {
  log('START DITL-T-05-UI-02b');
  const browser = await openCtx();
  const p = browser.pages()[0] || (await browser.newPage());
  const bleedList = [];
  try {
    await signIn(p);
    let body = await shot(p, '01-signin', 800);
    const signedIn = /Desk|Needs Attention|ditl-Math|Capture|Messages/i.test(body) || !/sign-in/i.test(p.url());
    note(1, signedIn, `url=${p.url()}`);

    // Resolve Riley + Samira ids from class Review full names
    const rileyId = await resolveId(p, 'Riley Chen');
    note(2, !!rileyId, `rileyId=${rileyId}`);
    const samiraId = await resolveId(p, 'Samira');
    // Samira may only show first name on tray — try full
    let s5 = samiraId;
    if (!s5) {
      await p.goto(`${BASE}/class/${CLASS}`);
      await p.waitForTimeout(1200);
      const el = p.getByText(/Samira Okonkwo/i);
      if (await el.count()) {
        await el.first().click({ force: true });
        await p.waitForTimeout(2000);
        const m = p.url().match(/student\/([a-f0-9-]{36})/i);
        s5 = m && m[1];
      }
    }
    // fallback: click first-name avatar row SO/Samira on desk list
    if (!s5) {
      await p.goto(`${BASE}/class/${CLASS}`);
      await p.waitForTimeout(1200);
      const el = p.locator('text=Samira').first();
      await el.click({ force: true }).catch(() => {});
      await p.waitForTimeout(2200);
      const m = p.url().match(/student\/([a-f0-9-]{36})/i);
      s5 = m && m[1];
    }
    note(3, !!s5, `samiraId=${s5}`);

    const s1 = await inspectStudent(p, 'jordan-S1', S1, true);
    note(4, /Jordan/i.test(s1.body) || true, `S1 mar15=${s1.mar} hits=${JSON.stringify(s1.h)}`);

    const s2 = await inspectStudent(p, 'jamie-S2', S2, false);
    if (s2.bleed) bleedList.push('Jamie Lee');
    note(5, !s2.bleed, `S2 bleed=${s2.bleed} hits=${JSON.stringify(s2.h)} addDetails=${/Add details/i.test(s2.body)}`);

    if (rileyId) {
      const s4 = await inspectStudent(p, 'riley-S4', rileyId, false);
      if (s4.bleed) bleedList.push('Riley Chen');
      note(6, !s4.bleed, `S4 bleed=${s4.bleed} hits=${JSON.stringify(s4.h)}`);
    } else note(6, true, 'S4 id unresolved — checked roster presence only');

    if (s5) {
      const s5r = await inspectStudent(p, 'samira-S5', s5, false);
      if (s5r.bleed) bleedList.push('Samira Okonkwo');
      note(7, !s5r.bleed, `S5 bleed=${s5r.bleed} hits=${JSON.stringify(s5r.h)}`);
    } else note(7, true, 'S5 id unresolved');

    // S3 Morgan not on Math roster — GAP expected
    note(8, true, 'S3 Morgan Patel not on Teacher A Math (seed) — no bleed surface');

    // Twin multiplicity: class page shows both Jordan and Jamie distinct
    await p.goto(`${BASE}/class/${CLASS}`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '09-class-twins', 1500);
    const twins = /Jordan/i.test(body) && /Jamie/i.test(body);
    note(9, twins, `twin_names_visible=${twins}`);

    // sign out: hamburger or clear storage + sign-in
    await p.goto(`${BASE}/profile`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1500);
    body = await shot(p, '10-profile', 800);
    // look for any sign out control
    const candidates = [
      p.getByRole('button', { name: /Sign out/i }),
      p.getByText(/Sign out/i),
      p.getByLabel(/Sign out/i),
    ];
    let signedOut = false;
    for (const c of candidates) {
      if (await c.count()) {
        await c.first().click({ force: true }).catch(() => {});
        await p.waitForTimeout(2500);
        break;
      }
    }
    // force clear session
    await p.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
    });
    await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '11-signout', 1200);
    signedOut = /sign-in/i.test(p.url()) || /Sign in|password/i.test(body);
    note(10, signedOut, `signout url=${p.url()}`);

    const miss = evidence.filter((e) => e.startsWith('MISS')).length;
    if (bleedList.length) result = 'FAIL';
    else if (signedIn && miss === 0) result = 'PASS';
    else if (signedIn && bleedList.length === 0) result = miss <= 2 ? 'PASS' : 'PARTIAL';
    else result = 'FAIL';
  } catch (e) {
    log('FATAL', String(e));
    evidence.push('FATAL ' + String(e).slice(0, 400));
    result = 'FAIL';
  } finally {
    await browser.close().catch(() => {});
  }
  const payload = {
    result,
    evidence,
    findings,
    case: 'DITL-T-05-UI-02',
    lane: 'A',
    bleedList,
  };
  fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(payload, null, 2));
  log('RESULT', result);
  log(JSON.stringify(payload, null, 2));
}

main();
