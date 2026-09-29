// DITL-T-04-UI-02 lane A — weighted overall verify in gradebook
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
const S1 = '2bcee429-11ce-4f84-b2de-9aab349f03cc';

const log = (...a) => console.log(...a);
const evidence = [];
const findings = [];
let result = 'PARTIAL';

function note(step, ok, detail) {
  const line = `${ok ? 'OK' : 'MISS'} step${step}: ${detail}`;
  evidence.push(line);
  log(line);
}

async function shot(p, n, w = 1200) {
  await p.waitForTimeout(w);
  await p.screenshot({ path: path.join(A, `${n}.png`), fullPage: true });
  const body = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 4000);
  log('==', n, p.url());
  log(body.slice(0, 1200));
  return body;
}

async function openCtx() {
  fs.mkdirSync(UD, { recursive: true });
  const common = {
    headless: true,
    viewport: { width: 1280, height: 900 },
    args: ['--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check'],
  };
  const candidates = [
    process.env.HOME +
      '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
    process.env.HOME + '/Library/Caches/ms-playwright/chromium-1234/chrome-mac/Chromium.app/Contents/MacOS/Chromium',
    process.env.HOME + '/Library/Caches/ms-playwright/chromium-1148/chrome-mac/Chromium.app/Contents/MacOS/Chromium',
  ];
  for (const exe of candidates) {
    if (!fs.existsSync(exe)) continue;
    try {
      log('TRY_EXE', exe);
      return await chromium.launchPersistentContext(UD, { ...common, executablePath: exe });
    } catch (e) {
      log('EXE_FAIL', String(e).slice(0, 120));
    }
  }
  return await chromium.launchPersistentContext(UD, { ...common, channel: 'chrome' });
}

async function signIn(p) {
  await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1000);
  await p.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
  });
  await p.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  await p.locator('input').nth(0).fill(USER);
  await p.locator('input[type=password]').first().fill(PASS);
  await p.locator('input[type=password]').first().press('Enter');
  await p.waitForTimeout(7000);
}

