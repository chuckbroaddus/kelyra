import { chromium } from '../_pw/node_modules/playwright/index.mjs';
const exe =
  process.env.HOME +
  '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const c = await chromium.launchPersistentContext('/tmp/ditl-pw-lane-c-probe', {
  headless: true,
  executablePath: exe,
  viewport: { width: 1280, height: 900 },
  args: ['--disable-dev-shm-usage'],
});
const p = c.pages()[0] || (await c.newPage());
await p.goto('http://localhost:8081/sign-in', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2500);
const info = await p.evaluate(() => {
  const inputs = [...document.querySelectorAll('input')].map((i) => ({
    type: i.type,
    name: i.name,
    placeholder: i.placeholder,
    id: i.id,
    aria: i.getAttribute('aria-label'),
  }));
  const buttons = [...document.querySelectorAll('button')].map((b) => b.innerText.slice(0, 40));
  return { inputs, buttons, body: document.body.innerText.slice(0, 800) };
});
console.log(JSON.stringify(info, null, 2));
await c.close();
