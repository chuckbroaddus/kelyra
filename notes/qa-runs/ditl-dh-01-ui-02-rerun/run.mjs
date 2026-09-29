// DITL-DH-01-UI-02 rerun 2026-09-28 lane A — skeleton
import { chromium } from '../../qa-fixtures/ditl/_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://127.0.0.1:8081';
const USER = 'ditl-teacher-a';
const PASS = process.env.DITL_TEACHER_PASS || 'DITL-teacher-test';
const UD = '/tmp/ditl-pw-lane-a';
const HW = path.resolve(A, '../../qa-fixtures/ditl/ditl-pen-math-homework-T-01.jpg');
const MARKER = `ditl-DH-01-UI-02-${Date.now()}`;
const evidence = [];
const findings = [];
let result = 'PARTIAL';
const log = (...a) => console.log(...a);

async function shot(p, n, w = 800) {
  await p.waitForTimeout(w);
  const fp = path.join(A, `${n}.png`);
  await p.screenshot({ path: fp, fullPage: true });
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 4500);
  evidence.push(`${n}: ${p.url()} :: ${body.slice(0, 700)}`);
  log('==', n, p.url(), body.slice(0, 500));
  return body;
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
  await p.waitForTimeout(7000);
}

async function uploadPhoto(p, filePath) {
  const fileBtn = p.getByLabel(/Photo or Video|Files|photo/i).first();
  try {
    const [chooser] = await Promise.all([
      p.waitForEvent('filechooser', { timeout: 8000 }),
      (async () => {
        if (await fileBtn.count()) await fileBtn.click({ timeout: 4000 });
        else if (await p.getByRole('button', { name: /Photo or Video|Files/i }).count())
          await p.getByRole('button', { name: /Photo or Video|Files/i }).first().click();
        else await p.getByText(/Drop photos|Files/i).first().click({ force: true }).catch(() => {});
      })(),
    ]);
    await chooser.setFiles(filePath);
    return 'chooser';
  } catch (e) {
    const inputs = p.locator('input[type=file]');
    if (await inputs.count()) {
      await inputs.first().setInputFiles(filePath);
      return 'hidden-input';
    }
    throw e;
  }
}

async function openDrawer(p) {
  await p.evaluate(() => {
    const els = [...document.querySelectorAll('button, [role="button"], div, img, span')];
    for (const el of els) {
      const al = (el.getAttribute('aria-label') || '').toLowerCase();
      const r = el.getBoundingClientRect();
      if (/menu|drawer|hamburger|more|account|profile/i.test(al) && r.width > 0) {
        el.click();
        return;
      }
      if (r.y < 80 && r.x < 80 && r.width >= 24 && r.width <= 56 && r.height >= 24) {
        el.click();
        return;
      }
    }
  });
  await p.waitForTimeout(900);
}

async function switchParent(p) {
  await openDrawer(p);
  let hit = await p.evaluate(() => {
    const els = [...document.querySelectorAll('button, [role="menuitem"], [role="button"], a, div, span, *')];
    const el = els.find((node) => {
      const al = node.getAttribute?.('aria-label') || '';
      if (/switch to parent seat/i.test(al)) return true;
      const t = (al + ' ' + (node.innerText || '')).replace(/\s+/g, ' ').trim();
      return /switch to parent/i.test(t);
    });
    if (el) {
      el.click();
      return el.getAttribute?.('aria-label') || (el.innerText || '').trim().slice(0, 80);
    }
    return null;
  });
  await p.waitForTimeout(3500);
  return hit;
}

function packBOn(body) {
  return /Keyed review|Pack B|Confirm extract|Accept recommendation|Approve this capture/i.test(body);
}

