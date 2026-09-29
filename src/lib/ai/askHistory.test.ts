/**
 * AC-DUAL-ASK-4 — seat-scoped Ask transcript helpers + RPC wiring.
 * Pure mapping asserted from source (askHistory imports @/ which node --test cannot resolve).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

test('AC-DUAL-ASK-4 askSeatFromChromeRole maps chrome seat, not job-of-record', () => {
  const hist = read('src/lib/ai/askHistory.ts');
  assert.match(hist, /export type AskTranscriptSeat = 'teacher' \| 'parent' \| 'office' \| 'student'/);
  assert.match(hist, /if \(role === 'parent'\) return 'parent'/);
  assert.match(hist, /if \(role === 'teacher'\) return 'teacher'/);
  assert.match(hist, /if \(role === 'student'\) return 'student'/);
  assert.match(hist, /role === 'superintendent' \|\| role === 'administrator'\) return 'office'/);
});

test('AC-DUAL-ASK-2 isTeacherAskHref blocks teacher desk routes', () => {
  const hist = read('src/lib/ai/askHistory.ts');
  assert.match(hist, /path === '\/inbox'/);
  assert.match(hist, /path === '\/capture'/);
  assert.match(hist, /path === '\/'/);
  assert.match(hist, /path\.startsWith\('\/class\/'\)/);
  assert.match(hist, /path\.startsWith\('\/admin\/class\/'\)/);
});

test('AC-DUAL-ASK-4 ask screen loads/writes/clears with p_seat; parent blocks teacher href', () => {
  const ask = read('src/app/ask.tsx');
  assert.match(ask, /askSeatFromChromeRole\(askRole\)/);
  assert.match(ask, /listAskMessages\(askSeat\)/);
  assert.match(ask, /appendAskMessage\([^)]*askSeat/);
  assert.match(ask, /startAskThread\(askSeat\)/);
  assert.match(ask, /isTeacherAskHref/);
  assert.match(ask, /askRole === 'parent' && isTeacherAskHref/);
  // Isolation on open: clear bubbles when seat changes before reload.
  assert.match(ask, /setMessages\(\[\]\);\s*\n\s*void loadHistory/);
});

test('AC-DUAL-ASK-4 history client always sends p_seat', () => {
  const hist = read('src/lib/ai/askHistory.ts');
  assert.match(hist, /rpc\('ask_list_messages',\s*\{[\s\S]*p_seat:\s*seat/);
  assert.match(hist, /rpc\('ask_append_message',\s*\{[\s\S]*p_seat:/);
  assert.match(hist, /rpc\('ask_new_thread',\s*\{\s*p_seat:\s*seat\s*\}/);
});

test('AC-DUAL-ASK-4 SQL: parent never adopts legacy null-seat thread', () => {
  const sql = read('supabase/migrations/20260927200000_ask_seat_scoped_transcript.sql');
  assert.match(sql, /ask_threads_one_open_per_seat/);
  assert.match(sql, /seat_val is distinct from 'parent'/);
  assert.match(sql, /Parent never sees legacy/);
  assert.match(sql, /Clear only this seat/);
  assert.match(
    sql,
    /elsif seat_val = 'parent' then[\s\S]*?t\.seat = 'parent'/,
  );
});
