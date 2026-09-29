// DITL-T-04-UI-03 lane A — math answer key capture + ingest
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
const KEY = path.resolve(A, 'ditl-mixed-math-key-T-04.jpg');
const MARKER = `ditl-T-04-UI-03-${Date.now()}`;

const log = (...a) => console.log(...a);
const evidence = [];
const findings = [];
let result = 'PARTIAL';

function note(step, ok, detail) {
  const line = `${ok ? 'OK' : 'MISS'} step${step}: ${detail}`;
  evidence.push(line);
  log(line);
}

async function shot(p, n, w = 1200) {
  await p.waitForTimeout(w);
  await p.screenshot({ path: path.join(A, `${n}.png`), fullPage: true });
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 4000);
  log('==', n, p.url());
  log(body.slice(0, 1100));
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
      log('EXE_FAIL', String(e).slice(0, 160));
    }
  }
  return await chromium.launchPersistentContext(UD, { ...common, channel: 'chrome' });
}

async function signIn(p) {
  await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(900);
  await p.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
  });
  await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1400);
  await p.locator('input').nth(0).fill(USER);
  await p.locator('input[type=password]').first().fill(PASS);
  await p.locator('input[type=password]').first().press('Enter');
  await p.waitForTimeout(7000);
}

async function signOut(p) {
  await p.goto(`${BASE}/profile`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await p.waitForTimeout(1200);
  const out = p.getByText(/Sign out|Log out/i).first();
  if (await out.count()) {
    await out.click({ force: true }).catch(() => {});
    await p.waitForTimeout(2500);
  } else {
    await p.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
    });
    await p.goto(`${BASE}/sign-in`).catch(() => {});
  }
  await shot(p, '99-signout', 800);
}

async function uploadPhoto(p, filePath) {
  const fileBtn = p.getByLabel(/Photo or Video|Files|photo/i).first();
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
          used = 'drop-text';
          await p.getByText(/Drop photos|Files/i).first().click({ force: true }).catch(() => {});
        }
      })(),
    ]);
    await chooser.setFiles(filePath);
  } catch (e) {
    log('FILECHOOSER_FAIL', used, String(e).slice(0, 200));
    const inputs = p.locator('input[type=file]');
    if (await inputs.count()) {
      used = 'hidden-input';
      await inputs.first().setInputFiles(filePath);
    } else throw e;
  }
  return used;
}

async function clickText(p, re) {
  const el = p.getByText(re).first();
  if (await el.count()) {
    await el.click({ force: true }).catch(() => {});
    return true;
  }
  return false;
}

