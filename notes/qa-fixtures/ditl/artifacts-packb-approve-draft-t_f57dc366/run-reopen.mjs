// Reopen saved capture by id for Pack B prove-out
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://127.0.0.1:8081';
const USER = 'ditl-teacher-a';
const PASS = process.env.DITL_TEACHER_PASS || 'DITL-teacher-test';
const UD = '/tmp/ditl-pw-packb-reopen-t_f57dc366';
const CLASS = 'd1715000-0000-4000-a000-000000000301';
const STUDENT = '2bcee429-11ce-4f84-b2de-9aab349f03cc';
const CAPTURE = process.env.PACKB_CAPTURE_ID || '4ac67add-3f16-4ee9-a924-53b1005fb95a';
const evidence = [];
const log = (...a) => {
  console.log(...a);
  evidence.push(a.map(String).join(' ').slice(0, 1400));
};

async function shot(p, n, w = 900) {
  await p.waitForTimeout(w);
  await p.screenshot({ path: path.join(A, `r-${n}.png`), fullPage: true });
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 5000);
  log('SHOT', n, p.url(), body.slice(0, 800));
  return body;
}

function packSig(body) {
  return {
    packB: /Keyed review|Pack B/i.test(body),
    accept: /Accept recommendation/i.test(body),
    approve: /Approve this capture/i.test(body),
    confirm: /Confirm & next|Confirm extract/i.test(body),
    draft: /draft/i.test(body),
  };
}

async function main() {
  fs.mkdirSync(UD, { recursive: true });
  const exe =
    process.env.HOME +
    '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
  const ctx = await chromium.launchPersistentContext(UD, {
    headless: true,
    executablePath: exe,
    viewport: { width: 1280, height: 900 },
    args: ['--disable-dev-shm-usage'],
  });
  const p = ctx.pages()[0] || (await ctx.newPage());
  const hits = { approve: false };
  p.on('response', (res) => {
    if (/approve_capture|approve-capture/i.test(res.url())) hits.approve = true;
  });
  const out = { card: 't_f57dc366', capture: CAPTURE, steps: {}, result: 'FAIL' };
  try {
    await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(400);
    await p.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
    });
    await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(800);
    await p.locator('input').nth(0).fill(USER);
    await p.locator('input[type=password]').first().fill(PASS);
    await p.locator('input[type=password]').first().press('Enter');
    await p.waitForTimeout(7000);
    await shot(p, '01-in', 400);

    const url = `${BASE}/class/${CLASS}/student/${STUDENT}?capture=${CAPTURE}&tab=focus`;
    log('GOTO', url);
    await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await p.waitForTimeout(5000);
    let body = await shot(p, '02-focus-capture', 1200);
    let sig = packSig(body);
    out.steps.initial = { url: p.url(), ...sig, head: body.slice(0, 1200) };
    log('SIG', JSON.stringify(sig));

    // dump buttons
    const btns = await p.evaluate(() =>
      [...document.querySelectorAll('button, [role="button"]')]
        .map((el) => (el.innerText || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .slice(0, 60),
    );
    log('BTNS', JSON.stringify(btns));
    out.steps.btns = btns;

    out.steps.ac1 = sig.packB || sig.accept || sig.approve;
    let accepted = false;
    if (out.steps.ac1) {
      for (let i = 0; i < 16; i++) {
        const conf = p.getByRole('button', { name: /Confirm & next|Confirm extract|^Confirm$/i });
        if ((await conf.count()) === 0) break;
        await conf.first().click({ force: true }).catch(() => {});
        await p.waitForTimeout(350);
      }
      body = await shot(p, '03-confirms', 500);
      for (const name of [/Accept recommendation/i, /Approve this capture/i]) {
        const b = p.getByRole('button', { name });
        if ((await b.count()) && !(await b.first().isDisabled().catch(() => true))) {
          await b.first().click({ force: true }).catch(() => {});
          accepted = true;
          await p.waitForTimeout(5000);
          log('ACCEPT', String(name));
          break;
        }
      }
      body = await shot(p, '04-after-accept', 1000);
      out.steps.afterAccept = packSig(body);
    }
    out.steps.ac2 = accepted || hits.approve;

    await p.evaluate(() => {
      const els = [...document.querySelectorAll('button, [role="button"], div, img')];
      for (const el of els) {
        const r = el.getBoundingClientRect();
        const al = (el.getAttribute('aria-label') || '').toLowerCase();
        if (/menu|open menu/i.test(al) || (r.y < 90 && r.x < 90 && r.width >= 20 && r.width <= 64)) {
          el.click();
          return;
        }
      }
    });
    await p.waitForTimeout(700);
    await p.evaluate(() => {
      const el = [...document.querySelectorAll('*')].find((n) =>
        /switch to parent seat/i.test(n.getAttribute?.('aria-label') || ''),
      );
      if (el) el.click();
    });
    await p.waitForTimeout(2500);
    await p.goto(`${BASE}/parent`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '05-parent', 2000);
    const iso = {
      morgan: /Morgan/i.test(body),
      jordan: /Jordan\s*Lee/i.test(body),
      approve: /Approve this capture|Accept recommendation/i.test(body),
      packB: /Keyed review|Pack B|Confirm extract/i.test(body),
    };
    out.parent = iso;
    out.steps.ac3 = !iso.approve && !iso.packB;
    out.hits = hits;
    out.evidence = evidence;
    out.result =
      out.steps.ac1 && out.steps.ac2 && out.steps.ac3
        ? 'PASS'
        : !out.steps.ac1
          ? 'FAIL_AC1'
          : !out.steps.ac2
            ? 'FAIL_AC2'
            : 'FAIL_AC3';
    fs.writeFileSync(path.join(A, 'result-reopen.json'), JSON.stringify(out, null, 2));
    log('RESULT', out.result);
  } catch (e) {
    out.error = String(e);
    out.evidence = evidence;
    fs.writeFileSync(path.join(A, 'result-reopen.json'), JSON.stringify(out, null, 2));
    log('ERR', e);
  } finally {
    await ctx.close().catch(() => {});
  }
}
await main();
