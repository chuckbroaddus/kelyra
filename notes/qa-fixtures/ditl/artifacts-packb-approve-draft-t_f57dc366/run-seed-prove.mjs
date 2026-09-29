// t_f57dc366: seed keyed draft then reopen saved review (Pack B stamp)
import { chromium } from '../_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://127.0.0.1:8081';
const USER = 'ditl-teacher-a';
const PASS = process.env.DITL_TEACHER_PASS || 'DITL-teacher-test';
const UD = '/tmp/ditl-pw-packb-seed-t_f57dc366';
const HW = path.resolve(A, '../ditl-pen-math-homework-T-01.jpg');
const MARKER = `packb-draft-${Date.now()}`;
const evidence = [];
const log = (...a) => {
  console.log(...a);
  evidence.push(a.map(String).join(' ').slice(0, 1400));
};

async function shot(p, n, w = 800) {
  await p.waitForTimeout(w);
  await p.screenshot({ path: path.join(A, `s-${n}.png`), fullPage: true });
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 4500);
  log('SHOT', n, p.url(), body.slice(0, 650));
  return body;
}
function packSig(body) {
  return {
    packB: /Keyed review|Pack B/i.test(body),
    accept: /Accept recommendation/i.test(body),
    approve: /Approve this capture/i.test(body),
    confirm: /Confirm & next|Confirm extract/i.test(body),
  };
}
async function signIn(p) {
  await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForTimeout(400);
  await p.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
  });
  await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForTimeout(900);
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
      return 'input';
    }
    throw e;
  }
}

