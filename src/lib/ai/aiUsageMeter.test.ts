/**
 * Defect #5: ai_usage.teacher_id FK → teachers(id). Meter must set user_id for every seat
 * and teacher_id only when the caller has a teachers row.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const env: Record<string, string> = { GEMINI_API_KEY: 'g-key', XAI_API_KEY: 'x-key' };
(globalThis as { Deno?: unknown }).Deno = { env: { get: (k: string) => env[k] } };

const {
  buildAiUsageInsert,
  meterUsage,
  seatFromSchoolRole,
} = await import('../../../supabase/functions/_shared/ai.ts');

const migration = 'supabase/migrations/20261005023000_ai_usage_actor_seat.sql';

test('seatFromSchoolRole maps school roles onto teacher/parent/student/office', () => {
  assert.equal(seatFromSchoolRole('teacher'), 'teacher');
  assert.equal(seatFromSchoolRole('parent'), 'parent');
  assert.equal(seatFromSchoolRole('student'), 'student');
  assert.equal(seatFromSchoolRole('superintendent'), 'office');
  assert.equal(seatFromSchoolRole('administrator'), 'office');
  assert.equal(seatFromSchoolRole(null), null);
  assert.equal(seatFromSchoolRole('nope'), null);
});

test('buildAiUsageInsert: teacher writes teacher_id + user_id + seat', () => {
  const row = buildAiUsageInsert({
    schoolId: 'school-1',
    userId: 'teacher-uid',
    isTeacher: true,
    seat: 'teacher',
    functionName: 'analyze-homework',
    model: 'gemini-test',
    captureId: 'cap-1',
    inputTokens: 10,
    outputTokens: 5,
    usd: 0.01,
  });
  assert.equal(row.user_id, 'teacher-uid');
  assert.equal(row.teacher_id, 'teacher-uid');
  assert.equal(row.seat, 'teacher');
  assert.equal(row.school_id, 'school-1');
  assert.equal(row.function, 'analyze-homework');
  assert.equal(row.model, 'gemini-test');
  assert.equal(row.capture_id, 'cap-1');
  assert.equal(row.input_tokens, 10);
  assert.equal(row.output_tokens, 5);
  assert.equal(row.usd, 0.01);
});

test('buildAiUsageInsert: parent writes user_id and does NOT write a fake teacher_id', () => {
  const row = buildAiUsageInsert({
    schoolId: 'school-1',
    userId: 'parent-uid',
    isTeacher: false,
    seat: 'parent',
    functionName: 'ask-assistant',
    model: 'gemini-test',
    inputTokens: 3,
    outputTokens: 2,
    usd: 0.002,
  });
  assert.equal(row.user_id, 'parent-uid');
  assert.equal(row.teacher_id, null);
  assert.equal(row.seat, 'parent');
});

test('buildAiUsageInsert: office and student seats keep actor id without teacher_id', () => {
  const office = buildAiUsageInsert({
    schoolId: 'school-1',
    userId: 'office-uid',
    isTeacher: false,
    seat: 'office',
    functionName: 'ask-assistant',
    model: 'm',
    inputTokens: 1,
    outputTokens: 1,
    usd: 0.001,
  });
  assert.equal(office.user_id, 'office-uid');
  assert.equal(office.teacher_id, null);
  assert.equal(office.seat, 'office');

  const student = buildAiUsageInsert({
    schoolId: 'school-1',
    userId: 'student-uid',
    isTeacher: false,
    seat: 'student',
    functionName: 'practice-help',
    model: 'm',
    inputTokens: 1,
    outputTokens: 1,
    usd: 0.001,
  });
  assert.equal(student.user_id, 'student-uid');
  assert.equal(student.teacher_id, null);
  assert.equal(student.seat, 'student');
});

type InsertRow = Record<string, unknown>;

function fakeMeterClient(opts: {
  userId: string;
  role: string;
  hasTeacherRow: boolean;
  schoolId?: string;
}) {
  const inserts: InsertRow[] = [];
  return {
    inserts,
    auth: { getUser: async () => ({ data: { user: { id: opts.userId } } }) },
    rpc: async (name: string) => {
      if (name === 'my_school_id') return { data: opts.schoolId ?? 'school-1', error: null };
      if (name === 'my_role') return { data: opts.role, error: null };
      return { data: null, error: null };
    },
    from: (table: string) => {
      if (table === 'teachers') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: opts.hasTeacherRow ? { id: opts.userId } : null,
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'ai_usage') {
        return {
          insert: async (row: InsertRow) => {
            inserts.push(row);
            return { error: null };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
}

test('meterUsage teacher: insert has user_id + teacher_id', async () => {
  const sb = fakeMeterClient({ userId: 't1', role: 'teacher', hasTeacherRow: true });
  await meterUsage(sb, {
    functionName: 'classify-capture',
    model: 'm',
    inputTokens: 1,
    outputTokens: 1,
    usd: 0.01,
  });
  assert.equal(sb.inserts.length, 1);
  assert.equal(sb.inserts[0]!.user_id, 't1');
  assert.equal(sb.inserts[0]!.teacher_id, 't1');
  assert.equal(sb.inserts[0]!.seat, 'teacher');
});

test('meterUsage parent: insert has user_id, null teacher_id, seat parent', async () => {
  const sb = fakeMeterClient({ userId: 'p1', role: 'parent', hasTeacherRow: false });
  await meterUsage(sb, {
    functionName: 'ask-assistant',
    model: 'm',
    inputTokens: 2,
    outputTokens: 2,
    usd: 0.02,
  });
  assert.equal(sb.inserts.length, 1);
  assert.equal(sb.inserts[0]!.user_id, 'p1');
  assert.equal(sb.inserts[0]!.teacher_id, null);
  assert.equal(sb.inserts[0]!.seat, 'parent');
});

test('meterUsage student: insert has user_id, null teacher_id, seat student', async () => {
  const sb = fakeMeterClient({ userId: 's1', role: 'student', hasTeacherRow: false });
  await meterUsage(sb, {
    functionName: 'practice-help',
    model: 'm',
    inputTokens: 1,
    outputTokens: 1,
    usd: 0.01,
  });
  assert.equal(sb.inserts.length, 1);
  assert.equal(sb.inserts[0]!.user_id, 's1');
  assert.equal(sb.inserts[0]!.teacher_id, null);
  assert.equal(sb.inserts[0]!.seat, 'student');
});

test('meterUsage office without teachers row: seat office, no teacher_id', async () => {
  const sb = fakeMeterClient({ userId: 'o1', role: 'administrator', hasTeacherRow: false });
  await meterUsage(sb, {
    functionName: 'ask-assistant',
    model: 'm',
    inputTokens: 1,
    outputTokens: 1,
    usd: 0.01,
  });
  assert.equal(sb.inserts.length, 1);
  assert.equal(sb.inserts[0]!.user_id, 'o1');
  assert.equal(sb.inserts[0]!.teacher_id, null);
  assert.equal(sb.inserts[0]!.seat, 'office');
});

test('meterUsage office with also_teacher hat: seat office but teacher_id set (valid FK)', async () => {
  const sb = fakeMeterClient({ userId: 'o2', role: 'superintendent', hasTeacherRow: true });
  await meterUsage(sb, {
    functionName: 'ask-assistant',
    model: 'm',
    inputTokens: 1,
    outputTokens: 1,
    usd: 0.01,
  });
  assert.equal(sb.inserts.length, 1);
  assert.equal(sb.inserts[0]!.user_id, 'o2');
  assert.equal(sb.inserts[0]!.teacher_id, 'o2');
  assert.equal(sb.inserts[0]!.seat, 'office');
});

test('migration adds user_id + seat, keeps teacher_id nullable FK, pins RLS and spend', () => {
  const sql = readFileSync(join(process.cwd(), migration), 'utf8');
  assert.match(sql, /add column if not exists user_id uuid references auth\.users/i);
  assert.match(sql, /add column if not exists seat text/i);
  assert.match(sql, /seat in \('teacher', 'parent', 'student', 'office'\)/);
  assert.match(sql, /create policy ai_usage_insert on public\.ai_usage/i);
  assert.match(sql, /user_id is null or user_id = auth\.uid\(\)/i);
  assert.match(sql, /teacher_id is null or teacher_id = auth\.uid\(\)/i);
  assert.match(sql, /create policy ai_usage_read on public\.ai_usage/i);
  assert.match(sql, /school_id = public\.my_school_id\(\)/i);
  assert.match(sql, /create or replace function public\.ai_spend_this_month\(\)/i);
  assert.match(sql, /from public\.ai_usage u/i);
  assert.match(sql, /grant execute on function public\.ai_spend_this_month\(\) to authenticated/i);
  // Must not force non-teachers into teacher_id or drop the teachers FK.
  assert.doesNotMatch(sql, /teacher_id uuid not null/i);
  assert.doesNotMatch(sql, /drop.*teacher_id/i);
});
