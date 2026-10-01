#!/usr/bin/env node
/**
 * Run the scripted setup-interview conversations against the DEV
 * `setup-interview` edge function (LLM extraction), then check the saved
 * settings match expectations — same driver as simulatedConversations.test.ts.
 *
 *   node --experimental-strip-types scripts/sim-setup-interview-llm.ts [--out dir]
 *
 * Needs .env EXPO_PUBLIC_SUPABASE_URL / ANON_KEY and ~/.kelyra/ui-personas.json
 * (teacher, office). Never prints secrets. Draft-only: the edge never publishes.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildExtractionPrompt, mergeExtractions, parseExtractionResponse } from '../src/lib/interview/extract.ts';
import { getNode } from '../src/lib/interview/graph.ts';
import { SIM_CONVERSATIONS, runConversation, type Extractor } from '../src/lib/interview/simConversations.ts';
import type { ExtractionResult } from '../src/lib/interview/types.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv(): Record<string, string> {
  const out: Record<string, string> = { ...(process.env as Record<string, string>) };
  const p = path.join(ROOT, '.env');
  if (fs.existsSync(p)) {
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let v = m[2]!.trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!out[m[1]!]) out[m[1]!] = v;
    }
  }
  return out;
}

async function signIn(url: string, anon: string, name: string): Promise<string> {
  const raw = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.kelyra', 'ui-personas.json'), 'utf8'));
  const row = raw[name];
  if (!row?.handle || !row?.password) throw new Error(`persona ${name} missing`);
  const res = await fetch(`${url}/functions/v1/sign-in-handle`, {
    method: 'POST',
    headers: { apikey: anon, Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ handle: row.handle, password: row.password }),
  });
  const j = (await res.json().catch(() => null)) as { access_token?: string } | null;
  if (!res.ok || !j?.access_token) throw new Error(`sign-in failed for ${name} (${res.status})`);
  return j.access_token;
}

async function rest(url: string, anon: string, token: string, pathQ: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(`${url}${pathQ}`, {
    ...init,
    headers: { apikey: anon, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  return res.json();
}

async function main() {
  const outDir = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1]! : '/tmp/gb-ask-setup/llm-sim';
  fs.mkdirSync(outDir, { recursive: true });
  const env = loadEnv();
  const url = String(env.EXPO_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || '').replace(/\/$/, '');
  const anon = String(env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '');
  if (!url || !anon) throw new Error('missing EXPO_PUBLIC_SUPABASE_URL / ANON_KEY');
  const teacher = await signIn(url, anon, 'teacher');
  const office = await signIn(url, anon, 'office');
  const user = (await rest(url, anon, teacher, '/auth/v1/user')) as { id?: string };
  const rows = (await rest(url, anon, teacher, `/rest/v1/class_teachers?select=class_id&teacher_id=eq.${user.id}&limit=1`)) as Array<{ class_id: string }>;
  const classId = rows[0]?.class_id;
  const schoolId = (await rest(url, anon, office, '/rest/v1/rpc/my_school_id', { method: 'POST', body: '{}' })) as string;
  if (!classId || typeof schoolId !== 'string') throw new Error('could not resolve teacher class / office school');

  const calls: Array<{ conv: string; node: string | null; text: string; mode: string; error?: string; slots: unknown }> = [];
  const make = (conv: string, wizard: 'school' | 'syllabus'): Extractor => async (session, text) => {
    const pending = session.pending_node ? getNode(session.wizard, session.pending_node) : null;
    const res = await fetch(`${url}/functions/v1/setup-interview`, {
      method: 'POST',
      headers: { apikey: anon, Authorization: `Bearer ${wizard === 'school' ? office : teacher}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: wizard,
        classId: wizard === 'syllabus' ? classId : undefined,
        schoolId: wizard === 'school' ? schoolId : undefined,
        userText: text,
        session: { ...session, transcript: [], draft: {} },
        prompt: buildExtractionPrompt(session, text, pending),
      }),
    });
    const j = (await res.json().catch(() => ({}))) as { mode?: string; extraction?: unknown; error?: string };
    const model = parseExtractionResponse(j.extraction ?? {}, wizard);
    calls.push({ conv, node: session.pending_node, text, mode: j.mode ?? `http_${res.status}`, error: j.error ? String(j.error).slice(0, 200) : undefined, slots: model.slots });
    // Same merge as InterviewScreen.
    const merged: ExtractionResult = mergeExtractions(session, text, model);
    await new Promise((r) => setTimeout(r, 400));
    return merged;
  };

  const results = [];
  for (const conv of SIM_CONVERSATIONS) {
    const r = await runConversation(conv, make(conv.name, conv.wizard));
    results.push({ name: r.name, pass: r.errors.length === 0, errors: r.errors, transcript: r.transcript, saved: r.saved });
    console.log(`${r.errors.length ? 'FAIL' : 'PASS'}  ${r.name}${r.errors.length ? `\n   - ${r.errors.join('\n   - ')}` : ''}`);
  }
  const modelCalls = calls.filter((c) => c.mode === 'model').length;
  console.log(`model turns: ${modelCalls}/${calls.length} (others fell back: ${[...new Set(calls.filter((c) => c.mode !== 'model').map((c) => c.mode))].join(', ') || 'none'})`);
  fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify({ results, calls }, null, 2));
  console.log(`wrote ${path.join(outDir, 'results.json')}`);
  if (results.some((r) => !r.pass)) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
