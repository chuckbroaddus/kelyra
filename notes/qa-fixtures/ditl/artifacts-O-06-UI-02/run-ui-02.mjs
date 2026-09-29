import { chromium } from '/Users/chuckbroaddus/projects/kelyra/notes/qa-fixtures/ditl/_pw/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';

const A = '/tmp/ditl-o06-ui02-out';
const UD = '/tmp/ditl-pw-lane-a';
const BASE = 'http://127.0.0.1:8081';
const USER = 'ditl-admin';
const PASS = process.env.DITL_ADMIN_PASS || 'DITL-admin-test';
const MARK = 'ditl-O06-UI02-' + Date.now();
const ALERT_BODY = MARK + ' ALERT notify path';
const POST_BODY = MARK + ' POST unused';
const exe =
  process.env.HOME +
  '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

fs.mkdirSync(A, { recursive: true });
const log = [];
const L = (...a) => {
  const s = a.map(String).join(' ');
  log.push(s);
  console.log(s);
};
const flush = () => {
  fs.writeFileSync(path.join(A, 'log.json'), JSON.stringify({ log, mark: MARK }, null, 2));
  fs.writeFileSync(path.join(A, 'log.txt'), log.join('\n'));
};

const ctx = await chromium.launchPersistentContext(UD, {
  headless: true,
  viewport: { width: 1280, height: 900 },
  executablePath: exe,
  args: ['--disable-dev-shm-usage', '--no-first-run'],
});
const p = ctx.pages()[0] || (await ctx.newPage());

async function snap(n) {
  const f = path.join(A, n + '.png');
  await p.screenshot({ path: f, fullPage: true }).catch(() => {});
  return f;
}
async function bodyText() {
  return (await p.innerText('body').catch(() => '')).replace(/\s+/g, ' ').trim();
}
async function dump(tag) {
  const b = await bodyText();
  L(tag, 'URL', p.url(), 'BODY', b.slice(0, 1200));
  await snap(tag);
  return b;
}
async function signOutBestEffort() {
  try {
    await p.goto(BASE + '/sign-in', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await p.waitForTimeout(800);
    await p.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (_) {}
    });
    await ctx.clearCookies().catch(() => {});
  } catch (e) {
    L('SIGNOUT_ERR', String(e).slice(0, 200));
  }
}

async function setKind(want) {
  const clicked = await p.evaluate((want) => {
    const nodes = [...document.querySelectorAll('button, [role=tab], div, span, a')];
    for (const el of nodes) {
      const t = (el.innerText || el.getAttribute('aria-label') || '').trim();
      if (t === (want === 'alert' ? 'Alert' : 'Post') || t.toLowerCase() === want) {
        const r = el.getBoundingClientRect();
        if (r.width > 10 && r.height > 10 && r.y < 400) {
          el.click();
          return t;
        }
      }
    }
    return null;
  }, want);
  L('KIND_CLICK', want, clicked);
  await p.waitForTimeout(800);
}

async function fillComposer(text) {
  const ta = p.locator('textarea, [contenteditable=true], [role=textbox], input[type=text]');
  const c = await ta.count();
  L('COMPOSER_FIELD_COUNT', c);
  for (let i = 0; i < c; i++) {
    const el = ta.nth(i);
    const ph = (await el.getAttribute('placeholder').catch(() => '')) || '';
    const box = await el.boundingBox().catch(() => null);
    if (!box || box.width < 40) continue;
    if (/Write a post|Enter Alert|post|alert|message|reply/i.test(ph) || i === 0) {
      await el.click({ timeout: 3000 }).catch(() => {});
      try {
        await el.fill(text);
      } catch {
        await el.click();
        await p.keyboard.type(text, { delay: 5 });
      }
      L('FILLED_VIA', i, ph || 'no-ph');
      return true;
    }
  }
  const ok = await p.evaluate((text) => {
    const els = [...document.querySelectorAll('textarea, [contenteditable=true], [role=textbox]')];
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.width < 40 || r.height < 10) continue;
      el.focus();
      if ('value' in el) {
        el.value = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
      el.innerText = text;
      el.dispatchEvent(new InputEvent('input', { bubbles: true, data: text }));
      return true;
    }
    return false;
  }, text);
  L('FILLED_EVAL', ok);
  return ok;
}

async function clickSend() {
  const sent = await p.evaluate(() => {
    const nodes = [...document.querySelectorAll('button, [role=button], div, span')];
    for (const el of nodes) {
      const al = (el.getAttribute('aria-label') || '').toLowerCase();
      const t = (el.innerText || '').trim().toLowerCase();
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) continue;
      if (/send|publish|submit/i.test(al) || t === 'send' || t === 'publish') {
        el.click();
        return al || t || 'clicked';
      }
    }
    const btns = nodes
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter((x) => x.r.width >= 28 && x.r.width <= 56 && x.r.height >= 28 && x.r.height <= 56 && x.r.y < 350);
    btns.sort((a, b) => b.r.x - a.r.x);
    if (btns[0]) {
      btns[0].el.click();
      return 'iconish';
    }
    return null;
  });
  L('SEND_CLICK', sent);
  await p.waitForTimeout(3500);
  return sent;
}

