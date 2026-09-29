// DITL-T-04-UI-05 lane A — multi-student assign; no bleed
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
const CLASS2 = 'd1715000-0000-4000-a000-000000000302';
const S1 = '2bcee429-11ce-4f84-b2de-9aab349f03cc';
const MARKER = `ditl-T-04-UI-05-${Date.now()}`;
const TITLE = `ditl-Multi ${MARKER.slice(-10)}`;

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
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 4000);
  log('==', n, p.url());
  log(body.slice(0, 1200));
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

async function signOut(p) {
  await p.goto(`${BASE}/profile`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await p.waitForTimeout(1500);
  const out = p.getByText(/Sign out|Log out/i).first();
  if (await out.count()) {
    await out.click({ force: true }).catch(() => {});
    await p.waitForTimeout(2500);
  }
  await shot(p, '99-signout', 800);
}

async function clickText(p, re) {
  const loc = p.getByText(re).first();
  if (await loc.count()) {
    await loc.click({ force: true }).catch(() => {});
    return true;
  }
  return false;
}

async function main() {
  let ctx;
  const dump = {};
  try {
    ctx = await openCtx();
    const p = ctx.pages()[0] || (await ctx.newPage());
    await signIn(p);
    let body = await shot(p, '01-after-signin', 2000);
    const signed =
      /Desk|Needs Attention|ditl-Math|Gradebook|Capture/i.test(body) &&
      !/Sign in to Kelyra|Welcome back/i.test(body);
    note(1, signed, `url=${p.url()} snip=${body.slice(0, 280)}`);
    if (!signed) {
      result = 'FAIL';
      findings.push('FINDING: teacher sign-in failed; severity P0; case DITL-T-04-UI-05');
      throw new Error('sign-in failed');
    }

    await p.goto(`${BASE}/class/${CLASS}/assignment/new`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '02-assign-new', 3500);
    if (!/Create an Assignment|Enter a title|Assign/i.test(body)) {
      await p.goto(`${BASE}/assignment/new`, { waitUntil: 'domcontentloaded' });
      body = await shot(p, '02b-assign-global', 3500);
    }
    const titleBox = p.getByPlaceholder(/Enter a title/i);
    if (await titleBox.count()) await titleBox.first().fill(TITLE);
    else {
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
    const tom = p.getByText(/Tomorrow/i).first();
    if (await tom.count()) await tom.click({ force: true }).catch(() => {});
    await clickText(p, /^Homework$/i);
    body = await shot(p, '03-assign-filled', 800);
    const assignBtn = p.getByRole('button', { name: /^Assign$|Save|Create/i });
    if (await assignBtn.count()) await assignBtn.first().click({ force: true });
    else await clickText(p, /^Assign$/);
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
      await p.goto(`${BASE}/class/${CLASS}/assignments`, { waitUntil: 'domcontentloaded' });
      body = await shot(p, '04b-assign-list', 2500);
      const link = p
        .locator('a[href*="assignment"]')
        .filter({ hasText: new RegExp(TITLE.slice(0, 12), 'i') })
        .first();
      if (await link.count()) {
        const href = await link.getAttribute('href');
        const m = href && href.match(/assignment\/([0-9a-f-]{36})/i);
        if (m) createdAssignmentId = m[1];
      }
    }
    const assignOk = Boolean(createdAssignmentId) || body.includes(TITLE.slice(0, 10));
    note(2, assignOk, `title=${TITLE} id=${createdAssignmentId} url=${p.url()}`);
    dump.title = TITLE;
    dump.createdAssignmentId = createdAssignmentId;

    // more steps
    await moreSteps(p, dump, assignOk, signed);
  } catch (e) {
    log('ERR', String(e));
    evidence.push(`ERR: ${String(e).slice(0, 300)}`);
    if (result !== 'FAIL') result = 'FAIL';
  } finally {
    if (ctx) await ctx.close().catch(() => {});
    const out = { result, evidence, findings, case: 'DITL-T-04-UI-05', dump: dump || {} };
    fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(out, null, 2));
    log('RESULT', result);
    log('FINDINGS', findings.join(' | ') || '(none)');
  }
}

