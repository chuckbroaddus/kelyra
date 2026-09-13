/**
 * FIX-NOW t_f407d454 / t_dafdba90 — static SQL shape guards for student/parent
 * UNION ALL + ORDER BY starts_at, title.
 *
 * Postgres 0A000: UNION outer ORDER BY may only use result column names.
 * Unaliased a.due_at in the first SELECT makes the result column "due_at",
 * so ORDER BY starts_at fails. Teacher already aliased; family must match.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const FIX =
  'supabase/migrations/20260916000001_list_calendar_items_phase_c_absence_owners.sql';
const PHASE_A_RPCS =
  'supabase/migrations/20260912000001_calendar_r2_phase_a_rpcs.sql';

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

function seatBlock(sql: string, seat: 'STUDENT' | 'PARENT'): string {
  const start = sql.indexOf(`-- ========== ${seat}`);
  assert.ok(start >= 0, `missing ${seat} branch`);
  const rest = sql.slice(start);
  const next = rest.search(/\n  -- ========== |\n  return;\nend;/);
  return next > 0 ? rest.slice(0, next) : rest;
}

function assignmentSelect(block: string): string {
  const u = block.indexOf('union all');
  assert.ok(u > 0, 'missing union all in seat block');
  return block.slice(0, u);
}

function eventSelect(block: string): string {
  const u = block.indexOf('union all');
  assert.ok(u > 0, 'missing union all in seat block');
  const after = block.slice(u);
  const order = after.search(/order by/i);
  return order > 0 ? after.slice(0, order) : after;
}

test('follow-up migration exists and replaces list_calendar_items', () => {
  const sql = read(FIX);
  assert.match(sql, /create or replace function public\.list_calendar_items\(/);
  assert.match(sql, /t_dafdba90|UNION ORDER BY|starts_at\/ends_at/i);
});

test('Phase A student/parent still show the defect shape (unaliased due_at)', () => {
  // Documents why the follow-up exists; do not "fix" Phase A in place.
  const phaseA = extractFn(read(PHASE_A_RPCS), 'list_calendar_items');
  for (const seat of ['STUDENT', 'PARENT'] as const) {
    const assign = assignmentSelect(seatBlock(phaseA, seat));
    assert.match(assign, /a\.due_at,\s*\n\s*a\.due_at,/);
    assert.doesNotMatch(assign, /a\.due_at as starts_at/);
  }
});

test('FIX student branch: every OUT column aliased; ORDER BY names only', () => {
  const items = extractFn(read(FIX), 'list_calendar_items');
  const student = seatBlock(items, 'STUDENT');
  const assign = assignmentSelect(student);
  const event = eventSelect(student);

  assert.match(assign, /a\.due_at as starts_at/);
  assert.match(assign, /a\.due_at as ends_at/);
  assert.match(assign, /'assignment'::text as source/);
  assert.match(assign, /a\.id as id/);
  assert.match(assign, /cw\.id as calendar_id/);
  assert.match(assign, /a\.title as title/);
  assert.match(assign, /true as all_day/);
  assert.match(assign, /as category/);
  assert.match(assign, /'academic'::text as role_tint/);
  assert.match(assign, /a\.class_id as class_id/);
  assert.match(assign, /null::uuid as student_id/);
  assert.match(assign, /a\.calendar_visibility as visibility/);
  assert.match(assign, /false as is_hidden/);
  assert.match(assign, /true as is_read_only/);
  assert.match(assign, /false as is_draft/);
  assert.match(assign, /as deep_link/);

  assert.match(event, /e\.starts_at as starts_at/);
  assert.match(event, /coalesce\(e\.ends_at,\s*e\.starts_at\) as ends_at/);
  assert.match(event, /'event'::text as source/);
  assert.match(event, /e\.id as id/);
  assert.match(event, /e\.calendar_id as calendar_id/);
  assert.match(event, /e\.title as title/);

  assert.match(student, /order by starts_at asc, title asc/i);
  assert.doesNotMatch(student, /order by a\.due_at|order by e\.starts_at/i);
  assert.match(student, /calendar_visibility = 'published'/);
  assert.doesNotMatch(student, /calendar_visibility in \('hidden'/);
});

test('FIX parent branch: every OUT column aliased; ORDER BY names only', () => {
  const items = extractFn(read(FIX), 'list_calendar_items');
  const parent = seatBlock(items, 'PARENT');
  const assign = assignmentSelect(parent);
  const event = eventSelect(parent);

  assert.match(assign, /a\.due_at as starts_at/);
  assert.match(assign, /a\.due_at as ends_at/);
  assert.match(assign, /'assignment'::text as source/);
  assert.match(assign, /a\.calendar_visibility as visibility/);
  assert.match(assign, /false as is_hidden/);

  assert.match(event, /e\.starts_at as starts_at/);
  assert.match(event, /coalesce\(e\.ends_at,\s*e\.starts_at\) as ends_at/);
  assert.match(event, /'event'::text as source/);

  assert.match(parent, /order by starts_at asc, title asc/i);
  assert.match(parent, /calendar_visibility = 'published'/);
  assert.doesNotMatch(parent, /calendar_visibility in \('hidden'/);
});

function stripSqlComments(sql: string): string {
  return sql
    .split('\n')
    .map((line) => {
      const idx = line.indexOf('--');
      return idx >= 0 ? line.slice(0, idx) : line;
    })
    .join('\n');
}

test('FIX preserves family published-only; never teaches_class; grants unchanged', () => {
  const sql = read(FIX);
  const items = extractFn(sql, 'list_calendar_items');
  assert.doesNotMatch(stripSqlComments(items), /\bteaches_class\b/);
  assert.match(items, /class_teacher_of/);
  assert.match(sql, /revoke all on function public\.list_calendar_items[\s\S]*from public, anon/i);
  assert.match(sql, /grant execute on function public\.list_calendar_items[\s\S]*to authenticated/i);
  assert.match(items, /security definer/i);
  assert.match(items, /set search_path = public/);
});

test('regression: unaliased family assignment SELECT would fail ORDER BY starts_at', () => {
  // Shape assert: first SELECT list item for time columns must not be bare a.due_at
  // immediately before UNION when ORDER BY uses starts_at.
  const items = extractFn(read(FIX), 'list_calendar_items');
  for (const seat of ['STUDENT', 'PARENT'] as const) {
    const assign = assignmentSelect(seatBlock(items, seat));
    assert.doesNotMatch(
      assign,
      /a\.title,\s*\n\s*a\.due_at,\s*\n\s*a\.due_at,/,
      `${seat} must not emit unaliased a.due_at, a.due_at before UNION`,
    );
  }
});
