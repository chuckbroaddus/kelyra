#!/usr/bin/env node
/**
 * Dual-hat Ask seat-scope UI proof (AC-DUAL-ASK-1..4).
 * 375px web screenshots. No live model calls.
 *   node scripts/ask-seat-scope-ui-proof.mjs
 */
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const { loadPersonas, signInPersona } = await import('./ui-persona-session.mjs');

const WEB_PORT = Number(process.env.ASK_PROOF_PORT || 8082);
const ORIGIN = `http://127.0.0.1:${WEB_PORT}`;
const OUT = process.env.ASK_PROOF_OUT || path.join(os.tmpdir(), 'ask-seat-scope-t_677ef113');
const VIEW = { width: 375, height: 812, deviceScaleFactor: 2 };

function readEnvFile(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const idx = trimmed.indexOf('=');
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return env;
}

// SECTION: helpers + main

function createSessionServer(session) {
  const server = http.createServer((req, res) => {
    const origin = req.headers.origin || '';
    const allow =
      origin === ORIGIN ||
      origin === `http://localhost:${WEB_PORT}` ||
      origin === 'http://127.0.0.1:8081' ||
      origin === 'http://localhost:8081'
        ? origin
        : '';
    if (allow) {
      res.setHeader('Access-Control-Allow-Origin', allow);
      res.setHeader('Vary', 'Origin');
    }
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.writeHead(204);
      res.end();
      return;
    }
    if (req.method !== 'GET' || req.url !== '/session') {
      res.writeHead(404);
      res.end();
      return;
    }
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify(session));
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, port: addr.port });
    });
  });
}

async function settle(page) {
  await page.waitForTimeout(2500);
  await page
    .waitForFunction(() => !document.body?.innerText?.includes('Opening Kelyra'), {
      timeout: 15000,
    })
    .catch(() => undefined);
  await page.waitForTimeout(800);
}

function trayKeys(text) {
  const body = String(text || '');
  return {
    hasDesk: /\bDesk\b/.test(body),
    hasNeeds: /Needs Attention|\bNeeds\b/.test(body),
    hasRide: /\bRide\b/.test(body),
    hasHome: /\bHome\b/.test(body),
    hasCapture: /Open Capture/.test(body),
    hasAsk: /\bAsk\b|\bKelyra\b/.test(body),
  };
}

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function openWithPersona(page, injectPort, route) {
  const url = `${ORIGIN}${route}?kelyra_persona_port=${injectPort}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await settle(page);
}

// SECTION: main body

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const personas = loadPersonas();
  const teacher = personas.teacher;
  if (!teacher) throw new Error('PERSONA_MISSING teacher');

  const env = {
    ...readEnvFile(path.join(process.cwd(), '.env')),
    ...readEnvFile(path.join(process.cwd(), '.env.local')),
  };
  const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) throw new Error('SUPABASE_ENV_MISSING');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEW,
    deviceScaleFactor: VIEW.deviceScaleFactor,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const log = { shots: [], checks: [], webPort: WEB_PORT, out: OUT };

  try {
    // Teach seat /ask
    {
      const tokens = await signInPersona({
        url: supabaseUrl,
        anonKey,
        handle: teacher.handle,
        password: teacher.password,
      });
      const { server, port } = await createSessionServer({ ...tokens, seat: 'teacher' });
      await openWithPersona(page, port, '/ask');
      const text = await page.locator('body').innerText();
      const keys = trayKeys(text);
      log.shots.push(await shot(page, '01-teach-ask-375.png'));
      log.checks.push({
        name: 'teach-ask',
        keys,
        ok: keys.hasDesk || keys.hasNeeds || keys.hasCapture || /Period|ditl/i.test(text),
      });
      server.close();
    }

    // Parent seat: home → tray Ask → bare /ask
    {
      const tokens = await signInPersona({
        url: supabaseUrl,
        anonKey,
        handle: teacher.handle,
        password: teacher.password,
      });
      const { server, port } = await createSessionServer({ ...tokens, seat: 'parent' });
      await openWithPersona(page, port, '/parent');
      log.shots.push(await shot(page, '02-parent-home-375.png'));

      const askTab = page.locator('[aria-label="Ask"], [href="/ask"]').first();
      if (await askTab.count()) {
        await askTab.click({ timeout: 10000 }).catch(() => undefined);
      } else {
        await page.goto(`${ORIGIN}/ask`, { waitUntil: 'domcontentloaded' });
      }
      await settle(page);
      const text = await page.locator('body').innerText();
      const keys = trayKeys(text);
      const labels = await page.locator('[accessibilityrole="tab"], [role="tab"]').allTextContents().catch(() => []);
      log.shots.push(await shot(page, '03-parent-ask-tray-375.png'));
      log.checks.push({
        name: 'parent-ask-tray',
        keys,
        labels,
        tabCount: labels.length,
        ok:
          !keys.hasDesk &&
          !keys.hasNeeds &&
          !keys.hasCapture &&
          !/Who still needs a name\?|What gaps did I approve/i.test(text) &&
          /Ask a question about this week/i.test(text),
        bodySample: text.slice(0, 400),
      });

      await page.goto(`${ORIGIN}/ask`, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await settle(page);
      const bareText = await page.locator('body').innerText();
      const bareKeys = trayKeys(bareText);
      const bareLabels = await page
        .locator('[accessibilityrole="tab"], [role="tab"]')
        .allTextContents()
        .catch(() => []);
      log.shots.push(await shot(page, '04-parent-ask-bare-375.png'));
      log.checks.push({
        name: 'parent-ask-bare',
        keys: bareKeys,
        labels: bareLabels,
        ok:
          bareKeys.hasRide ||
          bareKeys.hasHome ||
          bareLabels.some((l) => /Ride|Home|Ask/i.test(l))
            ? !bareKeys.hasDesk &&
              !bareKeys.hasNeeds &&
              !bareKeys.hasCapture &&
              !/Who still needs a name\?|What gaps did I approve/i.test(bareText) &&
              /Ask a question about this week/i.test(bareText)
            : !bareKeys.hasDesk &&
              !bareKeys.hasNeeds &&
              !bareKeys.hasCapture &&
              /Ask a question about this week/i.test(bareText),
        bodySample: bareText.slice(0, 400),
      });

      const hasTeachRoster =
        /Who still needs a name\?|What gaps did I approve|Open Capture/i.test(bareText);
      log.checks.push({
        name: 'parent-no-teach-roster-chrome',
        ok: !hasTeachRoster,
        hasTeachRoster,
      });
      server.close();
    }

    const failed = log.checks.filter((c) => !c.ok);
    log.passed = failed.length === 0;
    log.failed = failed.map((c) => c.name);
    fs.writeFileSync(path.join(OUT, 'ui-proof-log.json'), JSON.stringify(log, null, 2));
    console.log(
      JSON.stringify(
        { passed: log.passed, failed: log.failed, out: OUT, shots: log.shots },
        null,
        2,
      ),
    );
    if (!log.passed) process.exitCode = 2;
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(String(err && err.message ? err.message : err));
  process.exit(1);
});