async function main() {
  fs.mkdirSync(UD, { recursive: true });
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
  const hits = { classify: false, matchKey: false, storeDraft: false, approve: false };
  let captureId = null;
  p.on('response', async (res) => {
    const u = res.url();
    if (/classify-capture/i.test(u)) hits.classify = true;
    if (/score-key|match-key/i.test(u)) hits.matchKey = true;
    if (/approve_capture|approve-capture/i.test(u)) hits.approve = true;
    try {
      if (/model_draft|store.*draft|captures/i.test(u) && res.request().method() !== 'GET' && res.ok()) {
        hits.storeDraft = hits.storeDraft || /draft/i.test(u);
        const j = await res.json().catch(() => null);
        const id = j?.id || j?.data?.id;
        if (id && /capture/i.test(u)) captureId = id;
      }
    } catch {}
  });
  const out = { card: 't_f57dc366', marker: MARKER, hits, steps: {}, result: 'FAIL' };
  try {
    log('HW_EXISTS', fs.existsSync(HW), MARKER);
    await signIn(p);
    await shot(p, '01-in', 600);
    await p.goto(`${BASE}/capture`, { waitUntil: 'domcontentloaded' });
    let body = await shot(p, '02-capture', 1500);
    await uploadPhoto(p, HW);
    for (let i = 0; i < 25; i++) {
      if (/Remove page/i.test(await p.innerText('body').catch(() => ''))) break;
      await p.waitForTimeout(400);
    }
    body = await shot(p, '03-upload', 500);
    const spoken = `Math homework for Jordan Lee keyed ${MARKER}`;
    const noteBox = p.getByPlaceholder(/What is this/i);
    if (await noteBox.count()) await noteBox.first().fill(spoken);
    else {
      const ta = p.locator('textarea').first();
      if (await ta.count()) await ta.fill(spoken);
    }
    const ask = p.getByRole('button', { name: /Ask AI to process/i });
    if (await ask.count()) await ask.first().click({ force: true }).catch(() => {});
    for (let i = 0; i < 60; i++) {
      const t = await p.innerText('body').catch(() => '');
      if (!/Asking AI/i.test(t) && i > 3 && (/This will be|Homework|Student|Pack B|Keyed|Confirm/i.test(t) || hits.classify))
        break;
      await p.waitForTimeout(2000);
    }
    body = await shot(p, '04-classify', 800);
    for (const label of [/student work/i, /grade draft/i, /^Homework$/i]) {
      if (await p.getByText(label).count()) {
        await p.getByText(label).first().click({ force: true }).catch(() => {});
        break;
      }
    }
    for (const lab of [/ditl-Math HW S1/i, /ditl-Math HW/i, /answer key/i, /HW S1/i]) {
      const row = p.getByText(lab).first();
      if (await row.count()) {
        await row.click({ force: true }).catch(() => {});
        await p.waitForTimeout(800);
        break;
      }
    }
    if (await p.getByRole('button', { name: /Jordan/i }).count())
      await p.getByRole('button', { name: /Jordan/i }).first().click({ force: true }).catch(() => {});
    else if (await p.getByText(/Jordan Lee/i).count())
      await p.getByText(/Jordan Lee/i).first().click({ force: true }).catch(() => {});
    body = await shot(p, '05-jordan-assign', 1200);
    out.steps.liveCapturePackB = packSig(body);
    log('LIVE_CAP', JSON.stringify(out.steps.liveCapturePackB), 'match', hits.matchKey);

    // Save draft only — leave without Accept on capture session
    let saved = false;
    for (const name of [/Save draft/i, /Save to student/i, /Save to Inbox/i, /Save$/i]) {
      const b = p.getByRole('button', { name });
      if (await b.count()) {
        await b.first().click({ force: true }).catch(() => {});
        saved = true;
        await p.waitForTimeout(3500);
        log('SAVE_CLICK', String(name));
        break;
      }
    }
    body = await shot(p, '06-after-save', 1000);
    out.steps.afterSave = packSig(body);
    out.steps.savedClick = saved;

    // Leave capture → inbox
    await p.goto(`${BASE}/inbox`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '07-inbox', 3000);
    out.steps.inboxHasMarker = body.includes(MARKER.slice(-8)) || body.includes(MARKER) || /Jordan/i.test(body);
    log('INBOX_MARKER', out.steps.inboxHasMarker, MARKER);

    // Open Review for marker / Jordan draft
    const nav = await p.evaluate((marker) => {
      const all = [...document.querySelectorAll('button, a, div, span')];
      const mark = all.find((n) => (n.innerText || '').includes(marker.slice(-10)));
      const start = mark || all.find((n) => /Jordan/i.test(n.innerText || '') && /Review/i.test(n.innerText || ''));
      let el = start;
      for (let i = 0; i < 12 && el; i++) {
        const rev = [...(el.querySelectorAll?.('button, a, span, div') || [])].find((x) =>
          /^Review$/i.test((x.innerText || '').trim()),
        );
        if (rev) {
          rev.click();
          return 'review';
        }
        el = el.parentElement;
      }
      const any = all.find((n) => /^Review$/i.test((n.innerText || '').trim()) && /Jordan/i.test((n.parentElement?.innerText || '')));
      if (any) {
        any.click();
        return 'any';
      }
      return null;
    }, MARKER);
    log('REVIEW_NAV', nav);
    await p.waitForTimeout(4500);
    body = await shot(p, '08-review', 1200);
    // if still inbox, try student focus Work tab
    if (/\/inbox/i.test(p.url())) {
      await p.goto(
        `${BASE}/class/d1715000-0000-4000-a000-000000000301/student/2bcee429-11ce-4f84-b2de-9aab349f03cc?tab=work`,
        { waitUntil: 'domcontentloaded' },
      );
      await p.waitForTimeout(4000);
      body = await shot(p, '09-student-work', 1000);
      // click latest draft row if any
      await p.evaluate((marker) => {
        const n = [...document.querySelectorAll('*')].find((el) => (el.innerText || '').includes(marker.slice(-8)));
        if (n) n.click();
      }, MARKER);
      await p.waitForTimeout(2500);
      body = await shot(p, '10-after-draft-row', 800);
    }
    const savedSig = packSig(body);
    out.steps.savedReview = { url: p.url(), ...savedSig, head: body.slice(0, 900) };
    out.steps.ac1 = savedSig.packB || savedSig.accept || savedSig.approve;
    log('AC1', out.steps.ac1, JSON.stringify(savedSig));

    let accepted = false;
    if (out.steps.ac1) {
      for (let i = 0; i < 14; i++) {
        const conf = p.getByRole('button', { name: /Confirm & next|Confirm extract|^Confirm$/i });
        if ((await conf.count()) === 0) break;
        await conf.first().click({ force: true }).catch(() => {});
        await p.waitForTimeout(400);
      }
      body = await shot(p, '11-confirms', 500);
      for (const name of [/Accept recommendation/i, /Approve this capture/i]) {
        const b = p.getByRole('button', { name });
        if ((await b.count()) && !(await b.first().isDisabled().catch(() => true))) {
          await b.first().click({ force: true }).catch(() => {});
          accepted = true;
          await p.waitForTimeout(4500);
          log('ACCEPT', String(name));
          break;
        }
      }
      body = await shot(p, '12-after-accept', 800);
    }
    out.steps.ac2 = accepted || hits.approve;
    out.steps.afterAcceptHead = body.slice(0, 500);

    // Parent seat
    await p.evaluate(() => {
      const els = [...document.querySelectorAll('button, [role="button"], div, img')];
      for (const el of els) {
        const r = el.getBoundingClientRect();
        const al = (el.getAttribute('aria-label') || '').toLowerCase();
        if (/menu|open menu/i.test(al) || (r.y < 90 && r.x < 90 && r.width >= 20 && r.width <= 64)) {
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
    body = await shot(p, '13-parent', 2000);
    const iso = {
      morgan: /Morgan/i.test(body),
      jordan: /Jordan\s*Lee/i.test(body),
      approve: /Approve this capture|Accept recommendation/i.test(body),
      packB: /Keyed review|Pack B|Confirm extract/i.test(body),
    };
    out.parent = iso;
    out.steps.ac3 = !iso.approve && !iso.packB;
    log('PARENT', JSON.stringify(iso));

    out.captureId = captureId;
    out.hits = hits;
    out.evidence = evidence;
    const ok = out.steps.ac1 && out.steps.ac2 && out.steps.ac3;
    out.result = ok ? 'PASS' : !out.steps.ac1 ? 'FAIL_AC1' : !out.steps.ac2 ? 'FAIL_AC2' : 'FAIL_AC3';
    fs.writeFileSync(path.join(A, 'result-seed.json'), JSON.stringify(out, null, 2));
    log('RESULT', out.result, JSON.stringify(out.steps));
  } catch (e) {
    out.error = String(e && e.stack ? e.stack : e).slice(0, 1200);
    out.evidence = evidence;
    fs.writeFileSync(path.join(A, 'result-seed.json'), JSON.stringify(out, null, 2));
    log('ERR', out.error);
  } finally {
    await ctx.close().catch(() => {});
  }
}
await main();
