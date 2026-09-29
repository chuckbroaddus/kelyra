import { chromium } from './../_pw/node_modules/playwright/index.mjs';
const A = new URL('.', import.meta.url).pathname;
const b = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();
const net = [];
p.on('response', async (r) => {
  const u = r.url();
  if (/send_message|rpc\/open|rest\/v1\/messages/.test(u)) {
    let body = '';
    try { body = (await r.text()).slice(0, 500); } catch {}
    net.push({ st: r.status(), m: r.request().method(), u: u.replace(/https:\/\/[^/]+/, ''), body });
  }
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
await box.fill('ditl-T-03-UI-01 click-send probe');
// try common send buttons
const candidates = [
  p.getByRole('button', { name: /send/i }),
  p.locator('[aria-label*=end i]'),
  p.locator('button').filter({ hasText: /send/i }),
];
for (const c of candidates) {
  const n = await c.count();
  console.log('cand', n);
}
// dump buttons near composer
const btns = await p.locator('button, [role=button]').evaluateAll((els) =>
  els.map((e) => ({ t: (e.innerText || e.getAttribute('aria-label') || '').slice(0, 40), aria: e.getAttribute('aria-label') })).filter((x) => x.t || x.aria).slice(-30)
);
console.log('BTNS', JSON.stringify(btns).slice(0, 2000));
// Meta+Enter / Ctrl+Enter
await box.press('Meta+Enter');
await p.waitForTimeout(2000);
await box.press('Control+Enter');
await p.waitForTimeout(2000);
// click last small button in page bottom
const sendIcon = p.locator('[aria-label="Send"], [accessibilitylabel="Send"]');
console.log('sendIcon', await sendIcon.count());
// Pressable without button role — click by text Send
try {
  await p.getByText('Send', { exact: true }).click({ timeout: 2000 });
} catch (e) {
  console.log('no Send text');
}
await p.waitForTimeout(3000);
// try Enter again after fill
await box.fill('ditl-T-03-UI-01 enter2');
await box.press('Enter');
await p.waitForTimeout(3000);
console.log('NET', JSON.stringify(net).slice(0, 3000));
console.log('BODY', (await p.innerText('body')).slice(0, 500).replace(/\n+/g, ' | '));
await p.screenshot({ path: A + 'r9-send.png' });
await b.close();
