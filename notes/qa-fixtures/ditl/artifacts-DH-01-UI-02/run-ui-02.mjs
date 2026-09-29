// DITL-DH-01-UI-02 lane A — Teach Pack B Approve + Parent wall
// skeleton; body patched in sections
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:8081';
const USER = 'ditl-teacher-a';
const PASS = process.env.DITL_TEACHER_PASS || 'DITL-teacher-test';
const UD = '/tmp/ditl-pw-lane-a';
const CLASS = 'd1715000-0000-4000-a000-000000000301';
const HW = path.resolve(A, '../ditl-pen-math-homework-T-01.jpg');
const MARKER = `ditl-DH-01-UI-02-${Date.now()}`;
const evidence = [];
const findings = [];
let result = 'PARTIAL';
const log = (...a) => console.log(...a);
function note(step, ok, detail) {
  const line = `${ok ? 'OK' : 'MISS'} step${step}: ${detail}`;
  evidence.push(line);
  log(line);
}
async function shot(p, n, w = 1000) {
  await p.waitForTimeout(w);
  await p.screenshot({ path: path.join(A, `${n}.png`), fullPage: true });
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 4000);
  log('==', n, p.url());
  log(body.slice(0, 1000));
  return body;
}

async function openCtx() {
  fs.mkdirSync(UD, { recursive: true });
  const common = {
    headless: true,
    viewport: { width: 390, height: 844 },
    args: ['--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check'],
  };
  const candidates = [
    process.env.HOME +
      '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
    process.env.HOME + '/Library/Caches/ms-playwright/chromium-1234/chrome-mac/Chromium.app/Contents/MacOS/Chromium',
  ];
  for (const exe of candidates) {
    if (!fs.existsSync(exe)) continue;
    try {
      return await chromium.launchPersistentContext(UD, { ...common, executablePath: exe });
    } catch (e) {
      log('EXE_FAIL', String(e).slice(0, 120));
    }
  }
  return await chromium.launchPersistentContext(UD, { ...common, channel: 'chrome' });
}

async function signIn(p) {
  await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(800);
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
  await p.waitForTimeout(7000);
}

async function uploadPhoto(p, filePath) {
  const fileBtn = p.getByLabel(/Photo or Video|Files|photo/i).first();
  let used = 'none';
  try {
    const [chooser] = await Promise.all([
      p.waitForEvent('filechooser', { timeout: 8000 }),
      (async () => {
        if (await fileBtn.count()) {
          used = 'library';
          await fileBtn.click({ timeout: 4000 });
        } else if (await p.getByRole('button', { name: /Photo or Video|Files/i }).count()) {
          used = 'button';
          await p.getByRole('button', { name: /Photo or Video|Files/i }).first().click();
        } else {
          used = 'drop';
          await p.getByText(/Drop photos|Files/i).first().click({ force: true }).catch(() => {});
        }
      })(),
    ]);
    await chooser.setFiles(filePath);
  } catch (e) {
    log('FILECHOOSER_FAIL', used, String(e).slice(0, 160));
    const inputs = p.locator('input[type=file]');
    if (await inputs.count()) {
      used = 'hidden-input';
      await inputs.first().setInputFiles(filePath);
    } else throw e;
  }
  return used;
}

async function clickText(p, re) {
  const el = p.getByText(re).first();
  if (await el.count()) {
    await el.click({ force: true }).catch(() => {});
    return true;
  }
  return false;
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
      if (r.y < 80 && r.x < 80 && r.width >= 24 && r.width <= 56 && r.height >= 24 && r.height <= 56) {
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
      return /switch to parent/i.test(t) || (/^parent$/i.test(t) && !/my children/i.test(t));
    });
    if (el) {
      el.click();
      return el.getAttribute?.('aria-label') || (el.innerText || '').trim().slice(0, 80);
    }
    return null;
  });
  await p.waitForTimeout(3500);
  if (!hit) {
    await openDrawer(p);
    hit = await p.evaluate(() => {
      const el = [...document.querySelectorAll('*')].find((n) =>
        /switch to parent seat/i.test(n.getAttribute?.('aria-label') || ''),
      );
      if (el) {
        el.click();
        return el.getAttribute('aria-label');
      }
      return null;
    });
    await p.waitForTimeout(3500);
  }
  return hit;
}

