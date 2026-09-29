#!/usr/bin/env node
/**
 * Scripted UI drive for kelyra-ui-loop.
 * Warms web, QA Chrome :9223, and the iOS Simulator, then writes a packet.
 * The proof agent grades the packet. It must not invent a second drive.
 *
 *   node scripts/ui-drive.mjs --surface both --persona teacher --route /inbox --out /tmp/packet.json
 *
 * Stdout is one line: PACKET <path>
 * Stderr is status codes only. Tokens and passwords are never printed.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { loadPersonas } from './ui-persona-session.mjs';

export const WEB_PORT = 8081;
export const CHROME_PORT = 9223;
const CHROME_BIN = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CHROME_DIR = path.join(
  process.env.HOME || '',
  '.hermes/profiles/chief-of-staff/runtime/kelyra-qe-chrome',
);
const LAUNCH_CHROME = path.join(
  process.env.HOME || '',
  '.hermes/profiles/chief-of-staff/scripts/launch_qe_chrome.sh',
);

export function parseArgs(argv) {
  const out = {
    surface: '',
    persona: '',
    seat: '',
    route: '/',
    click: '',
    ids: '',
    out: '',
    camera: false,
    classStack: false,
    motionVideo: '',
  };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const next = () => {
      i += 1;
      return argv[i] || '';
    };
    if (flag === '--surface') out.surface = next();
    else if (flag === '--persona') out.persona = next();
    else if (flag === '--seat') out.seat = next();
    else if (flag === '--route') out.route = next() || '/';
    else if (flag === '--click') out.click = next();
    else if (flag === '--ids') out.ids = next();
    else if (flag === '--out') out.out = next();
    else if (flag === '--motion-video') out.motionVideo = next();
    else if (flag === '--camera') out.camera = true;
    else if (flag === '--class-stack') out.classStack = true;
    else if (flag === '--') continue;
    else throw new Error(`UNKNOWN_FLAG ${flag}`);
  }
  return out;
}

export function assertArgs(args) {
  if (!['web', 'phone', 'both'].includes(args.surface)) {
    throw new Error('SURFACE_INVALID');
  }
  if (args.route !== '/' && !args.route.startsWith('/')) {
    throw new Error('ROUTE_INVALID');
  }
  if (/[\s'"`$;&|]/.test(args.route) || /['`$;&|]/.test(args.click)) {
    throw new Error('UNSAFE_FLAG');
  }
}

export function buildDriveUrl(route, port) {
  const pathName = route && route.startsWith('/') ? route : '/';
  const url = new URL(`http://127.0.0.1:${WEB_PORT}${pathName}`);
  if (port) url.searchParams.set('kelyra_persona_port', String(port));
  return url.toString();
}

/** Expo Go deep link so the sim opens the project, not mobile Safari alone. */
export function buildPhoneDriveUrl(route, port) {
  const pathName = route && route.startsWith('/') ? route : '/';
  const exp = new URL(`exp://127.0.0.1:${WEB_PORT}/--${pathName}`);
  if (port) exp.searchParams.set('kelyra_persona_port', String(port));
  return exp.toString();
}

/** Header Search clears the query and leaves the route. Never use it as the drive click. */
export function isUnsafeDriveTarget(label) {
  return /sign out|disconnect|search/i.test(String(label || '').trim());
}

/** http openurl is mobile Safari. A phone proof has to stay on the Expo deep link. */
export function classifyPhoneOpen(url) {
  const value = String(url || '');
  if (value.startsWith('exp://')) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return 'PHONE_SAFARI';
  return 'SIMULATOR_NOT_READY';
}

/**
 * A settled page can still be the wrong page.
 * Bundle overlay and a sign-in splash (when a persona was requested) are harness failures.
 */
export function classifyPageText(text, expectPersona) {
  const body = String(text || '');
  if (/unable to resolve module/i.test(body)) return 'BUNDLE_OVERLAY';
  const signedOut = /sign in/i.test(body);
  const inApp = /people|manage|assignments|inbox|messages|needs attention|desk/i.test(body);
  if (expectPersona && signedOut && !inApp) return 'PERSONA_INJECT_FAILED';
  return '';
}

/**
 * Feature-map Drive lines use bare multi-word labels:
 *   click=[aria-label=Open Capture]
 * That is not a valid CSS attribute selector (unquoted value + space).
 * Quote the value so web querySelector can find the control. Phone still
 * reads the accessible name via accessibleNameFromClick.
 */
export function normalizeClickSelector(selector) {
  const value = String(selector || '').trim();
  if (!value) return value;
  if (/aria-label\s*=\s*["']/i.test(value)) return value;
  const bare = value.match(/^\[\s*aria-label\s*=\s*([^\]]+?)\s*\]$/i);
  if (!bare) return value;
  const name = bare[1].trim();
  if (!name) return value;
  // CSS bare identifiers cannot contain spaces or quotes.
  if (/[\s"']/.test(name)) {
    return `[aria-label="${name.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`;
  }
  return `[aria-label=${name}]`;
}

/** The Drive click is a CSS attribute selector. The phone tap uses the accessible name. */
export function accessibleNameFromClick(selector) {
  const value = String(selector || '').trim();
  const double = value.match(/aria-label\s*=\s*"([^"]+)"/i);
  if (double) return double[1].trim();
  const single = value.match(/aria-label\s*=\s*'([^']+)'/i);
  if (single) return single[1].trim();
  // Bare map form may include spaces: [aria-label=Open Capture]
  const bareBracket = value.match(/aria-label\s*=\s*([^\]]+?)\s*\]/i);
  if (bareBracket) return bareBracket[1].trim();
  const bareToken = value.match(/aria-label\s*=\s*([^\s\]]+)/i);
  if (bareToken) return bareToken[1].trim();
  if (!value || value.startsWith('[') || value.startsWith('#') || value.startsWith('.')) return '';
  return value;
}

