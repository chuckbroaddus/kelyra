import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { ASK_TOOL_POLICY, isAskToolAllowed, grantsFromAskDefaults } from '../../../supabase/functions/_shared/askToolPolicy.ts';

const root = process.cwd();
const grants = grantsFromAskDefaults();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const migration = 'supabase/migrations/20260902000000_class_syllabus.sql';

test('AVG migration: class_teacher_of excludes is_school_admin', () => {
  const sql = read(migration);
  assert.match(sql, /create or replace function public\.class_teacher_of\(p_class_id uuid\)/i);
  const fn = sql.slice(sql.indexOf('create or replace function public.class_teacher_of'));
  const body = fn.slice(0, fn.indexOf('comment on function public.class_teacher_of'));
  assert.match(body, /class_teachers/);
  assert.doesNotMatch(body, /is_school_admin/);
  assert.doesNotMatch(body, /is_staff/);
});

test('AVG migration: family never granted table SELECT on class_syllabi', () => {
  const sql = read(migration);
  assert.match(sql, /alter table public\.class_syllabi enable row level security/i);
  assert.match(sql, /class_syllabi_teacher_all/);
  assert.match(sql, /using \(public\.class_teacher_of\(class_id\)\)/);
  assert.doesNotMatch(sql, /create policy[\s\S]{0,80}class_syllabi[\s\S]{0,120}my_student_id/i);
  assert.doesNotMatch(sql, /grant select on table public\.class_syllabi to anon/i);
});

test('AVG migration: publish validates sum 100 and taught-class; no quiz include shortcut', () => {
  const sql = read(migration);
  assert.match(sql, /active weights must sum to 100/i);
  assert.match(sql, /not public\.class_teacher_of\(p_class_id\)/);
  assert.match(sql, /default_include_in_average boolean not null default false/);
  assert.match(sql, /Never quiz\/test → include shortcut/i);
  assert.match(sql, /source_asset_id = null/);
});

test('AVG migration: family RPCs strip ask_draft and require link/enrollment', () => {
  const sql = read(migration);
  assert.match(sql, /create or replace function public\.published_class_syllabus/);
  assert.match(sql, /create or replace function public\.student_class_average_explain/);
  assert.match(sql, /create or replace function public\.parent_class_average_explain/);
  const published = sql.slice(sql.indexOf('published_class_syllabus'));
  assert.doesNotMatch(published.slice(0, 2500), /ask_draft/);
  assert.match(sql, /parent_students/);
  assert.match(sql, /approved_at is not null/);
});

test('AVG Ask tools use syllabus.manage not assignments.manage', () => {
  assert.equal(ASK_TOOL_POLICY.scan_class_syllabus?.capability, 'syllabus.manage');
  assert.equal(ASK_TOOL_POLICY.scan_class_syllabus?.teacherSeatOnly, true);
  assert.notEqual(ASK_TOOL_POLICY.scan_class_syllabus?.capability, 'assignments.manage');
  assert.equal(isAskToolAllowed('scan_class_syllabus', { role: 'student' }, grants), false);
  assert.equal(isAskToolAllowed('scan_class_syllabus', { role: 'parent' }, grants), false);
  assert.equal(isAskToolAllowed('scan_class_syllabus', { role: 'administrator' }, grants), false);
  assert.equal(isAskToolAllowed('confirm_class_syllabus', { role: 'teacher' }, grants), false);
});

