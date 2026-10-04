/**
 * Shared eval plumbing: pick the AI target (Edge vs local ai:dev), sign in a persona,
 * and time every call so scorecards carry latency next to accuracy.
 *
 *   EVAL_TARGET=edge   → https://<project>.supabase.co/functions/v1/<fn>   (default)
 *   EVAL_TARGET=dev    → AI_DEV_URL / EXPO_PUBLIC_AI_DEV_URL / http://127.0.0.1:8787
 *
 * Old per-script vars (ANSKEY_AI_URL, AI_DEV_URL) still win when EVAL_TARGET is unset, so
 * earlier ai:dev runs stay reproducible.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export function loadEvalEnv() {
  const envPath = path.join(ROOT, '.env');
  const out = { ...process.env };
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!out[m[1]]) out[m[1]] = v;
    }
  }
  return out;
}

/**
 * @param {Record<string,string|undefined>} env
 * @param {{ legacyUrl?: string }} [opts] per-script override URL (kept for old runs)
 * @returns {{ kind: 'edge'|'dev', base: string, label: string }}
 */
export function resolveAiTarget(env, opts = {}) {
  const want = String(env.EVAL_TARGET || process.env.EVAL_TARGET || '').trim().toLowerCase();
  const supabaseUrl = String(env.EXPO_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || '').replace(/\/$/, '');
  const devUrl = String(
    opts.legacyUrl || env.AI_DEV_URL || env.EXPO_PUBLIC_AI_DEV_URL || 'http://127.0.0.1:8787',
  ).replace(/\/$/, '');
  if (want === 'dev' || want === 'ai-dev' || want === 'local') {
    return { kind: 'dev', base: devUrl, label: `ai:dev ${devUrl}` };
  }
  if (!supabaseUrl) throw new Error('EVAL_TARGET=edge needs EXPO_PUBLIC_SUPABASE_URL in .env');
  return { kind: 'edge', base: `${supabaseUrl}/functions/v1`, label: `edge ${supabaseUrl}` };
}

export function loadPersona(name) {
  const file = path.join(os.homedir(), '.kelyra', 'ui-personas.json');
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const row = raw[name];
  if (!row?.handle || !row?.password) throw new Error(`persona ${name} missing`);
  return { handle: String(row.handle), password: String(row.password) };
}

/** Sign in through sign-in-handle; returns { access_token, refresh_token, url, anon }. */
export async function signInPersona(env, personaName = 'teacher') {
  const url = String(env.EXPO_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || '').replace(/\/$/, '');
  const anon = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('missing EXPO_PUBLIC_SUPABASE_URL or ANON_KEY');
  const persona = loadPersona(personaName);
  const res = await fetch(`${url}/functions/v1/sign-in-handle`, {
    method: 'POST',
    headers: { apikey: anon, Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ handle: persona.handle, password: persona.password }),
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.access_token) {
    throw new Error(`sign-in failed for ${personaName}: ${res.status} ${payload?.error ?? ''}`);
  }
  return { access_token: payload.access_token, refresh_token: payload.refresh_token, url, anon };
}

export function isQuotaError(text) {
  return /RESOURCE_EXHAUSTED|PerDay|quota|429/i.test(String(text ?? ''));
}

/** Gemini free-tier daily cap (not a per-minute blip): retrying only burns the day. */
export function isDailyQuotaError(text) {
  return /PerDay|per day|daily/i.test(String(text ?? ''));
}

/**
 * POST one AI function on the chosen target and time it.
 * @returns {Promise<{ ok: boolean, status: number, json: any, latencyMs: number, target: string }>}
 */
export async function callAi(target, fn, body, auth, opts = {}) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${auth.access_token}`,
  };
  if (target.kind === 'edge' && auth.anon) headers.apikey = auth.anon;
  const t0 = performance.now();
  let status = 0;
  let json = null;
  try {
    const res = await fetch(`${target.base}/${fn}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: opts.timeoutMs ? AbortSignal.timeout(opts.timeoutMs) : undefined,
    });
    status = res.status;
    const text = await res.text();
    try {
      json = JSON.parse(text);
    } catch {
      json = { error: text.slice(0, 500) || `HTTP ${status}` };
    }
  } catch (err) {
    json = { error: err instanceof Error ? err.message : String(err) };
  }
  const latencyMs = Math.round(performance.now() - t0);
  const ok = status >= 200 && status < 300 && !json?.error;
  return { ok, status, json, latencyMs, target: target.kind };
}

/** p50 / p90 / mean / max over latencies (ms). Null when empty. */
export function latencyStats(values) {
  const xs = values.filter((v) => typeof v === 'number' && Number.isFinite(v)).sort((a, b) => a - b);
  if (!xs.length) return null;
  const pick = (q) => xs[Math.min(xs.length - 1, Math.floor(q * xs.length))];
  const mean = Math.round(xs.reduce((s, v) => s + v, 0) / xs.length);
  return { n: xs.length, p50: pick(0.5), p90: pick(0.9), mean, max: xs[xs.length - 1] };
}

/** Walk a run dir of result JSON files and collect every latencyMs (top-level or nested). */
export function collectLatencies(runDir) {
  const out = [];
  if (!fs.existsSync(runDir)) return out;
  const visit = (v) => {
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v)) return v.forEach(visit);
    if (typeof v.latencyMs === 'number') out.push(v.latencyMs);
    for (const [k, child] of Object.entries(v)) if (k !== 'latencyMs') visit(child);
  };
  for (const f of fs.readdirSync(runDir)) {
    if (!f.endsWith('.json') || f === 'score.json' || f === 'meta.json') continue;
    try {
      visit(JSON.parse(fs.readFileSync(path.join(runDir, f), 'utf8')));
    } catch {
      // skip unreadable result
    }
  }
  return out;
}