async function signOut(p) {
  await p.goto(`${BASE}/profile`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await p.waitForTimeout(1000);
  const out = p.getByText(/Sign out|Log out/i).first();
  if (await out.count()) {
    await out.click({ force: true }).catch(() => {});
    await p.waitForTimeout(2000);
  } else {
    await openDrawer(p);
    await p.evaluate(() => {
      const el = [...document.querySelectorAll('button, a, div, span')].find((n) =>
        /sign out/i.test((n.getAttribute('aria-label') || '') + (n.innerText || '')),
      );
      if (el) el.click();
    });
    await p.waitForTimeout(2000);
  }
  await p.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
  });
  await shot(p, '99-signout', 600);
}

async function main() {
  log('START DITL-DH-01-UI-02', { HW: fs.existsSync(HW), MARKER });
  let ctx;
  const hits = { classify: false, approve: false, scoreKey: false };
  let captureId = null;
  try {
    ctx = await openCtx();
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
    let body = await shot(p, '01-after-signin', 1500);
    const signed =
      /Desk|Needs Attention|ditl-Math|Gradebook|Capture/i.test(body) && !/Sign in to Kelyra|Welcome back/i.test(body);
    note(1, signed, `url=${p.url()} snip=${body.slice(0, 220)}`);
    if (!signed) {
      result = 'FAIL';
      findings.push('FINDING: teacher sign-in failed; severity P0; case DITL-DH-01-UI-02');
      throw new Error('sign-in failed');
    }

    // Stay Teach: open capture for S1 keyed HW
    await p.goto(`${BASE}/capture`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '02-capture', 2000);
    const onCap = /\/capture/i.test(p.url()) || /Camera|Photo or Video|Files|Drop photos/i.test(body);
    note(2, onCap, `url=${p.url()}`);

    let used = 'skip';
    try {
      used = await uploadPhoto(p, HW);
    } catch (e) {
      note(3, false, `upload failed ${String(e).slice(0, 200)}`);
      findings.push('FINDING: HW photo upload failed; severity P1; case DITL-DH-01-UI-02');
      throw e;
    }
    for (let i = 0; i < 20; i++) {
      const t = await p.innerText('body').catch(() => '');
      if (/Remove page/i.test(t)) break;
      await p.waitForTimeout(400);
    }
    body = await shot(p, '03-after-upload', 600);
    note(3, /Remove page|page 1|1 page/i.test(body) || used !== 'none', `upload=${used}`);

    const noteBox = p.getByPlaceholder(/What is this/i);
    const spoken = `Math homework for Jordan Lee keyed ${MARKER}`;
    if (await noteBox.count()) await noteBox.first().fill(spoken);
    else {
      const ta = p.locator('textarea').first();
      if (await ta.count()) await ta.fill(spoken);
    }
    body = await shot(p, '04-note', 400);

    const ask = p.getByRole('button', { name: /Ask AI to process/i });
    if (await ask.count()) await ask.first().click({ force: true }).catch(() => {});
    else await clickText(p, /Ask AI to process/i);
    for (let i = 0; i < 50; i++) {
      const t = await p.innerText('body').catch(() => '');
      if (!/Asking AI/i.test(t) && i > 2 && (/Confirm|Save|This will be|Homework|Student|Pack B|Keyed/i.test(t) || hits.classify))
        break;
      await p.waitForTimeout(2000);
    }
    body = await shot(p, '05-after-classify', 1000);
    note(4, hits.classify || /This will be|Homework|Student/i.test(body), `classify=${hits.classify}`);

    for (const label of [/student work/i, /grade draft/i, /^Homework$/i, /Turned in/i]) {
      if (await p.getByText(label).count()) {
        await p.getByText(label).first().click({ force: true }).catch(() => {});
        break;
      }
    }
    // Prefer ditl-Math HW assignment if listed
    for (const lab of [/ditl-Math HW S1/i, /ditl-Math HW/i, /ditl-Math Quiz/i]) {
      const row = p.getByText(lab).first();
      if (await row.count()) {
        await row.click({ force: true }).catch(() => {});
        await p.waitForTimeout(600);
        break;
      }
    }
    // Jordan
    let picked = false;
    if (await p.getByRole('button', { name: /Jordan/i }).count()) {
      await p.getByRole('button', { name: /Jordan/i }).first().click({ force: true }).catch(() => {});
      picked = true;
    } else if (await p.getByText(/Jordan Lee/i).count()) {
      await p.getByText(/Jordan Lee/i).first().click({ force: true }).catch(() => {});
      picked = true;
    } else if (await p.getByText(/^Jordan$/i).count()) {
      await p.getByText(/^Jordan$/i).first().click({ force: true }).catch(() => {});
      picked = true;
    }
    body = await shot(p, '06-jordan-assign', 800);
    note(5, picked || /Jordan/i.test(body), `pickedJordan=${picked}`);

    // Pack B path: confirm extracts + Accept recommendation
    let packB = /Keyed review|Pack B|Confirm extract|Accept recommendation|Approve this capture/i.test(body);
    if (!packB) {
      // try save to open review, or Confirm
      for (const name of [/Save to student/i, /Save to Inbox/i, /Review key/i, /^Confirm$/i, /Score with key/i]) {
        const b = p.getByRole('button', { name }).or(p.getByText(name));
        if (await b.count()) {
          await b.first().click({ force: true }).catch(() => {});
          await p.waitForTimeout(3000);
          break;
        }
      }
      body = await shot(p, '07-after-save-try', 1000);
      packB = /Keyed review|Pack B|Confirm extract|Accept recommendation|Approve this capture/i.test(body);
    }
    note(6, true, `packBUi=${packB} snip=${body.slice(0, 280)}`);

    // Confirm each extract
    for (let round = 0; round < 12; round++) {
      const t = await p.innerText('body').catch(() => '');
      if (/Accept recommendation|Approve this capture/i.test(t) && !/Confirm extract/i.test(t)) break;
      const conf = p.getByRole('button', { name: /Confirm extract|Confirm & next|^Confirm$/i });
      if (await conf.count()) {
        await conf.first().click({ force: true }).catch(() => {});
        await p.waitForTimeout(500);
      } else {
        // open item then confirm
        const item = p.getByLabel(/Item \d+ confirm/i).first();
        if (await item.count()) {
          await item.click({ force: true }).catch(() => {});
          await p.waitForTimeout(300);
          const c2 = p.getByRole('button', { name: /Confirm & next|Confirm extract|^Confirm$/i });
          if (await c2.count()) await c2.first().click({ force: true }).catch(() => {});
        } else break;
      }
    }
    body = await shot(p, '08-after-confirms', 800);

    let approved = false;
    for (const name of [/Accept recommendation/i, /Approve this capture/i, /^Approve$/i]) {
      const b = p.getByRole('button', { name });
      if (await b.count()) {
        const dis = await b.first().isDisabled().catch(() => false);
        if (!dis) {
          await b.first().click({ force: true }).catch(() => {});
          approved = true;
          await p.waitForTimeout(4000);
          break;
        }
      }
    }
    // fallback text click
    if (!approved) {
      approved = await clickText(p, /Accept recommendation|Approve this capture/);
      await p.waitForTimeout(4000);
    }
    body = await shot(p, '09-after-approve', 1500);
    const approveUi =
      approved ||
      hits.approve ||
      /Approving|Approved|published|gradebook|Desk|Needs Attention/i.test(body);
    note(7, approved || hits.approve, `approvedClick=${approved} hit=${hits.approve} snip=${body.slice(0, 260)}`);

    // Parent seat checks
    const parentHit = await switchParent(p);
    body = await shot(p, '10-parent-seat', 1500);
    note(8, Boolean(parentHit) || /Home|Ride|Morgan/i.test(body), `parentSwitch=${parentHit}`);

    await p.goto(`${BASE}/parent`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    body = await shot(p, '11-parent-home', 2000);
    const parentIso = await p.evaluate(() => {
      const t = (document.body?.innerText || '').replace(/\s+/g, ' ');
      return {
        hasMorgan: /Morgan\s*Patel/i.test(t),
        hasJordan: /Jordan\s*Lee/i.test(t),
        hasApprove: /Approve this capture|Accept recommendation|\bApprove\b/i.test(t),
        hasPackB: /Pack B|Keyed review|Confirm extract|draft_score|model_draft/i.test(t),
        hasCaptureTab: /\bCapture\b/i.test(t),
        hasRide: /\bRide\b/i.test(t),
        hasHome: /\bHome\b/i.test(t),
        hasDesk: /\bDesk\b/i.test(t),
        text: t.slice(0, 1400),
      };
    });
    evidence.push('parentIso ' + JSON.stringify(parentIso));
    log('parentIso', parentIso);
    note(
      9,
      parentIso.hasMorgan && !parentIso.hasApprove && !parentIso.hasPackB,
      `morgan=${parentIso.hasMorgan} jordan=${parentIso.hasJordan} approve=${parentIso.hasApprove} packB=${parentIso.hasPackB}`,
    );

    // open Morgan grades if present
    if (parentIso.hasMorgan) {
      await clickText(p, /Morgan/);
      await p.waitForTimeout(2000);
      body = await shot(p, '12-morgan-grades', 1200);
      const grades = await p.evaluate(() => {
        const t = (document.body?.innerText || '').replace(/\s+/g, ' ');
        return {
          hasApprove: /Approve this capture|Accept recommendation/i.test(t),
          hasDraft: /draft_score|model_draft|Keyed review|Confirm extract/i.test(t),
          snip: t.slice(0, 900),
        };
      });
      evidence.push('morganGrades ' + JSON.stringify(grades));
      note(10, !grades.hasApprove && !grades.hasDraft, `gradesApprove=${grades.hasApprove} draft=${grades.hasDraft}`);
    } else {
      note(10, false, 'Morgan not visible on parent home');
    }

    // Teardown: switch teach, try delete recent capture via inbox if possible
    await openDrawer(p);
    await p.evaluate(() => {
      const el = [...document.querySelectorAll('*')].find((n) =>
        /switch to teach|teach seat|^teach$/i.test(
          ((n.getAttribute?.('aria-label') || '') + ' ' + (n.innerText || '')).replace(/\s+/g, ' '),
        ),
      );
      if (el) el.click();
    });
    await p.waitForTimeout(2500);
    await p.goto(`${BASE}/inbox`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    body = await shot(p, '13-inbox-teardown', 2000);
    // best-effort: open first ditl capture with marker
    const delTry = await p.evaluate((marker) => {
      const t = document.body?.innerText || '';
      return { hasMarker: t.includes(marker.slice(-8)), snip: t.replace(/\s+/g, ' ').slice(0, 400) };
    }, MARKER);
    evidence.push('teardown ' + JSON.stringify({ captureId, delTry }));

    await signOut(p);

    const parentOk =
      (parentIso.hasMorgan || /Morgan/i.test(body)) &&
      !parentIso.hasApprove &&
      !parentIso.hasPackB &&
      !parentIso.hasJordan;
    // Jordan on parent is a leak of teach roster
    if (parentIso.hasJordan && !parentIso.hasMorgan) {
      findings.push('FINDING: Parent seat shows C-MATH S1 Jordan without S3 Morgan; severity P1; case DITL-DH-01-UI-02');
    }
    if (parentIso.hasApprove || parentIso.hasPackB) {
      findings.push(
        'FINDING: Parent seat exposes Approve/Pack B draft chrome; severity P0; case DITL-DH-01-UI-02',
      );
    }

    const teachOk = signed && onCap && (approved || hits.approve || packB);
    if (signed && onCap && (approved || hits.approve) && parentOk) result = 'PASS';
    else if (signed && onCap && parentOk && packB) result = 'PARTIAL';
    else if (signed && parentOk && !approved && !packB) {
      result = 'PARTIAL';
      evidence.push('NOTE: Pack B Approve path not reached after classify; parent wall still checked');
    } else if (!signed) result = 'FAIL';
    else result = teachOk && parentIso.hasMorgan ? 'PARTIAL' : 'FAIL';

    if (result === 'FAIL' && !findings.length) {
      findings.push('FINDING: dual-hat Pack B teach approve or parent isolation incomplete; severity P1; case DITL-DH-01-UI-02');
    }
  } catch (e) {
    log('ERROR', e);
    evidence.push('ERROR ' + String(e && e.stack ? e.stack : e).slice(0, 800));
    if (result !== 'FAIL') result = 'FAIL';
  } finally {
    const out = { result, evidence, findings, hits, captureId, marker: MARKER, case: 'DITL-DH-01-UI-02' };
    fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(out, null, 2));
    log('RESULT', result);
    log('FINDINGS', findings);
    if (ctx) await ctx.close().catch(() => {});
  }
}

main();