function walkAccessibility(elements, visit) {
  const stack = Array.isArray(elements) ? [...elements] : [elements];
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== 'object') continue;
    visit(node);
    for (const key of ['children', 'elements', 'nodes']) {
      if (Array.isArray(node[key])) stack.push(...node[key]);
    }
  }
}

export function accessibilitySignature(elements) {
  const rows = [];
  walkAccessibility(elements, (node) => {
    const name = String(node.AXLabel || '').trim();
    const value = String(node.AXValue ?? '');
    const frame = node.frame || {};
    if (!name && !value) return;
    rows.push([
      name,
      value,
      String(node.type || node.role || ''),
      Math.round(Number(frame.x) || 0),
      Math.round(Number(frame.y) || 0),
    ].join('|'));
  });
  rows.sort();
  return rows.join('\n');
}

export function accessibilityChanged(before, after) {
  const next = accessibilitySignature(after);
  return next !== '' && next !== accessibilitySignature(before);
}

/** Center of the enabled control whose accessible name is the Drive click. */
export function findAccessibilityPoint(elements, label) {
  const want = String(label || '').trim().toLowerCase();
  if (!want) return null;
  const matches = [];
  walkAccessibility(elements, (node) => {
    const name = String(node.AXLabel || '').trim();
    const frame = node.frame;
    if (!name || !frame || typeof frame.x !== 'number' || typeof frame.width !== 'number') return;
    const lower = name.toLowerCase();
    const named = lower === want || lower.startsWith(`${want},`) || lower.startsWith(`${want} `);
    if (!named || isUnsafeDriveTarget(name)) return;
    matches.push({
      name,
      type: String(node.type || node.role || ''),
      enabled: node.enabled !== false,
      x: frame.x + frame.width / 2,
      y: frame.y + frame.height / 2,
    });
  });
  const enabled = matches.filter((item) => item.enabled);
  const pool = enabled.length ? enabled : matches;
  const exact = pool.find((item) => item.name.toLowerCase() === want);
  const button = pool.find((item) => /button|tab/i.test(item.type) && item.name.toLowerCase() === want);
  const chosen = button || exact || pool.find((item) => /button|tab/i.test(item.type)) || pool[0];
  if (!chosen) return null;
  return { x: chosen.x, y: chosen.y, label: chosen.name };
}

export function parseTargetList(text) {
  const raw = String(text || '').trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') return [parsed];
  } catch {
    // idb list-targets --json is one target per line.
  }
  const rows = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const row = JSON.parse(trimmed);
      if (row && typeof row === 'object') rows.push(row);
    } catch {
      // A log line is not a target.
    }
  }
  return rows;
}

/** Booted simulator only. A booted physical phone is never a tap target. */
export function bootedUdid(payload) {
  const rows = Array.isArray(payload) ? payload : [];
  for (const row of rows) {
    if (String(row.type) !== 'simulator') continue;
    if (!/booted/i.test(String(row.state || ''))) continue;
    const udid = String(row.udid || '');
    if (udid) return udid;
  }
  return '';
}

const INSIDE_LABEL = /^(home|diary|calendar|desk|people|manage|assignments|messages|kelyraask|needs attention)$/i;

function accessibilityNodes(elements) {
  const nodes = [];
  walkAccessibility(elements, (node) => nodes.push(node));
  return nodes;
}

/**
 * splash-video: the intro is still playing.
 * splash-cta: one Sign in button, no fields yet. That tap reveals the form.
 * form: Email or @username and Password are on screen. The next Sign in submits.
 * inside: a tray or an office screen is up. Do not sign in again and do not sign out.
 */
export function phoneAuthState(elements) {
  const nodes = accessibilityNodes(elements);
  const label = (node) => String(node.AXLabel || '').trim();
  const value = (node) => String(node.AXValue || '').trim();
  const kind = (node) => String(node.type || node.role || '');
  const isButton = (node) => /button/i.test(kind(node));
  const isField = (node) => /textfield|text field|secure/i.test(kind(node));
  const form = nodes.some((node) => (
    /email or @username/i.test(value(node))
    || /email or @username/i.test(label(node))
    || (isField(node) && /^password$/i.test(value(node)))
  ));
  if (form) return 'form';
  const inside = nodes.some((node) => INSIDE_LABEL.test(label(node)) || /ride office/i.test(label(node)));
  if (inside) return 'inside';
  if (nodes.some((node) => isButton(node) && /^sign in$/i.test(label(node)))) return 'splash-cta';
  if (nodes.some((node) => /skip splash|tap to skip splash/i.test(label(node)))) return 'splash-video';
  return 'unknown';
}

