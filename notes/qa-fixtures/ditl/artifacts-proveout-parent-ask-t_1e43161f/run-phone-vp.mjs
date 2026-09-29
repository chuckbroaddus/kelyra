// Phone viewport web drive for prove-out t_1e43161f
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const A = path.dirname(fileURLToPath(import.meta.url));
const UD = '/tmp/ditl-pw-prove-phone-vp';
const PASS = process.env.DITL_PARENT_PASS || 'DITL-parent-test';
const evidence = [];
const log = (...a) => console.log(...a);

async function main() {
  fs.mkdirSync(UD, { recursive: true });
  const exe =
    process.env.HOME +
    '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
  const common = {
    headless: true,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    args: ['--disable-dev-shm-usage'],
  };
  const browser = fs.existsSync(exe)
    ? await chromium.launchPersistentContext(UD, { ...common, executablePath: exe })
    : await chromium.launchPersistentContext(UD, { ...common, channel: 'chrome' });
  const p = browser.pages()[0] || (await browser.newPage());
  try {
    await p.goto('http://localhost:8081/sign-in', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(800);
    await p.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
    });
    await p.goto('http://localhost:8081/sign-in');
    await p.waitForTimeout(800);
    await p.locator('input').nth(0).fill('ditl-parent-1');
    await p.locator('input[type=password]').first().fill(PASS);
    await p.locator('input[type=password]').first().press('Enter');
    await p.waitForTimeout(6500);
    await p.screenshot({ path: path.join(A, 'phone-vp-01-parent.png'), fullPage: true });
    let body = (await p.innerText('body')).replace(/\n+/g, ' | ');
    evidence.push(/Jamie|Jordan|Home|Ask/.test(body) ? 'PASS PHONE-VP-SIGNIN' : 'FAIL PHONE-VP-SIGNIN');

    await p.getByText(/^Ask$/i).first().click({ force: true }).catch(() => {});
    await p.waitForTimeout(2500);
    await p.screenshot({ path: path.join(A, 'phone-vp-02-ask.png'), fullPage: true });
    body = (await p.innerText('body')).replace(/\n+/g, ' | ');
    evidence.push(
      /ditl-Math HW|ditl-English HW|Which assignment|Ask/i.test(body)
        ? 'PASS PHONE-VP-ASK-OPEN'
        : 'FAIL PHONE-VP-ASK-OPEN',
    );

    await p.evaluate(() => {
      const n = [...document.querySelectorAll('div,span,button,p,a')].find((x) =>
        /^New chat$/i.test((x.textContent || '').trim()),
      );
      if (n) n.click();
    });
    await p.waitForTimeout(2000);
    await p.evaluate(() => {
      const n = [...document.querySelectorAll('div,span,button,p')].find((x) =>
        /^Just chatting$/i.test((x.textContent || '').trim()),
      );
      if (n) n.click();
    });
    await p.waitForTimeout(500);
    const q = 'List Jordan Lee assignments with list_my_assignments. Titles only. No invent.';
    const box = p.getByPlaceholder(/Ask/i).first();
    await box.click({ force: true }).catch(() => {});
    try {
      await box.fill('');
      await box.pressSequentially(q, { delay: 5 });
    } catch {
      await p.keyboard.type(q, { delay: 5 });
    }
    await p.waitForTimeout(400);
    await p.locator('[aria-label="Send"]').first().click({ force: true }).catch(async () => {
      await p.evaluate(() => document.querySelector('[aria-label="Send"]')?.click());
    });
    for (let i = 0; i < 40; i++) {
      await p.waitForTimeout(2000);
      const t = await p.innerText('body');
      if (!/Asking AI|Working/i.test(t) && t.includes('List Jordan') && i > 2) {
        await p.waitForTimeout(4000);
        break;
      }
    }
    await p.screenshot({ path: path.join(A, 'phone-vp-03-list.png'), fullPage: true });
    body = (await p.innerText('body')).replace(/\n+/g, ' | ');
    const stopped = /started that work, then stopped|can'?t list/i.test(body);
    // Assistant reply must list titles; chips alone are not AC pass
    const after = body.slice(body.lastIndexOf('List Jordan'));
    const titlesInReply = /ditl-Math HW|ditl-English HW/i.test(after) && !stopped;
    evidence.push(
      !stopped && titlesInReply
        ? 'PASS PHONE-VP-AC1'
        : `FAIL PHONE-VP-AC1 stopped=${stopped} snip=${after.slice(0, 400)}`,
    );
  } catch (e) {
    evidence.push('FATAL ' + String(e).slice(0, 300));
    log(e);
  } finally {
    await browser.close().catch(() => {});
  }
  const report = {
    surface: 'phone-viewport-web',
    evidence,
    result: evidence.some((e) => e.startsWith('FAIL') || e.startsWith('FATAL')) ? 'FAIL' : 'PASS',
  };
  fs.writeFileSync(path.join(A, 'result-phone-vp.json'), JSON.stringify(report, null, 2));
  log(JSON.stringify(report, null, 2));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
