// DITL-P-02-UI-01 messages probe only
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

async function shot(p, n, w = 1500) {
  await p.waitForTimeout(w);
  await p.screenshot({ path: path.join(A, `${n}.png`), fullPage: true });
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 2000);
  log('==', n, p.url());
  log(body);
  return body;
}

async function main() {
  const browser = await chromium.launchPersistentContext(UD, {
    channel: 'chrome',
    headless: true,
    viewport: { width: 1280, height: 900 },
    args: ['--disable-dev-shm-usage'],
  });
  const p = browser.pages()[0] || (await browser.newPage());
  try {
    await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1200);
    await p.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
    });
    await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1200);
    await p.locator('input').nth(0).fill(USER);
    await p.locator('input[type=password]').first().fill(PASS);
    await p.locator('input[type=password]').first().press('Enter');
    await p.waitForTimeout(6000);
    await shot(p, 'm01-signed');

    await p.goto(`${BASE}/messages`, { waitUntil: 'domcontentloaded' });
    let body = await shot(p, 'm02-list', 3000);

    // dump interactive-ish text
    const links = await p.locator('a,button,[role=button]').allTextContents().catch(() => []);
    log('CONTROLS', links.map((t) => t.trim()).filter(Boolean).slice(0, 40).join(' || '));

    // try Avery Quinn thread (teacher-ish from prior run)
    try {
      await p.getByText(/Avery Quinn/i).first().click({ timeout: 5000 });
      await p.waitForTimeout(2500);
    } catch (e) {
      log('aq click fail', String(e).slice(0, 80));
    }
    body = await shot(p, 'm03-thread', 2000);

    // try New / compose
    for (const label of [/^New$/i, /New message/i, /Compose/i, /Start/i, /\+/]) {
      try {
        const b = p.getByText(label).first();
        if (await b.count()) {
          await b.click({ timeout: 2000 });
          log('clicked', String(label));
          await p.waitForTimeout(1500);
        }
      } catch {}
    }
    body = await shot(p, 'm04-after-new', 1500);

    // list inputs
    const inputs = await p.evaluate(() => {
      return [...document.querySelectorAll('input,textarea,[contenteditable=true]')].map((el) => ({
        tag: el.tagName,
        type: el.getAttribute('type'),
        ph: el.getAttribute('placeholder'),
        aria: el.getAttribute('aria-label'),
        role: el.getAttribute('role'),
      }));
    });
    log('INPUTS', JSON.stringify(inputs));

    const ta = p.locator('textarea').first();
    const ce = p.locator('[contenteditable=true]').first();
    const inp = p.locator('input:not([type=password]):not([type=hidden])').last();
    let filled = false;
    const msg =
      'DITL-P-02-UI-01 parent homework check-in on Jordan. No action needed.';
    for (const loc of [ta, ce, inp]) {
      try {
        if (!(await loc.count())) continue;
        await loc.click({ timeout: 2000 });
        await loc.fill(msg).catch(async () => {
          await p.keyboard.type(msg, { delay: 10 });
        });
        filled = true;
        log('filled via', await loc.evaluate((el) => el.tagName));
        break;
      } catch (e) {
        log('fill fail', String(e).slice(0, 80));
      }
    }
    body = await shot(p, 'm05-composed', 1000);
    if (filled) {
      try {
        const send = p.getByRole('button', { name: /Send/i }).first();
        if (await send.count()) await send.click({ timeout: 3000 });
        else await p.keyboard.press('Enter');
        await p.waitForTimeout(4000);
      } catch (e) {
        log('send', String(e).slice(0, 80));
      }
    }
    body = await shot(p, 'm06-after-send', 2000);
    const visible = /DITL-P-02-UI-01|homework check-in on Jordan/i.test(body);
    log('MSG_VISIBLE', visible);

    await p.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
    });
    await p.goto(`${BASE}/sign-in`);
    await shot(p, 'm07-out', 1000);
  } finally {
    await browser.close().catch(() => {});
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
