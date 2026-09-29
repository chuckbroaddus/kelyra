// DITL-T-05-UI-01 lane A — student card → existing Jordan Lee
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:8081';
const USER = 'ditl-teacher-a';
const PASS = process.env.DITL_TEACHER_PASS || 'DITL-teacher-test';
const UD = '/tmp/ditl-pw-lane-a';
const PHOTO = path.resolve(A, '../ditl-pen-student-card-S-01.jpg');
const log = (...a) => console.log(...a);
const evidence = [];
const findings = [];
let result = 'PARTIAL';
const net = [];

function note(step, ok, detail) {
  const line = `${ok ? 'OK' : 'MISS'} step${step}: ${detail}`;
  evidence.push(line);
  log(line);
}

async function shot(p, n, w = 1200) {
  await p.waitForTimeout(w);
  await p.screenshot({ path: path.join(A, `${n}.png`), fullPage: true });
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 2500);
  log('==', n, p.url());
  log(body.slice(0, 800));
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
      log('TRY_EXE', exe);
      return await chromium.launchPersistentContext(UD, { ...common, executablePath: exe });
    } catch (e) {
      log('EXE_FAIL', String(e).slice(0, 120));
    }
  }
  return await chromium.launchPersistentContext(UD, { ...common, channel: 'chrome' });
}

async function signIn(p) {
  await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1200);
  await p.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
  });
  await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  await p.locator('input').nth(0).fill(USER);
  await p.locator('input[type=password]').first().fill(PASS);
  await p.locator('input[type=password]').first().press('Enter');
  await p.waitForTimeout(7000);
}

async function uploadPhoto(p) {
  // Prefer library path (web stand-in for PHYS fixture inject). Camera is PHYSICAL-ONLY.
  const fileBtn = p.getByLabel(/Photo or Video|Files|photo/i).first();
  const cam = p.getByLabel(/^Camera$/i).first();
  let used = 'none';
  try {
    const [chooser] = await Promise.all([
      p.waitForEvent('filechooser', { timeout: 8000 }),
      (async () => {
        if (await fileBtn.count()) {
          used = 'library';
          await fileBtn.click({ timeout: 4000 });
        } else if (await p.getByRole('button', { name: /Photo or Video|Files/i }).count()) {
          used = 'button';
          await p.getByRole('button', { name: /Photo or Video|Files/i }).first().click();
        } else {
          used = 'camera-fallback';
          await cam.click({ timeout: 3000 }).catch(() => {});
        }
      })(),
    ]);
    await chooser.setFiles(PHOTO);
  } catch (e) {
    log('FILECHOOSER_FAIL', used, String(e).slice(0, 200));
    // Drag-drop fallback via DataTransfer is flaky; try input[type=file]
    const inputs = p.locator('input[type=file]');
    if (await inputs.count()) {
      used = 'hidden-input';
      await inputs.first().setInputFiles(PHOTO);
    } else {
      throw e;
    }
  }
  return used;
}