/** Close the crash bubble. Never click Restore, which reopens old tabs. */
export function chromeRestoreDismissLabel(labels) {
  const texts = (labels || []).map((item) => String(item || '').trim()).filter(Boolean);
  const asking = texts.some((text) => /restore pages|wasn.t shut down correctly|didn.t shut down correctly/i.test(text));
  if (!asking) return '';
  const named = texts.find((text) => /^(close|no thanks|don.?t restore)$/i.test(text));
  return named || 'Close';
}

export function chromeRestoreTargetId(targets) {
  for (const target of targets || []) {
    const blob = `${target.url || ''} ${target.title || ''}`;
    if (/omnibox/i.test(blob)) continue;
    if (/restore pages|session.crash|crash-restore|wasn.t shut down correctly|didn.t shut down correctly/i.test(blob)) {
      return String(target.id || '');
    }
  }
  return '';
}

/**
 * The sign-in field accepts either an email address or an @handle.
 * An address contains @ and a dot and is typed unchanged.
 * Anything else is a handle and is typed with one leading @. Sign-in strips that @.
 * Do not turn an email into a handle, or a handle into an email.
 */
export function phoneSignInName(handle) {
  const raw = String(handle || '').trim();
  if (!raw) return '';
  if (raw.includes('@') && raw.includes('.')) return raw;
  return `@${raw.replace(/^@+/, '')}`;
}

const PASSWORD_PROMPT = /save (this )?password/i;
const DISMISS_PASSWORD = /^(not now|don'?t save|never( for this (website|app))?)$/i;

/** The iPhone save-password dialog. Returns the dismiss label, never Save. */
export function passwordPromptDismissLabel(elements) {
  const nodes = accessibilityNodes(elements);
  const textOf = (node) => `${node.AXLabel || ''} ${node.AXValue || ''} ${node.title || ''}`;
  const asking = nodes.some((node) => PASSWORD_PROMPT.test(textOf(node)));
  if (!asking) return '';
  const button = nodes.find((node) => {
    const name = String(node.AXLabel || node.AXValue || '').trim();
    return /button/i.test(String(node.type || node.role || '')) && DISMISS_PASSWORD.test(name);
  });
  if (button) return String(button.AXLabel || button.AXValue).trim();
  return 'Not Now';
}

export function phoneFieldsMatch(elements, handle, password) {
  const values = accessibilityNodes(elements)
    .filter((node) => /textfield|text field/i.test(String(node.type || node.role || '')))
    .map((node) => String(node.AXValue || ''));
  const userOk = values.some((value) => value === phoneSignInName(handle));
  const passOk = values.some((value) => value === password || (value.length === String(password || '').length && value !== 'Password' && !value.includes('@')));
  return userOk && passOk;
}

export function parseAccessibilityTree(text) {
  const raw = String(text || '').trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.elements)) return parsed.elements;
    return [];
  } catch {
    return [];
  }
}

export function redact(text) {
  return String(text || '')
    .replace(/access_token["']?\s*[:=]\s*["'][^"']+["']/gi, 'access_token=[redacted]')
    .replace(/refresh_token["']?\s*[:=]\s*["'][^"']+["']/gi, 'refresh_token=[redacted]')
    .replace(/password["']?\s*[:=]\s*["'][^"']+["']/gi, 'password=[redacted]');
}

let stopPersona = () => {};

function fail(code) {
  try {
    stopPersona();
  } catch {
    // The status line is the result. Cleanup must not hide it.
  }
  process.stderr.write(`${code}\n`);
  process.exit(2);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function run(cmd, args, { timeoutMs = 30000, cwd } = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd,
      env: {
        ...process.env,
        DEVELOPER_DIR: '/Applications/Xcode.app/Contents/Developer',
      },
    });
    let out = '';
    let err = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      resolve({ code: 2, out, err: `${err}\nTIMEOUT` });
    }, timeoutMs);
    child.stdout.on('data', (chunk) => {
      out += chunk;
    });
    child.stderr.on('data', (chunk) => {
      err += chunk;
    });
    let settled = false;
    const finish = (payload) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(payload);
    };
    child.on('error', (error) => {
      finish({ code: 127, out, err: `${err}\n${error.message}` });
    });
    child.on('close', (code) => {
      finish({ code: code ?? 1, out, err });
    });
  });
}

function httpRequest(method, url, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const req = http.request(url, { method, timeout: timeoutMs }, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => resolve({ ok: res.statusCode === 200, body }));
    });
    req.on('error', () => resolve({ ok: false, body: '' }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, body: '' });
    });
    req.end();
  });
}

