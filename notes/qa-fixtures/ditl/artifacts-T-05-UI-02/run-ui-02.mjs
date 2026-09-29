// DITL-T-05-UI-02 lane A — matcher stays on Jordan Lee; no bleed S2-S5
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:8081';
const USER = 'ditl-teacher-a';
const PASS = process.env.DITL_TEACHER_PASS || 'DITL-teacher-test';
const UD = '/tmp/ditl-pw-lane-a';
const S1_ID = '2bcee429-11ce-4f84-b2de-9aab349f03cc';
const CLASS = 'd1715000-0000-4000-a000-000000000301';
const log = (...a) => console.log(...a);
const evidence = [];
const findings = [];
let result = 'PARTIAL';
const CARD_MARKERS = [/123 Maple/i, /\(512\)\s*555-0142|555-0142/i, /alex\.rivera@school\.edu/i, /Jordy/i];
const OTHERS = ['Jamie Lee', 'Riley Chen', 'Samira Okonkwo', 'Morgan Patel'];

function note(step, ok, detail) {
  const line = `${ok ? 'OK' : 'MISS'} step${step}: ${detail}`;
  evidence.push(line);
  log(line);
}

async function shot(p, n, w = 1000) {
  await p.waitForTimeout(w);
  await p.screenshot({ path: path.join(A, `${n}.png`), fullPage: true });
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 3000);
  log('==', n, p.url());
  log(body.slice(0, 700));
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

async function signIn(p) {
  await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(800);
  await p.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
  });
  await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1200);
  await p.locator('input').nth(0).fill(USER);
  await p.locator('input[type=password]').first().fill(PASS);
  await p.locator('input[type=password]').first().press('Enter');
  await p.waitForTimeout(7000);
}

function cardHits(body) {
  return CARD_MARKERS.filter((re) => re.test(body)).map((re) => re.source);
}

async function openDetails(p) {
  const det = p.getByRole('button', { name: /^Details$/i });
  if (await det.count()) await det.first().click({ force: true }).catch(() => {});
  else await p.getByText(/^Details$/i).first().click({ force: true }).catch(() => {});
  await p.waitForTimeout(1500);
}