try {
  L('CASE', 'DITL-O-06-UI-02', 'MARK', MARK);
  await p.goto(BASE + '/sign-in', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForTimeout(1200);
  await p.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (_) {}
  });
  await ctx.clearCookies().catch(() => {});
  await p.goto(BASE + '/sign-in', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForTimeout(2000);
  await dump('01-pre-signin');

  const inputs = p.locator('input');
  const nIn = await inputs.count();
  L('INPUT_COUNT', nIn);
  if (nIn < 2) {
    L('RESULT', 'FAIL', 'no sign-in inputs');
    flush();
    await ctx.close();
    process.exit(0);
  }
  await inputs.nth(0).fill(USER);
  const pw = p.locator('input[type=password]').first();
  await pw.fill(PASS);
  await pw.press('Enter');
  await p.waitForTimeout(8000);
  let b = await dump('02-post-signin');
  if (/sign-in/i.test(p.url()) && /password/i.test(b)) {
    L('RESULT', 'FAIL', 'auth failed or kicked');
    flush();
    await ctx.close();
    process.exit(0);
  }
  const splash = /Welcome to Kelyra|Account creation is performed/i.test(b);
  L('SPLASH_HOME', splash);

  const feedRoutes = ['/?tab=feed', '/feed', '/'];
  let feedReached = false;
  let hasComposer = false;
  let composerProbe = '';
  for (const r of feedRoutes) {
    await p.goto(BASE + r, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch((e) =>
      L('GOTO_ERR', r, e.message),
    );
    await p.waitForTimeout(4000);
    b = await dump('03-route-' + r.replace(/[/?=&]/g, '_'));
    if (/Welcome to Kelyra|Account creation is performed/i.test(b) && r !== '/?tab=feed' && r !== '/feed') {
      L('STILL_SPLASH', r);
      continue;
    }
    try {
      const feedTab = p.getByText(/^Feed$/i).first();
      if (await feedTab.count()) {
        await feedTab.click({ timeout: 3000 }).catch(() => {});
        await p.waitForTimeout(2500);
        b = await dump('04-after-feed-tab-' + r.replace(/[/?=&]/g, '_'));
      }
    } catch (_) {}

    const fields = await p.evaluate(() => {
      return [...document.querySelectorAll('textarea, input, [contenteditable=true], [role=textbox]')]
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            tag: el.tagName,
            ph: el.getAttribute('placeholder') || '',
            role: el.getAttribute('role') || '',
            w: Math.round(r.width),
            h: Math.round(r.height),
            y: Math.round(r.y),
          };
        })
        .filter((x) => x.w > 40 && x.h > 10)
        .slice(0, 20);
    });
    L('FIELDS', JSON.stringify(fields));
    composerProbe = JSON.stringify(fields);
    if (
      fields.some((f) => /Write a post|Enter Alert|post|alert|message/i.test(f.ph)) ||
      fields.some((f) => f.tag === 'TEXTAREA' || f.role === 'textbox')
    ) {
      hasComposer = true;
      feedReached = true;
      L('FEED_COMPOSER_OK', r);
      break;
    }
  }

  if (!hasComposer) {
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.waitForTimeout(1000);
    b = await dump('05-no-composer-scan');
    const labels = await p.evaluate(() =>
      [...document.querySelectorAll('button,a,[role=button],[role=tab]')]
        .map((el) => (el.getAttribute('aria-label') || el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60))
        .filter(Boolean)
        .slice(0, 50),
    );
    L('LABELS', labels.join(' | '));
    L('RESULT', 'FAIL', 'no alert/feed composer on screen');
    L('COMPOSER_PROBE', composerProbe);
    L('FEED_REACHED', feedReached);
    await signOutBestEffort();
    await dump('99-signout');
    flush();
    await ctx.close();
    process.exit(0);
  }

  await setKind('alert');
  b = await dump('10-kind-alert');

  const notifyProbe = await p.evaluate(() => {
    const nodes = [...document.querySelectorAll('button,[role=button],[role=switch],input,label,a,span,div')];
    const hits = [];
    for (const el of nodes) {
      const al = (el.getAttribute('aria-label') || '').trim();
      const t = (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 80);
      const r = el.getBoundingClientRect();
      if (r.width < 6 || r.height < 6) continue;
      const blob = (al + ' ' + t).toLowerCase();
      if (/notif|notify|push|bell|deliver|broadcast|recipients|everyone|school-wide/i.test(blob)) {
        hits.push({ tag: el.tagName, al: al.slice(0, 50), t: t.slice(0, 50), y: Math.round(r.y) });
      }
    }
    return hits.slice(0, 30);
  });
  L('NOTIFY_PROBE', JSON.stringify(notifyProbe));

  const notifyClick = await p.evaluate(() => {
    const nodes = [...document.querySelectorAll('button,[role=button],[role=switch],label,a,span,div,input')];
    const want = /notif|notify|push|bell|deliver|broadcast|send alert/i;
    for (const el of nodes) {
      const al = (el.getAttribute('aria-label') || '').trim();
      const t = (el.innerText || '').trim();
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8 || r.y > 520) continue;
      if (want.test(al) || want.test(t)) {
        el.click();
        return al || t || el.tagName;
      }
    }
    return null;
  });
  L('NOTIFY_CLICK', notifyClick);
  await p.waitForTimeout(1200);
  b = await dump('11-after-notify-toggle');

  const filledA = await fillComposer(ALERT_BODY);
  L('ALERT_FILLED', filledA);
  await dump('12-alert-filled');
  await clickSend();
  b = await dump('13-after-alert-send');
  L('ALERT_IN_BODY', b.includes(ALERT_BODY));
  const kindBadge =
    b.includes(ALERT_BODY) && /Alert · School/i.test(b)
      ? 'Alert'
      : b.includes(ALERT_BODY) && /Post · School/i.test(b)
        ? 'Post'
        : 'unknown';
  L('KIND_BADGE_FOR_MARK', kindBadge);

  let notifBodyHasMark = false;
  const notifBodies = [];
  for (const r of ['/notifications', '/?tab=notifications', '/feed']) {
    await p.goto(BASE + r, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch((e) =>
      L('NOTIF_GOTO_ERR', r, e.message),
    );
    await p.waitForTimeout(3500);
    b = await dump('20-notif-' + r.replace(/[/?=&]/g, '_'));
    const has = b.includes(ALERT_BODY);
    notifBodies.push({ r, url: p.url(), has, splash: /Account creation is performed/i.test(b) });
    if (has) notifBodyHasMark = true;
    await p.evaluate(() => {
      const el = [...document.querySelectorAll('button,a,[role=button],span,div')].find((n) => {
        const al = (n.getAttribute('aria-label') || '').toLowerCase();
        const t = (n.innerText || '').toLowerCase();
        return /notif|bell|inbox/.test(al) || t === 'notifications';
      });
      if (el) el.click();
    });
    await p.waitForTimeout(1500);
    b = await dump('21-bell-' + r.replace(/[/?=&]/g, '_'));
    if (b.includes(ALERT_BODY)) notifBodyHasMark = true;
  }
  L('NOTIF_BODIES', JSON.stringify(notifBodies));
  L('NOTIF_MARK_VISIBLE', notifBodyHasMark);

  await p.goto(BASE + '/feed', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(4000);
  b = await dump('30-feed-verify');
  const alertOk = b.includes(ALERT_BODY);
  const postOk = false;
  L('VERIFY_ALERT', alertOk);
  L('VERIFY_POST', postOk);
  L('NOTIFY_CLICK_FINAL', notifyClick);
  L('NOTIF_FINAL', notifBodyHasMark);

  let deleted = 0;
  try {
    deleted = await p.evaluate((mark) => {
      let n = 0;
      const cards = [...document.querySelectorAll('div, article, section, li')].filter((el) =>
        (el.innerText || '').includes(mark),
      );
      for (const card of cards.slice(0, 8)) {
        const btn = [...card.querySelectorAll('button, [role=button], span, a')].find((el) =>
          /delete|archive|remove|trash/i.test(el.getAttribute('aria-label') || el.innerText || ''),
        );
        if (btn) {
          btn.click();
          n++;
        }
      }
      return n;
    }, MARK);
    L('DELETE_CLICKS', deleted);
    await p.waitForTimeout(2000);
    await p.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((el) =>
        /^(Delete|Confirm|Yes|OK|Archive)$/i.test((el.innerText || '').trim()),
      );
      if (b) b.click();
    });
    await p.waitForTimeout(1500);
  } catch (e) {
    L('TEARDOWN_ERR', String(e).slice(0, 200));
  }
  await dump('40-after-teardown');
  await signOutBestEffort();
  await dump('99-signout');

  let result = 'FAIL';
  if (alertOk && notifBodyHasMark && notifyClick) result = 'PASS';
  else if (hasComposer && alertOk) result = 'PARTIAL';
  else if (hasComposer && filledA) result = 'PARTIAL';
  L('RESULT', result);
  L(
    'SUMMARY',
    JSON.stringify({
      hasComposer,
      alertOk,
      filledA,
      notifyClick,
      notifBodyHasMark,
      kindBadge,
      deleted,
      mark: MARK,
    }),
  );
  flush();
  await ctx.close();
} catch (e) {
  L('FATAL', String(e.stack || e));
  L('RESULT', 'FAIL');
  flush();
  try {
    await ctx.close();
  } catch (_) {}
  process.exit(1);
}