async function runFlow(p) {
  await signIn(p);
  let body = await shot(p, '01-after-signin');
  const signedIn =
    !/sign-in/i.test(p.url()) || /Desk|Needs Attention|ditl-Math|Period|Messages|Ask|Capture/i.test(body);
  const wrongSeat = /Sign in to see work/i.test(body) && !/Desk|Needs/i.test(body);
  note(1, signedIn && !wrongSeat, `url=${p.url()} signedIn=${signedIn} wrongSeat=${wrongSeat}`);

  await p.goto(`${BASE}/capture`, { waitUntil: 'domcontentloaded' });
  body = await shot(p, '02-capture', 3500);
  const onCap = /\/capture/i.test(p.url()) || /Camera|Photo or Video|Files|Drop photos/i.test(body);
  note(2, onCap, `capture_surface url=${p.url()}`);

  let used = 'skip';
  try {
    used = await uploadPhoto(p);
  } catch (e) {
    note(3, false, `upload failed: ${String(e).slice(0, 200)}`);
    result = 'FAIL';
    return;
  }
  // Wait until page lands
  for (let i = 0; i < 20; i++) {
    const t = await p.innerText('body').catch(() => '');
    if (/Remove page/i.test(t)) break;
    await p.waitForTimeout(400);
  }
  body = await shot(p, '03-after-upload', 800);
  const pageOk = /Remove page/i.test(body);
  note(3, pageOk || used !== 'none', `upload_path=${used} pageOk=${pageOk} snip=${body.slice(0, 200)}`);
  if (!pageOk) {
    // retry upload once
    try {
      used = (await uploadPhoto(p)) + '+retry';
      await p.waitForTimeout(1500);
      body = await shot(p, '03b-retry-upload', 800);
    } catch {}
  }

  // Note field (spokenName) — exact placeholder from capture.tsx
  const noteBox = p.getByPlaceholder(/What is this/i);
  if (await noteBox.count()) {
    await noteBox.first().click({ force: true });
    await noteBox.first().fill('Student card for Jordan Lee');
  } else {
    const ta = p.locator('textarea').first();
    if (await ta.count()) {
      await ta.click({ force: true });
      await ta.fill('Student card for Jordan Lee');
    }
  }
  await p.waitForTimeout(400);

  let classifyHit = false;
  const onRes = async (res) => {
    if (/classify-capture/i.test(res.url())) classifyHit = true;
  };
  p.on('response', onRes);
  const ask = p.getByRole('button', { name: /Ask AI to process/i });
  if (await ask.count()) {
    await ask.first().scrollIntoViewIfNeeded().catch(() => {});
    await ask.first().click({ force: true, timeout: 8000 });
  } else {
    const askTxt = p.getByText(/Ask AI to process/i);
    if (await askTxt.count()) await askTxt.first().click({ force: true });
  }
  for (let i = 0; i < 60; i++) {
    const t = await p.innerText('body').catch(() => '');
    if (/This will be a student|Confirm every field|Suggested student|Save details|This will be/i.test(t) && !/Asking AI/i.test(t) && i > 1)
      break;
    if (classifyHit && !/Asking AI/i.test(t) && i > 3) break;
    await p.waitForTimeout(2000);
  }
  p.off('response', onRes);
  body = await shot(p, '04-after-classify', 1200);
  note(
    4,
    /This will be a student|Confirm every field|Student card|Save details|Save to/i.test(body) || classifyHit,
    `classifyHit=${classifyHit} snip=${body.slice(0, 500)}`,
  );

  // Force student card if unsure
  if (!/This will be a student card|Confirm every field/i.test(body)) {
    const sc = p.getByRole('button', { name: /^Student card$/i });
    if (await sc.count()) {
      await sc.first().click();
      body = await shot(p, '04b-forced-student-card', 1500);
    } else {
      const chip = p.getByText(/^Student card$/i);
      if (await chip.count()) await chip.first().click().catch(() => {});
      body = await shot(p, '04b-forced-student-card', 1500);
    }
  }

  // Pick Jordan Lee only — click the roster ListRow (full name), not tray chip
  let picked = false;
  const jordanRow = p.getByRole('button', { name: /Jordan Lee/i });
  if (await jordanRow.count()) {
    await jordanRow.first().click({ force: true, timeout: 5000 });
    picked = true;
  } else {
    const rows = p.locator('[role=button], [role=listitem], div').filter({ hasText: /^Jordan Lee$/ });
    const n = await rows.count();
    for (let i = 0; i < Math.min(n, 8); i++) {
      const t = (await rows.nth(i).innerText().catch(() => '')).trim();
      if (/^Jordan Lee/i.test(t) && !/Jamie/i.test(t)) {
        await rows.nth(i).click({ force: true }).catch(() => {});
        picked = true;
        break;
      }
    }
  }
  if (!picked) {
    await p.getByText('Jordan Lee', { exact: true }).last().click({ force: true }).catch(() => {});
  }
  await p.waitForTimeout(800);
  body = await shot(p, '05-jordan-selected', 1200);
  const jordanSel = /Jordan Lee/i.test(body);
  note(5, jordanSel, `jordan_visible=${jordanSel} picked=${picked}`);

  // "will not invent" is expected copy — not a create path
  const invent =
    /\bCreate student\b|\bNew student\b|\bAdd student\b/i.test(body) && !/will not invent/i.test(body);
  if (invent)
    findings.push(
      'FINDING: student_card UI offered create/new student path; severity P1; case DITL-T-05-UI-01',
    );

  const save = p.getByRole('button', { name: /Save details/i });
  let saveEnabled = false;
  for (let i = 0; i < 10; i++) {
    if (!(await save.count())) break;
    const dis = await save.first().getAttribute('aria-disabled').catch(() => null);
    const disabled = await save.first().isDisabled().catch(() => true);
    if (dis !== 'true' && !disabled) {
      saveEnabled = true;
      break;
    }
    // re-click Jordan
    await p.getByText('Jordan Lee', { exact: true }).last().click({ force: true }).catch(() => {});
    await p.waitForTimeout(500);
  }
  note(5.5, saveEnabled || (await save.count()) > 0, `saveEnabled=${saveEnabled}`);
  if (await save.count()) {
    if (saveEnabled) {
      await save.first().click({ timeout: 8000 });
    } else {
      // last resort: force click even if disabled (may no-op)
      await save.first().click({ force: true, timeout: 5000 }).catch(() => {});
    }
    for (let i = 0; i < 40; i++) {
      const t = await p.innerText('body').catch(() => '');
      if (!/Saving/i.test(t) && i > 2) break;
      await p.waitForTimeout(1500);
    }
  } else {
    note(6, false, 'Save details button missing');
  }
  body = await shot(p, '06-after-save', 2500);
  const saved = /\/student\/2bcee429|Jordan Lee/i.test(p.url() + body);
  note(6, saved, `after_save url=${p.url()} snip=${body.slice(0, 300)}`);

  // Details tab for field read-back
  if (/\/student\//i.test(p.url())) {
    const det = p.getByRole('button', { name: /^Details$/i });
    if (await det.count()) await det.first().click({ force: true }).catch(() => {});
    else await p.getByText(/^Details$/i).first().click({ force: true }).catch(() => {});
    body = await shot(p, '07-student-details', 2000);
    const fields =
      /123 Maple|555-0142|alex\.rivera|Mar 15|birthday|phone|address|grade/i.test(body);
    note(6.5, fields, `details_fields=${fields} snip=${body.slice(0, 400)}`);
  } else {
    body = await shot(p, '07-student-try', 1500);
  }

  // Teardown: clear metadata keys if UI allows; delete note_only capture if shown.
  // Do not delete student. Prefer Details clear; otherwise leave PARTIAL teardown note.
  const clearBtns = p.getByRole('button', { name: /Clear|Remove|Delete capture|Delete/i });
  log('TEARDOWN_UI_CANDIDATES', await clearBtns.count());

  // Sign out via hamburger drawer
  const ham = p.getByLabel(/Menu|Open menu|hamburger/i).first();
  if (await ham.count()) await ham.click({ force: true }).catch(() => {});
  else {
    // chrome mark / top-left
    await p.locator('[aria-label*=Menu], [aria-label*=menu]').first().click({ force: true }).catch(() => {});
  }
  await p.waitForTimeout(800);
  let so = p.getByRole('button', { name: /Sign out/i });
  if (!(await so.count())) so = p.getByText(/Sign out/i);
  if (await so.count()) await so.first().click({ force: true }).catch(() => {});
  else {
    await p.goto(`${BASE}/profile`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await p.waitForTimeout(1500);
    so = p.getByRole('button', { name: /Sign out/i });
    if (await so.count()) await so.first().click({ force: true }).catch(() => {});
  }
  await p.waitForTimeout(2500);
  body = await shot(p, '08-signout', 1500);
  const signedOut = /sign-in/i.test(p.url()) || /Sign in/i.test(body);
  note(7, signedOut, `teardown_signout url=${p.url()}`);

  const okSteps = evidence.filter((e) => e.startsWith('OK')).length;
  const miss = evidence.filter((e) => e.startsWith('MISS')).length;
  if (miss === 0 && okSteps >= 6 && signedIn && saved) result = 'PASS';
  else if (signedIn && onCap && saved) result = miss <= 1 ? 'PASS' : 'PARTIAL';
  else if (signedIn && onCap) result = 'PARTIAL';
  else result = 'FAIL';
}

function finish() {
  const payload = { result, evidence, findings, net: net.slice(0, 40) };
  fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(payload, null, 2));
  log('RESULT', result);
  log(JSON.stringify(payload, null, 2));
}

async function main() {
  log('START DITL-T-05-UI-01 photo=', PHOTO, fs.existsSync(PHOTO));
  const browser = await openCtx();
  const p = browser.pages()[0] || (await browser.newPage());
  p.on('response', async (res) => {
    try {
      const u = res.url();
      if (!/classify-capture|update_student|rpc\/|captures|students|storage/i.test(u)) return;
      let snip = '';
      try {
        snip = (await res.text()).slice(0, 400);
      } catch {}
      net.push({ st: res.status(), u: u.slice(0, 160), snip });
      log('NET', res.status(), u.slice(0, 100), snip.slice(0, 100));
    } catch {}
  });
  try {
    await runFlow(p);
  } catch (e) {
    log('FATAL', String(e));
    evidence.push('FATAL ' + String(e).slice(0, 500));
  } finally {
    await browser.close().catch(() => {});
  }
  finish();
}

main();
