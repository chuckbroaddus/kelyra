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
  log(body.slice(0, 1400));
  return body;
};

async function openCtx() {
  const common = {
    headless: true,
    viewport: { width: 1280, height: 900 },
    args: ['--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check'],
  };
  const candidates = [
    process.env.HOME +
      '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
    process.env.HOME +
      '/Library/Caches/ms-playwright/chromium-1234/chrome-mac/Chromium.app/Contents/MacOS/Chromium',
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

const marker = 'ditl-T-03-UI-03-' + Date.now();
log('MARKER', marker);

await signIn('ditl-teacher-a', 'DITL-teacher-test');
const home = await shot(p, '01-after-signin');

await p.goto('http://localhost:8081/messages', { waitUntil: 'domcontentloaded' });
const msgs = await shot(p, '02-messages', 4000);

const checks = {
  teacherHome: /ditl-Math|Period 3|Desk|Needs Attention/i.test(home),
  taylor: /Taylor/i.test(msgs),
  avery: /Avery/i.test(msgs),
  jacquee: /Jacquee/i.test(msgs),
  parentChrome: /Check-in|Ride home/i.test(msgs + home),
  wrongSeat: /Sign in to see work/i.test(home),
  hasAlertsTab: /Alerts/i.test(msgs),
  makeup: /makeup|Tuesday|quiz/i.test(msgs),
  ditlMarkerUi01: /ditl-T-03-UI-01/i.test(msgs),
};
log('CHECKS_MSGS', JSON.stringify(checks, null, 2));

let alertsBody = '';
try {
  // PersonTabs row: Messages | Alerts — prefer role/tab then exact text near Messages
  const tab = p.locator('[role="tab"], [accessibilityRole="tab"]').filter({ hasText: /^Alerts$/i });
  if (await tab.count()) {
    await tab.first().click({ force: true });
  } else {
    // click the second occurrence of Alerts (first may be school-scope noise)
    const all = p.getByText('Alerts', { exact: true });
    const c = await all.count();
    log('alerts_count', c);
    await all.nth(Math.min(1, c - 1)).click({ force: true, timeout: 10000 });
  }
  alertsBody = await shot(p, '03-alerts', 3500);
} catch (e) {
  log('alerts click err', String(e).slice(0, 300));
  try {
    await p.evaluate(() => {
      const nodes = [...document.querySelectorAll('div,span,button,a')];
      const hit = nodes.filter((n) => (n.textContent || '').trim() === 'Alerts').pop();
      if (hit) hit.click();
    });
    alertsBody = await shot(p, '03-alerts-eval', 3500);
  } catch (e2) {
    log('alerts eval err', String(e2).slice(0, 200));
  }
}

const alertChecks = {
  bodyLen: alertsBody.length,
  empty: /No alerts|Nothing here|no notifications|All clear/i.test(alertsBody),
  hasItems: /alert|notice|post|school/i.test(alertsBody),
  slice: alertsBody.slice(0, 600),
};
log('ALERT_CHECKS', JSON.stringify(alertChecks, null, 2));

let alertDetail = '';
try {
  const links = p.locator('a[href*="notification"]');
  const n = await links.count();
  log('notif_links', n);
  if (n > 0) {
    await links.first().click();
    alertDetail = await shot(p, '04-alert-detail', 3000);
  } else {
    await shot(p, '04-alert-detail-none', 1000);
  }
} catch (e) {
  log('alert detail err', String(e).slice(0, 200));
}

await p.goto('http://localhost:8081/messages', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2500);
let threadBody = '';
try {
  await p.getByText('Taylor', { exact: false }).first().click();
  threadBody = await shot(p, '05-taylor-thread', 4000);
} catch (e) {
  log('taylor open err', String(e).slice(0, 200));
  try {
    await p.getByText('Avery', { exact: false }).first().click();
    threadBody = await shot(p, '05-avery-thread', 4000);
  } catch (e2) {
    log('avery open err', String(e2).slice(0, 200));
  }
}

const threadChecks = {
  url: p.url(),
  hasParentMsg: /makeup|quiz|parent|Jordan|Jamie/i.test(threadBody),
  hasTeacherReply: /makeup Tuesday|Yes,|You/i.test(threadBody),
  hasUi01Marker: /ditl-T-03-UI-01/i.test(threadBody),
  composer: /Send|Message/i.test(threadBody),
  slice: threadBody.slice(0, 800),
};
log('THREAD_CHECKS', JSON.stringify(threadChecks, null, 2));

let sentOk = false;
let afterSend = '';
try {
  const box = p.locator('textarea, [contenteditable="true"]').last();
  if (await box.count()) {
    await box.click();
    await box.fill(marker + ' parent-notification-path probe');
    const sendBtn = p.getByRole('button', { name: /send/i });
    if (await sendBtn.count()) {
      await sendBtn.first().click();
    } else {
      await box.press('Enter');
    }
    await p.waitForTimeout(4000);
    afterSend = await shot(p, '06-after-send', 2000);
    sentOk = afterSend.includes(marker) || /Just now|You/i.test(afterSend);
  }
} catch (e) {
  log('send probe err', String(e).slice(0, 250));
}
log('SENT_OK', sentOk);

await p.goto('http://localhost:8081/sign-in', { waitUntil: 'domcontentloaded' });
await shot(p, '07-teardown-signin', 2000);

fs.writeFileSync(
  path.join(A, 'raw-log.json'),
  JSON.stringify({ marker, checks, alertChecks, threadChecks, sentOk, alertDetail: alertDetail.slice(0, 400) }, null, 2),
);
log('DONE');
await context.close();
