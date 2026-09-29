// Pack B Approve on saved draft — live IQG drive (t_f57dc366)
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://127.0.0.1:8081';
const USER = 'ditl-teacher-a';
const PASS = process.env.DITL_TEACHER_PASS || 'DITL-teacher-test';
const UD = '/tmp/ditl-pw-packb-t_f57dc366';
const evidence = [];
const log = (...a) => {
  console.log(...a);
  evidence.push(a.map(String).join(' ').slice(0, 1200));
};

async function shot(p, n, w = 800) {
  await p.waitForTimeout(w);
  const fp = path.join(A, `${n}.png`);
  await p.screenshot({ path: fp, fullPage: true });
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 4000);
  log('SHOT', n, p.url(), body.slice(0, 700));
  return body;
}

async function dump(p) {
  return p.evaluate(() => {
    const text = (document.body?.innerText || '').replace(/\s+/g, ' ').trim();
    const btns = [...document.querySelectorAll('button, a, [role="button"]')]
      .map((el) => (el.getAttribute('aria-label') || el.innerText || '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, 80);
    return { url: location.href, text: text.slice(0, 2500), btns };
  });
}

async function signIn(p) {
  await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForTimeout(500);
  await p.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
  });
  await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForTimeout(1000);
  await p.locator('input').nth(0).fill(USER);
  await p.locator('input[type=password]').first().fill(PASS);
  await p.locator('input[type=password]').first().press('Enter');
  await p.waitForTimeout(7000);
}

function packBSignals(body) {
  return {
    packBHeader: /Keyed review\s*[·.]\s*Pack B|Keyed review/i.test(body),
    accept: /Accept recommendation/i.test(body),
    approveCapture: /Approve this capture/i.test(body),
    confirm: /Confirm & next|Confirm extract|^Confirm$/im.test(body),
  };
}

