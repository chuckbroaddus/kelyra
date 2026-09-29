import { chromium } from './../_pw/node_modules/playwright/index.mjs';
const A = new URL('.', import.meta.url).pathname;
const b = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();
const net = [];
p.on('response', async (r) => {
  const u = r.url();
  if (/send_message|rest\/v1\/messages/.test(u)) {
    let body = '';
    try { body = (await r.text()).slice(0, 400); } catch {}
    net.push({ st: r.status(), m: r.request().method(), path: u.split('.co')[1]?.slice(0, 120) || u.slice(0, 80), body });
  }
});
p.on('console', (m) => {
  if (m.type() === 'error') console.log('ERR', m.text().slice(0, 200));
});
await p.goto('http://localhost:8081/sign-in');
await p.waitForTimeout(1500);
await p.locator('input').nth(0).fill('ditl-teacher-a');
await p.locator('input[type=password]').first().fill('DITL-teacher-test');
await p.locator('input[type=password]').first().press('Enter');
await p.waitForTimeout(6000);
await p.goto('http://localhost:8081/messages/24afbe48-3bf7-49be-90da-88e09bcfe1c5');
await p.waitForTimeout(4000);
net.length = 0;
const box = p.getByPlaceholder('Write a message');
await box.click();
await box.fill('');
await box.type('ditl-T-03-UI-01 teacher reply via type', { delay: 15 });
await p.waitForTimeout(500);
const val = await box.inputValue();
console.log('VAL', val);
await p.getByRole('button', { name: 'Send' }).click();
await p.waitForTimeout(4000);
console.log('NET', JSON.stringify(net).slice(0, 2500));
console.log('BODY', (await p.innerText('body')).slice(0, 800).replace(/\n+/g, ' | '));
await p.screenshot({ path: A + 'r10-after-send.png' });
// parent side read
const ctx2 = await b.newContext({ viewport: { width: 1280, height: 900 } });
const par = await ctx2.newPage();
await par.goto('http://localhost:8081/sign-in');
await par.waitForTimeout(1500);
await par.locator('input').nth(0).fill('ditl-parent-1');
await par.locator('input[type=password]').first().fill('DITL-parent-test');
await par.locator('input[type=password]').first().press('Enter');
await par.waitForTimeout(6000);
await par.goto('http://localhost:8081/messages/24afbe48-3bf7-49be-90da-88e09bcfe1c5');
await par.waitForTimeout(4000);
await par.screenshot({ path: A + 'r10-parent-thread.png' });
console.log('PARENT_BODY', (await par.innerText('body')).slice(0, 800).replace(/\n+/g, ' | '));
await b.close();
