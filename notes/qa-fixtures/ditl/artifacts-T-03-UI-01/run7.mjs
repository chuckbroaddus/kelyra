import { chromium } from './../_pw/node_modules/playwright/index.mjs';
const A = new URL('.', import.meta.url).pathname;
const b = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();
const net = [];
p.on('response', async (r) => {
  const u = r.url();
  if (/message|thread|rpc|rest\/v1/i.test(u)) {
    let body = '';
    try { body = (await r.text()).slice(0, 300); } catch {}
    net.push({ st: r.status(), u: u.replace(/https?:\/\/[^/]+/, ''), body });
  }
});
await p.goto('http://localhost:8081/sign-in');
await p.waitForTimeout(1500);
await p.locator('input').nth(0).fill('ditl-teacher-a');
await p.locator('input[type=password]').first().fill('DITL-teacher-test');
await p.locator('input[type=password]').first().press('Enter');
await p.waitForTimeout(6000);
net.length = 0;
await p.goto('http://localhost:8081/messages/24afbe48-3bf7-49be-90da-88e09bcfe1c5');
await p.waitForTimeout(5000);
const box = p.getByPlaceholder('Write a message');
await box.fill('ditl-T-03-UI-01 probe teacher reply ' + Date.now());
await box.press('Enter');
await p.waitForTimeout(4000);
await p.screenshot({ path: A + 'r7-after-send.png' });
console.log('BODY', (await p.innerText('body')).slice(0, 800).replace(/\n+/g, ' | '));
console.log('NET', JSON.stringify(net.slice(-25), null, 0).slice(0, 4000));
await b.close();
