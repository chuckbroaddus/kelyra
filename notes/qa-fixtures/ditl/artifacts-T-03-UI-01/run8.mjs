import { chromium } from './../_pw/node_modules/playwright/index.mjs';
const A = new URL('.', import.meta.url).pathname;
const b = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();
p.on('console', (m) => console.log('CON', m.type(), m.text().slice(0, 200)));
p.on('pageerror', (e) => console.log('PAGEERR', String(e).slice(0, 300)));
const msgs = [];
p.on('response', async (r) => {
  const u = r.url();
  if (u.includes('/messages') && u.includes('rest')) {
    try { msgs.push({ st: r.status(), u: u.slice(0, 120), b: (await r.text()).slice(0, 400) }); } catch {}
  }
  if (u.includes('rest/v1/messages')) {
    try { msgs.push({ st: r.status(), u: u.slice(0, 180), b: (await r.text()).slice(0, 600) }); } catch {}
  }
  if (u.includes('send_message')) {
    try { msgs.push({ st: r.status(), u: 'send_message', b: (await r.text()).slice(0, 400) }); } catch {}
  }
});
await p.goto('http://localhost:8081/sign-in');
await p.waitForTimeout(1500);
await p.locator('input').nth(0).fill('ditl-teacher-a');
await p.locator('input[type=password]').first().fill('DITL-teacher-test');
await p.locator('input[type=password]').first().press('Enter');
await p.waitForTimeout(6000);
await p.goto('http://localhost:8081/messages/24afbe48-3bf7-49be-90da-88e09bcfe1c5');
await p.waitForTimeout(5000);
console.log('MSG_NET', JSON.stringify(msgs, null, 0).slice(0, 3500));
const box = p.getByPlaceholder('Write a message');
await box.click();
await box.fill('probe-send-' + Date.now());
await box.press('Enter');
await p.waitForTimeout(4000);
console.log('MSG_NET2', JSON.stringify(msgs.slice(-8), null, 0).slice(0, 2500));
console.log('BODY', (await p.innerText('body')).slice(0, 600).replace(/\n+/g, ' | '));
// dump react fiber? skip — check opacity / height of scroll views
const layout = await p.evaluate(() => {
  const nodes = [...document.querySelectorAll('div')].slice(0, 200);
  return nodes
    .map((el) => {
      const s = getComputedStyle(el);
      const t = (el.innerText || '').slice(0, 40).replace(/\s+/g, ' ');
      if (!t && el.childElementCount < 2) return null;
      if (s.height === '0px' || s.display === 'none' || s.opacity === '0') {
        if (t.includes('probe') || t.includes('ditl') || t.includes('sick') || t.length > 15)
          return { t, h: s.height, o: s.opacity, d: s.display, ov: s.overflow };
      }
      return null;
    })
    .filter(Boolean)
    .slice(0, 20);
});
console.log('HIDDEN', JSON.stringify(layout).slice(0, 1500));
await p.screenshot({ path: A + 'r8-thread.png', fullPage: true });
await b.close();
