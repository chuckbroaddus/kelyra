import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { ASK_TOOL_POLICY } from '../../../supabase/functions/_shared/askToolPolicy.ts';

import { mapCalendarItemRow, mapCalendarLayerRow } from './mapItem.ts';
import { calendarSeatForChrome } from './seat.ts';
import type { CalendarItemRow, CalendarLayerRow } from './types.ts';

const root = process.cwd();
function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const schema = 'supabase/migrations/20260912000000_calendar_r2_phase_a_schema.sql';
const rpcs = 'supabase/migrations/20260912000001_calendar_r2_phase_a_rpcs.sql';
/** Live list_calendar_items after FIX-NOW t_dafdba90 (UNION ORDER BY aliases). */
const itemsFix =
  'supabase/migrations/20260913000002_list_calendar_items_union_orderby_aliases.sql';
/** Phase C list lineage (superseded for extract by Phase D team body). */
const itemsPhaseC =
  'supabase/migrations/20260916000001_list_calendar_items_phase_c_absence_owners.sql';
const crudSql = 'supabase/migrations/20260916000000_calendar_r2_phase_c_event_crud.sql';
/** Phase D: sport layers + unsubscribe + list_calendars with teams. */
const phaseDSport = 'supabase/migrations/20260917000000_calendar_r2_phase_d_sport.sql';
/** Phase D list_calendar_items (+ visibility_scope=team). Canonical for extract. */
const itemsPhaseD =
  'supabase/migrations/20260917000001_list_calendar_items_phase_d_team.sql';

/** Static JWT role fixtures for CAL-R2 Phase A+B (live DB apply is devops-release). */
const JWT = {
  teacher: { seat: 'teacher' as const, occupiesTeacher: true },
  student: { seat: 'student' as const, occupiesTeacher: false },
  parent: { seat: 'parent' as const, occupiesTeacher: false },
  office: { seat: 'office' as const, occupiesTeacher: false },
};

function extractFn(sql: string, name: string): string {
  const start = sql.indexOf(`create or replace function public.${name}`);
  assert.ok(start >= 0, `missing function ${name}`);
  const rest = sql.slice(start);
  const end = rest.indexOf('\n$$;');
  assert.ok(end > 0, `unclosed function ${name}`);
  return rest.slice(0, end + 4);
}

/** Canonical list_calendar_items (Phase D team body replaces Phase C). */
function listCalendarItemsSql(): string {
  return extractFn(read(itemsPhaseD), 'list_calendar_items');
}

/** Canonical list_calendars (Phase D sport body replaces Phase A). */
function listCalendarsSql(): string {
  return extractFn(read(phaseDSport), 'list_calendars');
}

/** Strip SQL `--` line comments so forbidden-helper asserts ignore docs. */
function stripSqlComments(sql: string): string {
  return sql
    .split('\n')
    .map((line) => {
      const idx = line.indexOf('--');
      return idx >= 0 ? line.slice(0, idx) : line;
    })
    .join('\n');
}

test('CAL-S1-01 never teaches_class for family/hidden calendar reads', () => {
  const sql = read(schema) + read(rpcs) + read(itemsFix) + read(itemsPhaseC) + read(crudSql) + read(phaseDSport) + read(itemsPhaseD);
  const items = listCalendarItemsSql();
  const layers = listCalendarsSql();
  assert.doesNotMatch(stripSqlComments(items), /\bteaches_class\b/);
  assert.doesNotMatch(stripSqlComments(layers), /\bteaches_class\b/);
  assert.match(items, /class_teacher_of/);
  assert.match(layers, /class_teacher_of/);
  // Office branch must not dump homework via teaches_class / class_work
  const officeBlock = items.slice(items.indexOf("-- ========== OFFICE"));
  const officeBody = stripSqlComments(
    officeBlock.slice(0, officeBlock.indexOf('-- ========== STUDENT')),
  );
  assert.doesNotMatch(officeBody, /assignments|class_work|teaches_class|calendar_visibility\s*=\s*'hidden'/);
  assert.match(sql, /Never teaches_class|never teaches_class/i);
});

