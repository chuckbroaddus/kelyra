// Live drive: Jordan Lee Turn in after student_submit planned SQL
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://127.0.0.1:8081';
const SID = '8c1e6ed0-f708-454b-b509-9b40ff2c3377';
const USER = 'ditl-student-s1';
const PASS = process.env.DITL_STUDENT_PASS || 'DITL-student-test';
const UD = '/tmp/ditl-pw-turnin-after-sql';
const log = (...a) => console.log(...a);
const rpcHits = [];
const evidence = [];

function note(id, ok, detail) {
  const line = `${ok ? 'PASS' : 'FAIL'} ${id}: ${detail}`;
  evidence.push(line);
  log(line);
}

async function shot(p, n, waitMs = 1500) {
  await p.waitForTimeout(waitMs);
  const fp = path.join(A, `${n}.png`);
  await p.screenshot({ path: fp, fullPage: true });
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 2200);
  log('==', n, p.url());
  log(body);
  return { body, path: fp, url: p.url() };
}

async function openCtx(vp) {
  fs.mkdirSync(UD + '-' + vp.width, { recursive: true });
  const common = {
    headless: true,
    viewport: vp,
    args: ['--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check'],
  };
  const candidates = [
    process.env.HOME +
      '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
    process.env.HOME +
      '/Library/Caches/ms-playwright/chromium-1234/chrome-mac/Chromium.app/Contents/MacOS/Chromium',
  ];
  for (const exe of candidates) {
    if (!fs.existsSync(exe)) continue;
    try {
      return await chromium.launchPersistentContext(UD + '-' + vp.width, {
        ...common,
        executablePath: exe,
      });
    } catch (e) {
      log('EXE_FAIL', String(e).slice(0, 120));
    }
  }
  return await chromium.launchPersistentContext(UD + '-' + vp.width, {
    ...common,
    channel: 'chrome',
  });
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

async function clickTurnIn(p) {
  let clicked = false;
  const turn = p.getByText(/^Turn in$/i);
  const n = await turn.count();
  log('TURN_CANDS', n, p.url());
  if (n > 0) {
    await turn.last().click({ force: true, timeout: 5000 });
    clicked = true;
    await p.waitForTimeout(4500);
    return clicked;
  }
  const rb = p.getByRole('button', { name: /^Turn in$/i });
  if (await rb.count()) {
    await rb.first().click({ force: true });
    clicked = true;
    await p.waitForTimeout(4500);
    return clicked;
  }
  clicked = await p.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('div,span,button,a'));
    const t = nodes.find((el) => /^Turn in$/i.test((el.textContent || '').trim()));
    if (t) {
      t.click();
      return true;
    }
    return false;
  });
  if (clicked) await p.waitForTimeout(4500);
  return clicked;
}