test('AVG parse-class-syllabus: taught-class before vendor; SSRF allowlist; no publish', () => {
  const edge = read('supabase/functions/parse-class-syllabus/index.ts');
  assert.match(edge, /isAllowedAskImageUrl/);
  assert.match(edge, /class_teachers/);
  assert.match(edge, /teacher_id/);
  const serve = edge.slice(edge.indexOf('Deno.serve'));
  assert.ok(serve.indexOf('class_teachers') > 0);
  assert.ok(serve.indexOf('class_teachers') < serve.indexOf('callMetered'));
  assert.doesNotMatch(edge, /status\s*=\s*['"]published['"]/);
  assert.doesNotMatch(edge, /publish_class_syllabus/);
  assert.doesNotMatch(edge, /EXPO_PUBLIC_XAI|EXPO_PUBLIC_.*API_KEY/);
  const local = read('scripts/ai-dev-server.mjs');
  assert.match(local, /parse-class-syllabus/);
  assert.match(local, /async function parseClassSyllabus/);
  const parseFn = local.slice(local.indexOf('async function parseClassSyllabus'));
  assert.ok(parseFn.indexOf('class_teachers') > 0);
  assert.ok(parseFn.indexOf('class_teachers') < parseFn.indexOf('grokCall'));
});

test('AVG matrix syllabus.manage office none; lesson include stays fail-closed', () => {
  const matrix = read('src/lib/school/matrix.ts');
  assert.match(
    matrix,
    /id:\s*'syllabus\.manage'[\s\S]*?superintendent:\s*'none'[\s\S]*?administrator:\s*'none'[\s\S]*?teacher:\s*'own'[\s\S]*?parent:\s*'none'[\s\S]*?student:\s*'none'/,
  );
  const lessons = read('src/lib/lessons/api.ts');
  assert.match(lessons, /include_in_average:\s*input\.includeInAverage\s*\?\?\s*false/);
  const publish = read('supabase/functions/publish-lesson-pack/index.ts');
  assert.doesNotMatch(publish, /class_syllabi|syllabus_categories|include_in_average/);
});

test('A-04/SEC-07 discard Ask draft always clears row source and uses owned _unref_delete_asset', () => {
  const sql = read(migration);
  const fn = sql.slice(sql.indexOf('create or replace function public.discard_syllabus_ask_draft'));
  const body = fn.slice(0, fn.indexOf('create or replace function public.save_class_syllabus_draft'));
  assert.match(body, /ask_draft = null/);
  assert.match(body, /source_asset_id = null/);
  assert.doesNotMatch(body, /case when status = 'published' then source_asset_id/);
  assert.match(body, /old_asset := row\.source_asset_id/);
  assert.match(body, /a\.teacher_id = auth\.uid\(\)/);
  assert.match(body, /perform public\._unref_delete_asset\(old_asset\)/);
  assert.doesNotMatch(body, /source_asset_id_to_delete/);
  assert.doesNotMatch(body, /delete from public\.assets where id = old_asset/);
});

test('T-04/T-14 save_class_syllabus_draft always status=draft; never keeps published', () => {
  const sql = read(migration);
  const fn = sql.slice(sql.indexOf('create or replace function public.save_class_syllabus_draft'));
  const body = fn.slice(0, fn.indexOf('create or replace function public.publish_class_syllabus'));
  assert.match(body, /status = 'draft'/);
  assert.match(body, /published_at = null/);
  assert.doesNotMatch(body, /when s\.status = 'published' then 'published'/);
  assert.doesNotMatch(body, /Keep published status/);
  const publish = sql.slice(sql.indexOf('create or replace function public.publish_class_syllabus'));
  assert.match(publish, /active weights must sum to 100/i);
  assert.match(publish, /syllabus version conflict/);
});

test('UI: Save draft hidden while published; live edits use Publish confirm', () => {
  const ui = read('src/app/class/[id]/syllabus.tsx');
  assert.match(ui, /syllabusStatus === 'published'/);
  assert.match(ui, /Live weights update only when you publish changes/);
  assert.match(ui, /Use Publish changes to update live weights/);
  assert.match(ui, /kind: 'live_edit'/);
  const actions = ui.slice(ui.indexOf('<View style={styles.actions}>'));
  const publishedBranch = actions.slice(0, actions.indexOf('</View>'));
  assert.match(publishedBranch, /syllabusStatus === 'published'/);
  assert.match(publishedBranch, /SecondaryButton label="Save draft"/);
  assert.ok(
    publishedBranch.indexOf("syllabusStatus === 'published'") <
      publishedBranch.indexOf('SecondaryButton label="Save draft"'),
  );
});

test('F-06 Parent Home sibling switch clears why-sheet and rows; keyed by studentId', () => {
  const ui = read('src/app/parent.tsx');
  const card = ui.slice(ui.indexOf('function ParentClassGradesCard'));
  assert.match(card, /setWhy\(null\)/);
  assert.match(card, /setRows\(\[\]\)/);
  assert.match(card, /FamilySyllabusSummary/);
  assert.match(card, /MissingUpcomingStrip/);
  assert.match(card, /studentIdRef\.current !== studentId/);
  assert.match(card, /studentIdRef\.current !== forStudent/);
  assert.match(ui, /<ParentClassGradesCard[\s\S]*?key=\{child\.student_id\}/);
});

test('P-H2/P-M1 Parent Home How-grades + Missing strip gated on published; no drafts', () => {
  const ui = read('src/app/parent.tsx');
  const card = ui.slice(ui.indexOf('function ParentClassGradesCard'));
  assert.match(card, /FamilySyllabusSummary/);
  assert.match(card, /compact/);
  assert.match(card, /MissingUpcomingStrip/);
  assert.match(card, /row\.published/);
  assert.match(card, /explained\?\.missing/);
  assert.match(card, /loadParentClassAverageExplain/);
  assert.doesNotMatch(card, /ask_draft|draft_score/);
  assert.doesNotMatch(card, /save_class_syllabus|publish_class_syllabus|upsertSyllabusAskDraft/);

  const strip = read('src/components/ui/MissingUpcomingStrip.tsx');
  assert.match(strip, /Missing: \{missing\.length\}/);
  assert.match(strip, /Not due yet/);
  assert.match(strip, /compact/);
});

test('P-G1 Parent Home pushes focused-child grades book', () => {
  const ui = read('src/app/parent.tsx');
  const card = ui.slice(ui.indexOf('function ParentClassGradesCard'));
  assert.match(card, /See all grades/);
  assert.match(card, /\/parent\/grades\?/);
  assert.match(card, /child: studentId/);
  assert.doesNotMatch(card, /ask_draft/);
  assert.doesNotMatch(card, /save_class_syllabus|publish_class_syllabus|upsertSyllabusAskDraft/);
});

test('P-G1…P-G4 Parent grades book reuses StudentGradeBook scoped to focused child', () => {
  const book = read('src/app/parent/grades.tsx');
  assert.match(book, /StudentGradeBook/);
  assert.match(book, /studentId=\{activeChildId\}/);
  assert.match(book, /key=\{activeChildId\}/);
  assert.match(book, /FamilySyllabusSummary|childName/);
  assert.match(book, /setClasses\(\[\]\)/);
  assert.match(book, /AvatarTray/);
  assert.doesNotMatch(book, /ask_draft|draft_score|loadStudentGradebook/);
  assert.doesNotMatch(book, /save_class_syllabus|publish_class_syllabus/);

  const component = read('src/components/ui/StudentGradeBook.tsx');
  assert.match(component, /loadFamilyStudentGradebook/);
  assert.match(component, /loadParentClassAverageExplain/);
  assert.match(component, /FamilySyllabusSummary/);
  assert.match(component, /WhyAverageSheet/);
  assert.match(component, /FamilyAssignmentDetail/);
  assert.match(component, /setWhyOpen\(false\)/);
  assert.match(component, /setDetail\(null\)/);
  assert.match(component, /studentId/);
});

test('S-G4/P-G4 FamilyAssignmentDetail own-cell labels; no draft fields', () => {
  const detail = read('src/components/ui/FamilyAssignmentDetail.tsx');
  assert.match(detail, /Counts toward/);
  assert.match(detail, /Does not count toward the class average/);
  assert.match(detail, /dropped as lowest score/);
  assert.match(detail, /Replaced by makeup/);
  assert.doesNotMatch(detail, /draft_score|ask_draft|model_draft|explain_draft/);
  assert.doesNotMatch(detail, /loadGradebook\(|listRoster/);
  // Doc may mention Glow/Grow as forbidden; assert no mapping from private note fields.
  assert.doesNotMatch(detail, /teacher_note|parent_sentence/);

  const book = read('src/components/ui/StudentGradeBook.tsx');
  assert.match(book, /openAssignmentDetail/);
  assert.match(book, /FamilyAssignmentDetail/);
  assert.match(book, /submittedAt: cell\.submittedAt/);
  assert.doesNotMatch(book, /familyComment\s*:/);
  assert.doesNotMatch(book, /categoryKey \?\? 'other'/);
  assert.doesNotMatch(book, /draft_score|ask_draft|teacher_note|parent_sentence/);

  const roles = read('src/lib/grade/syllabusAverage.ts');
  const fn = roles.slice(roles.indexOf('export function familyAssignmentRoleLabels'));
  assert.match(fn.slice(0, 1200), /include === true/);
  assert.match(fn.slice(0, 1200), /include === false/);
  assert.doesNotMatch(fn.slice(0, 900), /include_in_average !== false/);
});

test('Teacher gradebook overall uses studentWeightedOveralls; blank when unpublished', () => {
  const ui = read('src/app/class/[id]/gradebook.tsx');
  assert.match(ui, /studentWeightedOveralls/);
  assert.match(ui, /__overall__/);
  assert.match(ui, /Overall/);
  assert.match(ui, /syllabusForOverall/);
  assert.match(ui, /overall != null \? `\$\{overall\}%` : '—'/);

  const api = read('src/lib/gradebook/api.ts');
  assert.match(api, /export function studentWeightedOveralls/);
  assert.match(api, /computeTeacherStudentOveralls/);

  const engine = read('src/lib/grade/teacherOveralls.ts');
  assert.match(engine, /computeSyllabusAverage/);
  assert.match(engine, /status === 'published'/);
});

test('P-G1 family_student_gradebook strips answers; parent_students gate; no classmates', () => {
  const sql = read('supabase/migrations/20260911000000_family_gradebook_detail_fields.sql');
  assert.match(sql, /create function public\.family_student_gradebook\(p_student_id uuid\)/);
  assert.match(sql, /parent_students/);
  assert.match(sql, /my_student_id\(\)/);
  assert.match(sql, /sub\.student_id = p_student_id/);
  const body = sql.slice(sql.indexOf('return query'), sql.indexOf('$$;'));
  assert.doesNotMatch(body, /answers|draft_score|ask_draft|model_draft/);
  assert.match(body, /sub\.approved_score/);
  assert.match(body, /sub\.status/);
  assert.match(body, /sub\.submitted_at/);
  assert.match(body, /a\.due_at/);
  assert.match(body, /a\.category/);
  assert.match(body, /a\.include_in_average/);
  assert.doesNotMatch(body, /approved_at/);

  const api = read('src/lib/gradebook/api.ts');
  assert.match(api, /family_student_gradebook/);
  assert.match(api, /includeAnswers/);
  assert.match(api, /submittedAt/);
  const familyLoader = api.slice(api.indexOf('export async function loadFamilyStudentGradebook'));
  assert.doesNotMatch(familyLoader.slice(0, 1200), /includeAnswers:\s*true/);
});

test('Parent drawer exposes Grades → /parent/grades', () => {
  const drawer = read('src/components/ui/HamburgerDrawer.tsx');
  assert.match(drawer, /go\('\/parent\/grades'\)/);
  const gradesRow = drawer.slice(drawer.indexOf("go('/parent/grades')") - 120, drawer.indexOf("go('/parent/grades')") + 40);
  assert.match(gradesRow, /matches\('Grades'/);
  assert.match(gradesRow, /DrawerRow label="Grades"/);
});

test('SEC: syllabus RPCs never delete client-supplied asset ids; require ownership + _unref_delete_asset', () => {
  const sql = read(migration);
  const upsert = sql.slice(sql.indexOf('create or replace function public.upsert_syllabus_ask_draft'));
  const upsertBody = upsert.slice(0, upsert.indexOf('create or replace function public.discard_syllabus_ask_draft'));
  assert.match(upsertBody, /p_source_asset_id is not null and not exists/);
  assert.match(upsertBody, /a\.teacher_id = auth\.uid\(\)/);
  assert.match(upsertBody, /raise exception 'not allowed'/);

  const discard = sql.slice(sql.indexOf('create or replace function public.discard_syllabus_ask_draft'));
  const discardBody = discard.slice(0, discard.indexOf('create or replace function public.save_class_syllabus_draft'));
  assert.match(discardBody, /old_asset := row\.source_asset_id/);
  assert.match(discardBody, /perform public\._unref_delete_asset\(old_asset\)/);
  assert.doesNotMatch(discardBody, /source_asset_id_to_delete/);

  const publish = sql.slice(sql.indexOf('create or replace function public.publish_class_syllabus'));
  const publishBody = publish.slice(0, publish.indexOf('create or replace function public.unpublish_class_syllabus'));
  assert.match(publishBody, /old_asset := case when found then row\.source_asset_id else null end/);
  assert.match(publishBody, /payload - 'source_asset_id_to_delete'/);
  assert.match(publishBody, /perform public\._unref_delete_asset\(old_asset\)/);
  assert.doesNotMatch(publishBody, /del_id uuid := \(payload->>'source_asset_id_to_delete'\)/);
  assert.doesNotMatch(publishBody, /delete from public\.assets where id = del_id/);

  const unref = sql.slice(sql.indexOf('create or replace function public._unref_delete_asset'));
  assert.match(unref, /schools where logo_asset_id/);
  assert.match(unref, /class_syllabi where source_asset_id/);
});

test('SEC client: publishClassSyllabus never sends source_asset_id_to_delete', () => {
  const api = read('src/lib/syllabus/api.ts');
  assert.doesNotMatch(api, /source_asset_id_to_delete/);
  const ui = read('src/app/class/[id]/syllabus.tsx');
  assert.doesNotMatch(ui, /source_asset_id_to_delete/);
});
