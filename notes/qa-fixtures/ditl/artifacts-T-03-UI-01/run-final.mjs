import { chromium } from './../_pw/node_modules/playwright/index.mjs';
const A = new URL('.', import.meta.url).pathname;
const b = await chromium.launch({ channel: 'chrome', headless: true });
const log = (...a) => console.log(...a);
const shot = async (p, n, w = 2000) => {
  await p.waitForTimeout(w);
  await p.screenshot({ path: A + n + '.png' });
  log('==', n, p.url());
  log((await p.innerText('body')).slice(0, 900).replace(/\n+/g, ' | '));
};
async function signIn(user, pass) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.goto('http://localhost:8081/sign-in');
  await p.waitForTimeout(1500);
  await p.locator('input').nth(0).fill(user);
  await p.locator('input[type=password]').first().fill(pass);
  await p.locator('input[type=password]').first().press('Enter');
  await p.waitForTimeout(6500);
  return p;
}
async function sendText(p, text) {
  const box = p.getByPlaceholder('Write a message');
  await box.click();
  await box.fill('');
  await box.type(text, { delay: 12 });
  await p.getByRole('button', { name: 'Send' }).click();
  await p.waitForTimeout(2500);
}

const marker = 'ditl-T-03-UI-01-' + Date.now();

// Parent message
const par = await signIn('ditl-parent-1', 'DITL-parent-test');
await shot(par, 'final-01-parent-home');
await par.goto('http://localhost:8081/messages/new');
await par.waitForTimeout(2000);
await par.getByPlaceholder('Type a name').fill('Avery');
await par.waitForTimeout(2000);
await par.getByText('Avery Quinn').first().click();
await par.waitForTimeout(800);
const chat = par.getByText(/Chat with/i).first();
if (await chat.count()) await chat.click();
await par.waitForTimeout(2000);
await shot(par, 'final-02-parent-thread');
await sendText(par, marker + ' parent: Jordan out Friday — makeup quiz?');
await shot(par, 'final-03-parent-sent');

// Teacher reply + inbox need triage
const t = await signIn('ditl-teacher-a', 'DITL-teacher-test');
await shot(t, 'final-04-teacher-home');
await t.goto('http://localhost:8081/messages');
await shot(t, 'final-05-tray', 3500);
await t.getByText('Taylor Lee').first().click();
await shot(t, 'final-06-thread', 3000);
const bodyBefore = await t.innerText('body');
log('HAS_PARENT_MSG', bodyBefore.includes(marker));
await sendText(t, marker + ' teacher: Yes, makeup Tuesday P3.');
await shot(t, 'final-07-replied', 3000);
const bodyAfter = await t.innerText('body');
log('HAS_TEACHER_MSG', bodyAfter.includes('makeup Tuesday'));

// Needs inbox — triage visibility (flagged items already exist)
await t.goto('http://localhost:8081/inbox');
await shot(t, 'final-08-inbox', 3500);
// chip Needs a name
try {
  await t.getByText('Needs a name', { exact: true }).first().click();
  await shot(t, 'final-09-inbox-name', 2000);
} catch (e) {
  log('chip name skip', String(e).slice(0, 120));
}
try {
  await t.getByText('Review', { exact: true }).first().click();
  await shot(t, 'final-10-inbox-review', 2000);
} catch {}
try {
  await t.getByText('All', { exact: true }).first().click();
  await shot(t, 'final-11-inbox-all', 2000);
} catch {}

// Sign out if available
try {
  // hamburger / settings
  await t.goto('http://localhost:8081/class/d1715000-0000-4000-a000-000000000301/settings');
  await shot(t, 'final-12-settings', 2500);
  const so = t.getByText(/Sign out|Log out/i).first();
  if (await so.count()) {
    await so.click();
    await shot(t, 'final-13-signed-out', 3000);
  }
} catch (e) {
  log('signout', String(e).slice(0, 150));
}

log('MARKER', marker);
log('DONE');
await b.close();