async function driveViewport(label, vp) {
  log('--- drive', label, JSON.stringify(vp));
  const browser = await openCtx(vp);
  const p = browser.pages()[0] || (await browser.newPage());
  const hits = [];
  p.on('response', async (res) => {
    try {
      const u = res.url();
      const st = res.status();
      if (!/student_submit|student_list_todo|rpc\//i.test(u)) return;
      const txt = await res.text().catch(() => '');
      const row = { st, u: u.slice(0, 180), snip: txt.slice(0, 500) };
      hits.push(row);
      rpcHits.push({ label, ...row });
      if (/student_submit/i.test(u)) log('HIT_SUBMIT', label, st, txt.slice(0, 200));
    } catch {}
  });

  await signIn(p);
  const shot1 = await shot(p, `${label}-01-after-signin`);
  const signedIn =
    !/sign-in/i.test(p.url()) || /To Do|Jordan|Assignments|Ask|Done/i.test(shot1.body);
  note(`${label}-signin`, signedIn, `url=${p.url()} jordan=${/Jordan/i.test(shot1.body)}`);

  await p.goto(`${BASE}/todo/${SID}`, { waitUntil: 'domcontentloaded' });
  const shot2 = await shot(p, `${label}-02-detail`, 4000);
  const onRow =
    p.url().includes(SID) &&
    /PhaseB|NoUnhide|Turn in|Could not submit|submitted|practice/i.test(shot2.body);
  note(
    `${label}-open`,
    onRow,
    `url=${p.url()} hasTurn=${/Turn in/i.test(shot2.body)} err=${/Could not submit/i.test(shot2.body)}`,
  );

  const alreadySubmittedCue =
    /submitted|turned in|already submitted|graded|complete/i.test(shot2.body) &&
    !/Turn in/i.test(shot2.body);
  const hasTurn = /Turn in/i.test(shot2.body);
  let clicked = false;
  let shot3 = shot2;
  if (hasTurn) {
    clicked = await clickTurnIn(p);
    shot3 = await shot(p, `${label}-03-after-turnin`, 3000);
  } else {
    shot3 = await shot(p, `${label}-03-no-turnin-control`, 800);
  }

  const couldNot = /Could not submit/i.test(shot3.body);
  const submitOk = hits.some((h) => /student_submit/i.test(h.u) && h.st < 400);
  const submitFail = hits.some((h) => /student_submit/i.test(h.u) && h.st >= 400);
  const submitSnips = hits.filter((h) => /student_submit/i.test(h.u));
  const leftDetail = !p.url().includes(SID) || /\/todo\/?$/.test(p.url());
  const ac1 =
    !couldNot &&
    (submitOk || alreadySubmittedCue || (clicked && leftDetail && !submitFail));
  note(
    `${label}-AC-TURNIN-1`,
    ac1,
    `couldNot=${couldNot} clicked=${clicked} submitOk=${submitOk} submitFail=${submitFail} left=${leftDetail} snips=${JSON.stringify(submitSnips).slice(0, 280)} url=${p.url()}`,
  );

  let secondWrite = false;
  if (/Turn in/i.test(shot3.body) && !alreadySubmittedCue) {
    const beforeHits = hits.filter((h) => /student_submit/i.test(h.u)).length;
    await clickTurnIn(p);
    await p.waitForTimeout(3000);
    const afterHits = hits.filter((h) => /student_submit/i.test(h.u));
    secondWrite = afterHits.slice(beforeHits).some((h) => h.st < 400);
    await shot(p, `${label}-04-second-turnin`, 1200);
  }
  note(
    `${label}-AC-TURNIN-2`,
    alreadySubmittedCue || !secondWrite || submitFail,
    `already=${alreadySubmittedCue} secondWrite=${secondWrite}`,
  );

  await p.goto(`${BASE}/todo`, { waitUntil: 'domcontentloaded' });
  const shotList = await shot(p, `${label}-05-todo-list`, 3500);
  const bleed = /\bJamie Lee\b|\bAlex Rivera\b|ditl-student-s2|Samira Khan|Colton/i.test(
    shotList.body,
  );
  note(`${label}-AC-TURNIN-3`, !bleed, `bleed=${bleed}`);

  await browser.close().catch(() => {});
  return {
    label,
    signedIn,
    ac1,
    couldNot,
    submitOk,
    submitFail,
    shots: [shot1.path, shot2.path, shot3.path, shotList.path],
    hits,
  };
}

async function main() {
  log('START turnin-after-sql', SID, USER);
  const web = await driveViewport('web1280', { width: 1280, height: 900 });
  const phone = await driveViewport('phone390', { width: 390, height: 844 });
  const out = {
    case: 'turnin-after-sql',
    submission: SID,
    user: USER,
    web,
    phone,
    rpcHits,
    evidence,
    verdict: {
      'AC-TURNIN-1': web.ac1 && phone.ac1,
      'AC-TURNIN-2': evidence
        .filter((e) => e.includes('AC-TURNIN-2'))
        .every((e) => e.startsWith('PASS')),
      'AC-TURNIN-3': evidence
        .filter((e) => e.includes('AC-TURNIN-3'))
        .every((e) => e.startsWith('PASS')),
    },
  };
  fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(out, null, 2));
  log('RESULT', JSON.stringify(out.verdict));
  for (const e of evidence) log(e);
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