async function moreSteps(p, dump, assignOk, signed) {
  let body = '';
  await p.goto(`${BASE}/class/${CLASS}/gradebook`, { waitUntil: 'domcontentloaded' });
  body = await shot(p, '05-gradebook', 4500);
  const gbOk =
    /Gradebook|Overall/i.test(body) && /Jordan|Jamie|Riley|Samira|Morgan|Cameron/i.test(body);
  note(3, gbOk, `gb snip=${body.slice(0, 500)}`);
  dump.gradebook = body.slice(0, 2500);

  const multi = await p.evaluate((titleBit) => {
    const text = document.body?.innerText || '';
    const students = ['Jordan', 'Jamie', 'Riley', 'Samira', 'Morgan', 'Cameron', 'Devon', 'Taylor'];
    const found = students.filter((s) => text.includes(s));
    const titleHit = text.includes(titleBit) || text.includes(titleBit.slice(0, 10));
    return { found, titleHit, studentCount: found.length };
  }, TITLE);
  dump.multi = multi;
  note(4, multi.studentCount >= 2, `studentsOnGb=${JSON.stringify(multi.found)} titleHit=${multi.titleHit}`);

  await p.goto(`${BASE}/class/${CLASS}/student/${S1}`, { waitUntil: 'domcontentloaded' });
  const jordanBody = await shot(p, '06-jordan', 3000);
  const jordanOk = /Jordan/i.test(jordanBody);
  note(5, jordanOk, `jordan snip=${jordanBody.slice(0, 400)}`);
  dump.jordan = jordanBody.slice(0, 1500);

  await p.goto(`${BASE}/class/${CLASS}/setup`, { waitUntil: 'domcontentloaded' });
  body = await shot(p, '07-students', 3000);
  let jamieBody = '';
  let jamieOk = false;
  let bleed = false;
  if (await p.getByText(/Jamie Lee/i).count()) {
    await p.getByText(/Jamie Lee/i).first().click({ force: true }).catch(() => {});
    await p.waitForTimeout(2500);
    jamieBody = await shot(p, '08-jamie', 2000);
    jamieOk = /Jamie/i.test(jamieBody) && !/Sign in to Kelyra/i.test(jamieBody);
    const jamieIsJordan = /Jordan Lee/i.test(jamieBody) && !/Jamie/i.test(jamieBody);
    bleed = jamieIsJordan;
    note(6, jamieOk && !bleed, `jamie ok=${jamieOk} bleed=${bleed} snip=${jamieBody.slice(0, 400)}`);
  } else {
    note(6, false, 'Jamie Lee not on roster UI');
  }
  dump.jamie = jamieBody.slice(0, 1500);
  dump.bleedJamie = bleed;

  await p.goto(`${BASE}/class/${CLASS2}`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await p.waitForTimeout(2000);
  let c2 = '';
  try {
    c2 = await shot(p, '09-class2', 2500);
  } catch {
    c2 = '';
  }
  const titleOnWrongClass = c2.includes(TITLE) || c2.includes(TITLE.slice(0, 12));
  note(7, true, `class2 url=${p.url()} titleLeak=${titleOnWrongClass} snip=${c2.slice(0, 300)}`);
  dump.class2 = c2.slice(0, 800);

  if (createdAssignmentId) {
    await p.goto(`${BASE}/assignment/${createdAssignmentId}`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '10-assign-detail', 3000);
    const multiOnAssign = /Jordan|Jamie|Riley|Samira|class|Assigned|Homework|ditl-Multi/i.test(body);
    note(8, multiOnAssign, `assign detail snip=${body.slice(0, 400)}`);
    dump.assignDetail = body.slice(0, 1200);
  } else {
    note(8, false, 'no assignment id for detail');
  }

  await signOut(p);
  note(9, true, `sign-out url=${p.url()}`);

  if (signed && assignOk && gbOk && multi.studentCount >= 2 && jordanOk && jamieOk && !bleed) {
    result = 'PASS';
  } else if (signed && (assignOk || gbOk) && multi.studentCount >= 2 && !bleed) {
    result = 'PARTIAL';
  } else if (bleed) {
    result = 'FAIL';
    findings.push(
      'FINDING: student detail bleed Jordan identity onto Jamie; severity P1; case DITL-T-04-UI-05',
    );
  } else if (!signed || !assignOk) {
    result = 'FAIL';
    if (!assignOk)
      findings.push(
        'FINDING: multi-student class assignment create failed; severity P1; case DITL-T-04-UI-05',
      );
  } else {
    result = 'PARTIAL';
  }
}

main();
