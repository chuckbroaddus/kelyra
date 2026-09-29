// DITL-DH-01-UI-02 pass2 skeleton
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:8081';
const USER = 'ditl-teacher-a';
const PASS = process.env.DITL_TEACHER_PASS || 'DITL-teacher-test';
const UD = '/tmp/ditl-pw-lane-a';
const MARKER = 'ditl-DH-01-UI-02-1790531215247';
const log = (...a) => console.log(...a);
const evidence = [];
const findings = [];
async function shot(p, n, w = 1000) {
  await p.waitForTimeout(w);
  await p.screenshot({ path: path.join(A, `p2-${n}.png`), fullPage: true });
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 3500);
  log('==', n, p.url(), body.slice(0, 900));
  evidence.push(`${n}: ${p.url()} :: ${body.slice(0, 500)}`);
  return body;
}
async function openCtx() {
  fs.mkdirSync(UD, { recursive: true });
  const exe =
    process.env.HOME +
    '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
  return chromium.launchPersistentContext(UD, {
    headless: true,
    executablePath: exe,
    viewport: { width: 390, height: 844 },
    args: ['--disable-dev-shm-usage'],
  });
}
async function signIn(p) {
  await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(600);
  await p.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
  });
  await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1000);
  await p.locator('input').nth(0).fill(USER);
  await p.locator('input[type=password]').first().fill(PASS);
  await p.locator('input[type=password]').first().press('Enter');
  await p.waitForTimeout(6000);
}
async function main() {
  const ctx = await openCtx();
  const p = ctx.pages()[0] || (await ctx.newPage());
  try {
    await signIn(p);
    await shot(p, '01-in', 800);
    await p.goto(`${BASE}/inbox`, { waitUntil: 'domcontentloaded' });
    let body = await shot(p, '02-inbox', 2500);
    const hit = await p.evaluate((marker) => {
      const nodes = [...document.querySelectorAll('button, a, div, span')];
      const row = nodes.find((n) => (n.innerText || '').includes(marker.slice(-12)));
      if (!row) return null;
      let el = row;
      for (let i = 0; i < 8 && el; i++) {
        const rev = [...(el.querySelectorAll?.('button, a, span, div') || [])].find((x) =>
          /^Review$/i.test((x.innerText || '').trim()),
        );
        if (rev) {
          rev.click();
          return 'row-review';
        }
        el = el.parentElement;
      }
      const any = nodes.find((n) => /^Review$/i.test((n.innerText || '').trim()));
      if (any) {
        any.click();
        return 'first-review';
      }
      return null;
    }, MARKER);
    log('reviewClick', hit);
    await p.waitForTimeout(3500);
    body = await shot(p, '03-review', 1200);
    const pack = /Keyed review|Pack B|Confirm extract|Accept recommendation|Approve this capture|Decision card/i.test(
      body,
    );
    evidence.push(`packB_on_review=${pack}`);
    for (let i = 0; i < 10; i++) {
      const conf = p.getByRole('button', { name: /Confirm extract|Confirm & next|^Confirm$/i });
      if (await conf.count()) {
        await conf.first().click({ force: true }).catch(() => {});
        await p.waitForTimeout(400);
      } else break;
    }
    for (const name of [/Accept recommendation/i, /Approve this capture/i]) {
      const b = p.getByRole('button', { name });
      if (await b.count() && !(await b.first().isDisabled().catch(() => true))) {
        await b.first().click({ force: true }).catch(() => {});
        await p.waitForTimeout(3000);
        evidence.push('approved_via_review');
        break;
      }
    }
    body = await shot(p, '04-after-review-actions', 1000);
    await p.goto(`${BASE}/inbox`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '05-inbox-before-del', 2000);
    const deleted = await p.evaluate((marker) => {
      const all = [...document.querySelectorAll('button, a, div, span')];
      const markNode = all.find((n) => (n.innerText || '').includes(marker.slice(-12)));
      if (!markNode) return false;
      let el = markNode;
      for (let i = 0; i < 10 && el; i++) {
        const del = [...(el.querySelectorAll?.('button, a, span') || [])].find((x) =>
          /^Delete$/i.test((x.innerText || '').trim()),
        );
        if (del) {
          del.click();
          return true;
        }
        el = el.parentElement;
      }
      return false;
    }, MARKER);
    await p.waitForTimeout(1500);
    const confDel = p.getByRole('button', { name: /Delete|Confirm|Yes/i });
    if (await confDel.count()) await confDel.first().click({ force: true }).catch(() => {});
    await p.waitForTimeout(2000);
    body = await shot(p, '06-after-delete', 1000);
    evidence.push(`deleteAttempt=${deleted} stillMarker=${body.includes(MARKER.slice(-8))}`);
    await p.evaluate(() => {
      const els = [...document.querySelectorAll('button, [role="button"], div, img')];
      for (const el of els) {
        const r = el.getBoundingClientRect();
        if (r.y < 80 && r.x < 80 && r.width >= 24 && r.width <= 56) {
          el.click();
          return;
        }
      }
    });
    await p.waitForTimeout(800);
    await p.evaluate(() => {
      const el = [...document.querySelectorAll('*')].find((n) =>
        /switch to parent seat/i.test(n.getAttribute?.('aria-label') || ''),
      );
      if (el) el.click();
    });
    await p.waitForTimeout(3000);
    await p.goto(`${BASE}/parent`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '07-parent', 2000);
    const iso = {
      morgan: /Morgan\s*Patel/i.test(body),
      jordan: /Jordan\s*Lee/i.test(body),
      approve: /Approve this capture|Accept recommendation/i.test(body),
      packB: /Pack B|Keyed review|Confirm extract/i.test(body),
    };
    evidence.push('iso ' + JSON.stringify(iso));
    if (!iso.morgan) findings.push('FINDING: Parent seat missing Morgan Patel; severity P1; case DITL-DH-01-UI-02');
    if (iso.jordan)
      findings.push('FINDING: Parent seat shows Jordan Lee teach roster bleed; severity P1; case DITL-DH-01-UI-02');
    if (iso.approve || iso.packB)
      findings.push('FINDING: Parent seat shows Approve/Pack B draft chrome; severity P0; case DITL-DH-01-UI-02');
    await p.goto(`${BASE}/profile`).catch(() => {});
    await p.waitForTimeout(800);
    const so = p.getByText(/Sign out/i).first();
    if (await so.count()) await so.click({ force: true }).catch(() => {});
    await p.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
    });
    await shot(p, '99-out', 600);
    const result = pack
      ? findings.length
        ? 'FAIL'
        : 'PASS'
      : iso.morgan && !iso.jordan && !iso.approve && !iso.packB
        ? 'PARTIAL'
        : 'FAIL';
    if (!pack) {
      evidence.push(
        'NOTE: Pack B UI not reached — homework capture never selects keyed assignment (assignmentId only on answer_key).',
      );
    }
    const out = {
      result,
      evidence,
      findings,
      packB: pack,
      case: 'DITL-DH-01-UI-02',
      note: 'pass1 draft Jordan; pass2 review+delete+parent',
    };
    fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(out, null, 2));
    fs.writeFileSync(path.join(A, 'result-pass2.json'), JSON.stringify(out, null, 2));
    log('RESULT', result, findings);
  } catch (e) {
    log('ERR', e);
    fs.writeFileSync(
      path.join(A, 'result.json'),
      JSON.stringify({ result: 'FAIL', evidence, findings, error: String(e) }, null, 2),
    );
  } finally {
    await ctx.close().catch(() => {});
  }
}
main();
