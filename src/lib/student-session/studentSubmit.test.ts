import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const migration = 'supabase/migrations/20260927180000_student_submit_planned.sql';
const screen = 'src/app/todo/[submissionId].tsx';
const api = 'src/lib/student-session/api.ts';

test('AC-TURNIN-1: student_submit accepts own open practice and planned (empty answers ok)', () => {
  const sql = read(migration);
  assert.match(sql, /create or replace function public\.student_submit/);
  assert.match(sql, /sub\.student_id = sid/);
  assert.match(sql, /sub\.status in \('assigned', 'started'\)/);
  assert.match(sql, /a\.kind in \('practice', 'planned'\)/);
  assert.match(sql, /status = 'completed'/);
  assert.match(sql, /submitted_at = now\(\)/);
  assert.doesNotMatch(sql, /a\.kind = 'practice'\s*;/);
  // Empty items/answers are not a gate — no items-length check.
  assert.doesNotMatch(sql, /jsonb_array_length|items is not null|p_answers is not null/);
});

test('AC-TURNIN-2: already submitted (completed/graded) is not rewritten', () => {
  const sql = read(migration);
  assert.match(sql, /sub\.status in \('assigned', 'started'\)/);
  assert.match(sql, /raise exception 'Submission not found or already submitted'/);
  assert.doesNotMatch(sql, /status in \('assigned', 'started', 'completed'/);
  assert.doesNotMatch(sql, /status in \('assigned', 'started', 'graded'/);
});

test('AC-TURNIN-3: only the signed-in student row is updated', () => {
  const sql = read(migration);
  assert.match(sql, /sid uuid := public\.my_student_id\(\)/);
  assert.match(sql, /sub\.student_id = sid/);
  assert.match(sql, /sub\.id = p_submission_id/);
});

test('existing Turn in control calls submitStudentTodo → student_submit (no second screen)', () => {
  const ui = read(screen);
  const client = read(api);
  assert.match(ui, /submitStudentTodo/);
  assert.match(ui, /label=\{busy \? 'Turning in…' : 'Turn in'\}/);
  assert.match(ui, /isOpenWork\(item\.status\)/);
  assert.match(ui, /Could not submit/);
  assert.match(client, /rpc\('student_submit'/);
  assert.match(client, /p_submission_id: submissionId/);
  assert.match(client, /p_answers: answers/);
  assert.doesNotMatch(ui, /ditl-PhaseB|8c1e6ed0/);
});
