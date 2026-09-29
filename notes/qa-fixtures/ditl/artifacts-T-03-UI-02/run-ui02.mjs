import { chromium } from './../_pw/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';

const A = new URL('.', import.meta.url).pathname;
const UD = '/tmp/ditl-pw-lane-a';
fs.mkdirSync(UD, { recursive: true });
fs.mkdirSync(A, { recursive: true });

const log = (...a) => console.log(...a);
const shot = async (p, n, w = 2000) => {
  await p.waitForTimeout(w);
  const f = path.join(A, n + '.png');
  await p.screenshot({ path: f, fullPage: true });
  const body = (await p.innerText('body')).replace(/\n+/g, ' | ');
  log('==', n, p.url());
  log(body.slice(0, 1200));
  return body;
};

async function openCtx() {
  const common = {
    headless: true,
    viewport: { width: 1280, height: 900 },
    args: ['--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check'],
  };
  const candidates = [
    process.env.HOME + '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
    process.env.HOME + '/Library/Caches/ms-playwright/chromium-1234/chrome-mac/Chromium.app/Contents/MacOS/Chromium',
    process.env.HOME + '/Library/Caches/ms-playwright/chromium-1148/chrome-mac/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  for (const exe of candidates) {
    if (!fs.existsSync(exe)) continue;
    log('TRY_EXE', exe);
    try {
      return await chromium.launchPersistentContext(UD, { ...common, executablePath: exe });
    } catch (e) {
      log('EXE_FAIL', exe, String(e).slice(0, 160));
    }
  }
  log('TRY_CHANNEL_CHROME');
  return await chromium.launchPersistentContext(UD, { ...common, channel: 'chrome' });
}

const context = await openCtx();

const pages = context.pages();
const p = pages[0] || (await context.newPage());

async function signIn(user, pass) {
  await p.goto('http://localhost:8081/sign-in', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2000);
  const inputs = p.locator('input');
  await inputs.nth(0).fill(user);
  await p.locator('input[type=password]').first().fill(pass);
  await p.locator('input[type=password]').first().press('Enter');
  await p.waitForTimeout(7000);
}

const marker = 'ditl-T-03-UI-02-' + Date.now();
log('MARKER', marker);

await signIn('ditl-teacher-a', 'DITL-teacher-test');
const home = await shot(p, '01-after-signin');

await p.goto('http://localhost:8081/inbox', { waitUntil: 'domcontentloaded' });
const allBody = await shot(p, '02-inbox-all', 4000);

const checks = {
  needsAttention: /Needs Attention/i.test(allBody),
  chipName: /Needs a name/i.test(allBody),
  chipReview: /\bReview\b/i.test(allBody),
  chipAll: /\bAll\b/.test(allBody),
  jordan: /Jordan/i.test(allBody),
  riley: /Riley/i.test(allBody),
  needsNameRow: /Needs a name/i.test(allBody),
  draftQueued: /Draft queued/i.test(allBody),
  empty: /Nothing waiting/i.test(allBody),
  wrongSeat: /Sign in to see work/i.test(allBody),
  jacquee: /Jacquee/i.test(allBody),
  parentChrome: /Check-in|Ride home/i.test(allBody),
};

log('CHECKS', JSON.stringify(checks, null, 2));

// Filter: Needs a name
let nameBody = '';
try {
  await p.getByText('Needs a name', { exact: true }).first().click();
  nameBody = await shot(p, '03-inbox-name', 2500);
} catch (e) {
  log('chip name err', String(e).slice(0, 200));
}

// Filter: Review
let reviewBody = '';
try {
  await p.getByText('Review', { exact: true }).first().click();
  reviewBody = await shot(p, '04-inbox-review', 2500);
} catch (e) {
  log('chip review err', String(e).slice(0, 200));
}

// Filter: All
let all2 = '';
try {
  await p.getByText('All', { exact: true }).first().click();
  all2 = await shot(p, '05-inbox-all-again', 2500);
} catch (e) {
  log('chip all err', String(e).slice(0, 200));
}

const nameOnlyUnassigned = nameBody
  ? {
      hasNeedsAName: /Needs a name/i.test(nameBody),
      hasJordanReview: /Jordan/i.test(nameBody) && /Review/i.test(nameBody),
      // crude: if Review rows for named students dominate
      bodySlice: nameBody.slice(0, 500),
    }
  : null;
const reviewOnly = reviewBody
  ? {
      hasJordan: /Jordan/i.test(reviewBody),
      hasRiley: /Riley/i.test(reviewBody),
      bodySlice: reviewBody.slice(0, 500),
    }
  : null;

log('NAME_FILTER', JSON.stringify(nameOnlyUnassigned));
log('REVIEW_FILTER', JSON.stringify(reviewOnly));

// Teardown: sign out via drawer if possible
try {
  // try open menu
  const menu = p.locator('[aria-label*="menu" i], [aria-label*="Menu" i], button').filter({ hasText: /menu/i });
  // fallback: navigate settings-ish
  await p.goto('http://localhost:8081/sign-in');
  await shot(p, '06-teardown-signin', 2000);
} catch (e) {
  log('teardown', String(e).slice(0, 150));
}

fs.writeFileSync(
  path.join(A, 'raw-log.json'),
  JSON.stringify({ marker, checks, nameOnlyUnassigned, reviewOnly, homeUrl: p.url() }, null, 2),
);

log('DONE');
await context.close();
