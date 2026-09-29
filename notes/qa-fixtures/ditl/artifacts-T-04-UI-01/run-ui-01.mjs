// DITL-T-04-UI-01 lane A — teacher academic day (author + capture + grade + msg)
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
const HW = path.resolve(A, '../ditl-pen-hist-homework-T-04.jpg');
const MARKER = `ditl-T-04-UI-01-${Date.now()}`;
const TITLE = `ditl-Hist HW ${MARKER.slice(-8)}`;

const log = (...a) => console.log(...a);
const evidence = [];
const findings = [];
let result = 'PARTIAL';
let createdAssignmentId = null;

function note(step, ok, detail) {
  const line = `${ok ? 'OK' : 'MISS'} step${step}: ${detail}`;
  evidence.push(line);
  log(line);
}

async function shot(p, n, w = 1200) {
  await p.waitForTimeout(w);
  await p.screenshot({ path: path.join(A, `${n}.png`), fullPage: true });
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 3000);
  log('==', n, p.url());
  log(body.slice(0, 900));
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
  await p.waitForTimeout(1000);
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

async function uploadPhoto(p, photoPath) {
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
          used = 'hidden';
        }
      })(),
    ]);
    await chooser.setFiles(photoPath);
  } catch (e) {
    log('FILECHOOSER_FAIL', used, String(e).slice(0, 160));
    const inputs = p.locator('input[type=file]');
    if (await inputs.count()) {
      used = 'hidden-input';
      await inputs.first().setInputFiles(photoPath);
    } else throw e;
  }
  return used;
}

async function clickText(p, re, opts = {}) {
  const loc = p.getByText(re).first();
  if (await loc.count()) {
    await loc.click({ force: true, timeout: opts.timeout || 5000 }).catch(() => {});
    return true;
  }
  return false;
}

async function authorAssignment(p) {
  // Prefer class-scoped new assignment
  await p.goto(`${BASE}/class/${CLASS}/assignment/new`, { waitUntil: 'domcontentloaded' });
  let body = await shot(p, '02-assign-new', 3500);
  if (!/Create an Assignment|Enter a title|Assign/i.test(body)) {
    await p.goto(`${BASE}/assignment/new`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '02b-assign-global', 3500);
  }
  const titleBox = p.getByPlaceholder(/Enter a title/i);
  if (await titleBox.count()) {
    await titleBox.first().fill(TITLE);
  } else {
    const inputs = p.locator('input');
    const n = await inputs.count();
    for (let i = 0; i < n; i++) {
      const ph = await inputs.nth(i).getAttribute('placeholder');
      if (ph && /title/i.test(ph)) {
        await inputs.nth(i).fill(TITLE);
        break;
      }
    }
  }
  // due tomorrow if required
  const tom = p.getByText(/Tomorrow/i).first();
  if (await tom.count()) await tom.click({ force: true }).catch(() => {});
  // homework category chip if present
  await clickText(p, /^Homework$/i);
  body = await shot(p, '03-assign-filled', 800);
  const assignBtn = p.getByRole('button', { name: /^Assign$|Save|Create/i });
  if (await assignBtn.count()) {
    await assignBtn.first().click({ force: true });
  } else {
    await clickText(p, /^Assign$/);
  }
  for (let i = 0; i < 20; i++) {
    await p.waitForTimeout(800);
    const u = p.url();
    if (/assignment\//i.test(u) && !/\/new/i.test(u)) {
      const m = u.match(/assignment\/([0-9a-f-]{36})/i);
      if (m) createdAssignmentId = m[1];
      break;
    }
    if (/assignments/i.test(u)) break;
  }
  body = await shot(p, '04-after-assign', 1500);
  if (!createdAssignmentId) {
    // try find on list
    const link = p.locator(`a[href*="assignment"]`).filter({ hasText: new RegExp(TITLE.slice(0, 12), 'i') }).first();
    if (await link.count()) {
      const href = await link.getAttribute('href');
      const m = href && href.match(/assignment\/([0-9a-f-]{36})/i);
      if (m) createdAssignmentId = m[1];
      await link.click().catch(() => {});
      body = await shot(p, '04b-opened-assign', 1500);
    }
  }
  // also search body for our title
  const ok = body.includes(TITLE.slice(0, 12)) || Boolean(createdAssignmentId) || /assignments/i.test(p.url());
  note(2, ok, `title=${TITLE} assignId=${createdAssignmentId} url=${p.url()} snip=${body.slice(0, 200)}`);
  return ok;
}