async function ensureWeb(repo) {
  const ready = await httpRequest('GET', `http://127.0.0.1:${WEB_PORT}/`);
  if (ready.ok) {
    process.stderr.write('WEB_READY\n');
    return;
  }
  const child = spawn('npm', ['run', 'web'], {
    cwd: repo,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  const start = Date.now();
  while (Date.now() - start < 45000) {
    const again = await httpRequest('GET', `http://127.0.0.1:${WEB_PORT}/`);
    if (again.ok) {
      process.stderr.write('WEB_READY\n');
      return;
    }
    await sleep(500);
  }
  fail('WEB_NOT_READY');
}

function markChromeExitedCleanly() {
  const prefs = path.join(CHROME_DIR, 'Default', 'Preferences');
  if (!fs.existsSync(prefs)) return;
  try {
    const data = JSON.parse(fs.readFileSync(prefs, 'utf8'));
    const profile = data.profile && typeof data.profile === 'object' ? data.profile : {};
    profile.exit_type = 'Normal';
    profile.exited_cleanly = true;
    data.profile = profile;
    fs.writeFileSync(prefs, JSON.stringify(data));
  } catch {
    // A locked Preferences file must not block the drive.
  }
}

async function dismissChromeRestore() {
  const list = await httpRequest('GET', `http://127.0.0.1:${CHROME_PORT}/json/list`);
  let targets = [];
  try {
    const parsed = JSON.parse(list.body || '[]');
    targets = Array.isArray(parsed) ? parsed : [];
  } catch {
    targets = [];
  }
  const targetId = chromeRestoreTargetId(targets);
  if (targetId) {
    await httpRequest('GET', `http://127.0.0.1:${CHROME_PORT}/json/close/${targetId}`);
    process.stderr.write('CHROME_RESTORE_DISMISSED\n');
    return;
  }
  const pidLine = await run('bash', ['-lc', `lsof -nP -iTCP:${CHROME_PORT} -sTCP:LISTEN -t | head -1`], { timeoutMs: 5000 });
  const pid = String(pidLine.out || '').trim();
  if (!/^\d+$/.test(pid)) return;
  const script = [
    'tell application "System Events"',
    `set procs to every process whose unix id is ${pid}`,
    'if (count of procs) is 0 then return "NONE"',
    'tell item 1 of procs',
    'repeat with w in windows',
    'set blob to ""',
    'try',
    'set blob to name of w as text',
    'end try',
    'try',
    'repeat with t in static texts of w',
    'set blob to blob & " " & (name of t as text)',
    'end repeat',
    'end try',
    'if blob contains "Restore pages" or blob contains "shut down correctly" then',
    'repeat with b in buttons of w',
    'set n to ""',
    'try',
    'set n to name of b as text',
    'end try',
    'if n is "Close" or n is "No thanks" or n is "Don\'t restore" then',
    'click b',
    'return "DISMISSED"',
    'end if',
    'end repeat',
    'end if',
    'end repeat',
    'end tell',
    'end tell',
    'return "NONE"',
  ].join('\n');
  const dismissed = await run('osascript', ['-e', script], { timeoutMs: 8000 });
  if (String(dismissed.out || '').includes('DISMISSED')) {
    process.stderr.write('CHROME_RESTORE_DISMISSED\n');
  }
}

async function ensureChrome() {
  const list = await httpRequest('GET', `http://127.0.0.1:${CHROME_PORT}/json/list`);
  if (list.ok) {
    await dismissChromeRestore();
    process.stderr.write('CHROME_READY\n');
    return;
  }
  markChromeExitedCleanly();
  if (fs.existsSync(LAUNCH_CHROME)) {
    const launched = await run('bash', [LAUNCH_CHROME, String(CHROME_PORT)], { timeoutMs: 20000 });
    if (launched.code === 0) {
      process.stderr.write('CHROME_READY\n');
      return;
    }
  }
  if (!fs.existsSync(CHROME_BIN)) fail('CHROME_NOT_READY');
  fs.mkdirSync(CHROME_DIR, { recursive: true });
  const child = spawn(
    CHROME_BIN,
    [
      `--remote-debugging-port=${CHROME_PORT}`,
      `--user-data-dir=${CHROME_DIR}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--hide-crash-restore-bubble',
      '--disable-session-crashed-bubble',
      'about:blank',
    ],
    { detached: true, stdio: 'ignore' },
  );
  child.unref();
  const start = Date.now();
  while (Date.now() - start < 20000) {
    const again = await httpRequest('GET', `http://127.0.0.1:${CHROME_PORT}/json/list`);
    if (again.ok) {
      process.stderr.write('CHROME_READY\n');
      return;
    }
    await sleep(400);
  }
  fail('CHROME_NOT_READY');
}

async function ensureSimulator(repo) {
  const result = await run('bash', ['scripts/boot-ios-simulator.sh'], {
    cwd: repo,
    timeoutMs: 100000,
  });
  if (result.code !== 0) fail('SIMULATOR_NOT_READY');
  process.stderr.write('SIM_READY\n');
}

function startPersona(repo, persona, seat) {
  const args = ['scripts/ui-persona-session.mjs', '--persona', persona];
  if (seat) args.push('--seat', seat);
  const child = spawn('node', args, { cwd: repo });
  let out = '';
  child.stdout.on('data', (chunk) => {
    out += chunk;
  });
  child.stderr.on('data', () => {});
  return {
    child,
    ready() {
      const match = out.match(/INJECT_PORT=(\d+)/);
      return match ? Number(match[1]) : 0;
    },
  };
}

async function personaPort(repo, persona, seat) {
  if (!persona) return 0;
  const session = startPersona(repo, persona, seat);
  const start = Date.now();
  while (Date.now() - start < 60000) {
    const port = session.ready();
    if (port) {
      process.stderr.write('PERSONA_READY\n');
      const stop = () => session.child.kill('SIGTERM');
      stopPersona = stop;
      return { port, stop };
    }
    if (session.child.exitCode != null) break;
    await sleep(200);
  }
  session.child.kill('SIGTERM');
  fail('PERSONA_NOT_READY');
  return { port: 0, stop() {} };
}

function connectCdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (!msg.id || !pending.has(msg.id)) return;
    const { resolve, reject, timer } = pending.get(msg.id);
    clearTimeout(timer);
    pending.delete(msg.id);
    if (msg.error) reject(new Error('CDP_FAILED'));
    else resolve(msg.result);
  });
  const opened = new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', () => reject(new Error('CDP_FAILED')));
  });
  return {
    opened,
    send(method, params, timeoutMs = 20000) {
      const n = ++id;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(n);
          reject(new Error('CDP_TIMEOUT'));
        }, timeoutMs);
        pending.set(n, { resolve, reject, timer });
        ws.send(JSON.stringify({ id: n, method, params }));
      });
    },
    close() {
      ws.close();
    },
  };
}

