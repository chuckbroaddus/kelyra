// DITL-DH-01-ASK-01 rerun — lane A dual-hat Ask seat scope
import { chromium } from '../../qa-fixtures/ditl/_pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const A = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://127.0.0.1:8081';
const USER = 'ditl-teacher-a';
const PASS = process.env.DITL_TEACHER_PASS || 'DITL-teacher-test';
const UD = '/tmp/ditl-pw-lane-a';
const OUT = '/tmp/ditl-dh-01-ask-01-rerun-out';
fs.mkdirSync(OUT, { recursive: true });
const log = [];
const push = (k, v) => {
  log.push({ k, v, t: Date.now() });
  console.log(k, typeof v === 'string' ? v.slice(0, 900) : JSON.stringify(v).slice(0, 900));
};
const exe =
  process.env.HOME +
  '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

function trayKind(tray) {
  const j = (tray || []).join(' | ').toLowerCase();
  const hasHome = /home/.test(j);
  const hasRide = /ride/.test(j);
  const hasAsk = /\bask\b|kelyra/.test(j);
  const hasDesk = /desk/.test(j);
  const hasNeeds = /needs/.test(j);
  const hasCapture = /capture/.test(j);
  return {
    tray: tray || [],
    parentish: hasHome && hasRide,
    teachish: hasDesk || hasNeeds || hasCapture,
    hasHome,
    hasRide,
    hasAsk,
    hasDesk,
    hasNeeds,
    hasCapture,
  };
}

async function dumpChrome(p) {
  return p.evaluate(() => {
    const tray = [...document.querySelectorAll('[role="tab"], a, button, [aria-label]')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.bottom > window.innerHeight - 100 && r.height > 8 && r.width > 8;
      })
      .map((el) => (el.getAttribute('aria-label') || el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40))
      .filter(Boolean)
      .slice(0, 24);
    const labels = [...document.querySelectorAll('button, a, [role="button"], [role="tab"], [aria-label], [role="menuitem"]')]
      .map((el) => (el.getAttribute('aria-label') || el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 80))
      .filter(Boolean);
    return {
      url: location.href,
      tray,
      labels: labels.filter((t) => /ask|parent|teach|class|child|morgan|grade|capture|approve|roster|math|home|ride|desk|needs|diary|calendar|kelyra|jordan|jamie/i.test(t)).slice(0, 50),
      approveHits: labels.filter((t) => /approve/i.test(t)).slice(0, 12),
      textHead: (document.body?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 2200),
    };
  });
}

async function shot(p, name) {
  const pathOut = `${OUT}/${name}.png`;
  await p.screenshot({ path: pathOut, fullPage: true });
  return pathOut;
}

async function openDrawer(p) {
  const how = await p.evaluate(() => {
    const byAl = [...document.querySelectorAll('button, [role="button"], [aria-label]')].find((el) => {
      const al = (el.getAttribute('aria-label') || '').trim();
      const r = el.getBoundingClientRect();
      return /open menu|^menu$/i.test(al) && r.width > 0 && r.height > 0;
    });
    if (byAl) {
      byAl.click();
      return byAl.getAttribute('aria-label') || 'Open menu';
    }
    // phone chrome: menu is top-right, not top-left
    const right = [...document.querySelectorAll('button, [role="button"]')]
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.y < 70 && r.x > window.innerWidth - 80 && r.width >= 28 && r.height >= 28)
      .sort((a, b) => b.r.x - a.r.x)[0];
    if (right) {
      right.el.click();
      return 'top-right';
    }
    return null;
  });
  await p.waitForTimeout(1200);
  return how;
}