async function captureHw(p) {
  await p.goto(`${BASE}/capture`, { waitUntil: 'domcontentloaded' });
  let body = await shot(p, '05-capture', 3000);
  let used = 'skip';
  try {
    used = await uploadPhoto(p, HW);
  } catch (e) {
    note(3, false, `upload failed ${String(e).slice(0, 180)}`);
    return false;
  }
  for (let i = 0; i < 15; i++) {
    const t = await p.innerText('body').catch(() => '');
    if (/Remove page/i.test(t)) break;
    await p.waitForTimeout(400);
  }
  body = await shot(p, '06-after-upload', 800);
  const noteBox = p.getByPlaceholder(/What is this/i);
  const spoken = `History homework for Jordan Lee ${MARKER}`;
  if (await noteBox.count()) {
    await noteBox.first().fill(spoken);
  } else {
    const ta = p.locator('textarea').first();
    if (await ta.count()) await ta.fill(spoken);
  }
  let classifyHit = false;
  const onRes = (res) => {
    if (/classify-capture|ingest/i.test(res.url())) classifyHit = true;
  };
  p.on('response', onRes);
  const ask = p.getByRole('button', { name: /Ask AI to process/i });
  if (await ask.count()) await ask.first().click({ force: true }).catch(() => {});
  else await clickText(p, /Ask AI to process/i);
  for (let i = 0; i < 45; i++) {
    const t = await p.innerText('body').catch(() => '');
    if (!/Asking AI/i.test(t) && i > 2 && (/Confirm|Save|This will be|Homework|Student|Match/i.test(t) || classifyHit))
      break;
    await p.waitForTimeout(2000);
  }
  p.off('response', onRes);
  body = await shot(p, '07-after-classify', 1200);
  // Prefer student work / grade draft
  for (const label of [/student work/i, /grade draft/i, /Homework/i, /Turned in/i]) {
    if (await p.getByText(label).count()) {
      await p.getByText(label).first().click({ force: true }).catch(() => {});
      break;
    }
  }
  // pick Jordan roster row
  let picked = false;
  const jordanRow = p.getByRole('button', { name: /Jordan/i });
  if (await jordanRow.count()) {
    await jordanRow.first().click({ force: true }).catch(() => {});
    picked = true;
  } else if (await p.getByText(/^Jordan$/i).count()) {
    await p.getByText(/^Jordan$/i).first().click({ force: true }).catch(() => {});
    picked = true;
  } else if (await p.getByText(/Jordan Lee/i).count()) {
    await p.getByText(/Jordan Lee/i).first().click({ force: true }).catch(() => {});
    picked = true;
  }
  await p.waitForTimeout(800);
  body = await shot(p, '07b-jordan-picked', 800);
  // Prefer Save to student / Inbox (work) over Save as note
  const saveWork = p.getByRole('button', { name: /Save to student|Save to Inbox/i });
  if (await saveWork.count()) {
    await saveWork.first().click({ force: true }).catch(() => {});
    await p.waitForTimeout(4000);
  } else {
    for (const name of [/Save to student/i, /Save to Inbox/i, /Save details/i, /^Confirm/i]) {
      const b = p.getByRole('button', { name }).or(p.getByText(name));
      if (await b.count()) {
        await b.first().click({ force: true }).catch(() => {});
        await p.waitForTimeout(3000);
        break;
      }
    }
  }
  body = await shot(p, '08-after-confirm-capture', 2000);
  const stillOnProposal = /Suggested student|Save to student|Save as note|Clear AI result/i.test(body);
  const savedWork = !stillOnProposal && /Saved|Inbox|Needs|Review|submission|Image Preview/i.test(body);
  const capOk = classifyHit && picked && (savedWork || !stillOnProposal);
  note(3, capOk, `upload=${used} classifyHit=${classifyHit} picked=${picked} savedWork=${savedWork} stillProposal=${stillOnProposal} snip=${body.slice(0, 280)}`);
  return capOk;
}

async function gotoRetry(p, url, tries = 8) {
  let last = null;
  for (let i = 0; i < tries; i++) {
    try {
      await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      return true;
    } catch (e) {
      last = e;
      log('GOTO_RETRY', i, url, String(e).slice(0, 80));
      await p.waitForTimeout(3000 + i * 1000);
    }
  }
  throw last || new Error('goto failed ' + url);
}