async function openTab() {
  let created = await httpRequest('GET', `http://127.0.0.1:${CHROME_PORT}/json/new?about:blank`);
  if (!created.ok) {
    created = await httpRequest('PUT', `http://127.0.0.1:${CHROME_PORT}/json/new?about:blank`);
  }
  if (!created.ok) fail('CHROME_NOT_READY');
  const target = JSON.parse(created.body);
  if (!target.webSocketDebuggerUrl) fail('CHROME_NOT_READY');
  return target.webSocketDebuggerUrl;
}

async function waitInject(send, expectInject) {
  const start = Date.now();
  while (Date.now() - start < 20000) {
    const ev = await send('Runtime.evaluate', {
      expression:
        'JSON.stringify({flag: window.__kelyraPersonaInject || "", title: document.title || "", href: location.href || ""})',
      returnByValue: true,
    });
    let state = { flag: '', title: '', href: '' };
    try {
      state = JSON.parse(ev?.result?.value || '{}');
    } catch {
      state = { flag: '', title: '', href: '' };
    }
    if (expectInject && state.flag === 'ok') return state;
    if (expectInject && state.flag === 'fail') fail('PERSONA_INJECT_FAILED');
    if (!expectInject && (state.title || String(state.href).includes('8081'))) return state;
    await sleep(400);
  }
  fail(expectInject ? 'PERSONA_NOT_READY' : 'WEB_NOT_READY');
  return { title: '', href: '' };
}

/** True when the page has left Soft Working K and shows route content. */
async function waitRouteSettled(send, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ev = await send('Runtime.evaluate', {
      expression: `(() => {
        const text = document.body?.innerText || '';
        if (!text) return false;
        const lines = text.split('\\n').map((l) => l.trim()).filter(Boolean);
        const onlyWorking = lines.length > 0 && lines.every((l) => /^Working\\.?$/i.test(l) || /Messages|Search|Open menu|Desk|Needs|Diary|Calendar|Kelyra|Alerts/i.test(l));
        const hasWorkingLine = lines.some((l) => /^Working\\.?$/i.test(l));
        const hasRow = lines.some((l) =>
          /Unread\\.|No messages|No matches|Favorite|Taylor|Jacquee|Staff|Parents|Students|To:/i.test(l),
        );
        if (hasRow) return true;
        if (hasWorkingLine && onlyWorking) return false;
        if (!hasWorkingLine && lines.length >= 6) return true;
        return false;
      })()`,
      returnByValue: true,
    });
    if (ev?.result?.value) return true;
    await sleep(400);
  }
  return false;
}

async function shot(send, file) {
  const result = await send('Page.captureScreenshot', { format: 'png' });
  if (!result?.data) fail('SCREENSHOT_FAILED');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(result.data, 'base64'));
  return file;
}

async function click(send, selector) {
  // Normalize bare multi-word aria-label so querySelector is valid CSS.
  const want = normalizeClickSelector(selector || '');
  const byName = accessibleNameFromClick(selector || '');
  const expression = `(() => {
    const want = ${JSON.stringify(want)};
    const byName = ${JSON.stringify(byName)};
    const here = location.pathname;
    const labelOf = (node) => ((node.innerText || node.getAttribute('aria-label') || node.getAttribute('placeholder') || '')).trim();
    const skip = /sign out|disconnect|search/i;
    const leaves = (node) => {
      if (node.tagName !== 'A') return false;
      const href = node.getAttribute('href') || '';
      if (!href || href === '#' || href.startsWith('#')) return false;
      try {
        const path = new URL(href, location.origin).pathname;
        return path !== here;
      } catch {
        return true;
      }
    };
    const usable = (node) => node && !skip.test(labelOf(node)) && !leaves(node);
    if (!want && !byName) return 'missing';
    let el = null;
    if (want) {
      try {
        el = document.querySelector(want);
      } catch {
        el = null;
      }
    }
    if (!usable(el) && byName) {
      // Fallback: exact aria-label match (RN Web Pressable / role=button).
      const nodes = document.querySelectorAll('[aria-label], button, [role="button"]');
      for (const node of nodes) {
        const label = (node.getAttribute('aria-label') || '').trim();
        if (label === byName && usable(node)) {
          el = node;
          break;
        }
      }
    }
    if (!usable(el)) return 'missing';
    const before = location.pathname + ' ' + labelOf(el);
    el.click();
    return before;
  })()`;
  const ev = await send('Runtime.evaluate', { expression, returnByValue: true });
  return String(ev?.result?.value || 'missing');
}