async function switchSeat(p, labelRe) {
  const drawerHow = await openDrawer(p);
  let hit = await p.evaluate((reSrc) => {
    const re = new RegExp(reSrc, 'i');
    const preferred = [...document.querySelectorAll('button, [role="menuitem"], [role="button"], a')].find((node) => {
      const al = (node.getAttribute?.('aria-label') || '').trim();
      return re.test(al);
    });
    const el =
      preferred ||
      [...document.querySelectorAll('button, [role="menuitem"], [role="button"], a, div, span')].find((node) => {
        const al = node.getAttribute?.('aria-label') || '';
        if (re.test(al)) return true;
        const t = (al + ' ' + (node.innerText || '')).replace(/\s+/g, ' ').trim();
        return re.test(t) && t.length < 90 && t.length > 2;
      });
    if (el) {
      el.click();
      return el.getAttribute?.('aria-label') || (el.innerText || '').trim().slice(0, 80);
    }
    return null;
  }, labelRe);
  await p.waitForTimeout(4500);
  if (!hit) {
    const drawerHow2 = await openDrawer(p);
    hit = await p.evaluate((reSrc) => {
      const re = new RegExp(reSrc, 'i');
      const el = [...document.querySelectorAll('[aria-label]')].find((node) => re.test(node.getAttribute('aria-label') || ''));
      if (el) {
        el.click();
        return el.getAttribute('aria-label');
      }
      return null;
    }, labelRe);
    await p.waitForTimeout(4500);
    return { hit, drawerHow, drawerHow2 };
  }
  return { hit, drawerHow };
}

async function typeAsk(p, msg) {
  const filled = await p.evaluate((text) => {
    const cands = [...document.querySelectorAll('textarea, [contenteditable="true"], input[type="text"], [role="textbox"]')].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 80 && r.height > 18 && r.y > 80;
    });
    const el = cands.sort((a, b) => b.getBoundingClientRect().y - a.getBoundingClientRect().y)[0];
    if (!el) return { ok: false };
    el.focus();
    if (el.isContentEditable) {
      el.textContent = text;
      el.dispatchEvent(new InputEvent('input', { bubbles: true }));
    } else {
      const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) setter.call(el, text);
      else el.value = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return { ok: true, tag: el.tagName, ph: el.getAttribute('placeholder') };
  }, msg);
  if (!filled.ok) {
    try {
      await p.locator('textarea').last().fill(msg);
      filled.ok = true;
      filled.via = 'locator';
    } catch (e) {
      filled.err = String(e).slice(0, 120);
    }
  }
  await p.waitForTimeout(400);
  const sent = await p.evaluate(() => {
    const btns = [...document.querySelectorAll('button, [role="button"]')];
    const send = btns.find((b) => {
      const t = (b.getAttribute('aria-label') || b.innerText || '').trim();
      const r = b.getBoundingClientRect();
      return (/send|submit/i.test(t) || (r.bottom > window.innerHeight - 140 && r.right > window.innerWidth - 90 && r.width < 90)) && r.width > 0;
    });
    if (send) {
      send.click();
      return send.getAttribute('aria-label') || (send.innerText || '').trim().slice(0, 40) || 'clicked';
    }
    return null;
  });
  if (!sent) {
    try {
      await p.keyboard.press('Enter');
    } catch {}
  }
  await p.waitForTimeout(10000);
  return { filled, sent };
}

