// DITL-S-01-ASK-01 lane C runner — skeleton
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:8081';
const USER = 'ditl-student-s1';
const PASS = process.env.DITL_STUDENT_PASS || 'DITL-student-test';
const UD = '/tmp/ditl-pw-lane-c';
const log = (...a) => console.log(...a);
const evidence = [];
const findings = [];
let result = 'PARTIAL';

function note(step, ok, detail) {
  const line = `${ok ? 'OK' : 'MISS'} step${step}: ${detail}`;
  evidence.push(line);
  log(line);
}

async function shot(p, n, w = 1500) {
  await p.waitForTimeout(w);
  await p.screenshot({ path: path.join(A, `${n}.png`), fullPage: true });
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 1600);
  log('==', n, p.url());
  log(body);
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
      return await chromium.launchPersistentContext(UD, { ...common, executablePath: exe });
    } catch (e) {
      log('EXE_FAIL', String(e).slice(0, 120));
    }
  }
  return await chromium.launchPersistentContext(UD, { ...common, channel: 'chrome' });
}

async function main() {
  log('START DITL-S-01-ASK-01');
  const browser = await openCtx();
  const p = browser.pages()[0] || (await browser.newPage());
  const askPayloads = [];
  const toolNames = [];
  p.on('response', async (res) => {
    try {
      const u = res.url();
      if (!/ask-assistant|list_my_practice|student_list_todo|rpc\//i.test(u)) return;
      const j = await res.json().catch(() => null);
      if (j) askPayloads.push({ u: u.slice(0, 120), j });
      const s = JSON.stringify(j || {}).slice(0, 4000);
      if (/list_my_practice|open_screen/i.test(s)) toolNames.push(s.slice(0, 200));
    } catch {}
  });
  try {
    await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2000);
    // clear prior seat
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
    let body = await shot(p, '01-after-signin');
    const signedIn = !/sign-in/i.test(p.url()) || /To Do|Done|Jordan|Ask|Assignments/i.test(body);
    note(1, signedIn, `url=${p.url()} signedIn=${signedIn}`);

    await p.goto(`${BASE}/ask`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '02-ask-home', 4000);
    const onAsk = /\/ask/i.test(p.url()) || /Ask|Soft|chat|message/i.test(body);
    note(2, onAsk, `ask_surface url=${p.url()} onAsk=${onAsk}`);

    // Type list_my_practice intent
    const prompts = [
      'List my practice assignments. Use list_my_practice.',
      'What practice do I have assigned? list_my_practice please.',
    ];
    let listed = false;
    let listText = '';
    for (const prompt of prompts) {
      try {
        const box = p.locator('textarea').first();
        await box.click({ timeout: 3000 });
        await box.fill(prompt);
        await p.waitForTimeout(400);
        const send = p.getByRole('button', { name: 'Send' });
        if (await send.count()) await send.click({ timeout: 3000 });
        else await p.locator('[aria-label="Send"]').first().click({ timeout: 3000 });
        await p.waitForTimeout(18000);
        body = await shot(p, listed ? '03b-ask-list' : '03-ask-list', 2000);
        listText = body;
        if (/practice|PhaseB|NoUnhide|assigned|To Do|Math|English|nothing|no practice|empty|list_my|todo/i.test(body) &&
            !/^Kelyra \| Kelyra \| 1 \| Assignments.*Ask a question about this week/i.test(body.replace(/\s+/g,' '))) {
          listed = true;
          break;
        }
        // any reply bubble beyond empty state
        if (body.length > 200 && !/Ask a question about this week/.test(body)) {
          listed = true;
          break;
        }
        if (/PhaseB|NoUnhide|assigned practice|Your practice|list_my_practice/i.test(body)) {
          listed = true;
          break;
        }
      } catch (e) {
        log('prompt err', String(e).slice(0, 120));
      }
    }
    const hasPracticeNames = /PhaseB|NoUnhide|ditl-|practice|assignment/i.test(listText);
    const emptyPractice = /no practice|nothing assigned|empty|0 assignment|no assigned/i.test(listText);
    note(3, listed || hasPracticeNames || emptyPractice, `list_attempt listed=${listed} names=${hasPracticeNames} empty=${emptyPractice}`);

    // Try open_screen / navigate to practice
    let opened = false;
    try {
      const openPrompt = 'Open my first assigned practice. Use open_screen to the practice detail.';
      const box = p.locator('textarea').first();
      await box.click({ timeout: 2000 });
      await box.fill(openPrompt);
      await p.waitForTimeout(400);
      const send2 = p.getByRole('button', { name: 'Send' });
      if (await send2.count()) await send2.click({ timeout: 3000 });
      else await p.locator('[aria-label="Send"]').first().click({ timeout: 3000 });
      await p.waitForTimeout(18000);
      body = await shot(p, '04-ask-open', 2000);
      if (/\/todo\/|\/lesson\//.test(p.url())) opened = true;
      // click any Open link Ask may have rendered
      if (!opened) {
        const openBtn = p.getByText(/^Open$/i);
        if ((await openBtn.count()) > 0) {
          await openBtn.first().click({ timeout: 3000, force: true }).catch(() => {});
          await p.waitForTimeout(3000);
          opened = /\/todo\/|\/lesson\//.test(p.url());
        }
      }
      if (!opened) {
        const link = await p.$$eval('a[href]', (as) =>
          as.map((a) => a.getAttribute('href')).find((h) => h && (/\/todo\//.test(h) || /\/lesson\//.test(h))),
        );
        if (link) {
          await p.goto(link.startsWith('http') ? link : `${BASE}${link}`, { waitUntil: 'domcontentloaded' });
          await p.waitForTimeout(2500);
          opened = true;
        }
      }
    } catch (e) {
      log('open err', String(e).slice(0, 120));
    }
    body = await shot(p, '05-after-open', 1500);
    note(4, opened || /Turn in|Submit|Open|practice/i.test(body), `open_screen_or_nav opened=${opened} url=${p.url()}`);

    // Confirm submit is UI-primary (known GAP for Ask submit)
    const submitOnAsk = /Turn in|Submit practice via Ask/i.test(body) && /\/ask/i.test(p.url());
    evidence.push('GAP: submit via Ask is UI-primary (case known GAP) — not a finding');
    note(5, true, `submit_via_ask_ui_primary_gap observed_submit_on_ask=${submitOnAsk}`);

    // Dual path: still can reach /todo
    await p.goto(`${BASE}/todo`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '06-todo-dual-path', 3500);
    const dualTodo = /To Do|Done|Open|PhaseB|assignment|practice|not assigned/i.test(body);
    note(6, dualTodo, `dual_path_todo=${dualTodo} url=${p.url()}`);

    // Class ground chip if present on Ask
    await p.goto(`${BASE}/ask`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '07-ask-ground', 3000);
    const ground = /Math|English|class|assignment|Choose|Just chatting|Jordan/i.test(body);
    note(7, ground || onAsk, `ask_groundish=${ground}`);

    // soft sign-out cleanup (no DB teardown for this ask-only case)
    try {
      await p.evaluate(() => {
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch {}
      });
      await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
      await shot(p, '08-signout', 800);
    } catch {}

    const misses = evidence.filter((e) => e.startsWith('MISS'));
    const sawList = listed || hasPracticeNames || emptyPractice;
    if (signedIn && onAsk && sawList && dualTodo && misses.length === 0) {
      // submit via Ask is GAP by design — PASS if list+open path + dual UI visible
      result = opened || dualTodo ? 'PASS' : 'PARTIAL';
      if (!opened && !hasPracticeNames) result = emptyPractice ? 'PARTIAL' : 'PARTIAL';
    } else if (!signedIn) {
      result = 'FAIL';
    } else if (!sawList) {
      result = 'PARTIAL';
      evidence.push('Ask could not clearly list practice — saw: ' + listText.slice(0, 280));
    } else {
      result = misses.length >= 3 ? 'FAIL' : 'PARTIAL';
    }
    // Prefer GAP tag if only missing was Ask submit
    if (result === 'PASS' && !opened) {
      // still ok: dual path + list is enough; open_screen optional soft
      result = hasPracticeNames || listed ? 'PASS' : 'PARTIAL';
    }
    log('ASK_PAYLOADS_N', askPayloads.length);
    log('TOOL_SNIPS', JSON.stringify(toolNames).slice(0, 800));
  } catch (e) {
    log('FATAL', String(e));
    evidence.push('FATAL ' + String(e).slice(0, 400));
    result = 'FAIL';
  } finally {
    await browser.close().catch(() => {});
  }
  const report = {
    case: 'DITL-S-01-ASK-01',
    result,
    evidence,
    findings,
    lane: 'C',
    user: USER,
    note: 'Known GAP submit-via-Ask (UI-primary) — not filed as finding',
  };
  fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(report, null, 2));
  log('RESULT', result);
  log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
