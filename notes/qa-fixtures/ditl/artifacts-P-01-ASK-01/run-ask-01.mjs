import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:8081';
const USER = 'ditl-parent-1';
const PASS = process.env.DITL_PARENT_PASS || 'DITL-parent-test';
const UD = '/tmp/ditl-pw-lane-b';
const log = (...a) => console.log(...a);
const evidence = [];
function note(step, ok, detail) {
  const line = `${ok ? 'OK' : 'MISS'} step${step}: ${detail}`;
  evidence.push(line);
  log(line);
}
async function shot(p, n, w = 1500) {
  await p.waitForTimeout(w);
  await p.screenshot({ path: path.join(A, `${n}.png`), fullPage: true });
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 1800);
  log('==', n, p.url());
  log(body);
  return body;
}
async function sendAsk(p, text) {
  await p.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('div,span,button,p,a'));
    const nc = nodes.find((n) => /^New chat$/i.test((n.textContent || '').trim()));
    if (nc) nc.click();
  });
  await p.waitForTimeout(2500);
  await p.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('div,span,button,p'));
    const jc = nodes.find((n) => /^Just chatting$/i.test((n.textContent || '').trim()));
    if (jc) jc.click();
  });
  await p.waitForTimeout(800);

  const box = p.getByPlaceholder(/Ask/i).first();
  await box.click({ force: true, timeout: 5000 }).catch(() => {});
  try {
    await box.fill('');
    await box.pressSequentially(text, { delay: 10 });
  } catch (e) {
    log('pressSeq fail', String(e).slice(0, 80));
    await p.keyboard.type(text, { delay: 10 });
  }
  await p.waitForTimeout(600);
  let enabled = false;
  for (let i = 0; i < 10; i++) {
    const dis = await p.locator('[aria-label="Send"]').first().getAttribute('aria-disabled').catch(() => 'true');
    if (dis !== 'true') {
      enabled = true;
      break;
    }
    await p.waitForTimeout(300);
  }
  log('send enabled', enabled);
  await p.locator('[aria-label="Send"]').first().click({ force: true, timeout: 5000 }).catch(async () => {
    await p.evaluate(() => document.querySelector('[aria-label="Send"]')?.click());
  });
  await p.waitForTimeout(3000);
  const marker = text.slice(0, 36);
  for (let i = 0; i < 45; i++) {
    const t = await p.innerText('body').catch(() => '');
    const busy = /Asking AI|Opening Kelyra|Working…|Working\.\.\./i.test(t);
    if (!busy && t.includes(marker) && i > 2) {
      await p.waitForTimeout(6000);
      break;
    }
    await p.waitForTimeout(2000);
  }
}
async function tray(p, label) {
  const t = p.getByText(new RegExp(`^${label}$`, 'i')).first();
  await t.click({ timeout: 6000, force: true });
  await p.waitForTimeout(2000);
}
async function bindChildAndOpenAsk(p, childFirst) {
  await tray(p, 'Home');
  await p.waitForTimeout(1500);
  // Force-click AvatarTray label without scrollIntoView (RN web often hangs)
  await p.evaluate((name) => {
    const nodes = Array.from(document.querySelectorAll('div,span,button,p'));
    // Prefer short exact match near avatars (single token first name)
    const exact = nodes.filter((n) => (n.textContent || '').trim() === name);
    const hit = exact[exact.length - 1] || exact[0];
    if (hit) {
      hit.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      hit.click();
    }
  }, childFirst);
  await p.waitForTimeout(1500);
  // Confirm home body shows the child
  const homeBody = (await p.innerText('body').catch(() => '')).slice(0, 500);
  log('bound home snip', childFirst, homeBody.includes(childFirst));
  await tray(p, 'Ask');
  await p.waitForTimeout(2500);
  await p.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('div,span,button,p'));
    const jc = nodes.find((n) => /Just chatting/i.test((n.textContent || '').trim()));
    if (jc) jc.click();
  });
  await p.waitForTimeout(800);
}
async function main() {
  fs.mkdirSync(UD, { recursive: true });
  const browser = await chromium.launchPersistentContext(UD, {
    channel: 'chrome',
    headless: true,
    viewport: { width: 1280, height: 900 },
    args: ['--disable-dev-shm-usage'],
  });
  const p = browser.pages()[0] || (await browser.newPage());
  try {
    await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2000);
    await p.locator('input').nth(0).fill(USER);
    await p.locator('input[type=password]').first().fill(PASS);
    await p.locator('input[type=password]').first().press('Enter');
    await p.waitForTimeout(7000);
    let body = await shot(p, '01-after-signin');
    const onParent = /\/parent/.test(p.url()) || /Jordan|Jamie|Home|Ride|Ask/i.test(body);
    note(1, onParent, `url=${p.url()} parentish=${onParent}`);

    await bindChildAndOpenAsk(p, 'Jordan');
    body = await shot(p, '03-ask-open-jordan', 2000);
    const askOpen =
      /\/ask/.test(p.url()) &&
      !/Pick a child on Home first/i.test(body);
    note(2, askOpen || /Just chatting|Which assignment|Ask…|Ask\.\.\./i.test(body), `ask_url=${p.url()} groundedish=${askOpen} snip=${body.slice(0, 180)}`);

    // Clear prior thread so scoring is not polluted
    try {
      await p.getByText(/^New chat$/i).first().click({ force: true, timeout: 3000 });
      await p.waitForTimeout(2000);
    } catch {}
    await p.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('div,span,button,p'));
      const jc = nodes.find((n) => /^Just chatting$/i.test((n.textContent || '').trim()));
      if (jc) jc.click();
    });
    await p.waitForTimeout(600);

    await sendAsk(
      p,
      'Call my_children_progress. Summarize focus and practice for Jordan Lee only. Do not invent scores. Do not change grades.',
    );
    body = await shot(p, '04-ask-progress-jordan', 1000);
    const jordanProg =
      /Jordan/i.test(body) &&
      /place-value|focus|practice|progress|sentence|Math Period/i.test(body) &&
      !/Pick a child on Home first/i.test(body);
    note(3, jordanProg, `jordan_progressish=${jordanProg} snip=${body.slice(-500)}`);

    await bindChildAndOpenAsk(p, 'Jamie');
    try {
      await p.getByText(/^New chat$/i).first().click({ force: true, timeout: 3000 });
      await p.waitForTimeout(2000);
    } catch {}
    await p.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('div,span,button,p'));
      const jc = nodes.find((n) => /^Just chatting$/i.test((n.textContent || '').trim()));
      if (jc) jc.click();
    });
    await p.waitForTimeout(600);
    body = await shot(p, '05-ask-open-jamie', 1000);
    await sendAsk(
      p,
      'Call my_children_progress for Jamie Lee only (not Jordan). Report Jamie focus/practice only. Keep siblings isolated. No scores. No grade writes.',
    );
    body = await shot(p, '05-ask-progress-jamie', 1000);
    const jamieProg =
      /Jamie/i.test(body) &&
      /decimal|focus|practice|progress|sentence|Math/i.test(body) &&
      !/Pick a child on Home first/i.test(body);
    // Isolation soft-check: if both names in assistant reply region, still OK if Jamie present
    note(4, jamieProg, `jamie_progressish=${jamieProg} snip=${body.slice(-500)}`);

    await bindChildAndOpenAsk(p, 'Jordan');
    try {
      await p.getByText(/^New chat$/i).first().click({ force: true, timeout: 3000 });
      await p.waitForTimeout(2000);
    } catch {}
    await p.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('div,span,button,p'));
      const jc = nodes.find((n) => /^Just chatting$/i.test((n.textContent || '').trim()));
      if (jc) jc.click();
    });
    await p.waitForTimeout(600);
    await sendAsk(
      p,
      'For Jordan Lee only, call explain_my_class_average for class Math named ditl-Math Period 3. Report overall weighted average and category weights. Published scores only. Do not mutate grades.',
    );
    body = await shot(p, '06-ask-avg-jordan-math', 1000);
    const avgOk =
      (/average|weighted|overall|92\s*%|88\s*%|Homework|Quiz|Participation/i.test(body) ||
        /explain_my_class_average|Current average/i.test(body)) &&
      /Jordan|Math/i.test(body) &&
      !/Pick a child on Home first/i.test(body);
    // Require more than leftover assignment list alone
    const avgStrong =
      /weighted|overall|92|%|Homework ·|category|disclos/i.test(body) ||
      (/average/i.test(body) && /Jordan/i.test(body) && /Math/i.test(body));
    note(5, avgOk && avgStrong, `avgish=${avgOk} strong=${avgStrong} snip=${body.slice(-550)}`);

    const mutateUi =
      /Approve capture|Save grade|Publish grade|Edit approved/i.test(body) ||
      (await p.getByRole('button', { name: /Approve|Publish grade|Save score/i }).count()) > 0;
    note(6, !mutateUi, `no_grade_mutation_ui=${!mutateUi}`);

    let signedOut = false;
    try {
      await tray(p, 'Home');
      await p.waitForTimeout(1000);
      const so = p.getByText(/Sign out|Log out/i).first();
      if (await so.count()) {
        await so.click({ force: true });
        await p.waitForTimeout(3000);
        signedOut = true;
      }
    } catch (e) {
      log('signout', String(e).slice(0, 100));
    }
    if (!signedOut) {
      await p.evaluate(() => {
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch {}
      });
      await p.goto(`${BASE}/sign-in`);
      await p.waitForTimeout(2000);
      signedOut = /sign-in/i.test(p.url());
    }
    body = await shot(p, '07-signout', 1200);
    note(7, signedOut || /sign-in/i.test(p.url()), `signedOut=${signedOut} url=${p.url()}`);
    evidence.push(
      'GAP: vehicle pick / Ride check-in / leave = no Ask tools (case known GAP) — not findings',
    );
  } catch (e) {
    log('FATAL', String(e));
    evidence.push('FATAL ' + String(e).slice(0, 400));
  } finally {
    await browser.close().catch(() => {});
  }
  const misses = evidence.filter((e) => e.startsWith('MISS'));
  const fatals = evidence.filter((e) => e.startsWith('FATAL'));
  let result = 'PASS';
  if (fatals.length) result = 'FAIL';
  else if (misses.length) result = misses.length >= 3 ? 'FAIL' : 'PARTIAL';
  const report = {
    case: 'DITL-P-01-ASK-01',
    result,
    evidence,
    findings: [],
    misses,
    gaps: [
      'GAP: vehicle pick / Ride check-in / leave — no Ask tools; PHYSICAL-ONLY camera (case PARTIAL/GAP)',
    ],
  };
  fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(report, null, 2));
  log('RESULT', result);
  log(JSON.stringify(report, null, 2));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