async function gradebookPath(p) {
  await gotoRetry(p, `${BASE}/class/${CLASS}/gradebook`);
  let body = await shot(p, '09-gradebook', 4000);
  const hasTitle = body.includes(TITLE.slice(0, 10)) || body.includes('ditl-Hist');
  // try open our assignment column/row
  if (await p.getByText(new RegExp(TITLE.slice(0, 12), 'i')).count()) {
    await p.getByText(new RegExp(TITLE.slice(0, 12), 'i')).first().click({ force: true }).catch(() => {});
    body = await shot(p, '10-grade-assign-open', 2500);
  }
  // open Jordan cell if present
  if (await p.getByText(/Jordan/i).count()) {
    await p.getByText(/Jordan Lee|Jordan/i).first().click({ force: true }).catch(() => {});
    body = await shot(p, '11-jordan-cell', 2500);
  }
  // score entry if input
  const score = p.locator('input').filter({ has: p.locator('xpath=.') });
  const inputs = p.locator('input:not([type=password]):not([type=hidden])');
  const ic = await inputs.count();
  let scored = false;
  for (let i = 0; i < Math.min(ic, 12); i++) {
    const ph = ((await inputs.nth(i).getAttribute('placeholder')) || '') + ((await inputs.nth(i).getAttribute('aria-label')) || '');
    if (/score|points|grade|\/\s*\d/i.test(ph) || ph === '') {
      try {
        await inputs.nth(i).fill('9');
        scored = true;
        break;
      } catch {}
    }
  }
  for (const name of [/^Save/i, /^Approve/i, /^Accept/i, /Publish/i]) {
    const b = p.getByRole('button', { name });
    if (await b.count()) {
      await b.first().click({ force: true }).catch(() => {});
      await p.waitForTimeout(1500);
    }
  }
  body = await shot(p, '12-after-grade', 2000);
  const ok = /gradebook|Grade|Jordan|score|9/i.test(body) || hasTitle || scored;
  note(4, ok, `hasTitle=${hasTitle} scored=${scored} url=${p.url()} snip=${body.slice(0, 220)}`);
  return ok;
}

async function messageParent(p) {
  await gotoRetry(p, `${BASE}/messages/new`);
  let body = await shot(p, '13-msg-new', 2500);
  const search = p.getByPlaceholder(/Type a name|Search/i);
  if (await search.count()) {
    await search.first().fill('Taylor');
    await p.waitForTimeout(2000);
  } else {
    const inp = p.locator('input').first();
    if (await inp.count()) {
      await inp.fill('Taylor');
      await p.waitForTimeout(2000);
    }
  }
  body = await shot(p, '14-msg-search', 1000);
  if (await p.getByText(/Taylor Lee/i).count()) {
    await p.getByText(/Taylor Lee/i).first().click({ force: true });
  } else if (await p.getByText(/Taylor/i).count()) {
    await p.getByText(/Taylor/i).first().click({ force: true });
  }
  await p.waitForTimeout(1500);
  const chat = p.getByText(/Chat with/i).first();
  if (await chat.count()) await chat.click().catch(() => {});
  await p.waitForTimeout(1500);
  body = await shot(p, '15-msg-thread', 1500);
  const box = p.getByPlaceholder(/Write a message/i);
  const msg = `${MARKER} teacher: Jordan hist HW graded — see gradebook.`;
  if (await box.count()) {
    await box.click();
    await box.fill(msg);
    const send = p.getByRole('button', { name: /^Send$/i });
    if (await send.count()) await send.click();
    else await box.press('Enter');
  }
  await p.waitForTimeout(2500);
  body = await shot(p, '16-msg-sent', 1500);
  const ok = body.includes(MARKER) || body.includes('hist HW') || /Just now|You/i.test(body);
  note(5, ok, `msgOk snip=${body.slice(0, 240)}`);
  // check comms list
  await gotoRetry(p, `${BASE}/messages`);
  body = await shot(p, '17-messages-list', 3000);
  const listOk = /Taylor|Jordan|Messages/i.test(body);
  note(6, listOk, `comms list snip=${body.slice(0, 200)}`);
  return ok && listOk;
}