async function driveWeb(url, args, dir, expectInject) {
  const wsUrl = await openTab();
  const cdp = connectCdp(wsUrl);
  await cdp.opened;
  await cdp.send('Page.enable');
  await dismissChromeRestore();
  await cdp.send('Page.navigate', { url });
  const before = await waitInject(cdp.send, expectInject);
  // A splash shot is not an acceptance failure. Fail the drive so the grader
  // does not send an implementer to "fix" Working...
  const assertPage = async () => {
    const bodyEv = await cdp.send('Runtime.evaluate', {
      expression: 'document.body?.innerText || ""',
      returnByValue: true,
    });
    const pageStatus = classifyPageText(bodyEv?.result?.value, expectInject);
    if (pageStatus) {
      cdp.close();
      fail(pageStatus);
    }
  };
  const settled = await waitRouteSettled(cdp.send, expectInject ? 20000 : 8000);
  if (!settled) fail('ROUTE_NOT_SETTLED');
  await assertPage();
  const widths = [];
  for (const [width, height] of [
    [390, 844],
    [1280, 800],
  ]) {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 720,
    });
    // Resize remounts the route. Do not shoot until the tray is back.
    const resized = await waitRouteSettled(cdp.send, 12000);
    if (!resized) fail('ROUTE_NOT_SETTLED');
    await assertPage();
    const file = path.join(dir, `web-${width}.png`);
    await shot(cdp.send, file);
    widths.push({ width, screenshot: file, url });
  }
  if (!args.click) fail('INTERACTION_MISSING');
  await dismissChromeRestore();
  const clicked = await click(cdp.send, args.click);
  if (clicked === 'missing') {
    cdp.close();
    fail('INTERACTION_MISSING');
  }
  await sleep(400);
  const after = await cdp.send('Runtime.evaluate', {
    expression: 'location.pathname',
    returnByValue: true,
  });
  const afterPath = String(after?.result?.value || '');
  const routePath = new URL(url).pathname;
  if (afterPath && afterPath !== routePath) {
    // Search (and any other leaving control) must not be the proof screen.
    await cdp.send('Page.navigate', { url: url.split('?')[0] });
    const back = await waitRouteSettled(cdp.send, 12000);
    if (!back) fail('ROUTE_NOT_SETTLED');
  }
  const afterEval = await cdp.send('Runtime.evaluate', {
    expression: 'JSON.stringify({title: document.title || "", href: location.pathname || ""})',
    returnByValue: true,
  });
  let afterState = { title: '', href: afterPath };
  try {
    afterState = JSON.parse(afterEval?.result?.value || '{}');
  } catch {
    afterState = { title: '', href: afterPath };
  }
  const afterFile = path.join(dir, 'web-after.png');
  await shot(cdp.send, afterFile);
  cdp.close();
  return {
    widths,
    interaction: {
      did: true,
      from_state: String(before.title || before.href || 'before').slice(0, 180),
      to_state: String(afterState.title || afterState.href || 'after').slice(0, 180),
    },
  };
}

async function idb(args) {
  const result = await run('idb', args, { timeoutMs: 25000 });
  if (result.code === 127 || /ENOENT|not found/i.test(result.err)) fail('PHONE_TAP_TOOL_MISSING');
  return result;
}

async function bootedSimulatorUdid() {
  const listed = await idb(['list-targets', '--json']);
  if (listed.code !== 0) fail('SIMULATOR_NOT_READY');
  const udid = bootedUdid(parseTargetList(listed.out));
  if (!udid) fail('SIMULATOR_NOT_READY');
  return udid;
}

async function phoneTree(udid, api = '') {
  const args = ['ui', 'describe-all', '--udid', udid, '--json', '--nested'];
  if (api) args.push('--api', api);
  const described = await idb(args);
  if (described.code !== 0) {
    if (!api) fail('PHONE_TAP_TOOL_MISSING');
    return [];
  }
  return parseAccessibilityTree(described.out);
}

async function tapMarker(udid, key, marker) {
  return idb([
    'ui',
    'tap',
    '--udid',
    udid,
    '--match-key',
    key,
    '--ignore-case',
    '--api',
    'ax',
    marker,
  ]);
}

async function waitPhoneAuth(udid) {
  const start = Date.now();
  let state = 'unknown';
  while (Date.now() - start < 15000) {
    state = phoneAuthState(await phoneTree(udid));
    process.stderr.write(`PHONE_AUTH ${state}\n`);
    if (state !== 'unknown') return state;
    await sleep(1000);
  }
  return state;
}

