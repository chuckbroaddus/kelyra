// DITL-DH-01-UI-02 pass3 — open focus review via href
import { chromium } from '../../qa-fixtures/ditl/_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://127.0.0.1:8081';
const USER = 'ditl-teacher-a';
const PASS = process.env.DITL_TEACHER_PASS || 'DITL-teacher-test';
const UD = '/tmp/ditl-pw-lane-a';
const CLASS = 'd1715000-0000-4000-a000-000000000301';
const STUDENT = '2bcee429-11ce-4f84-b2de-9aab349f03cc';
const MARKER = process.env.DITL_MARKER || 'ditl-DH-01-UI-02-1790576788496';
const evidence = [];
const findings = [];
const log = (...a) => console.log(...a);

async function shot(p, n, w = 900) {
  await p.waitForTimeout(w);
  await p.screenshot({ path: path.join(A, `p3-${n}.png`), fullPage: true });
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 5000);
  evidence.push(`${n}: ${p.url()} :: ${body.slice(0, 900)}`);
  log('==', n, p.url(), body.slice(0, 600));
  return body;
}

function packBOn(body) {
  return /Keyed review|Pack B|Confirm extract|Accept recommendation|Approve this capture/i.test(body);
}

async function openCtx(vp) {
  fs.mkdirSync(UD, { recursive: true });
  const exe =
    process.env.HOME +
    '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
  return chromium.launchPersistentContext(UD, {
    headless: true,
    executablePath: exe,
    viewport: vp,
    args: ['--disable-dev-shm-usage', '--no-first-run'],
  });
}

async function signIn(p) {
  await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(500);
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
  await p.waitForTimeout(7000);
}