async function main() {
  log('START', { HW: fs.existsSync(HW), MARKER });
  const hits = { classify: false, approve: false, scoreKey: false };
  let captureId = null;
  let ctx;
  try {
    ctx = await openCtx({ width: 390, height: 844 });
    const p = ctx.pages()[0] || (await ctx.newPage());
    p.on('response', async (res) => {
      const u = res.url();
      if (/classify-capture/i.test(u)) hits.classify = true;
      if (/score-key|match-key|analyze-answer/i.test(u)) hits.scoreKey = true;
      if (/approve_capture|approve-capture|approved_score/i.test(u)) hits.approve = true;
      try {
        if (/\/captures/i.test(u) && res.request().method() === 'POST' && res.ok()) {
          const j = await res.json().catch(() => null);
          const id = j?.id || j?.data?.id || j?.[0]?.id;
          if (id) captureId = id;
        }
      } catch {}
    });

    await signIn(p);
    let body = await shot(p, '01-phone-signin', 1200);
    const signed =
      /Desk|Needs Attention|ditl-Math|Gradebook|Capture/i.test(body) && !/Sign in to Kelyra|Welcome back/i.test(body);
    evidence.push(`signed=${signed}`);
    if (!signed) {
      result = 'FAIL';
      findings.push('FINDING: teacher sign-in failed; severity P0; case DITL-DH-01-UI-02');
      throw new Error('sign-in failed');
    }

    await p.goto(`${BASE}/capture`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '02-phone-capture', 1500);
    const used = await uploadPhoto(p, HW);
    for (let i = 0; i < 20; i++) {
      const t = await p.innerText('body').catch(() => '');
      if (/Remove page/i.test(t)) break;
      await p.waitForTimeout(400);
    }
    body = await shot(p, '03-phone-upload', 600);
    evidence.push(`upload=${used}`);

    const spoken = `Math homework for Jordan Lee keyed ${MARKER}`;
    const noteBox = p.getByPlaceholder(/What is this/i);
    if (await noteBox.count()) await noteBox.first().fill(spoken);
    else {
      const ta = p.locator('textarea').first();
      if (await ta.count()) await ta.fill(spoken);
    }
    body = await shot(p, '04-phone-note', 400);

    const ask = p.getByRole('button', { name: /Ask AI to process/i });
    if (await ask.count()) await ask.first().click({ force: true }).catch(() => {});
    else await p.getByText(/Ask AI to process/i).first().click({ force: true }).catch(() => {});
    for (let i = 0; i < 50; i++) {
      const t = await p.innerText('body').catch(() => '');
      if (!/Asking AI/i.test(t) && i > 2 && (/Confirm|Save|This will be|Homework|Student|Pack B|Keyed/i.test(t) || hits.classify))
        break;
      await p.waitForTimeout(2000);
    }
    body = await shot(p, '05-phone-classify', 1000);

    for (const label of [/student work/i, /grade draft/i, /^Homework$/i, /Turned in/i]) {
      if (await p.getByText(label).count()) {
        await p.getByText(label).first().click({ force: true }).catch(() => {});
        break;
      }
    }
    for (const lab of [/ditl-Math HW S1/i, /ditl-Math HW/i, /ditl-Math Quiz/i, /Math homework/i]) {
      const row = p.getByText(lab).first();
      if (await row.count()) {
        await row.click({ force: true }).catch(() => {});
        await p.waitForTimeout(600);
        break;
      }
    }
    let picked = false;
    if (await p.getByRole('button', { name: /Jordan/i }).count()) {
      await p.getByRole('button', { name: /Jordan/i }).first().click({ force: true }).catch(() => {});
      picked = true;
    } else if (await p.getByText(/Jordan Lee/i).count()) {
      await p.getByText(/Jordan Lee/i).first().click({ force: true }).catch(() => {});
      picked = true;
    }
    body = await shot(p, '06-phone-jordan', 800);
    evidence.push(`pickedJordan=${picked}`);

    let packBPhone = packBOn(body);
    for (const name of [/Save to student/i, /Save to Inbox/i, /Review key/i, /^Confirm$/i, /Score with key/i]) {
      const b = p.getByRole('button', { name }).or(p.getByText(name));
      if (await b.count()) {
        await b.first().click({ force: true }).catch(() => {});
        await p.waitForTimeout(3500);
        break;
      }
    }
    body = await shot(p, '07-phone-after-save', 1000);
    packBPhone = packBPhone || packBOn(body);

    // open inbox review for marker
    await p.goto(`${BASE}/inbox`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '08-phone-inbox', 2500);
    const reviewClick = await p.evaluate((marker) => {
      const nodes = [...document.querySelectorAll('button, a, div, span')];
      const row = nodes.find((n) => (n.innerText || '').includes(marker.slice(-12)));
      if (row) {
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
      }
      const any = nodes.find((n) => /^Review$/i.test((n.innerText || '').trim()));
      if (any) {
        any.click();
        return 'first-review';
      }
      return null;
    }, MARKER);
    evidence.push(`phoneReviewClick=${reviewClick}`);
    await p.waitForTimeout(3500);
    // try focus URL if captureId known
    if (captureId) {
      await p.goto(`${BASE}/inbox?capture=${captureId}&tab=focus`, { waitUntil: 'domcontentloaded' }).catch(() => {});
      await p.waitForTimeout(2500);
    }
    body = await shot(p, '09-phone-review', 1200);
    packBPhone = packBPhone || packBOn(body);
    evidence.push(`packB_phone=${packBPhone}`);

    for (let i = 0; i < 10; i++) {
      const conf = p.getByRole('button', { name: /Confirm extract|Confirm & next|^Confirm$/i });
      if (await conf.count()) {
        await conf.first().click({ force: true }).catch(() => {});
        await p.waitForTimeout(400);
      } else break;
    }
    let approvedPhone = false;
    for (const name of [/Accept recommendation/i, /Approve this capture/i, /^Approve$/i]) {
      const b = p.getByRole('button', { name });
      if (await b.count() && !(await b.first().isDisabled().catch(() => true))) {
        await b.first().click({ force: true }).catch(() => {});
        approvedPhone = true;
        await p.waitForTimeout(4000);
        break;
      }
    }
    body = await shot(p, '10-phone-after-approve', 1000);
    evidence.push(`approvedPhone=${approvedPhone} hits.approve=${hits.approve}`);

    // WEB viewport same session
    await p.setViewportSize({ width: 1280, height: 800 });
    await p.goto(`${BASE}/inbox`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '11-web-inbox', 2500);
    if (captureId) {
      await p.goto(`${BASE}/inbox?capture=${captureId}&tab=focus`, { waitUntil: 'domcontentloaded' }).catch(() => {});
      await p.waitForTimeout(2500);
    } else {
      await p.evaluate((marker) => {
        const nodes = [...document.querySelectorAll('button, a, div, span')];
        const row = nodes.find((n) => (n.innerText || '').includes(marker.slice(-12)));
        if (!row) return;
        let el = row;
        for (let i = 0; i < 8 && el; i++) {
          const rev = [...(el.querySelectorAll?.('button, a, span, div') || [])].find((x) =>
            /^Review$/i.test((x.innerText || '').trim()),
          );
          if (rev) {
            rev.click();
            return;
          }
          el = el.parentElement;
        }
      }, MARKER);
      await p.waitForTimeout(3000);
    }
    body = await shot(p, '12-web-review', 1200);
    const packBWeb = packBOn(body);
    evidence.push(`packB_web=${packBWeb}`);
    let approvedWeb = false;
    if (!approvedPhone && !hits.approve) {
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
          approvedWeb = true;
          await p.waitForTimeout(4000);
          break;
        }
      }
    }
    body = await shot(p, '13-web-after-approve', 800);
    evidence.push(`approvedWeb=${approvedWeb}`);

    // Parent seat
    await p.setViewportSize({ width: 390, height: 844 });
    const parentHit = await switchParent(p);
    body = await shot(p, '14-parent-switch', 1200);
    await p.goto(`${BASE}/parent`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '15-parent-home', 2000);
    const parentIso = await p.evaluate(() => {
      const t = (document.body?.innerText || '').replace(/\s+/g, ' ');
      return {
        hasMorgan: /Morgan\s*Patel/i.test(t),
        hasJordan: /Jordan\s*Lee/i.test(t),
        hasApprove: /Approve this capture|Accept recommendation/i.test(t),
        hasPackB: /Pack B|Keyed review|Confirm extract/i.test(t),
        hasRide: /\bRide\b/i.test(t),
        hasHome: /\bHome\b/i.test(t),
        snip: t.slice(0, 1200),
      };
    });
    evidence.push('parentIso ' + JSON.stringify(parentIso));
    evidence.push(`parentHit=${parentHit}`);
    if (parentIso.hasMorgan) {
      await p.getByText(/Morgan/i).first().click({ force: true }).catch(() => {});
      await p.waitForTimeout(2000);
      body = await shot(p, '16-morgan-grades', 1000);
      const g = await p.evaluate(() => {
        const t = (document.body?.innerText || '').replace(/\s+/g, ' ');
        return {
          hasApprove: /Approve this capture|Accept recommendation/i.test(t),
          hasDraft: /Keyed review|Confirm extract|Pack B|model_draft/i.test(t),
          snip: t.slice(0, 800),
        };
      });
      evidence.push('morganGrades ' + JSON.stringify(g));
      if (g.hasApprove || g.hasDraft)
        findings.push('FINDING: Parent Morgan grades show Approve/draft chrome; severity P0; case DITL-DH-01-UI-02');
    } else {
      findings.push('FINDING: Parent seat missing Morgan Patel; severity P1; case DITL-DH-01-UI-02');
    }
    if (parentIso.hasJordan)
      findings.push('FINDING: Parent seat shows Jordan Lee teach roster bleed; severity P1; case DITL-DH-01-UI-02');
    if (parentIso.hasApprove || parentIso.hasPackB)
      findings.push('FINDING: Parent seat shows Approve/Pack B draft chrome; severity P0; case DITL-DH-01-UI-02');

    // teardown: delete marker draft if still in inbox
    await openDrawer(p);
    await p.evaluate(() => {
      const el = [...document.querySelectorAll('*')].find((n) =>
        /switch to teach|teach seat/i.test(((n.getAttribute?.('aria-label') || '') + ' ' + (n.innerText || '')).replace(/\s+/g, ' ')),
      );
      if (el) el.click();
    });
    await p.waitForTimeout(2500);
    await p.goto(`${BASE}/inbox`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '17-teardown-inbox', 2000);
    await p.evaluate((marker) => {
      const all = [...document.querySelectorAll('button, a, div, span')];
      const markNode = all.find((n) => (n.innerText || '').includes(marker.slice(-12)));
      if (!markNode) return;
      let el = markNode;
      for (let i = 0; i < 10 && el; i++) {
        const del = [...(el.querySelectorAll?.('button, a, span') || [])].find((x) => /^Delete$/i.test((x.innerText || '').trim()));
        if (del) {
          del.click();
          return;
        }
        el = el.parentElement;
      }
    }, MARKER);
    await p.waitForTimeout(1200);
    const confDel = p.getByRole('button', { name: /Delete|Confirm|Yes/i });
    if (await confDel.count()) await confDel.first().click({ force: true }).catch(() => {});
    await p.waitForTimeout(1500);
    body = await shot(p, '18-teardown-after-del', 600);

    await p.goto(`${BASE}/profile`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await p.waitForTimeout(800);
    const so = p.getByText(/Sign out/i).first();
    if (await so.count()) await so.click({ force: true }).catch(() => {});
    await p.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
    });
    await shot(p, '99-signout', 600);

    const packAny = packBPhone || packBWeb;
    const approvedAny = approvedPhone || approvedWeb || hits.approve;
    const parentOk = parentIso.hasMorgan && !parentIso.hasJordan && !parentIso.hasApprove && !parentIso.hasPackB;
    if (packAny && approvedAny && parentOk && !findings.length) result = 'PASS';
    else if (signed && parentOk && !packAny) {
      result = 'FAIL';
      findings.push(
        'FINDING: Saved keyed homework draft review missing Pack B Approve/Accept on phone and web; severity P1; case DITL-DH-01-UI-02',
      );
    } else if (findings.length) result = 'FAIL';
    else if (packAny && parentOk && !approvedAny) result = 'PARTIAL';
    else result = 'FAIL';

    const out = {
      result,
      evidence,
      findings,
      hits,
      captureId,
      marker: MARKER,
      case: 'DITL-DH-01-UI-02',
      packBPhone,
      packBWeb,
      approvedPhone,
      approvedWeb,
    };
    fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(out, null, 2));
    log('RESULT', result, findings);
  } catch (e) {
    log('ERR', e);
    evidence.push('ERROR ' + String(e && e.stack ? e.stack : e).slice(0, 900));
    result = 'FAIL';
    fs.writeFileSync(
      path.join(A, 'result.json'),
      JSON.stringify({ result, evidence, findings, error: String(e), marker: MARKER, case: 'DITL-DH-01-UI-02' }, null, 2),
    );
  } finally {
    if (ctx) await ctx.close().catch(() => {});
  }
}

main();
