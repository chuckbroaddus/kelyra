import { chromium } from './../_pw/node_modules/playwright/index.mjs';
const A = new URL('.', import.meta.url).pathname;
const pw = process.env.DITL_PW;
const b = await chromium.launch({ channel: 'chrome', headless: true });
const txt = async (p) => (await p.innerText('body')).slice(0, 800).replace(/\n+/g,' | ');
const shot = async (p, n, w=2500) => { await p.waitForTimeout(w); await p.screenshot({ path: A + n + '.png' }); console.log('==', n, p.url()); console.log(await txt(p)); };
async function signIn(user) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); const p = await ctx.newPage();
  await p.goto('http://localhost:8081/sign-in'); await p.waitForTimeout(2000);
  await p.locator('input').nth(0).fill(user); const pwd = p.locator('input[type=password]').first(); await pwd.fill(pw); await pwd.press('Enter');
  await p.waitForTimeout(6000); return p;
}
// Parent opens thread to teacher
const par = await signIn('ditl-parent-1');
await par.goto('http://localhost:8081/messages/new'); await par.waitForTimeout(3000);
await par.getByPlaceholder('Type a name').fill('Avery'); await par.waitForTimeout(3000);
await shot(par, '08-parent-search', 500);
await par.getByText('Avery Quinn').first().click(); await par.waitForTimeout(1500);
await par.getByText('Chat with Avery Quinn').first().click();
await shot(par, '09-parent-thread');
const pbox = par.getByPlaceholder('Write a message'); await pbox.fill('ditl-T-03-UI-01 parent: Jordan was out sick Friday, can he make up the quiz?'); await pbox.press('Enter');
await shot(par, '10-parent-sent');
// Teacher replies
const t = await signIn('ditl-teacher-a');
await t.goto('http://localhost:8081/messages'); await shot(t, '11-teacher-tray', 4000);
await t.getByText('Taylor Lee').first().click(); await shot(t, '12-teacher-thread');
const tbox = t.getByPlaceholder('Write a message'); await tbox.fill('ditl-T-03-UI-01 teacher: Yes, Jordan can make it up Tuesday during Period 3.'); await tbox.press('Enter');
await shot(t, '13-teacher-replied');
await t.context().storageState({ path: A + '.state.json' });
await b.close();
