#!/usr/bin/env node
/**
 * Conduct All periods UI proof (t_72bfee5d).
 * Portrait 375 + landscape 812x375. No AI. No Supabase writes beyond auth.
 *   node scripts/gb-conduct-all-ui-proof.mjs --port 8147
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const { loadPersonas, signInPersona } = await import('./ui-persona-session.mjs');
const require = createRequire(import.meta.url);
function loadPlaywright() {
  for (const t of [
    path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'node_modules/playwright'),
    path.join(process.env.HOME || '', '.hermes/hermes-agent/node_modules/playwright'),
    path.join(process.env.HOME || '', 'projects/kelyra/notes/qa-fixtures/ditl/_pw/node_modules/playwright'),
  ]) {
    try {
      return require(t);
    } catch {
      /* next */
    }
  }
  throw new Error('playwright missing');
}
const { chromium } = loadPlaywright();

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function arg(flag, dflt = '') {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}
const WEB_PORT = Number(arg('--port', process.env.CONDUCT_PROOF_PORT || '8147'));
const CLASS_ID = arg('--class', 'd1715000-0000-4000-a000-000000000301');
const ORIGIN = `http://127.0.0.1:${WEB_PORT}`;
const OUT =
  arg('--out', '') ||
  process.env.CONDUCT_PROOF_OUT ||
  path.join(ROOT, 'notes/qa-runs/t_72bfee5d-conduct-all');
fs.mkdirSync(OUT, { recursive: true });

// SECTION: helpers
function readEnvFile(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const idx = trimmed.indexOf('=');
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1).replace(/^['"]|['"]$/g, '');
  }
  return env;
}

function createSessionServer(session) {
  const server = http.createServer((req, res) => {
    const origin = req.headers.origin || '';
    const allow =
      origin === ORIGIN ||
      origin === `http://localhost:${WEB_PORT}` ||
      origin.startsWith('http://127.0.0.1:') ||
      origin.startsWith('http://localhost:')
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
      resolve({ server, port: server.address().port });
    });
  });
}

async function settle(page) {
  await page.waitForTimeout(2000);
  await page
    .waitForFunction(() => !document.body?.innerText?.includes('Opening Kelyra'), {
      timeout: 20000,
    })
    .catch(() => undefined);
  await page.waitForTimeout(1000);
}

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

function analyzeBody(text) {
  const body = String(text || '');
  const periodLabels = [];
  for (const label of [
    '1st Six Weeks',
    '2nd Six Weeks',
    '3rd Six Weeks',
    '4th Six Weeks',
    '5th Six Weeks',
    '6th Six Weeks',
    'Quarter 1',
    'Quarter 2',
    'Quarter 3',
    'Quarter 4',
  ]) {
    if (body.includes(label)) periodLabels.push(label);
  }
  return {
    hasPickPeriodPrompt: /Conduct is marked per grading period/i.test(body),
    hasConduct: /Conduct/i.test(body),
    periodLabels,
    periodCount: periodLabels.length,
    hasCombinedOnlyHint: /combined total/i.test(body),
    sample: body.slice(0, 600),
  };
}

// SECTION: main
async function main() {
  const personas = loadPersonas();
  const teacher = personas.teacher;
  if (!teacher) throw new Error('PERSONA_MISSING teacher');
  const env = {
    ...readEnvFile(path.join(ROOT, '.env')),
    ...readEnvFile(path.join(ROOT, '.env.local')),
    ...readEnvFile(path.join('/Users/chuckbroaddus/projects/kelyra', '.env')),
  };
  const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) throw new Error('SUPABASE_ENV_MISSING');

  for (let i = 0; i < 90; i++) {
    try {
      const r = await fetch(ORIGIN);
      if (r.status > 0) break;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1000));
    if (i === 89) throw new Error(`WEB_NOT_UP ${ORIGIN}`);
  }

  const tokens = await signInPersona({
    url: supabaseUrl,
    anonKey,
    handle: teacher.handle,
    password: teacher.password,
  });
  const { server, port } = await createSessionServer({ ...tokens, seat: 'teacher' });
  const browser = await chromium.launch({ headless: true });
  const log = { shots: [], checks: [], webPort: WEB_PORT, out: OUT, classId: CLASS_ID };

  try {
    const route = `/class/${CLASS_ID}/gradebook?tab=conduct&kelyra_persona_port=${port}`;

    {
      const context = await browser.newContext({
        viewport: { width: 375, height: 812 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      });
      const page = await context.newPage();
      await page.goto(`${ORIGIN}${route}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await settle(page);
      const allTab = page.getByText('All', { exact: true }).first();
      if (await allTab.count()) {
        await allTab.click({ timeout: 5000 }).catch(() => undefined);
        await page.waitForTimeout(800);
      }
      const text = await page.locator('body').innerText();
      const a = analyzeBody(text);
      log.shots.push(await shot(page, '01-conduct-all-portrait-375.png'));
      await page.evaluate(() => window.scrollBy(0, 400));
      await page.waitForTimeout(400);
      log.shots.push(await shot(page, '02-conduct-all-portrait-375-scrolled.png'));
      log.checks.push({
        name: 'portrait-all-lists-periods',
        ...a,
        ok: a.hasConduct && !a.hasPickPeriodPrompt && a.periodCount >= 2 && !a.hasCombinedOnlyHint,
      });
      await context.close();
    }

    {
      const context = await browser.newContext({
        viewport: { width: 812, height: 375 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      });
      const page = await context.newPage();
      await page.goto(`${ORIGIN}${route}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await settle(page);
      const allTab = page.getByText('All', { exact: true }).first();
      if (await allTab.count()) {
        await allTab.click({ timeout: 5000 }).catch(() => undefined);
        await page.waitForTimeout(800);
      }
      const text = await page.locator('body').innerText();
      const a = analyzeBody(text);
      log.shots.push(await shot(page, '03-conduct-all-landscape-812x375.png'));
      log.checks.push({
        name: 'landscape-all-lists-periods',
        ...a,
        ok: a.hasConduct && !a.hasPickPeriodPrompt && a.periodCount >= 2 && !a.hasCombinedOnlyHint,
      });
      await context.close();
    }
  } finally {
    server.close();
    await browser.close();
  }

  log.passed = log.checks.every((c) => c.ok);
  log.failed = log.checks.filter((c) => !c.ok).map((c) => c.name);
  fs.writeFileSync(path.join(OUT, 'ui-proof-log.json'), JSON.stringify(log, null, 2));
  console.log(JSON.stringify({ passed: log.passed, failed: log.failed, out: OUT, shots: log.shots.length }));
  if (!log.passed) process.exit(1);
}

main().catch((err) => {
  console.error(String(err && err.message ? err.message : err));
  process.exit(1);
});
