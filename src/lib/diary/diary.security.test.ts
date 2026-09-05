import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { DIARY_FORBIDDEN_PRIVACY_PHRASES, DIARY_PRIVACY_BODY, diaryPrivacyCopyIsHonest } from './privacy.ts';
import { isAskToolAllowed, ASK_TOOL_POLICY, grantsFromAskDefaults } from '../../../supabase/functions/_shared/askToolPolicy.ts';

const root = process.cwd();
function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const migration = 'supabase/migrations/20260910000000_diary_ledger.sql';
const grants = grantsFromAskDefaults();

test('D1-01 diary/ledger policies never use staff/admin/taught helpers', () => {
  const sql = read(migration);
  const policyBlocks = [...sql.matchAll(/create policy[\s\S]*?;/gi)].map((m) => m[0]);
  const diaryPolicies = policyBlocks.filter((block) =>
    /on public\.(diary_entries|diary_media|ledger_events)|on storage\.objects/i.test(block) &&
    /diary/i.test(block),
  );
  assert.ok(diaryPolicies.length >= 8, `expected diary/ledger/storage policies, got ${diaryPolicies.length}`);
  for (const block of diaryPolicies) {
    assert.doesNotMatch(block, /is_staff|is_staff_profile|is_school_admin|teaches_class|class_teacher_of/);
  }
  // Whole migration policies on diary tables
  const diaryTableSql = sql.slice(sql.indexOf('create table if not exists public.diary_entries'));
  assert.doesNotMatch(
    diaryTableSql.replace(/create or replace function public\.ledger_on_[\s\S]*?\$\$;/g, ''),
    /create policy[\s\S]{0,200}is_school_admin|create policy[\s\S]{0,200}is_staff|create policy[\s\S]{0,200}teaches_class|create policy[\s\S]{0,200}class_teacher_of/,
  );
});

test('D1-03 private diary bucket public=false; path prefix uid', () => {
  const sql = read(migration);
  assert.match(sql, /values\s*\(\s*'diary'\s*,\s*'diary'\s*,\s*false\s*\)/i);
  assert.match(sql, /split_part\(name,\s*'\/',\s*1\)\s*=\s*auth\.uid\(\)::text/);
  assert.doesNotMatch(sql, /bucket_id\s*=\s*'photos'[\s\S]{0,80}diary|diary[\s\S]{0,80}bucket_id\s*=\s*'photos'/);
});