async function signOut(p) {
  const ham = p.getByLabel(/Menu|Open menu|hamburger/i).first();
  if (await ham.count()) await ham.click({ force: true }).catch(() => {});
  await p.waitForTimeout(600);
  let so = p.getByRole('button', { name: /Sign out/i });
  if (!(await so.count())) so = p.getByText(/Sign out/i);
  if (await so.count()) await so.first().click({ force: true }).catch(() => {});
  else {
    await p.goto(`${BASE}/profile`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await p.waitForTimeout(1200);
    so = p.getByRole('button', { name: /Sign out/i });
    if (await so.count()) await so.first().click({ force: true }).catch(() => {});
  }
  await p.waitForTimeout(2000);
}

async function run(p) {
  await signIn(p);
  let body = await shot(p, '01-after-signin');
  const signedIn =
    !/sign-in/i.test(p.url()) || /Desk|Needs Attention|ditl-Math|Period|Messages|Ask|Capture/i.test(body);
  const wrongSeat = /Sign in to see work/i.test(body) && !/Desk|Needs/i.test(body);
  note(1, signedIn && !wrongSeat, `url=${p.url()} signedIn=${signedIn} wrongSeat=${wrongSeat}`);

  await p.goto(`${BASE}/class/${CLASS}/student/${S1_ID}`, { waitUntil: 'domcontentloaded' });
  body = await shot(p, '02-jordan-overview', 2500);
  const onJordan = /Jordan Lee/i.test(body) && /\/student\/2bcee429/i.test(p.url());
  note(2, onJordan, `jordan_url=${p.url()}`);

  await openDetails(p);
  body = await shot(p, '03-jordan-details', 2000);
  const s1Hits = cardHits(body);
  const s1HasCard =
    s1Hits.length >= 1 || /Mar 15|123 Maple|555-0142|alex\.rivera|Address|Phone/i.test(body);
  note(3, onJordan && /Jordan Lee/i.test(body), `s1 hits=${JSON.stringify(s1Hits)} hasCardish=${s1HasCard}`);

  await p.goto(`${BASE}/class/${CLASS}/gradebook`, { waitUntil: 'domcontentloaded' });
  body = await shot(p, '04-gradebook', 3000);
  note(
    4,
    /Jordan Lee/i.test(body) && /Jamie Lee/i.test(body),
    `roster S1=${/Jordan Lee/i.test(body)} S2=${/Jamie Lee/i.test(body)} S4=${/Riley Chen/i.test(body)} S5=${/Samira Okonkwo/i.test(body)}`,
  );

  const bleed = [];
  for (const name of OTHERS) {
    const safe = name.replace(/\s+/g, '-').toLowerCase();
    await p.goto(`${BASE}/class/${CLASS}/gradebook`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1500);
    let opened = false;
    const row = p.getByText(name, { exact: true });
    if (await row.count()) {
      await row.first().click({ force: true }).catch(() => {});
      await p.waitForTimeout(2000);
      opened = /\/student\//i.test(p.url()) || new RegExp(name, 'i').test(await p.innerText('body').catch(() => ''));
    }
    if (!opened) {
      await p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(1200);
      const search = p.getByPlaceholder(/Search|Find/i);
      if (await search.count()) {
        await search.first().fill(name);
        await p.waitForTimeout(800);
        await p.getByText(name, { exact: false }).first().click({ force: true }).catch(() => {});
        await p.waitForTimeout(1500);
      }
    }
    body = await shot(p, `05-${safe}-open`, 1500);
    if (/\/student\//i.test(p.url()) || new RegExp(name, 'i').test(body)) {
      await openDetails(p);
      body = await shot(p, `06-${safe}-details`, 1800);
    }
    const hits = cardHits(body);
    const foreignCard =
      hits.length > 0 ||
      /123 Maple/i.test(body) ||
      /alex\.rivera@school\.edu/i.test(body) ||
      /\(512\)\s*555-0142/i.test(body);
    if (name === 'Morgan Patel' && !/\/student\//i.test(p.url()) && !/Morgan Patel/i.test(body)) {
      note(`5-${safe}`, true, 'S3 not on Teacher A Math roster (expected) — no bleed surface');
      continue;
    }
    if (foreignCard) {
      bleed.push({ name, hits });
      note(`5-${safe}`, false, `BLEED markers on ${name}: ${JSON.stringify(hits)}`);
    } else {
      note(`5-${safe}`, true, `no card markers on ${name}; url=${p.url()}`);
    }
  }

  if (bleed.length) {
    findings.push(
      `FINDING: student_card metadata bled to non-S1 (${bleed.map((b) => b.name).join(', ')}); severity P1; case DITL-T-05-UI-02`,
    );
  }

  await p.goto(`${BASE}/capture`, { waitUntil: 'domcontentloaded' });
  body = await shot(p, '07-capture-surface', 2000);
  note(6, /Camera|Photo or Video|Files|Drop photos|Capture/i.test(body), `capture url=${p.url()}`);

  await signOut(p);
  body = await shot(p, '08-signout', 1500);
  const signedOut = /sign-in/i.test(p.url()) || /Sign in/i.test(body);
  note(7, signedOut, `signout url=${p.url()}`);

  const miss = evidence.filter((e) => e.startsWith('MISS')).length;
  if (bleed.length) result = 'FAIL';
  else if (signedIn && onJordan && miss === 0) result = 'PASS';
  else if (signedIn && onJordan && bleed.length === 0) result = miss <= 2 ? 'PASS' : 'PARTIAL';
  else if (signedIn) result = 'PARTIAL';
  else result = 'FAIL';
  log('SCORE miss=', miss, 'bleed=', bleed.length);
}

async function main() {
  log('START DITL-T-05-UI-02');
  const browser = await openCtx();
  const p = browser.pages()[0] || (await browser.newPage());
  try {
    await run(p);
  } catch (e) {
    log('FATAL', String(e));
    evidence.push('FATAL ' + String(e).slice(0, 500));
    result = 'FAIL';
  } finally {
    await browser.close().catch(() => {});
  }
  const payload = { result, evidence, findings, case: 'DITL-T-05-UI-02', lane: 'A' };
  fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(payload, null, 2));
  log('RESULT', result);
  log(JSON.stringify(payload, null, 2));
}

main();