async function findFocusHref(p, marker) {
  return p.evaluate((m) => {
    const links = [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href') || '');
    const withCap = links.filter((h) => /capture=|\/student\//i.test(h));
    // Prefer near marker text
    const all = [...document.querySelectorAll('a, button, div, span')];
    for (const n of all) {
      const t = n.innerText || '';
      if (!t.includes(m.slice(-12)) && !t.includes(m)) continue;
      let el = n;
      for (let i = 0; i < 10 && el; i++) {
        const a = el.closest?.('a') || el.querySelector?.('a[href]');
        if (a && a.getAttribute('href')) return a.getAttribute('href');
        el = el.parentElement;
      }
    }
    return withCap[0] || null;
  }, marker);
}

async function main() {
  let result = 'FAIL';
  let ctx;
  try {
    ctx = await openCtx({ width: 390, height: 844 });
    const p = ctx.pages()[0] || (await ctx.newPage());
    await signIn(p);
    await shot(p, '01-in', 800);
    await p.goto(`${BASE}/inbox`, { waitUntil: 'domcontentloaded' });
    let body = await shot(p, '02-inbox', 2500);
    let href = await findFocusHref(p, MARKER);
    evidence.push(`href1=${href}`);
    log('href1', href);

    // Also try clicking Review and reading URL after navigation
    if (!href || !/capture=/i.test(href)) {
      await p.evaluate((m) => {
        const nodes = [...document.querySelectorAll('a, button, div, span')];
        const row = nodes.find((n) => (n.innerText || '').includes(m.slice(-12)));
        if (!row) return;
        let el = row;
        for (let i = 0; i < 8 && el; i++) {
          const a = el.querySelector?.('a[href*="student"], a[href*="capture"]');
          if (a) {
            a.click();
            return;
          }
          const rev = [...(el.querySelectorAll?.('a,button') || [])].find((x) =>
            /^Review$/i.test((x.innerText || '').trim()),
          );
          if (rev) {
            rev.click();
            return;
          }
          el = el.parentElement;
        }
      }, MARKER);
      await p.waitForTimeout(4000);
      body = await shot(p, '03-after-click', 800);
      href = p.url();
      evidence.push(`urlAfterClick=${href}`);
    }

    const paths = [];
    if (href && href.startsWith('http')) paths.push(href);
    else if (href) paths.push(href.startsWith('/') ? BASE + href : BASE + '/' + href);
    // Always try known student focus if we can scrape capture id from DOM
    const capId = await p.evaluate((m) => {
      const html = document.documentElement.innerHTML;
      const near = html.indexOf(m.slice(-12));
      if (near < 0) {
        const m2 = html.match(/capture=([0-9a-f-]{36})/i);
        return m2 ? m2[1] : null;
      }
      const slice = html.slice(Math.max(0, near - 2500), near + 2500);
      const m3 = slice.match(/capture=([0-9a-f-]{36})/i) || slice.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      return m3 ? m3[1] : null;
    }, MARKER);
    evidence.push(`capId=${capId}`);
    if (capId) {
      paths.push(`${BASE}/class/${CLASS}/student/${STUDENT}?capture=${capId}&tab=focus`);
      paths.push(`${BASE}/class/${CLASS}/student/${STUDENT}?capture=${capId}&tab=work`);
    }
    paths.push(`${BASE}/class/${CLASS}/student/${STUDENT}`);

    let packBPhone = false;
    let packBWeb = false;
    let reviewBody = '';
    for (const u of paths) {
      if (!u) continue;
      await p.goto(u, { waitUntil: 'domcontentloaded' }).catch(() => {});
      await p.waitForTimeout(2500);
      body = await shot(p, `04-try-${paths.indexOf(u)}`, 600);
      if (packBOn(body) || /Draft score|Draft cheap|Look again|Explain|gap/i.test(body) || /Heard:|model_draft|Save/i.test(body)) {
        reviewBody = body;
        packBPhone = packBOn(body);
        evidence.push(`opened=${u} packB=${packBPhone}`);
        break;
      }
    }
    if (!reviewBody) {
      reviewBody = body;
      packBPhone = packBOn(body);
    }

    // Web vp
    await p.setViewportSize({ width: 1280, height: 800 });
    if (capId) {
      await p.goto(`${BASE}/class/${CLASS}/student/${STUDENT}?capture=${capId}&tab=focus`, {
        waitUntil: 'domcontentloaded',
      });
      await p.waitForTimeout(2500);
    }
    body = await shot(p, '05-web-focus', 1000);
    packBWeb = packBOn(body);
    evidence.push(`packB_phone=${packBPhone} packB_web=${packBWeb}`);
    evidence.push(`gapChrome=${/Draft cheap|Look again|Add gap|Keep as a note|Draft score/i.test(body)}`);

    // Parent
    await p.setViewportSize({ width: 390, height: 844 });
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
    body = await shot(p, '06-parent', 1500);
    const parentIso = {
      hasMorgan: /Morgan\s*Patel/i.test(body),
      hasJordan: /Jordan\s*Lee/i.test(body),
      hasApprove: /Approve this capture|Accept recommendation/i.test(body),
      hasPackB: /Pack B|Keyed review|Confirm extract/i.test(body),
    };
    evidence.push('parentIso ' + JSON.stringify(parentIso));
    if (!parentIso.hasMorgan) findings.push('FINDING: Parent seat missing Morgan Patel; severity P1; case DITL-DH-01-UI-02');
    if (parentIso.hasJordan)
      findings.push('FINDING: Parent seat shows Jordan Lee teach roster bleed; severity P1; case DITL-DH-01-UI-02');
    if (parentIso.hasApprove || parentIso.hasPackB)
      findings.push('FINDING: Parent seat shows Approve/Pack B draft chrome; severity P0; case DITL-DH-01-UI-02');

    // teardown delete marker
    await p.evaluate(() => {
      const el = [...document.querySelectorAll('*')].find((n) =>
        /switch to teach/i.test((n.getAttribute?.('aria-label') || '') + (n.innerText || '')),
      );
      if (el) el.click();
    });
    await p.waitForTimeout(2000);
    await p.goto(`${BASE}/inbox`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2500);
    await p.evaluate((m) => {
      const all = [...document.querySelectorAll('button, a, div, span')];
      const markNode = all.find((n) => (n.innerText || '').includes(m.slice(-12)));
      if (!markNode) return;
      let el = markNode;
      for (let i = 0; i < 10 && el; i++) {
        const del = [...(el.querySelectorAll?.('button, a, span') || [])].find((x) =>
          /^Delete$/i.test((x.innerText || '').trim()),
        );
        if (del) {
          del.click();
          return;
        }
        el = el.parentElement;
      }
    }, MARKER);
    await p.waitForTimeout(1000);
    const confDel = p.getByRole('button', { name: /Delete|Confirm|Yes/i });
    if (await confDel.count()) await confDel.first().click({ force: true }).catch(() => {});
    await p.waitForTimeout(1500);
    await shot(p, '07-teardown', 500);

    await p.goto(`${BASE}/profile`).catch(() => {});
    await p.waitForTimeout(600);
    const so = p.getByText(/Sign out/i).first();
    if (await so.count()) await so.click({ force: true }).catch(() => {});
    await p.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
    });
    await shot(p, '99-out', 400);

    const parentOk = parentIso.hasMorgan && !parentIso.hasJordan && !parentIso.hasApprove && !parentIso.hasPackB;
    const packAny = packBPhone || packBWeb;
    if (packAny && parentOk && !findings.length) result = 'PASS';
    else if (!packAny) {
      result = 'FAIL';
      findings.push(
        'FINDING: Saved keyed homework draft review missing Pack B Approve/Accept on phone and web; severity P1; case DITL-DH-01-UI-02',
      );
    } else if (findings.length) result = 'FAIL';
    else result = 'PARTIAL';

    const out = {
      result,
      evidence,
      findings,
      marker: MARKER,
      case: 'DITL-DH-01-UI-02',
      packBPhone,
      packBWeb,
      capId,
      pass: 3,
    };
    fs.writeFileSync(path.join(A, 'result-pass3.json'), JSON.stringify(out, null, 2));
    fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(out, null, 2));
    log('RESULT', result, findings);
  } catch (e) {
    log('ERR', e);
    evidence.push(String(e));
    fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify({ result: 'FAIL', evidence, findings, error: String(e) }, null, 2));
  } finally {
    if (ctx) await ctx.close().catch(() => {});
  }
}

main();