test('D1-04 write_ledger definer; revoke authenticated; owner from auth.uid', () => {
  const sql = read(migration);
  assert.match(sql, /create or replace function public\.write_ledger\(/);
  assert.match(sql, /security definer/);
  assert.match(sql, /auth\.uid\(\)/);
  assert.match(sql, /revoke all on function public\.write_ledger[\s\S]*authenticated/i);
  assert.match(sql, /exception when others then/i);
  assert.doesNotMatch(sql, /grant execute on function public\.write_ledger[\s\S]*authenticated/i);
});

test('D1-06 ledger_events is new table not audit view; no teacher SELECT widen on audit', () => {
  const sql = read(migration);
  assert.match(sql, /create table if not exists public\.ledger_events/);
  assert.doesNotMatch(sql, /create\s+(or\s+replace\s+)?view\s+public\.ledger_events/i);
  assert.doesNotMatch(sql, /create policy[\s\S]{0,80}audit_events[\s\S]{0,120}true/i);
  assert.doesNotMatch(sql, /grant select on public\.audit_events to authenticated[\s\S]*teacher/);
});

test('D1-02 parent twin fail-closed RPC', () => {
  const sql = read(migration);
  assert.match(sql, /list_my_diary_entries/);
  assert.match(sql, /my_parent_student_count\(\)\s*>=\s*2/);
  assert.match(sql, /fail closed|return; -- fail closed/i);
});

test('D1-09 honest privacy copy; forbidden E2E phrases absent', () => {
  assert.equal(diaryPrivacyCopyIsHonest(DIARY_PRIVACY_BODY), true);
  for (const phrase of DIARY_FORBIDDEN_PRIVACY_PHRASES) {
    assert.equal(DIARY_PRIVACY_BODY.toLowerCase().includes(phrase), false);
  }
  const ui = read('src/app/diary.tsx') + read('src/components/ui/SettingsSheet.tsx');
  for (const phrase of DIARY_FORBIDDEN_PRIVACY_PHRASES) {
    assert.equal(ui.toLowerCase().includes(phrase), false, phrase);
  }
  assert.match(ui, /DIARY_PRIVACY_TITLE|DIARY_PRIVACY_BODY|DIARY_FERPA_NOTE/);
  const copy = read('src/lib/diary/privacy.ts');
  assert.match(copy, /Private to you in Kelyra/);
  assert.match(copy, /Personal reflection/);
  assert.match(copy, /School IT or a legal process could still access server-held data/);
});

test('D1-07 Ask diary.draft capability; not assignments.manage; not officeOnly; student denied', () => {
  const entry = ASK_TOOL_POLICY.draft_diary_entry;
  assert.ok(entry, 'draft_diary_entry registered');
  assert.equal(entry.capability, 'diary.draft');
  assert.notEqual(entry.capability, 'assignments.manage');
  assert.equal(entry.officeOnly, undefined);
  assert.equal(isAskToolAllowed('draft_diary_entry', { role: 'teacher' }, grants), true);
  assert.equal(isAskToolAllowed('draft_diary_entry', { role: 'parent' }, grants), true);
  assert.equal(isAskToolAllowed('draft_diary_entry', { role: 'administrator' }, grants), true);
  assert.equal(isAskToolAllowed('draft_diary_entry', { role: 'student' }, grants), false);
  const tools = read('src/lib/ai/askTools.ts');
  const start = tools.indexOf('draft_diary_entry:');
  assert.ok(start > 0);
  const block = tools.slice(start, start + 2500);
  assert.doesNotMatch(block, /create_class|approveCapture|write_ledger|from\('diary_entries'\)\.insert/);
  assert.match(block, /parkPendingDiaryDraft|parked/);
});

test('D1-08 / D1-10 transcribe-audio is capture-free; student seat hidden', () => {
  const edge = read('supabase/functions/transcribe-audio/index.ts');
  assert.doesNotMatch(edge, /captureId|from\('captures'\)/);
  assert.match(edge, /audioBase64|audioUrl/);
  assert.match(edge, /XAI_API_KEY/);
  assert.doesNotMatch(edge, /GEMINI_API_KEY|EXPO_PUBLIC_/);
  const seat = read('src/lib/diary/seat.ts');
  assert.match(seat, /profile\.role === 'student'\)\s*return null/);
  assert.match(seat, /if \(!profile\?\.role \|\| profile\.role === 'student'\) return false/);
});

test('D1-05 diary CRUD never write_audit in migration emitters', () => {
  const sql = read(migration);
  assert.doesNotMatch(sql, /write_audit\([\s\S]{0,40}diary/);
  assert.doesNotMatch(sql, /trigger[\s\S]{0,80}diary_entries[\s\S]{0,80}write_audit/);
});

test('UI: /diary Journal|Ledger; drawer Diary; student has no Diary link', () => {
  const screen = read('src/app/diary.tsx');
  assert.match(screen, /Journal/);
  assert.match(screen, /Ledger/);
  assert.match(screen, /PersonTabs/);
  const drawer = read('src/components/ui/HamburgerDrawer.tsx');
  assert.match(drawer, /label=\"Diary\"/);
  // Student branch must not include Diary go
  const studentAt = drawer.indexOf("chromeState.role === 'student'");
  const parentAt = drawer.indexOf("chromeState.role === 'parent'");
  assert.ok(studentAt > 0 && parentAt > studentAt);
  const studentBlock = drawer.slice(studentAt, parentAt);
  assert.doesNotMatch(studentBlock, /go\('\/diary'\)/);
});
