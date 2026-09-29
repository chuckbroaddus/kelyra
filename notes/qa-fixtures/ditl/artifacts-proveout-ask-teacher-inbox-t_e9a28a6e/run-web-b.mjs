// Seat switch + inbox Review compare for t_e9a28a6e
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://127.0.0.1:8081';
const USER = 'ditl-teacher-a';
const PASS = process.env.DITL_TEACHER_PASS || 'DITL-teacher-test';
const UD = '/tmp/ditl-pw-prove-ask-inbox-b';
const log = (...a) => console.log(...a);
async function main() {
  const report = {};
  fs.mkdirSync(UD, { recursive: true });
  const exe =
    process.env.HOME +
    '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
  const common = { headless: true, viewport: { width: 1280, height: 900 }, args: ['--disable-dev-shm-usage'] };
  const ctx = fs.existsSync(exe)
    ? await chromium.launchPersistentContext(UD, { ...common, executablePath: exe })
    : await chromium.launchPersistentContext(UD, { ...common, channel: 'chrome' });
  const p = ctx.pages()[0] || (await ctx.newPage());
  try {
    await p.goto(BASE + '/sign-in', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(600);
    await p.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
    });
    await p.goto(BASE + '/sign-in');
    await p.waitForTimeout(800);
    await p.locator('input').nth(0).fill(USER);
    await p.locator('input[type=password]').first().fill(PASS);
    await p.locator('input[type=password]').first().press('Enter');
    await p.waitForTimeout(7000);

    await p.goto(BASE + '/inbox', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2000);
    await p.screenshot({ path: path.join(A, 'web-b-01-inbox.png'), fullPage: true });
    let body = (await p.innerText('body')).replace(/\n+/g, ' | ');
    report.inboxDefault = body.slice(0, 1500);

    for (const tab of ['Review', 'All', 'Needs a name']) {
      await p.evaluate((t) => {
        const nodes = Array.from(document.querySelectorAll('div,span,button,p,a'));
        const hit = nodes.find((n) => (n.textContent || '').trim() === t);
        if (hit) hit.click();
      }, tab);
      await p.waitForTimeout(1500);
      body = (await p.innerText('body')).replace(/\n+/g, ' | ');
      await p.screenshot({ path: path.join(A, `web-b-inbox-${tab.replace(/\s+/g, '-')}.png`), fullPage: true });
      report['tab_' + tab] = body.slice(0, 1200);
      report['has_row_' + tab] = /1d937e5a|draft|Jordan Lee|Needs a name|Review/i.test(body);
    }

    await p.goto(BASE + '/profile', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2000);
    body = (await p.innerText('body')).replace(/\n+/g, ' | ');
    report.profileSnip = body.slice(0, 1500);
    await p.screenshot({ path: path.join(A, 'web-b-02-profile.png'), fullPage: true });

    const clicked = await p.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('button,div,span,a,p'));
      for (const n of nodes) {
        const t = (n.textContent || '').trim();
        if (t === 'Parent' || /^Parent seat$/i.test(t) || /Switch to Parent/i.test(t)) {
          n.click();
          return t;
        }
      }
      for (const n of nodes) {
        const t = (n.textContent || '').trim();
        if (/Teacher · Parent|· Parent/i.test(t) && t.length < 60) {
          n.click();
          return 'chrome:' + t;
        }
      }
      return 'none';
    });
    report.switchClick = clicked;
    await p.waitForTimeout(2500);
    body = (await p.innerText('body')).replace(/\n+/g, ' | ');
    report.afterSwitch = body.slice(0, 1200);
    await p.screenshot({ path: path.join(A, 'web-b-03-after-switch.png'), fullPage: true });
    report.onParentTray = /Home|Ride/.test(body) && !/Needs Attention/.test(body);
    report.stillTeach = /Needs Attention|Desk/.test(body);

    if (report.onParentTray) {
      await p.goto(BASE + '/ask', { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(2000);
      await p.evaluate(() => {
        const nodes = Array.from(document.querySelectorAll('div,span,button,p,a'));
        const nc = nodes.find((n) => /^New chat$/i.test((n.textContent || '').trim()));
        if (nc) nc.click();
      });
      await p.waitForTimeout(1000);
      const box = p.getByPlaceholder(/Ask/i).first();
      if (await box.count()) {
        await box.fill('');
        await box.pressSequentially('Call list_inbox. Return tool result.', { delay: 4 });
      }
      await p.locator('[aria-label="Send"]').first().click({ force: true }).catch(() => p.keyboard.press('Enter'));
      for (let i = 0; i < 30; i++) {
        await p.waitForTimeout(2000);
        const t = await p.innerText('body');
        if (!/Asking AI|Working/i.test(t) && i > 2) break;
      }
      body = (await p.innerText('body')).replace(/\n+/g, ' | ');
      report.dhParentAsk = body.slice(-1000);
      report.dhListed = /1d937e5a|status:\s*`?draft/i.test(body);
      await p.screenshot({ path: path.join(A, 'web-b-04-dh-parent-ask.png'), fullPage: true });
    }
  } catch (e) {
    report.error = String(e).slice(0, 400);
  }
  fs.writeFileSync(path.join(A, 'result-web-b.json'), JSON.stringify(report, null, 2));
  log(JSON.stringify(report, null, 2));
  await ctx.close().catch(() => {});
}
main();
