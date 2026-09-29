import { chromium } from './../_pw/node_modules/playwright/index.mjs';
const A = new URL('.', import.meta.url).pathname;
const pw = process.env.DITL_PW;
if (!pw) { console.error('missing DITL_PW'); process.exit(2); }
const b = await chromium.launch({ channel: 'chrome', headless: true });
const log = (...a) => console.log(...a);
const txt = async (p) => (await p.innerText('body')).slice(0, 1200).replace(/\n+/g, ' | ');
const shot = async (p, n, w = 2000) => {
  await p.waitForTimeout(w);
  await p.screenshot({ path: A + n + '.png', fullPage: false });
  log('==', n, p.url());
  log(await txt(p));
};
async function signIn(user) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.goto('http://localhost:8081/sign-in', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2000);
  await p.locator('input').nth(0).fill(user);
  const pwd = p.locator('input[type=password]').first();
  await pwd.fill(pw);
  await pwd.press('Enter');
  await p.waitForTimeout(7000);
  return p;
}

// Parent starts thread so teacher has something to reply to
const par = await signIn('ditl-parent-1');
await shot(par, 'r4-01-parent-home');
await par.goto('http://localhost:8081/messages/new');
await par.waitForTimeout(2500);
await shot(par, 'r4-02-parent-new');
const pq = par.getByPlaceholder('Type a name');
await pq.fill('Avery');
await par.waitForTimeout(2500);
await shot(par, 'r4-03-parent-search');
try {
  await par.getByText('Avery Quinn').first().click({ timeout: 8000 });
  await par.waitForTimeout(1000);
  const chat = par.getByText(/Chat with Avery/i).first();
  if (await chat.count()) await chat.click();
  await par.waitForTimeout(2000);
  await shot(par, 'r4-04-parent-thread');
  const pbox = par.getByPlaceholder(/Write a message|message/i).first();
  await pbox.fill('ditl-T-03-UI-01 parent: Jordan was out sick Friday — can he make up the quiz?');
  await pbox.press('Enter');
  await shot(par, 'r4-05-parent-sent');
} catch (e) {
  log('PARENT_THREAD_ERR', String(e).slice(0, 400));
  await shot(par, 'r4-04-parent-err');
}

// Teacher seat
const t = await signIn('ditl-teacher-a');
await shot(t, 'r4-06-teacher-home');
await t.goto('http://localhost:8081/messages');
await shot(t, 'r4-07-messages', 4000);
// try open Taylor Lee or any parent thread
let opened = false;
for (const name of ['Taylor Lee', 'Taylor', 'Jordan', 'Lee', 'parent']) {
  const loc = t.getByText(name, { exact: false }).first();
  if (await loc.count()) {
    try {
      await loc.click({ timeout: 3000 });
      opened = true;
      log('opened via', name);
      break;
    } catch {}
  }
}
await shot(t, 'r4-08-thread', 3000);
if (opened) {
  try {
    const tbox = t.getByPlaceholder(/Write a message|message/i).first();
    await tbox.fill('ditl-T-03-UI-01 teacher: Yes, Jordan can make it up Tuesday during Period 3.');
    await tbox.press('Enter');
    await shot(t, 'r4-09-replied', 3000);
  } catch (e) {
    log('REPLY_ERR', String(e).slice(0, 300));
  }
}

// Needs / inbox
await t.goto('http://localhost:8081/inbox');
await shot(t, 'r4-10-inbox', 3500);
const body = await txt(t);
log('INBOX_SNIP', body.slice(0, 500));

// Try log/create need if UI offers
const chips = await t.locator('text=/Need|Unassigned|Review|Name/i').allInnerTexts().catch(() => []);
log('CHIPS', chips.slice(0, 20).join(' | '));

await t.context().storageState({ path: A + '.state.json' });
await b.close();
log('DONE');