async function ensurePhoneSession(udid, personaName) {
  if (!personaName) return;
  const creds = loadPersonas()[personaName];
  if (!creds?.handle || !creds?.password) fail('PERSONA_MISSING');
  let state = await waitPhoneAuth(udid);
  if (state === 'inside') return;
  if (state === 'splash-video') {
    const skipped = await tapMarker(udid, 'AXLabel', 'Skip splash');
    if (skipped.code !== 0) fail('PHONE_SIGN_IN_FAILED');
    await sleep(1500);
    state = await waitPhoneAuth(udid);
  }
  if (state === 'inside') return;
  if (state === 'splash-cta') {
    // First Sign in reveals the fields. It does not submit.
    const revealed = await tapMarker(udid, 'AXLabel', 'Sign in');
    if (revealed.code !== 0) fail('PHONE_SIGN_IN_FAILED');
    await sleep(1000);
    state = await waitPhoneAuth(udid);
  }
  if (state === 'inside') return;
  if (state !== 'form') fail('PHONE_SIGN_IN_FAILED');
  const signInName = phoneSignInName(creds.handle);
  const userSet = await idb([
    'ui', 'set-value', '--udid', udid,
    '--match-key', 'AXValue', '--ignore-case', '--api', 'ax',
    '--value', signInName,
    'Email or @username',
  ]);
  if (userSet.code !== 0) fail('PHONE_SIGN_IN_FAILED');
  const passSet = await idb([
    'ui', 'set-value', '--udid', udid,
    '--match-key', 'AXValue', '--ignore-case', '--api', 'ax',
    '--value', creds.password,
    'Password',
  ]);
  if (passSet.code !== 0) fail('PHONE_SIGN_IN_FAILED');
  await sleep(400);
  if (!phoneFieldsMatch(await phoneTree(udid), creds.handle, creds.password)) {
    process.stderr.write('PHONE_AUTH username_missing_at\n');
    fail('PHONE_SIGN_IN_FAILED');
  }
  // Second Sign in submits. One submit. Do not tap it again and do not sign out.
  const submitted = await tapMarker(udid, 'AXLabel', 'Sign in');
  if (submitted.code !== 0) fail('PHONE_SIGN_IN_FAILED');
  await sleep(5000);
  if (phoneAuthState(await phoneTree(udid)) !== 'inside') fail('PHONE_SIGN_IN_FAILED');
  await dismissSavePassword(udid);
}

async function dismissSavePassword(udid) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const trees = [await phoneTree(udid), await phoneTree(udid, 'axbridge')];
    const label = trees.map((tree) => passwordPromptDismissLabel(tree)).find(Boolean) || '';
    if (!label) {
      if (attempt >= 1 && phoneAuthState(trees[0]) === 'inside') return;
      await sleep(500);
      continue;
    }
    process.stderr.write('PHONE_AUTH save_password\n');
    const dismissed = await idb([
      'ui', 'tap', '--udid', udid,
      '--match-key', 'AXLabel', '--ignore-case', '--api', 'axbridge',
      label,
    ]);
    if (dismissed.code !== 0) {
      const point = findAccessibilityPoint(trees[1].length ? trees[1] : trees[0], label);
      if (!point) return;
      await idb([
        'ui', 'tap', '--udid', udid, '--api', 'hid',
        String(Math.round(point.x)), String(Math.round(point.y)),
      ]);
    }
    await sleep(600);
    return;
  }
}

async function drivePhone(repo, url, dir, click, personaName) {
  const label = accessibleNameFromClick(click);
  if (!label || isUnsafeDriveTarget(label)) fail('INTERACTION_MISSING');
  const before = path.join(dir, 'phone-before.png');
  const after = path.join(dir, 'phone.png');
  fs.mkdirSync(dir, { recursive: true });
  await run('xcrun', ['simctl', 'io', 'booted', 'screenshot', before], { timeoutMs: 20000 });
  // Expo Go only. An http URL opens Safari and is not a phone proof.
  const expoUrl = url.startsWith('exp://')
    ? url
    : url.replace(/^http:\/\/127\.0\.0\.1:8081/, 'exp://127.0.0.1:8081/--');
  const opened = await run('xcrun', ['simctl', 'openurl', 'booted', expoUrl], { timeoutMs: 15000 });
  if (opened.code !== 0) fail('SIMULATOR_NOT_READY');
  const phoneClass = classifyPhoneOpen(expoUrl);
  if (phoneClass) fail(phoneClass);
  const openedUrl = expoUrl;
  // Persona inject + listThreads need settle time on a cold sim open.
  await sleep(12000);
  const udid = await bootedSimulatorUdid();
  await ensurePhoneSession(udid, personaName);
  await dismissSavePassword(udid);
  const beforeTree = await phoneTree(udid);
  const point = findAccessibilityPoint(beforeTree, label);
  if (!point) fail('INTERACTION_MISSING');
  const tapped = await idb([
    'ui',
    'tap',
    '--udid',
    udid,
    '--match-key',
    'AXLabel',
    '--ignore-case',
    '--api',
    'ax',
    point.label,
  ]);
  if (tapped.code !== 0) {
    const touched = await idb([
      'ui',
      'tap',
      '--udid',
      udid,
      '--api',
      'hid',
      String(Math.round(point.x)),
      String(Math.round(point.y)),
    ]);
    if (touched.code !== 0) fail('INTERACTION_MISSING');
  }
  await sleep(1500);
  await dismissSavePassword(udid);
  const afterTree = await phoneTree(udid);
  if (!accessibilityChanged(beforeTree, afterTree)) fail('PHONE_TAP_UNCHANGED');
  await run('xcrun', ['simctl', 'io', 'booted', 'screenshot', after], {
    timeoutMs: 30000,
  });
  if (!fs.existsSync(after)) {
    await sleep(2000);
    await run('xcrun', ['simctl', 'io', 'booted', 'screenshot', after], { timeoutMs: 30000 });
  }
  if (!fs.existsSync(after)) fail('SCREENSHOT_FAILED');
  return {
    ran: true,
    screenshot: after,
    evidence: `Tapped ${point.label} on Expo Go ${openedUrl}. The accessibility tree changed. Not USB. Not Safari.`,
    interaction: {
      did: true,
      from_state: point.label,
      to_state: `tapped ${point.label}`,
    },
  };
}