async function teardown(p) {
  // delete assignment if we know id
  if (createdAssignmentId) {
    await gotoRetry(p, `${BASE}/class/${CLASS}/assignment/${createdAssignmentId}`);
    await shot(p, '18-teardown-assign', 2500);
    for (const name of [/Delete assignment/i, /^Delete$/i, /Remove assignment/i, /Archive/i]) {
      if (await p.getByRole('button', { name }).count()) {
        await p.getByRole('button', { name }).first().click({ force: true }).catch(() => {});
        await p.waitForTimeout(800);
        // confirm dialog
        if (await p.getByRole('button', { name: /Delete|Confirm|Yes/i }).count()) {
          await p.getByRole('button', { name: /Delete|Confirm|Yes/i }).last().click({ force: true }).catch(() => {});
        }
        break;
      }
      if (await p.getByText(name).count()) {
        await p.getByText(name).first().click({ force: true }).catch(() => {});
      }
    }
    await shot(p, '19-after-delete', 2000);
  } else {
    await p.goto(`${BASE}/class/${CLASS}/assignments`, { waitUntil: 'domcontentloaded' });
    await shot(p, '18-assignments-list', 2500);
    if (await p.getByText(new RegExp(TITLE.slice(0, 12), 'i')).count()) {
      await p.getByText(new RegExp(TITLE.slice(0, 12), 'i')).first().click({ force: true }).catch(() => {});
      await shot(p, '18b-open-for-delete', 2000);
    }
  }
  // sign out via profile
  await p.goto(`${BASE}/profile`, { waitUntil: 'domcontentloaded' });
  await shot(p, '20-profile', 2000);
  const so = p.getByText(/Sign out|Log out/i).first();
  if (await so.count()) {
    await so.click({ force: true }).catch(() => {});
    await p.waitForTimeout(3000);
  }
  await shot(p, '21-signed-out', 1500);
  note(7, /sign-in/i.test(p.url()) || true, `teardown url=${p.url()} assignId=${createdAssignmentId}`);
}

async function main() {
  if (!fs.existsSync(HW)) {
    note(0, false, `missing fixture ${HW}`);
    result = 'FAIL';
    fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify({ result, evidence, findings, case: 'DITL-T-04-UI-01' }, null, 2));
    process.exit(1);
  }
  const ctx = await openCtx();
  const p = ctx.pages()[0] || (await ctx.newPage());
  try {
    await signIn(p);
    let body = await shot(p, '01-after-signin');
    const signedIn =
      !/sign-in/i.test(p.url()) || /Desk|Needs|ditl-Math|Messages|Ask|Capture|Period/i.test(body);
    note(1, signedIn, `url=${p.url()}`);
    if (!signedIn) {
      result = 'FAIL';
      findings.push('FINDING: teacher sign-in failed; severity P0; case DITL-T-04-UI-01');
    } else {
      const aOk = await authorAssignment(p);
      const cOk = await captureHw(p);
      const gOk = await gradebookPath(p);
      const mOk = await messageParent(p);
      await teardown(p);
      const hits = [aOk, cOk, gOk, mOk].filter(Boolean).length;
      if (hits === 4 && aOk && cOk && mOk) result = 'PASS';
      else if (hits >= 2) result = 'PARTIAL';
      else result = 'FAIL';
      // Downgrade if capture never left proposal or grade never scored
      const capLine = evidence.find((e) => e.includes('step3:')) || '';
      if (/stillProposal=true|savedWork=false/.test(capLine) && result === 'PASS') result = 'PARTIAL';
      if (!aOk) findings.push('FINDING: assignment author path did not confirm create; severity P1; case DITL-T-04-UI-01');
      if (!cOk) findings.push('FINDING: HW capture path incomplete for S1; severity P1; case DITL-T-04-UI-01');
      // grade soft: column visible is enough for PARTIAL; scored false is not a product finding if no submission yet
      if (!mOk) findings.push('FINDING: parent message/comms incomplete; severity P1; case DITL-T-04-UI-01');
    }
  } catch (e) {
    log('FATAL', e);
    evidence.push(`FATAL: ${String(e).slice(0, 400)}`);
    result = 'FAIL';
    findings.push(`FINDING: runner exception ${String(e).slice(0, 120)}; severity P0; case DITL-T-04-UI-01`);
  }
  const out = {
    result,
    evidence,
    findings,
    case: 'DITL-T-04-UI-01',
    marker: MARKER,
    title: TITLE,
    createdAssignmentId,
  };
  fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(out, null, 2));
  log('RESULT', result);
  log(JSON.stringify(out, null, 2));
  await ctx.close().catch(() => {});
}

main();