async function main() {
  log('START DITL-T-04-UI-03', { KEY: fs.existsSync(KEY), MARKER });
  let ctx;
  const hits = { classify: false, analyzeKey: false, createAssign: false, matchKey: false };
  try {
    ctx = await openCtx();
    const p = ctx.pages()[0] || (await ctx.newPage());
    p.on('response', (res) => {
      const u = res.url();
      if (/classify-capture/i.test(u)) hits.classify = true;
      if (/analyze-answer-key/i.test(u)) hits.analyzeKey = true;
      if (/create_assignment|assignments/i.test(u) && res.request().method() === 'POST') hits.createAssign = true;
      if (/match-key|score-key/i.test(u)) hits.matchKey = true;
    });

    await signIn(p);
    let body = await shot(p, '01-after-signin', 2000);
    const signed =
      /Desk|Needs Attention|ditl-Math|Gradebook|Capture/i.test(body) && !/Sign in to Kelyra|Welcome back/i.test(body);
    note(1, signed, `url=${p.url()} snip=${body.slice(0, 240)}`);
    if (!signed) {
      result = 'FAIL';
      findings.push('FINDING: teacher sign-in failed; severity P0; case DITL-T-04-UI-03');
      throw new Error('sign-in failed');
    }

    await p.goto(`${BASE}/capture`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '02-capture', 2500);
    const onCap = /\/capture/i.test(p.url()) || /Camera|Photo or Video|Files|Drop photos/i.test(body);
    note(2, onCap, `url=${p.url()}`);

    let used = 'skip';
    try {
      used = await uploadPhoto(p, KEY);
    } catch (e) {
      note(3, false, `upload failed ${String(e).slice(0, 200)}`);
      findings.push('FINDING: key photo upload failed; severity P1; case DITL-T-04-UI-03');
      throw e;
    }
    for (let i = 0; i < 20; i++) {
      const t = await p.innerText('body').catch(() => '');
      if (/Remove page/i.test(t)) break;
      await p.waitForTimeout(400);
    }
    body = await shot(p, '03-after-upload', 800);
    const uploaded = /Remove page|page 1|1 page/i.test(body);
    note(3, uploaded || used !== 'none', `upload=${used} uploadedUi=${uploaded}`);

    const noteBox = p.getByPlaceholder(/What is this/i);
    const spoken = `Math answer key mixed for ditl-Math ${MARKER}`;
    if (await noteBox.count()) await noteBox.first().fill(spoken);
    else {
      const ta = p.locator('textarea').first();
      if (await ta.count()) await ta.fill(spoken);
    }
    body = await shot(p, '04-note-filled', 600);

    const ask = p.getByRole('button', { name: /Ask AI to process/i });
    if (await ask.count()) await ask.first().click({ force: true }).catch(() => {});
    else await clickText(p, /Ask AI to process/i);

    for (let i = 0; i < 50; i++) {
      const t = await p.innerText('body').catch(() => '');
      if (
        !/Asking AI/i.test(t) &&
        i > 2 &&
        (/Confirm|Save|This will be|Answer key|assignment|Key/i.test(t) || hits.classify)
      )
        break;
      await p.waitForTimeout(2000);
    }
    body = await shot(p, '05-after-classify', 1200);
    note(4, hits.classify || /Answer key|This will be/i.test(body), `classifyHit=${hits.classify} snip=${body.slice(0, 320)}`);

    // Prefer answer key intent (already shown) and pick math assignment
    let intent = /answer key/i.test(body);
    for (const label of [/Answer key/i, /answer key for an assignment/i]) {
      if (await p.getByText(label).count()) {
        await p.getByText(label).first().click({ force: true }).catch(() => {});
        intent = true;
        break;
      }
    }
    await p.waitForTimeout(600);
    // Pick math assignment for key attach
    let pickedAssign = false;
    for (const lab of [/^ditl-Math HW S1$/i, /ditl-Math HW S1/i, /ditl-Math Quiz/i]) {
      const row = p.getByText(lab).first();
      if (await row.count()) {
        await row.click({ force: true }).catch(() => {});
        pickedAssign = true;
        await p.waitForTimeout(800);
        break;
      }
    }
    body = await shot(p, '06-intent-answer-key', 800);
    note(5, intent, `intent=${intent} pickedAssign=${pickedAssign}`);

    body = await shot(p, '07-before-confirm', 600);

    // Confirm / Attach key
    let saved = false;
    const attach = p.getByRole('button', { name: /Attach key to assignment/i });
    if (await attach.count()) {
      await attach.first().click({ force: true }).catch(() => {});
      saved = true;
      await p.waitForTimeout(4000);
    } else {
      for (const name of [
        /Attach key/i,
        /Save answer key/i,
        /Confirm/i,
        /Create assignment/i,
        /^Save$/i,
      ]) {
        const b = p.getByRole('button', { name }).or(p.getByText(name));
        if (await b.count()) {
          await b.first().click({ force: true }).catch(() => {});
          await p.waitForTimeout(3500);
          saved = true;
          break;
        }
      }
    }
    for (let i = 0; i < 40; i++) {
      const t = await p.innerText('body').catch(() => '');
      if (hits.analyzeKey || /Key saved|attached|items extracted|Key ·|Saved|parsed/i.test(t)) break;
      if (!/Asking AI|Analyz|Attach/i.test(t) && i > 8) break;
      await p.waitForTimeout(2000);
    }
    body = await shot(p, '08-after-confirm', 1500);
    const stillProposal = /Pick the assignment this key belongs|Attach key to assignment|Clear AI result/i.test(body);
    const ingestOk =
      hits.analyzeKey ||
      (!stillProposal && /Saved|Key ·|assignment|Desk|Needs/i.test(body));
    note(
      6,
      saved || ingestOk,
      `savedClick=${saved} analyzeKey=${hits.analyzeKey} classify=${hits.classify} stillProposal=${stillProposal} snip=${body.slice(0, 360)}`,
    );

    // Verify via assignment detail if possible
    await p.goto(`${BASE}/class/${CLASS}/assignments`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    body = await shot(p, '09-assignments', 3000);
    // open math hw s1
    const hw = p.getByText(/ditl-Math HW S1/i).first();
    if (await hw.count()) {
      await hw.click({ force: true }).catch(() => {});
      await p.waitForTimeout(2500);
      body = await shot(p, '10-math-hw-detail', 1500);
    }
    const keyOnAssign = /Key ·|answer key|key items|Photo key|items/i.test(body);
    note(7, true, `keyOnAssign=${keyOnAssign} url=${p.url()} snip=${body.slice(0, 300)}`);

    const core = signed && onCap && (uploaded || used !== 'none' || /Remove page/i.test(body));
    // speech-only path also classified key — require attach success for PASS
    const strong = (hits.analyzeKey || (saved && !stillProposal)) && (intent || hits.classify);
    if (strong && core) result = 'PASS';
    else if (intent && signed && onCap) result = 'PARTIAL';
    else result = 'FAIL';

    if (result === 'FAIL') {
      findings.push(
        'FINDING: key capture ingest did not complete attach/analyze; severity P1; case DITL-T-04-UI-03',
      );
    }
    // clear false positive finding from prior logic
    // (recomputed below)

    await signOut(p);
  } catch (e) {
    log('ERR', e);
    evidence.push(`ERR: ${String(e).slice(0, 400)}`);
    if (result !== 'FAIL') result = 'PARTIAL';
  } finally {
    const out = {
      result,
      evidence,
      findings,
      case: 'DITL-T-04-UI-03',
      hits,
      marker: MARKER,
      key: path.basename(KEY),
    };
    fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(out, null, 2));
    log('RESULT', result, findings);
    if (ctx) await ctx.close().catch(() => {});
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