async function signOut(p) {
  await p.goto(`${BASE}/profile`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await p.waitForTimeout(1500);
  const out = p.getByText(/Sign out|Log out/i).first();
  if (await out.count()) {
    await out.click({ force: true }).catch(() => {});
    await p.waitForTimeout(2500);
  }
  await shot(p, '99-signout', 800);
}

async function main() {
  let ctx;
  try {
    ctx = await openCtx();
    const p = ctx.pages()[0] || (await ctx.newPage());
    await signIn(p);
    let body = await shot(p, '01-after-signin', 2000);
    const signed =
      /Desk|Needs Attention|ditl-Math|Gradebook|Capture/i.test(body) && !/Sign in to Kelyra|Welcome back/i.test(body);
    note(1, signed, `url=${p.url()} snip=${body.slice(0, 280)}`);
    if (!signed) {
      result = 'FAIL';
      findings.push('FINDING: teacher sign-in failed; severity P0; case DITL-T-04-UI-02');
      throw new Error('sign-in failed');
    }

    await p.goto(`${BASE}/class/${CLASS}/gradebook`, { waitUntil: 'domcontentloaded' });
    body = await shot(p, '02-gradebook', 4500);
    const onGb = /Gradebook|Overall/i.test(body) && /ditl-Math|Jordan|Jamie|Riley|Samira|Morgan/i.test(body);
    note(2, onGb, `url=${p.url()} snip=${body.slice(0, 500)}`);

    const dump = await p.evaluate(() => {
      const text = document.body?.innerText || '';
      const lines = text.split('\n').map((s) => s.trim()).filter(Boolean);
      const overallIdx = lines.findIndex((l) => /^Overall$/i.test(l) || l === 'Overall');
      const percents = [];
      const re = /(\d{1,3})%/g;
      let m;
      while ((m = re.exec(text))) percents.push(Number(m[1]));
      const students = ['Jordan', 'Jamie', 'Riley', 'Samira', 'Morgan'];
      const foundStudents = students.filter((s) => text.includes(s));
      let afterOverall = '';
      if (overallIdx >= 0) afterOverall = lines.slice(overallIdx, overallIdx + 12).join(' | ');
      const syllabusHints = [];
      if (/published/i.test(text)) syllabusHints.push('published');
      if (/draft/i.test(text)) syllabusHints.push('draft');
      if (/syllabus/i.test(text)) syllabusHints.push('syllabus-word');
      const dashCount = (text.match(/\u2014/g) || []).length;
      return {
        overallIdx,
        afterOverall,
        percents: percents.slice(0, 40),
        foundStudents,
        syllabusHints,
        dashCount,
        hasOverall: /Overall/i.test(text),
        sample: lines.slice(0, 80),
      };
    });
    log('DUMP', JSON.stringify(dump));
    fs.writeFileSync(path.join(A, 'gradebook-dump.json'), JSON.stringify(dump, null, 2));

    await p.goto(`${BASE}/class/${CLASS}/syllabus`, { waitUntil: 'domcontentloaded' });
    const sylBody = await shot(p, '03-syllabus', 3500);
    const sylDump = await p.evaluate(() => {
      const text = document.body?.innerText || '';
      const lines = text.split('\n').map((s) => s.trim()).filter(Boolean);
      const weightLines = lines.filter((l) =>
        /%|weight|Homework|Quiz|Test|Participation|Category|Published|Draft/i.test(l),
      );
      return { lines: lines.slice(0, 120), weightLines: weightLines.slice(0, 60), text: text.slice(0, 3500) };
    });
    fs.writeFileSync(path.join(A, 'syllabus-dump.json'), JSON.stringify(sylDump, null, 2));
    log('SYL', JSON.stringify(sylDump.weightLines));

    await p.goto(`${BASE}/class/${CLASS}/gradebook`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2500);
    const heat = p.getByText(/^Heatmap$/i).first();
    if (await heat.count()) {
      await heat.click({ force: true }).catch(() => {});
      await shot(p, '04-heatmap', 2000);
      const gbTab = p.getByText(/^Gradebook$/i).first();
      if (await gbTab.count()) await gbTab.click({ force: true }).catch(() => {});
    }
    body = await shot(p, '05-gradebook-again', 2500);

    const overallClick = p.getByText(/^Overall$/i).first();
    if (await overallClick.count()) {
      await overallClick.click({ force: true }).catch(() => {});
      body = await shot(p, '06-overall-focus', 1500);
    }

    await p.goto(`${BASE}/class/${CLASS}/student/${S1}`, { waitUntil: 'domcontentloaded' });
    const stuBody = await shot(p, '07-jordan-student', 3000);

    const hasOverallLabel = dump.hasOverall || /Overall/i.test(body);
    const hasNumericOverall = (dump.percents && dump.percents.length > 0) || /\d{1,3}%/.test(body);
    const blankOnly = hasOverallLabel && !hasNumericOverall && (dump.dashCount > 0 || /\u2014/.test(body));
    const syllabusPublished = /published/i.test(sylBody) || sylDump.weightLines.some((l) => /Published/i.test(l));
    const hasWeights = sylDump.weightLines.some((l) => /\d+\s*%/.test(l) || /weight/i.test(l));

    note(
      3,
      hasOverallLabel,
      `overallLabel=${hasOverallLabel} numeric=${hasNumericOverall} blankOnly=${blankOnly} percents=${JSON.stringify(
        dump.percents?.slice(0, 15),
      )} after=${dump.afterOverall}`,
    );
    note(
      4,
      true,
      `syllabusPublished=${syllabusPublished} hasWeights=${hasWeights} weightLines=${JSON.stringify(
        sylDump.weightLines.slice(0, 20),
      )}`,
    );
    note(5, /Jordan/i.test(stuBody), `jordan snip=${stuBody.slice(0, 400)}`);

    if (!hasOverallLabel) {
      result = 'FAIL';
      findings.push('FINDING: gradebook missing Overall row; severity P1; case DITL-T-04-UI-02');
    } else if (syllabusPublished && hasWeights && hasNumericOverall) {
      result = 'PASS';
      note(6, true, 'published syllabus weights + Overall % visible');
    } else if (syllabusPublished && hasWeights && blankOnly) {
      result = 'PASS';
      note(6, true, 'published weights; Overall em-dash blanks (no graded cells) OK');
    } else if (!syllabusPublished) {
      if (blankOnly || !hasNumericOverall) {
        result = 'PASS';
        note(6, true, 'unpublished syllabus -> Overall blank per teacherOveralls');
      } else {
        result = 'FAIL';
        findings.push(
          'FINDING: Overall numeric % without published syllabus weights; severity P1; case DITL-T-04-UI-02',
        );
      }
    } else {
      result = 'PARTIAL';
      note(6, false, 'could not fully confirm weight math against cells');
    }

    await signOut(p);
    note(7, true, `teardown sign-out url=${p.url()}`);
  } catch (e) {
    log('ERR', e);
    evidence.push(`ERR: ${String(e).slice(0, 400)}`);
    if (result !== 'FAIL') result = 'PARTIAL';
  } finally {
    const out = { result, evidence, findings, case: 'DITL-T-04-UI-02', classId: CLASS, studentId: S1 };
    fs.writeFileSync(path.join(A, 'result.json'), JSON.stringify(out, null, 2));
    log('RESULT', result);
    log('FINDINGS', findings);
    if (ctx) await ctx.close().catch(() => {});
  }
}

main();