async function main() {
  fs.mkdirSync(UD, { recursive: true });
  fs.mkdirSync(A, { recursive: true });
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
  const out = {
    card: 't_f57dc366',
    case: 'DITL-DH-01-UI-02',
    surface: 'web',
    steps: {},
    packB: null,
    parent: null,
    result: 'FAIL',
  };
  try {
    await signIn(p);
    await shot(p, 'w-01-signin', 500);
    await p.goto(`${BASE}/inbox`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    let body = await shot(p, 'w-02-inbox', 3500);
    const d2 = await dump(p);
    log('INBOX_DUMP', JSON.stringify({ url: d2.url, hasJordan: /Jordan/i.test(d2.text), head: d2.text.slice(0, 400) }));

    const nav = await p.evaluate(() => {
      const links = [...document.querySelectorAll('a, button, div, span')];
      const candidates = [];
      for (const el of links) {
        const t = (el.innerText || '').replace(/\s+/g, ' ').trim();
        if (!/^Review$/i.test(t)) continue;
        let root = el;
        for (let i = 0; i < 12 && root; i++) {
          const rt = (root.innerText || '').replace(/\s+/g, ' ');
          if (/Jordan/i.test(rt) && /Review/i.test(rt)) {
            candidates.push({ el, rt: rt.slice(0, 120) });
            break;
          }
          root = root.parentElement;
        }
      }
      if (candidates[0]) {
        candidates[0].el.click();
        return { how: 'click-review-jordan', sample: candidates[0].rt };
      }
      return { how: null };
    });
    log('NAV_CLICK', JSON.stringify(nav));
    await p.waitForTimeout(4000);
    body = await shot(p, 'w-03-after-review-click', 1500);

    if (/\/inbox/i.test(p.url())) {
      const href = await p.evaluate(() => {
        const as = [...document.querySelectorAll('a[href*="/student/"], a[href*="capture="]')];
        const hit = as.find((a) => /Jordan/i.test(a.innerText || a.parentElement?.innerText || ''));
        return hit ? hit.getAttribute('href') : as[0]?.getAttribute('href') || null;
      });
      log('HREF_TRY', href);
      if (href) {
        const url = href.startsWith('http') ? href : `${BASE}${href.startsWith('/') ? '' : '/'}${href}`;
        await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await p.waitForTimeout(4000);
        body = await shot(p, 'w-04-deep-link', 1000);
      }
    }

    if (!/student\//i.test(p.url())) {
      await p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(2000);
      await p.evaluate(() => {
        const el = [...document.querySelectorAll('*')].find(
          (n) => /ditl-Math|Period 3/i.test((n.innerText || '').trim()) && (n.innerText || '').length < 60,
        );
        if (el) el.click();
      });
      await p.waitForTimeout(2500);
      await p.evaluate(() => {
        const tab = [...document.querySelectorAll('button, a, [role="tab"]')].find((n) =>
          /^Students$/i.test((n.innerText || '').trim()),
        );
        if (tab) tab.click();
      });
      await p.waitForTimeout(2000);
      await p.evaluate(() => {
        const j = [...document.querySelectorAll('*')].find((n) => {
          const t = (n.innerText || '').trim();
          return /^Jordan(\s+Lee)?$/i.test(t) && t.length < 40;
        });
        if (j) j.click();
      });
      await p.waitForTimeout(4000);
      body = await shot(p, 'w-05-student-focus', 1000);
      await p.evaluate(() => {
        const tab = [...document.querySelectorAll('button, a, [role="tab"]')].find((n) =>
          /Focus|Work|Capture/i.test((n.innerText || '').trim()),
        );
        if (tab) tab.click();
      });
      await p.waitForTimeout(2000);
      body = await shot(p, 'w-06-focus-tab', 800);
    }

    let sig = packBSignals(body);
    log('PACKB_SIG', JSON.stringify(sig), p.url());
    out.packB = { url: p.url(), ...sig, bodyHead: body.slice(0, 900) };
    out.steps.ac1_visible = sig.packBHeader || sig.accept || sig.approveCapture;

    if (out.steps.ac1_visible) {
      for (let i = 0; i < 12; i++) {
        const conf = p.getByRole('button', { name: /Confirm & next|Confirm extract|^Confirm$/i });
        if ((await conf.count()) === 0) break;
        await conf.first().click({ force: true }).catch(() => {});
        await p.waitForTimeout(350);
      }
      body = await shot(p, 'w-07-after-confirms', 600);
      let accepted = false;
      for (const name of [/Accept recommendation/i, /Approve this capture/i]) {
        const b = p.getByRole('button', { name });
        if ((await b.count()) && !(await b.first().isDisabled().catch(() => true))) {
          await b.first().click({ force: true }).catch(() => {});
          await p.waitForTimeout(4000);
          accepted = true;
          log('ACCEPT_CLICK', String(name));
          break;
        }
      }
      body = await shot(p, 'w-08-after-accept', 800);
      out.steps.ac2_accept = accepted;
      out.steps.afterAcceptHead = body.slice(0, 600);
    } else {
      out.steps.ac2_accept = false;
      const d = await dump(p);
      log('NO_PACKB_BTNS', JSON.stringify(d.btns.slice(0, 40)));
    }

    await p.evaluate(() => {
      const els = [...document.querySelectorAll('button, [role="button"], div, img')];
      for (const el of els) {
        const r = el.getBoundingClientRect();
        const al = (el.getAttribute('aria-label') || '').toLowerCase();
        if (/menu|open menu|drawer/i.test(al) || (r.y < 90 && r.x < 90 && r.width >= 20 && r.width <= 64)) {
          el.click();
          return;
        }
      }
    });
    await p.waitForTimeout(900);
    await p.evaluate(() => {
      const el = [...document.querySelectorAll('*')].find((n) =>
        /switch to parent seat/i.test(n.getAttribute?.('aria-label') || ''),
      );
      if (el) el.click();
    });
    await p.waitForTimeout(3000);
    await p.goto(`${BASE}/parent`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, 'w-09-parent', 2500);
    const iso = {
      morgan: /Morgan/i.test(body),
      jordan: /Jordan\s*Lee/i.test(body),
      approve: /Approve this capture|Accept recommendation/i.test(body),
      packB: /Keyed review|Pack B|Confirm extract/i.test(body),
    };
    out.parent = iso;
    out.steps.ac3_parent_hide = !iso.approve && !iso.packB;
    log('PARENT_ISO', JSON.stringify(iso));

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
    await shot(p, 'w-99-out', 500);

    const ok1 = out.steps.ac1_visible === true;
    const ok2 = out.steps.ac2_accept === true;
    const ok3 = out.steps.ac3_parent_hide === true;
    out.result = ok1 && ok2 && ok3 ? 'PASS' : !ok1 ? 'FAIL_AC1' : !ok2 ? 'FAIL_AC2' : 'FAIL';
    out.evidence = evidence;
    fs.writeFileSync(path.join(A, 'result-web.json'), JSON.stringify(out, null, 2));
    log('RESULT', out.result);
  } catch (e) {
    out.error = String(e);
    out.evidence = evidence;
    fs.writeFileSync(path.join(A, 'result-web.json'), JSON.stringify(out, null, 2));
    log('ERR', e);
  } finally {
    await ctx.close().catch(() => {});
  }
}

await main();
