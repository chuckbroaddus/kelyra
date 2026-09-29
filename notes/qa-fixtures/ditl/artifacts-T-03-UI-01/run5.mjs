import { chromium } from './../_pw/node_modules/playwright/index.mjs';
const A = new URL('.', import.meta.url).pathname;
const teacherPw = process.env.DITL_TEACHER_PW || process.env.DITL_PW || 'DITL-teacher-test';
const parentPw = process.env.DITL_PARENT_PW || 'DITL-parent-test';
const b = await chromium.launch({ channel: 'chrome', headless: true });
const log = (...a) => console.log(...a);
const shot = async (p, n, w = 2000) => {
  await p.waitForTimeout(w);
  await p.screenshot({ path: A + n + '.png' });
  log('==', n, p.url());
  log((await p.innerText('body')).slice(0, 1100).replace(/\n+/g, ' | '));
};
async function signIn(user, pass) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.goto('http://localhost:8081/sign-in', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1800);
  await p.locator('input').nth(0).fill(user);
  const pwd = p.locator('input[type=password]').first();
  await pwd.fill(pass);
  await pwd.press('Enter');
  await p.waitForTimeout(7000);
  return p;
}

// Parent opens thread
const par = await signIn('ditl-parent-1', parentPw);
await shot(par, 'r5-01-parent-home');
await par.goto('http://localhost:8081/messages/new');
await par.waitForTimeout(2500);
await shot(par, 'r5-02-parent-new');
await par.getByPlaceholder('Type a name').fill('Avery');
await par.waitForTimeout(2500);
await shot(par, 'r5-03-parent-search');
try {
  await par.getByText('Avery Quinn').first().click({ timeout: 10000 });
  await par.waitForTimeout(1200);
  const chat = par.getByText(/Chat with/i).first();
  if (await chat.count()) await chat.click();
  await par.waitForTimeout(2000);
  await shot(par, 'r5-04-parent-thread');
  const pbox = par.getByPlaceholder(/Write a message|message/i).first();
  await pbox.fill('ditl-T-03-UI-01 parent: Jordan was out sick Friday — can he make up the quiz?');
  await pbox.press('Enter');
  await shot(par, 'r5-05-parent-sent', 3000);
} catch (e) {
  log('PARENT_ERR', String(e).slice(0, 500));
  await shot(par, 'r5-04-parent-err');
}

// Teacher replies + needs
const t = await signIn('ditl-teacher-a', teacherPw);
await shot(t, 'r5-06-teacher-home');
await t.goto('http://localhost:8081/messages');
await shot(t, 'r5-07-messages', 4000);
for (const name of ['Taylor Lee', 'Taylor', 'Lee']) {
  const loc = t.getByText(name, { exact: false }).first();
  if (await loc.count()) {
    try { await loc.click({ timeout: 4000 }); log('opened', name); break; } catch {}
  }
}
await shot(t, 'r5-08-thread', 3000);
try {
  const tbox = t.getByPlaceholder(/Write a message|message/i).first();
  if (await tbox.count()) {
    await tbox.fill('ditl-T-03-UI-01 teacher: Yes, Jordan can make it up Tuesday during Period 3.');
    await tbox.press('Enter');
    await shot(t, 'r5-09-replied', 3000);
  } else {
    log('NO_COMPOSER');
  }
} catch (e) {
  log('REPLY_ERR', String(e).slice(0, 400));
}

// Teacher-initiated if no thread
await t.goto('http://localhost:8081/messages/new');
await shot(t, 'r5-10-new', 2500);
await t.getByPlaceholder('Type a name').fill('Taylor');
await shot(t, 'r5-11-search-taylor', 3000);
try {
  await t.getByText('Taylor Lee').first().click({ timeout: 8000 });
  await t.waitForTimeout(1000);
  const chat2 = t.getByText(/Chat with/i).first();
  if (await chat2.count()) await chat2.click();
  await shot(t, 'r5-12-teacher-thread', 2500);
  const tbox2 = t.getByPlaceholder(/Write a message|message/i).first();
  if (await tbox2.count()) {
    await tbox2.fill('ditl-T-03-UI-01 teacher-init: Checking in on Jordan makeup quiz.');
    await tbox2.press('Enter');
    await shot(t, 'r5-13-teacher-sent', 3000);
  }
} catch (e) {
  log('TEACHER_NEW_ERR', String(e).slice(0, 500));
  await shot(t, 'r5-12-teacher-new-err');
}

await t.goto('http://localhost:8081/inbox');
await shot(t, 'r5-14-inbox', 3500);
// exercise need triage: open Review on Jordan if present
try {
  const rev = t.getByText('Review').first();
  if (await rev.count()) {
    // do not approve — just open if navigates
    log('review_buttons_present');
  }
} catch {}
log('DONE');
await b.close();