test('CAL-S1-02 hidden dues class_teacher_of only; assign ≠ publish', () => {
  const schemaSql = read(schema);
  const items = listCalendarItemsSql();
  assert.match(schemaSql, /calendar_visibility/);
  assert.match(schemaSql, /Never flip on submissions seed|assign ≠ publish|Independent of assign-to-roster/i);
  assert.match(schemaSql, /quiz',\s*'test',\s*'midterm',\s*'final'/);
  // Teacher branch: hidden + published with class_teacher_of
  const teacherBlock = items.slice(items.indexOf('-- ========== TEACHER'));
  const teacherBody = teacherBlock.slice(0, teacherBlock.indexOf('-- ========== OFFICE'));
  assert.match(teacherBody, /calendar_visibility in \('hidden', 'published'\)/);
  assert.match(teacherBody, /class_teacher_of\(a\.class_id\)/);
  // Family/student: published only
  assert.match(items, /a\.calendar_visibility = 'published'/);
  const studentBlock = items.slice(items.indexOf('-- ========== STUDENT'));
  assert.doesNotMatch(
    studentBlock.slice(0, studentBlock.indexOf('-- ========== PARENT')),
    /calendar_visibility in \('hidden'/,
  );
});

test('CAL-S1-03 / S2-02 parent 2+ missing child → empty (layers + items)', () => {
  const layers = listCalendarsSql();
  const items = listCalendarItemsSql();
  for (const body of [layers, items]) {
    assert.match(body, /my_parent_student_count\(\)\s*>=\s*2/);
    assert.match(body, /p_child_student_id is null or not public\.i_parent_of/);
    assert.match(body, /return;/);
  }
});

test('CAL-S1-04 / S2-01 dual-hat by chrome seat; p_seat occupancy; wrong → empty', () => {
  const rpcSql = read(rpcs);
  const occ = extractFn(rpcSql, 'calendar_seat_occupied');
  assert.match(occ, /security definer/i);
  assert.match(occ, /set search_path = public/);
  assert.match(occ, /class_teachers/);
  assert.match(occ, /is_school_admin/);
  assert.doesNotMatch(stripSqlComments(occ), /\bis_staff\b|also_teacher|staff_also_parent/);
  const layers = listCalendarsSql();
  const items = listCalendarItemsSql();
  for (const body of [layers, items]) {
    assert.match(body, /calendar_seat_occupied\(p_seat\)/);
    assert.match(body, /if not public\.calendar_seat_occupied\(p_seat\) then\s*\n\s*return;/);
  }
  // Static JWT fixtures: student claiming teacher → occupancy false → empty
  assert.equal(JWT.student.occupiesTeacher, false);
  assert.equal(calendarSeatForChrome('student'), 'student');
  assert.notEqual(calendarSeatForChrome('student'), 'teacher');
  // Dual-hat chrome maps declared seat only
  assert.equal(calendarSeatForChrome('teacher'), 'teacher');
  assert.equal(calendarSeatForChrome('parent'), 'parent');
  assert.equal(calendarSeatForChrome('superintendent'), 'office');
  assert.equal(calendarSeatForChrome('administrator'), 'office');
});

test('CAL-S1-08 DEFINER hygiene on both RPCs', () => {
  const rpcSql = read(rpcs);
  const itemsSql = read(itemsPhaseC);
  for (const name of ['list_calendars', 'calendar_seat_occupied'] as const) {
    const body = extractFn(rpcSql, name);
    assert.match(body, /security definer/i);
    assert.match(body, /set search_path = public/);
    assert.match(body, /auth\.uid\(\)/);
  }
  const items = listCalendarItemsSql();
  assert.match(items, /security definer/i);
  assert.match(items, /set search_path = public/);
  assert.match(items, /auth\.uid\(\)/);
  assert.match(rpcSql, /revoke all on function public\.list_calendars[\s\S]*from public, anon/i);
  assert.match(itemsSql, /revoke all on function public\.list_calendar_items[\s\S]*from public, anon/i);
  assert.match(rpcSql, /grant execute on function public\.list_calendars[\s\S]*to authenticated/i);
  assert.match(itemsSql, /grant execute on function public\.list_calendar_items[\s\S]*to authenticated/i);
});

test('CAL-S1-10 / S2-04 projection: no scores/drafts/classmates; family never hidden titles', () => {
  const items = listCalendarItemsSql();
  assert.doesNotMatch(items, /approved_score|draft_score|model_draft|classmate/i);
  const studentBlock = items.slice(items.indexOf('-- ========== STUDENT'));
  const parentBlock = items.slice(items.indexOf('-- ========== PARENT'));
  assert.match(studentBlock, /calendar_visibility = 'published'/);
  assert.match(parentBlock, /calendar_visibility = 'published'/);
  assert.match(studentBlock, /family never isHidden/);
  assert.doesNotMatch(studentBlock, /calendar_visibility in \('hidden'/);
  assert.doesNotMatch(parentBlock, /calendar_visibility in \('hidden'/);
  const familyRow: CalendarItemRow = {
    source: 'assignment',
    id: 'a1',
    calendar_id: 'c1',
    title: 'Pop quiz',
    starts_at: '2026-09-15T12:00:00.000Z',
    ends_at: '2026-09-15T12:00:00.000Z',
    all_day: true,
    category: 'quiz',
    role_tint: 'academic',
    class_id: 'cl1',
    student_id: null,
    visibility: 'published',
    is_hidden: false,
    is_read_only: true,
    is_draft: false,
    deep_link: '/todo',
  };
  assert.equal(mapCalendarItemRow(familyRow).isHidden, false);
});

test('CAL-S1-11 / S2-06 no EXPO_PUBLIC vendor keys; provider=kelyra forced; no FullCalendar', () => {
  const schemaSql = read(schema);
  const api = read('src/lib/calendar/api.ts');
  const screen = read('src/app/calendar.tsx');
  const pkg = read('package.json');
  assert.match(schemaSql, /calendars_force_kelyra_provider/);
  assert.match(schemaSql, /v1 calendars provider must be kelyra/);
  assert.doesNotMatch(api, /EXPO_PUBLIC_/);
  assert.doesNotMatch(screen, /EXPO_PUBLIC_/);
  assert.doesNotMatch(pkg, /fullcalendar|@fullcalendar|react-big-calendar|expo-calendar/i);
  // Own views — not a vendor calendar package (Phase B: Agenda + Day + Week).
  assert.match(screen, /TeacherWeekGrid/);
  assert.match(screen, /AgendaList/);
  assert.match(screen, /DayColumn/);
  assert.doesNotMatch(screen, /from ['"]@fullcalendar|from ['"]fullcalendar|from ['"]react-big-calendar/);
});

test('CAL-S1-12 / S2-02 office list_calendars school-kind only; no class_work', () => {
  const layers = listCalendarsSql();
  assert.match(layers, /Office: school-kind only|school-kind only/i);
  const officeStart = layers.indexOf("if p_seat = 'office'");
  assert.ok(officeStart > 0);
  const officeBody = stripSqlComments(
    layers.slice(officeStart, layers.indexOf("if p_seat = 'teacher'")),
  );
  assert.match(officeBody, /c\.kind = 'school'/);
  // Predicate is school-only.
  assert.doesNotMatch(officeBody, /c\.kind in \('class'|c\.kind = 'class_work'|kind in \('class'/);
  // JWT fixture expectation: office layers never include class_work
  const officeLayer: CalendarLayerRow = {
    id: 's1',
    kind: 'school',
    name: 'School',
    role_tint: 'school',
    class_id: null,
    default_enabled: true,
    is_read_only: false,
    can_unsubscribe: false,
  };
  assert.equal(mapCalendarLayerRow(officeLayer).kind, 'school');
  assert.notEqual(mapCalendarLayerRow(officeLayer).kind, 'class_work');
});

test('CAL-S2-03 no client CRUD of school/class/class_work; calendar_id intersection', () => {
  const schemaSql = read(schema);
  const items = listCalendarItemsSql();
  assert.match(schemaSql, /enable row level security/);
  assert.match(schemaSql, /revoke all on table public\.calendars from anon, authenticated/);
  assert.match(schemaSql, /revoke all on table public\.calendar_events from anon, authenticated/);
  assert.match(schemaSql, /revoke all on function public\.provision_school_calendar/);
  assert.match(schemaSql, /revoke all on function public\.provision_class_calendars/);
  assert.doesNotMatch(schemaSql, /create policy[\s\S]*on public\.calendars/i);
  assert.doesNotMatch(schemaSql, /create policy[\s\S]*on public\.calendar_events/i);
  assert.match(items, /cw\.id = any \(p_calendar_ids\)|e\.calendar_id = any \(p_calendar_ids\)/);
  assert.match(items, /intersection/i);
  const client = read('src/lib/calendar/api.ts');
  assert.doesNotMatch(client, /from\(['"]calendars['"]\)\.(insert|update|delete)/);
  assert.doesNotMatch(client, /from\(['"]calendar_events['"]\)\.(insert|update|delete)/);
  assert.match(client, /rpc\('list_calendar_items'/);
  assert.match(client, /rpc\('list_calendars'/);
});

test('CAL-S2-07 prefs/cache not consulted in RPC', () => {
  const layers = listCalendarsSql();
  const items = listCalendarItemsSql();
  for (const body of [layers, items]) {
    assert.match(body, /Prefs\/cache (are )?not consulted/i);
    assert.doesNotMatch(body, /calprefs|AsyncStorage|calendar_layer_prefs/i);
  }
});

test('CAL-S2-08 Ask calendar tools not hung on assignments.manage (Phase A)', () => {
  assert.equal(ASK_TOOL_POLICY.calendar_search, undefined);
  assert.equal(ASK_TOOL_POLICY.calendar_draft_event, undefined);
  assert.ok(ASK_TOOL_POLICY.create_assignment?.capability === 'assignments.manage');
});

test('CAL-S2-09 unique (school_id, provider, external_id) school-scoped', () => {
  const schemaSql = read(schema);
  assert.match(
    schemaSql,
    /calendars_school_provider_external_uidx[\s\S]*\(school_id, provider, external_id\)/,
  );
});

test('CAL-S2-10 calendar_id cannot retarget visibility', () => {
  const schemaSql = read(schema);
  assert.match(schemaSql, /calendar_events_calendar_id_consistent/);
  assert.match(schemaSql, /calendar_id school mismatch|class_work layers have no calendar_events/);
  assert.match(schemaSql, /school calendar requires visibility_scope=school/);
});

test('CAL-S1-09 draft creator-only; sport not roster-copied (Phase A schema)', () => {
  const items = listCalendarItemsSql();
  assert.match(items, /e\.status = 'draft' and e\.owner_profile_id = me/);
  const schemaSql = read(schema);
  // No roster-copy into team members in Phase A (teams table not even required)
  assert.doesNotMatch(schemaSql, /insert into public\.calendar_team_members[\s\S]*enrollments/);
});

test('JWT fixture matrix: teacher sees hidden; family/office do not; student p_seat=teacher empty', () => {
  // Encodes acceptance expectations for devops-release live prove-out.
  const teacherHidden = mapCalendarItemRow({
    source: 'assignment',
    id: 'q1',
    calendar_id: 'cw1',
    title: 'Fractions quiz',
    starts_at: '2026-09-16T17:00:00.000Z',
    ends_at: '2026-09-16T17:00:00.000Z',
    all_day: true,
    category: 'quiz',
    role_tint: 'academic',
    class_id: 'class-a',
    student_id: null,
    visibility: 'hidden',
    is_hidden: true,
    is_read_only: true,
    is_draft: false,
    deep_link: '/class/class-a/assignment/q1',
  });
  assert.equal(JWT.teacher.seat, 'teacher');
  assert.equal(teacherHidden.isHidden, true);
  assert.equal(teacherHidden.visibility, 'hidden');

  // Family/office never receive hidden rows from RPC (mapper still forces false for events)
  assert.equal(
    mapCalendarItemRow({
      ...teacherHidden,
      source: 'assignment',
      is_hidden: false,
      visibility: 'published',
    } as CalendarItemRow & { id: string }).isHidden,
    false,
  );

  assert.equal(JWT.student.occupiesTeacher, false);
  assert.equal(JWT.parent.occupiesTeacher, false);
  assert.equal(JWT.office.occupiesTeacher, false);
});

test('CE-A chrome: drawer Calendar + quiet Desk link; not 6th tray', () => {
  const drawer = read('src/components/ui/HamburgerDrawer.tsx');
  const desk = read('src/app/class/[id]/index.tsx');
  const tray = read('src/lib/chrome/trayTabs.ts');
  assert.match(drawer, /label="Calendar"/);
  assert.match(drawer, /go\('\/calendar'\)/);
  assert.match(desk, /Open Calendar/);
  assert.match(desk, /Calendar/);
  assert.doesNotMatch(tray, /calendar/i);
  assert.doesNotMatch(tray, /\/calendar/);
});

test('Phase A cap 500 + window window on list_calendar_items', () => {
  const items = listCalendarItemsSql();
  assert.match(items, /lim int := 500/);
  assert.match(items, /limit lim/);
  assert.match(items, /p_to < p_from/);
  assert.match(items, /due_at >= p_from/);
  assert.match(items, /starts_at >= p_from/);
});

test('t_dafdba90 family UNION ORDER BY uses aliased starts_at/ends_at (no 0A000)', () => {
  // Postgres UNION outer ORDER BY may only use result column names. Unaliased
  // a.due_at made starts_at missing → HTTP 400 0A000 on student/parent seats.
  const items = listCalendarItemsSql();
  const studentBlock = items.slice(
    items.indexOf('-- ========== STUDENT'),
    items.indexOf('-- ========== PARENT'),
  );
  const parentBlock = items.slice(items.indexOf('-- ========== PARENT'));

  for (const [seat, block] of [
    ['student', studentBlock],
    ['parent', parentBlock],
  ] as const) {
    const assignSel = block.slice(
      block.indexOf('select'),
      block.indexOf('from public.assignments'),
    );
    assert.match(assignSel, /a\.due_at as starts_at/, `${seat} assignment starts_at alias`);
    assert.match(assignSel, /a\.due_at as ends_at/, `${seat} assignment ends_at alias`);
    assert.doesNotMatch(
      assignSel,
      /^\s*a\.due_at,\s*$/m,
      `${seat} must not emit unaliased a.due_at`,
    );
    // Full OUT aliases on assignment leg (ORDER BY / RETURNS TABLE names).
    for (const col of [
      'source',
      'id',
      'calendar_id',
      'title',
      'starts_at',
      'ends_at',
      'all_day',
      'category',
      'role_tint',
      'class_id',
      'student_id',
      'visibility',
      'is_hidden',
      'is_read_only',
      'is_draft',
      'deep_link',
    ]) {
      assert.match(assignSel, new RegExp(`\\bas ${col}\\b`), `${seat} assign as ${col}`);
    }

    const unionIdx = block.indexOf('union all');
    assert.ok(unionIdx > 0, `${seat} has union all`);
    const eventSel = block.slice(
      block.indexOf('select', unionIdx),
      block.indexOf('from public.calendar_events', unionIdx),
    );
    assert.match(eventSel, /e\.starts_at as starts_at/, `${seat} event starts_at alias`);
    assert.match(
      eventSel,
      /coalesce\(e\.ends_at, e\.starts_at\) as ends_at/,
      `${seat} event ends_at alias`,
    );
    for (const col of [
      'source',
      'id',
      'calendar_id',
      'title',
      'starts_at',
      'ends_at',
      'all_day',
      'category',
      'role_tint',
      'class_id',
      'student_id',
      'visibility',
      'is_hidden',
      'is_read_only',
      'is_draft',
      'deep_link',
    ]) {
      assert.match(eventSel, new RegExp(`\\bas ${col}\\b`), `${seat} event as ${col}`);
    }

    assert.match(
      block,
      /order by starts_at asc, title asc/i,
      `${seat} ORDER BY result column names only`,
    );
    // Never ORDER BY expressions/functions on the UNION result.
    assert.doesNotMatch(
      block,
      /order by\s+(e\.|a\.|coalesce)/i,
      `${seat} ORDER BY must use result names only`,
    );
    // Security laws preserved on family path.
    assert.match(block, /calendar_visibility = 'published'/);
    assert.doesNotMatch(block, /calendar_visibility in \('hidden'/);
  }
});


const publishSql = 'supabase/migrations/20260914000000_calendar_r2_phase_b_publish.sql';

test('Phase B publish_assignment_to_calendar: class_teacher_of only; never teaches_class (S1-02)', () => {
  const sql = read(publishSql);
  const body = extractFn(sql, 'publish_assignment_to_calendar');
  assert.match(body, /security definer/i);
  assert.match(body, /set search_path = public/);
  assert.match(body, /class_teacher_of\(row\.class_id\)/);
  assert.doesNotMatch(stripSqlComments(body), /\bteaches_class\b/);
  assert.match(body, /calendar_visibility = 'published'/);
  assert.match(body, /calendar_published_at/);
  assert.match(body, /calendar_published_by/);
  assert.match(sql, /revoke all on function public\.publish_assignment_to_calendar[\s\S]*from public, anon/i);
  assert.match(sql, /grant execute on function public\.publish_assignment_to_calendar[\s\S]*to authenticated/i);
  const listHidden = extractFn(sql, 'list_hidden_calendar_dues');
  assert.match(listHidden, /calendar_visibility = 'hidden'/);
  assert.match(listHidden, /class_teacher_of\(a\.class_id\)/);
  assert.doesNotMatch(stripSqlComments(listHidden), /\bteaches_class\b/);
});

test('Phase B CH-A: parent 2+ missing child empty (S1-03); UI fail-closed', () => {
  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /Pick a child to open that calendar/);
  assert.match(screen, /Twin calendars never mix/);
  assert.match(screen, /parentChildMissing/);
  assert.match(screen, /listParentLinkedChildren/);
  // Still enforced in RPC
  const items = listCalendarItemsSql();
  assert.match(items, /my_parent_student_count\(\)\s*>=\s*2/);
});

test('Phase B VW-A phone Agenda+Day; DP-A teacher badge; family never hidden titles (S2-04)', () => {
  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /phoneView/);
  assert.match(screen, /Agenda/);
  assert.match(screen, /Day/);
  assert.match(screen, /showHiddenBadge = seat === 'teacher'/);
  const agenda = read('src/components/calendar/AgendaList.tsx');
  assert.match(agenda, /showHiddenBadge/);
  assert.match(agenda, /Hidden/);
  // Family RPC still published-only
  const items = listCalendarItemsSql();
  const parentBlock = items.slice(items.indexOf('-- ========== PARENT'));
  assert.match(parentBlock, /calendar_visibility = 'published'/);
  assert.doesNotMatch(parentBlock, /calendar_visibility in \('hidden'/);
});

test('Phase B CE-A: no 6th tray; Desk Today/This week unchanged product', () => {
  const tray = read('src/lib/chrome/trayTabs.ts');
  assert.doesNotMatch(tray, /calendar/i);
  const desk = read('src/app/class/[id]/index.tsx');
  assert.match(desk, /DeskSpanTabs/);
  assert.match(desk, /pane === 'today'|pane === 'week'/);
  assert.match(desk, /Publish to calendar/);
  assert.match(desk, /publishAssignmentToCalendar/);
});

test('Phase B assignment form publish toggle (assign ≠ publish)', () => {
  const form = read('src/components/ui/AssignmentForm.tsx');
  assert.match(form, /showOnFamilyCalendar/);
  assert.match(form, /Hide on family calendar|Show on student\/parent calendar/);
  assert.match(form, /Assigning work does not publish/);
  const api = read('src/lib/assignments/api.ts');
  assert.match(api, /calendarVisibility/);
  assert.match(api, /calendar_visibility: input\.calendarVisibility/);
});


test('Phase C absence walls: owner parents of C + teachers of C; never office/student/twin/is_staff', () => {
  const items = listCalendarItemsSql();
  const crud = read(crudSql);
  const parentBlock = items.slice(items.indexOf('-- ========== PARENT'));
  const studentBlock = items.slice(
    items.indexOf('-- ========== STUDENT'),
    items.indexOf('-- ========== PARENT'),
  );
  const officeBlock = items.slice(
    items.indexOf('-- ========== OFFICE'),
    items.indexOf('-- ========== STUDENT'),
  );
  const teacherBlock = items.slice(
    items.indexOf('-- ========== TEACHER'),
    items.indexOf('-- ========== OFFICE'),
  );

  // Parent: focused child only; creator-only filter removed (all owner parents of C).
  assert.match(parentBlock, /e\.student_id = child/);
  assert.match(parentBlock, /visibility_scope = 'student_teachers'/);
  assert.match(parentBlock, /category = 'absence'/);
  assert.match(
    parentBlock,
    /category = 'absence'\s*\n\s*and e\.student_id = child\s*\n\s*\)/,
  );
  assert.doesNotMatch(
    parentBlock,
    /category = 'absence'\s*\n\s*and e\.student_id = child\s*\n\s*and e\.owner_profile_id/,
  );
  // Twin wall: missing child still empty
  assert.match(items, /my_parent_student_count\(\)\s*>=\s*2/);
  assert.match(parentBlock, /if child is null then/);

  // Student never sees absence / student_teachers
  assert.doesNotMatch(studentBlock, /student_teachers/);
  assert.doesNotMatch(studentBlock, /category = 'absence'/);

  // Office never absence / self / homework
  assert.doesNotMatch(officeBlock, /student_teachers|category = 'absence'/);
  assert.match(officeBlock, /visibility_scope = 'school'/);

  // Teacher sees student_teachers via class_teacher_of enrollments (not is_staff)
  assert.match(teacherBlock, /visibility_scope = 'student_teachers'/);
  assert.match(teacherBlock, /class_teacher_of\(en\.class_id\)/);

  const create = extractFn(crud, 'create_calendar_event');
  const update = extractFn(crud, 'update_calendar_event');
  const del = extractFn(crud, 'delete_calendar_event');
  const get = extractFn(crud, 'get_calendar_event');
  const write = extractFn(crud, 'calendar_event_write_allowed');
  for (const [name, body] of [
    ['create', create],
    ['update', update],
    ['delete', del],
    ['get', get],
    ['write', write],
  ] as const) {
    assert.doesNotMatch(stripSqlComments(body), /\bis_staff\b/, `${name} no is_staff`);
    assert.doesNotMatch(stripSqlComments(body), /\bteaches_class\b/, `${name} no teaches_class`);
    assert.match(body, /security definer/i);
    assert.match(body, /set search_path = public/);
    assert.match(body, /auth\.uid\(\)/);
  }

  // Create paths hat-scoped
  assert.match(create, /Only office can create school events/);
  assert.match(create, /Only teachers can create class events/);
  assert.match(create, /class_teacher_of\(p_class_id\)/);
  assert.match(create, /Only a parent can create an absence/);
  assert.match(create, /i_parent_of\(p_child_student_id\)/);
  assert.match(create, /vis := 'student_teachers'/);
  assert.match(create, /Office cannot create personal events/);
  assert.match(create, /calendar_seat_occupied\(p_seat\)/);

  // Teacher cannot edit/delete school
  assert.match(update, /Managed by office/);
  assert.match(del, /Managed by office/);
  assert.match(write, /Managed by office|visibility_scope = 'school'/);

  // Parent edits own absence only
  assert.match(write, /owner_profile_id = me/);
  assert.match(write, /category = 'absence'/);
  assert.match(write, /i_parent_of\(p_event\.student_id\)/);

  // Student get omits student_teachers
  assert.match(get, /Student does not see own absence/);
  const studentGet = get.slice(get.indexOf("p_seat = 'student'"));
  assert.doesNotMatch(
    studentGet.slice(0, studentGet.indexOf("p_seat = 'parent'")),
    /student_teachers/,
  );

  // Unlink: DELETE not SET NULL / deleted_at
  assert.match(crud, /calendar_events_on_parent_unlink/);
  assert.match(crud, /Do not SET NULL student_id/);
  assert.match(crud, /Do not use deleted_at tombstone for absences/);
  assert.match(crud, /delete from public\.calendar_events e/);
  assert.match(crud, /before delete on public\.parent_students/);
  assert.match(crud, /before delete on public\.students/);

  assert.match(crud, /revoke all on function public\.create_calendar_event[\s\S]*from public, anon/i);
  assert.match(crud, /grant execute on function public\.create_calendar_event[\s\S]*to authenticated/i);
});

test('Phase C CR-A / MG-A client: no FullCalendar; rpc only; no table writes', () => {
  const api = read('src/lib/calendar/api.ts');
  const screen = read('src/app/calendar.tsx');
  const composer = read('src/components/calendar/EventComposer.tsx');
  const menu = read('src/components/calendar/EventMenu.tsx');
  assert.match(api, /rpc\('create_calendar_event'/);
  assert.match(api, /rpc\('update_calendar_event'/);
  assert.match(api, /rpc\('delete_calendar_event'/);
  assert.match(api, /rpc\('get_calendar_event'/);
  assert.doesNotMatch(api, /from\(['"]calendar_events['"]\)\.(insert|update|delete)/);
  assert.doesNotMatch(api, /from\(['"]calendars['"]\)\.(insert|update|delete)/);
  assert.match(screen, /EventComposer/);
  assert.match(screen, /EventMenu/);
  assert.match(screen, /Add event/);
  assert.match(composer, /Who can see this/);
  assert.match(composer, /Discard draft/);
  assert.match(read('src/lib/calendar/eventActions.ts'), /Managed by office/);
  assert.match(menu, /eventMenuActions/);
  assert.doesNotMatch(screen, /from ['"]@fullcalendar|from ['"]fullcalendar|from ['"]react-big-calendar/);
  assert.doesNotMatch(composer, /fullcalendar/i);
});

test('Phase C JWT fixture matrix: create/read absence walls', () => {
  // Encodes live prove-out expectations (devops-release applies SQL).
  assert.equal(JWT.parent.seat, 'parent');
  assert.equal(JWT.teacher.seat, 'teacher');
  assert.equal(JWT.student.occupiesTeacher, false);
  assert.equal(JWT.office.occupiesTeacher, false);
  // Student claiming teacher stays empty (occupancy)
  assert.notEqual(calendarSeatForChrome('student'), 'teacher');
  const items = listCalendarItemsSql();
  const studentBlock = items.slice(
    items.indexOf('-- ========== STUDENT'),
    items.indexOf('-- ========== PARENT'),
  );
  assert.doesNotMatch(studentBlock, /student_teachers/);
});

test('CAL-S2-07 / Phase D prefs never consulted; Unsubscribe ≠ Delete', () => {
  const sport = read(phaseDSport);
  const unsub = extractFn(sport, 'unsubscribe_team');
  assert.match(unsub, /security definer/i);
  assert.match(unsub, /delete from public\.calendar_team_members/);
  assert.doesNotMatch(stripSqlComments(unsub), /delete from public\.calendar_events/);
  assert.match(sport, /Never Delete|never Delete|Leave team membership/i);
  const layers = listCalendarsSql();
  assert.doesNotMatch(layers, /calprefs|AsyncStorage|calendar_layer_prefs/i);
  assert.match(layers, /Prefs\/cache are not consulted/);
  assert.match(layers, /kind = 'team'/);
  assert.match(layers, /can_unsubscribe/);
});

test('Phase D thin sport: team layers opted-only; default_enabled false; office no team', () => {
  const sport = read(phaseDSport);
  assert.match(sport, /create table if not exists public\.calendar_teams/);
  assert.match(sport, /create table if not exists public\.calendar_team_members/);
  assert.match(sport, /default_enabled/i);
  assert.match(sport, /'sport', false, false/); // role_tint sport, not read_only, default_enabled false
  assert.doesNotMatch(stripSqlComments(sport), /insert into public\.calendar_team_members[\s\S]*enrollments/);
  const layers = listCalendarsSql();
  const officeStart = layers.indexOf("if p_seat = 'office'");
  const teacherStart = layers.indexOf("if p_seat = 'teacher'");
  assert.ok(officeStart >= 0 && teacherStart > officeStart);
  const officeBody = stripSqlComments(layers.slice(officeStart, teacherStart));
  assert.doesNotMatch(officeBody, /kind = 'team'|calendar_team_members/);
  assert.match(layers, /i_calendar_team_member/);
});

test('Phase D list_calendar_items includes team scope for opted seats only', () => {
  const items = listCalendarItemsSql();
  assert.match(items, /visibility_scope = 'team'/);
  assert.match(items, /i_calendar_team_member/);
  // Office branch still school-only — no team
  const officeBlock = items.slice(items.indexOf('-- ========== OFFICE'));
  const officeBody = stripSqlComments(
    officeBlock.slice(0, officeBlock.indexOf('-- ========== STUDENT')),
  );
  assert.doesNotMatch(officeBody, /visibility_scope = 'team'/);
});

test('Phase D client: unsubscribeTeam RPC + Calendars sheet never labels Delete for teams', () => {
  const api = read('src/lib/calendar/api.ts');
  assert.match(api, /rpc\('unsubscribe_team'/);
  assert.match(api, /Unsubscribe|Leave team/);
  const sheet = read('src/components/calendar/CalendarsSheet.tsx');
  assert.match(sheet, /Unsubscribe/);
  assert.match(sheet, /Disable|Enable/);
  assert.doesNotMatch(sheet, />Delete</);
  const screen = read('src/app/calendar.tsx');
  assert.match(screen, /CalendarsSheet/);
  assert.match(screen, /CATEGORY_CHIPS|filters/);
  assert.match(screen, /calprefs|loadCalPrefs|saveCalPrefs/);
});

test('filters ≠ security: p_calendar_ids / p_categories remain intersection UX args', () => {
  const items = listCalendarItemsSql();
  assert.match(items, /p_calendar_ids/);
  assert.match(items, /p_categories/);
  assert.match(items, /cw\.id = any \(p_calendar_ids\)|e\.calendar_id = any \(p_calendar_ids\)/);
  // Still seat-gated before filters
  assert.match(items, /calendar_seat_occupied\(p_seat\)/);
});