async function main() {
  const browser = await chromium.launchPersistentContext(UD, {
    headless: true,
    executablePath: exe,
    viewport: { width: 390, height: 844 },
    args: ['--disable-dev-shm-usage', '--no-first-run'],
  });
  const p = browser.pages()[0] || (await browser.newPage());
  try {
    await p.goto(BASE + '/sign-in', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await p.waitForTimeout(500);
    await p.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
    });
    await p.goto(BASE + '/sign-in', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await p.waitForTimeout(1200);
    await p.locator('input').nth(0).fill(USER);
    await p.locator('input[type=password]').first().fill(PASS);
    await p.locator('input[type=password]').first().press('Enter');
    await p.waitForTimeout(7000);
    push('after_signin', await dumpChrome(p));
    await shot(p, '01-after-signin');

    // 1 Teach /ask list class captures
    await p.goto(BASE + '/ask', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await p.waitForTimeout(3500);
    const teachLand = await dumpChrome(p);
    push('teach_ask_land', { ...teachLand, trayKind: trayKind(teachLand.tray) });
    await shot(p, '02-teach-ask');
    const teachQ = await typeAsk(p, 'List my taught classes and any recent captures or Needs items. Marker teach-ask-DH01ASK01-rerun.');
    push('teach_ask_send', teachQ);
    await p.waitForTimeout(1500);
    const teachAfter = await dumpChrome(p);
    push('teach_ask_after', { ...teachAfter, trayKind: trayKind(teachAfter.tray) });
    await shot(p, '03-teach-ask-reply');
    const teachScan = await p.evaluate(() => {
      const t = (document.body?.innerText || '').replace(/\s+/g, ' ');
      return {
        hasMath: /Math|C-MATH|Period 3|Algebra/i.test(t),
        hasRosterish: /Jordan|Jamie|Riley|Samira/i.test(t),
        hasCapture: /capture/i.test(t),
        hasNeeds: /Needs/i.test(t),
        hasApproveThis: /Approve this capture/i.test(t),
        text: t.slice(0, 2000),
      };
    });
    push('teach_scan', teachScan);

    // 2 Parent altitude
    const parentHit = await switchSeat(p, 'Switch to Parent seat|switch to parent seat');
    push('parent_switch', parentHit);
    const afterParent = await dumpChrome(p);
    push('after_parent', { ...afterParent, trayKind: trayKind(afterParent.tray) });
    await shot(p, '04-parent-seat');

    // 3 bare /ask parent session
    await p.goto(BASE + '/ask', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await p.waitForTimeout(4000);
    const parentBare = await dumpChrome(p);
    const parentBareTk = trayKind(parentBare.tray);
    push('parent_bare_ask', { ...parentBare, trayKind: parentBareTk });
    await shot(p, '05-parent-bare-ask');

    // also try tray Ask if bare failed
    if (parentBareTk.teachish && !parentBareTk.parentish) {
      await p.evaluate(() => {
        const el = [...document.querySelectorAll('button, a, [role="tab"], [role="button"]')].find((n) => {
          const t = (n.getAttribute('aria-label') || n.innerText || '').trim();
          const r = n.getBoundingClientRect();
          return /^ask$/i.test(t) && r.bottom > window.innerHeight - 120;
        });
        if (el) el.click();
      });
      await p.waitForTimeout(3000);
      const parentTrayAsk = await dumpChrome(p);
      push('parent_tray_ask_fallback', { ...parentTrayAsk, trayKind: trayKind(parentTrayAsk.tray) });
      await shot(p, '05b-parent-tray-ask');
    }

    const parentQ = await typeAsk(p, 'Show my children only. Marker parent-ask-DH01ASK01-rerun. Do not list teacher roster or captures.');
    push('parent_ask_send', parentQ);
    await p.waitForTimeout(1500);
    const parentAfter = await dumpChrome(p);
    push('parent_ask_after', { ...parentAfter, trayKind: trayKind(parentAfter.tray) });
    await shot(p, '06-parent-ask-reply');
    const parentScan = await p.evaluate(() => {
      const t = (document.body?.innerText || '').replace(/\s+/g, ' ');
      const labels = [...document.querySelectorAll('button, a, [role="button"], [role="tab"], [aria-label]')]
        .map((el) => (el.getAttribute('aria-label') || el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 80))
        .filter(Boolean);
      return {
        hasMorgan: /Morgan\s*Patel/i.test(t),
        teachRosterInScroll: /Jordan|Jamie|Riley|Samira/i.test(t) && /Period 3|ditl-Math|C-MATH|Needs Attention/i.test(t),
        teachMarker: /teach-ask-DH01ASK01-rerun/i.test(t),
        parentMarker: /parent-ask-DH01ASK01-rerun/i.test(t),
        hasApproveThis: /Approve this capture/i.test(t),
        hasDeskLabel: labels.some((x) => /^desk$/i.test(x)),
        hasNeedsLabel: labels.some((x) => /needs attention|^needs$/i.test(x)),
        hasHomeLabel: labels.some((x) => /^home$/i.test(x)),
        hasRideLabel: labels.some((x) => /^ride$/i.test(x)),
        trayish: labels.filter((x) => /home|ride|ask|desk|needs|diary|calendar|capture|kelyra/i.test(x)).slice(0, 24),
        text: t.slice(0, 2200),
      };
    });
    push('parent_scan', parentScan);

    await openDrawer(p);
    push('parent_drawer', await dumpChrome(p));
    await shot(p, '07-parent-drawer');

    // 6 switch teach + teach question — seat scoped both ways
    const teachHit = await switchSeat(p, 'Switch to Teach seat|switch to teach seat|switch to teacher');
    push('teach_switch', teachHit);
    await p.goto(BASE + '/ask', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await p.waitForTimeout(3500);
    const teachBack = await dumpChrome(p);
    push('teach_back_ask', { ...teachBack, trayKind: trayKind(teachBack.tray) });
    await shot(p, '08-teach-back-ask');
    const teach2 = await typeAsk(p, 'Confirm teach seat Ask. Marker teach2-ask-DH01ASK01-rerun. List class briefly.');
    push('teach2_send', teach2);
    await p.waitForTimeout(1500);
    const teach2After = await dumpChrome(p);
    push('teach2_after', { ...teach2After, trayKind: trayKind(teach2After.tray) });
    await shot(p, '09-teach2-reply');
    const teach2Scan = await p.evaluate(() => {
      const t = (document.body?.innerText || '').replace(/\s+/g, ' ');
      return {
        parentMarkerBleed: /parent-ask-DH01ASK01-rerun/i.test(t),
        teach2Marker: /teach2-ask-DH01ASK01-rerun/i.test(t),
        teach1Marker: /teach-ask-DH01ASK01-rerun/i.test(t),
        text: t.slice(0, 2200),
      };
    });
    push('teach2_scan', teach2Scan);

    // back parent once more to check isolation
    const parent2 = await switchSeat(p, 'Switch to Parent seat|switch to parent seat');
    push('parent2_switch', parent2);
    await p.goto(BASE + '/ask', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await p.waitForTimeout(3500);
    const parent2Ask = await dumpChrome(p);
    push('parent2_ask', { ...parent2Ask, trayKind: trayKind(parent2Ask.tray) });
    await shot(p, '10-parent2-ask');
    const parent2Scan = await p.evaluate(() => {
      const t = (document.body?.innerText || '').replace(/\s+/g, ' ');
      return {
        teachMarkers: /teach-ask-DH01ASK01-rerun|teach2-ask-DH01ASK01-rerun/i.test(t),
        parentMarker: /parent-ask-DH01ASK01-rerun/i.test(t),
        rosterBleed: /Jordan|Jamie|Riley|Samira/i.test(t) && /Needs Attention|ditl-Math|Period 3/i.test(t),
        text: t.slice(0, 2200),
      };
    });
    push('parent2_scan', parent2Scan);

    await openDrawer(p);
    const signedOut = await p.evaluate(() => {
      const hit = [...document.querySelectorAll('button, [role="menuitem"], a, div, span')].find((el) =>
        /sign out/i.test((el.getAttribute('aria-label') || el.innerText || '').trim()),
      );
      if (hit) {
        hit.click();
        return true;
      }
      return false;
    });
    push('signout_click', signedOut);
    await p.waitForTimeout(3000);
    push('after_signout', await dumpChrome(p));
    await shot(p, '99-signout');
  } catch (e) {
    push('ERROR', String(e && e.stack ? e.stack : e).slice(0, 2500));
    try {
      await shot(p, 'error');
    } catch {}
  } finally {
    fs.writeFileSync(OUT + '/log.json', JSON.stringify(log, null, 2));
    fs.writeFileSync(path.join(A, 'log.json'), JSON.stringify(log, null, 2));
    await browser.close();
  }
}

main();
