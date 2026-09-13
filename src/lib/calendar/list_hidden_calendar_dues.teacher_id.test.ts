/**
 * FIX-NOW t_5497924e — static SQL shape guards for list_hidden_calendar_dues.
 *
 * Live B-NEEDS-01 FAIL: Postgres 42703 column ct.profile_id does not exist.
 * class_teachers column is teacher_id (Phase A class_teacher_of + schema).
 * Follow-up migration must join ct.teacher_id = me and never ct.profile_id.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const FIX =
  'supabase/migrations/20260915000000_list_hidden_calendar_dues_teacher_id.sql';

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

function extractFn(sql: string, name: string): string {
  const start = sql.indexOf(`create or replace function public.${name}`);
  assert.ok(start >= 0, `missing function ${name}`);
  const rest = sql.slice(start);
  const end = rest.indexOf('\n$$;');
  assert.ok(end > 0, `unclosed function ${name}`);
  return rest.slice(0, end + 4);
}

/** Strip SQL `--` line comments so forbidden-column asserts ignore docs. */
function stripSqlComments(sql: string): string {
  return sql
    .split('\n')
    .map((line) => {
      const idx = line.indexOf('--');
      return idx >= 0 ? line.slice(0, idx) : line;
    })
    .join('\n');
}

test('follow-up migration exists and replaces list_hidden_calendar_dues', () => {
  const sql = read(FIX);
  assert.match(sql, /create or replace function public\.list_hidden_calendar_dues\(/);
  assert.match(sql, /t_5497924e|teacher_id|FIX-NOW/i);
});

test('list_hidden_calendar_dues joins class_teachers.teacher_id = me (not profile_id)', () => {
  const body = extractFn(read(FIX), 'list_hidden_calendar_dues');
  const code = stripSqlComments(body);

  assert.match(code, /class_teachers\s+ct\s+where\s+ct\.teacher_id\s*=\s*me/);
  assert.doesNotMatch(code, /ct\.profile_id/);
  assert.doesNotMatch(code, /class_teachers[\s\S]*profile_id/);
});

test('list_hidden_calendar_dues keeps Phase B seat + visibility laws', () => {
  const sql = read(FIX);
  const body = extractFn(sql, 'list_hidden_calendar_dues');
  const code = stripSqlComments(body);

  assert.match(body, /security definer/i);
  assert.match(body, /set search_path = public/);
  assert.match(code, /calendar_visibility\s*=\s*'hidden'/);
  assert.match(code, /class_teacher_of\(a\.class_id\)/);
  assert.doesNotMatch(code, /\bteaches_class\b/);
  assert.match(sql, /revoke all on function public\.list_hidden_calendar_dues[\s\S]*from public, anon/i);
  assert.match(sql, /grant execute on function public\.list_hidden_calendar_dues[\s\S]*to authenticated/i);
});