async function optionalScript(repo, enabled, relative, missing) {
  if (!enabled) return;
  const script = path.join(repo, relative);
  if (!fs.existsSync(script)) fail(missing);
  const runner = relative.endsWith('.mjs') ? 'node' : 'bash';
  const result = await run(runner, [relative], { cwd: repo, timeoutMs: 120000 });
  if (result.code !== 0) fail(missing);
}

async function recordMotion(repo, url, video) {
  const started = await run('bash', ['scripts/record-ui-motion.sh', 'start', video], {
    cwd: repo,
    timeoutMs: 20000,
  });
  if (started.code !== 0) fail('MOTION_NOT_WRITTEN');
  await run('xcrun', ['simctl', 'openurl', 'booted', url], { timeoutMs: 20000 });
  await sleep(3000);
  await run('bash', ['scripts/record-ui-motion.sh', 'stop'], { cwd: repo, timeoutMs: 20000 });
  await sleep(500);
  if (!fs.existsSync(video) || fs.statSync(video).size < 1000) fail('MOTION_NOT_WRITTEN');
}

export async function drive(args, repo = process.cwd()) {
  assertArgs(args);
  const needChrome = args.surface === 'web' || args.surface === 'both';
  const needPhone = args.surface === 'phone' || args.surface === 'both' || Boolean(args.motionVideo);
  const warm = [ensureWeb(repo)];
  if (needChrome) warm.push(ensureChrome());
  if (needPhone) warm.push(ensureSimulator(repo));
  await Promise.all(warm);
  const persona = args.persona ? await personaPort(repo, args.persona, args.seat) : { port: 0, stop() {} };
  try {
    const url = buildDriveUrl(args.route, persona.port);
    const dir = args.out.replace(/\.json$/, '');
    fs.mkdirSync(dir, { recursive: true });
    let widths = [];
    let interaction = { did: false, from_state: '', to_state: '' };
    if (needChrome) {
      const web = await driveWeb(url, args, dir, Boolean(persona.port));
      widths = web.widths;
      interaction = web.interaction;
    }
    let phone = { ran: false, screenshot: '', evidence: '' };
    if (args.surface === 'phone' || args.surface === 'both') {
      const phoneUrl = buildPhoneDriveUrl(args.route, persona.port);
      const shotPhone = await drivePhone(repo, phoneUrl, dir, args.click, args.persona);
      phone = {
        ran: shotPhone.ran,
        screenshot: shotPhone.screenshot,
        evidence: shotPhone.evidence,
      };
      if (!needChrome) interaction = shotPhone.interaction;
    }
    await optionalScript(repo, args.camera, 'scripts/prove-fl05-camera.mjs', 'CAMERA_SCRIPT_MISSING');
    await optionalScript(repo, args.classStack, 'scripts/prove-fl05-phone.sh', 'CLASS_STACK_SCRIPT_MISSING');
    let motion = { required: false, video: '', note: '' };
    if (args.motionVideo) {
      await recordMotion(repo, url, args.motionVideo);
      motion = { required: true, video: args.motionVideo, note: 'recorded' };
    }
    const packet = {
      surface: args.surface,
      drive_ran: true,
      widths,
      interaction,
      phone,
      motion,
      acceptance: [],
    };
    fs.writeFileSync(args.out, JSON.stringify(packet, null, 2));
    process.stdout.write(`PACKET ${args.out}\n`);
    return packet;
  } finally {
    persona.stop();
  }
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
    if (!args.out) args.out = '/tmp/kelyra-ui-drive-packet.json';
    assertArgs(args);
  } catch (err) {
    fail(err instanceof Error ? err.message : 'ARGS_INVALID');
  }
  try {
    await drive(args);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'DRIVE_FAILED';
    if (message.startsWith('PERSONA_') || message.startsWith('SIMULATOR_') || message.startsWith('WEB_') || message.startsWith('CHROME_') || message.startsWith('SCREENSHOT_') || message.startsWith('INTERACTION_') || message.startsWith('MOTION_') || message.startsWith('CAMERA_') || message.startsWith('CLASS_') || message.startsWith('CDP_') || message.startsWith('PHONE_')) {
      fail(message);
    }
    fail('DRIVE_FAILED');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
