// AC-3 only redrive
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:8081';
const PASS = process.env.DITL_PARENT_PASS || 'DITL-parent-test';
const UD = '/tmp/ditl-pw-prove-msg';
const log = (...a) => console.log(...a);

async function main() {
  fs.mkdirSync(UD, { recursive: true });
  const exe =
    process.env.HOME +
    '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
  const common = { headless: true, viewport: { width: 1280, height: 900 }, args: ['--disable-dev-shm-usage'] };
  const browser = fs.existsSync(exe)
    ? await chromium.launchPersistentContext(UD, { ...common, executablePath: exe })
    : await chromium.launchPersistentContext(UD, { ...common, channel: 'chrome' });
  const p = browser.pages()[0] || (await browser.newPage());
  try {
    await p.goto(BASE + '/sign-in', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(800);
    await p.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
    });
    await p.goto(BASE + '/sign-in');
    await p.waitForTimeout(800);
    await p.locator('input').nth(0).fill('ditl-parent-1');
    await p.locator('input[type=password]').first().fill(PASS);
    await p.locator('input[type=password]').first().press('Enter');
    await p.waitForTimeout(6000);
    await p.getByText(/^Home$/i).first().click({ force: true });
    await p.waitForTimeout(800);
    await p.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('div,span,button,p'));
      const hit = nodes.filter((n) => (n.textContent || '').trim() === 'Jordan').pop();
      if (hit) hit.click();
    });
    await p.waitForTimeout(800);
    await p.getByText(/^Ask$/i).first().click({ force: true });
    await p.waitForTimeout(2000);
    await p.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('div,span,button,p,a'));
      const nc = nodes.find((n) => /^New chat$/i.test((n.textContent || '').trim()));
      if (nc) nc.click();
    });
    await p.waitForTimeout(2000);
    await p.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('div,span,button,p'));
      const jc = nodes.find((n) => /^Just chatting$/i.test((n.textContent || '').trim()));
      if (jc) jc.click();
    });
    await p.waitForTimeout(600);
    const text =
      'Call send_message_to_teacher for Jordan Lee. Message body: PROVEOUT-t_1e43161f-msg parent check-in no reply needed. Confirm tool result. Do not change grades.';
    const box = p.getByPlaceholder(/Ask/i).first();
    await box.click({ force: true });
    await box.fill('');
    await box.pressSequentially(text, { delay: 5 });
    await p.waitForTimeout(500);
    await p.locator('[aria-label="Send"]').first().click({ force: true });
    for (let i = 0; i < 45; i++) {
      await p.waitForTimeout(2000);
      const t = await p.innerText('body');
      if (!/Asking AI|Working/i.test(t) && /PROVEOUT-t_1e43161f-msg|sent|thread|delivered/i.test(t) && i > 2) break;
    }
    await p.waitForTimeout(3000);
    const body = (await p.innerText('body')).replace(/\n+/g, ' | ');
    await p.screenshot({ path: path.join(A, 'v2-msg-only.png'), fullPage: true });
    const ok =
      /sent|delivered|thread|message id|success|queued/i.test(body) &&
      !/cannot send|unknown tool|not allowed|failed to send/i.test(body);
    const report = { ac3: ok ? 'PASS' : 'FAIL', snip: body.slice(-700) };
    fs.writeFileSync(path.join(A, 'result-msg.json'), JSON.stringify(report, null, 2));
    log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close().catch(() => {});
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
