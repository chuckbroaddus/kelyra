/**
 * CAL-R2 Phase C live JWT prove-out (t_49e99879).
 * Never prints JWTs / service keys / passwords.
 */
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { createRequire } from 'module';

const ROOT = '/Users/chuckbroaddus/projects/kelyra';
const require = createRequire(path.join(ROOT, 'package.json'));
void require;

const envText = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
function env(k) {
  const m = envText.match(new RegExp(`^${k}=(.*)$`, 'm'));
  if (!m) throw new Error('missing ' + k);
  return m[1].trim().replace(/^['"]|['"]$/g, '');
}

const URL = env('EXPO_PUBLIC_SUPABASE_URL');
const ANON = env('EXPO_PUBLIC_SUPABASE_ANON_KEY');
const SERVICE = env('SUPABASE_SERVICE_ROLE_KEY');
const MATH = 'd1715000-0000-4000-a000-000000000301';
const ENG = 'd1715000-0000-4000-a000-000000000302';
const RANGE = {
  from: '2026-09-20T00:00:00.000Z',
  to: '2026-09-28T00:00:00.000Z',
};
const B_RANGE = {
  from: '2026-09-14T00:00:00.000Z',
  to: '2026-09-21T00:00:00.000Z',
};
const ACCOUNTS = {
  admin: { email: 'ditl-admin@ditl.test', pass: 'DITL-admin-test' },
  teacher_a: { email: 'ditl-teacher-a@ditl.test', pass: 'DITL-teacher-test' },
  teacher_b: { email: 'ditl-teacher-b@ditl.test', pass: 'DITL-teacher-test' },
  teacher_c: { email: 'ditl-teacher-c@ditl.test', pass: 'DITL-teacher-test' },
  student_s1: { email: 'ditl-student-s1@ditl.test', pass: 'DITL-student-test' },
  parent_1: { email: 'ditl-parent-1@ditl.test', pass: 'DITL-parent-test' },
  parent_2: { email: 'ditl-parent-2@ditl.test', pass: 'DITL-parent-test' },
};

const TITLES = {
  school: 'ditl-PhaseC Office School',
  class: 'ditl-PhaseC Teacher Class',
  tPersonal: 'ditl-PhaseC Teacher Personal',
  sPersonal: 'ditl-PhaseC Student Personal',
  pPersonal: 'ditl-PhaseC Parent Personal',
  absence: 'ditl-PhaseC Parent Absence S1',
};

function anonClient() {
  return createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
}
function serviceClient() {
  return createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
}
async function signIn(role) {
  const c = anonClient();
  const { data, error } = await c.auth.signInWithPassword({
    email: ACCOUNTS[role].email,
    password: ACCOUNTS[role].pass,
  });
  if (error || !data.session?.access_token) throw new Error(`signin_failed:${role}`);
  return c;
}
function nowCt() {
  return (
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
      .format(new Date())
      .replace(',', '') + ' CT'
  );
}
function shapeItems(rows, probeTitles = []) {
  const list = Array.isArray(rows) ? rows : [];
  const titles = list.map((r) => r.title).filter(Boolean).sort();
  const vis = {};
  const kinds = {};
  let hidden_n = 0;
  for (const r of list) {
    const v = r.visibility || r.calendar_visibility || (r.is_hidden ? 'hidden' : 'published');
    vis[v] = (vis[v] || 0) + 1;
    if (v === 'hidden' || r.is_hidden) hidden_n += 1;
    const k = r.category || r.kind || 'unknown';
    kinds[k] = (kinds[k] || 0) + 1;
  }
  const has = Object.fromEntries(probeTitles.map((t) => [`has_${t}`, titles.includes(t)]));
  return {
    n: list.length,
    titles_sorted: titles,
    hidden_n,
    vis,
    kinds,
    has_quiz_title: titles.includes('ditl-Math Quiz'),
    has_probe: titles.includes('ditl-PhaseB Publish Probe'),
    ...Object.fromEntries(
      Object.entries(TITLES).map(([k, t]) => [`has_${k}`, titles.includes(t)]),
    ),
    keys_sample: list[0] ? Object.keys(list[0]).sort() : [],
  };
}
async function rpcList(client, seat, opts = {}, range = RANGE) {
  const { data, error } = await client.rpc('list_calendar_items', {
    p_from: range.from,
    p_to: range.to,
    p_seat: seat,
    p_class_id: opts.classId ?? null,
    p_child_student_id: opts.childId ?? null,
    p_categories: null,
    p_calendar_ids: null,
  });
  return {
    status: error ? 400 : 200,
    data: data ?? [],
    error: error ? { message: error.message, code: error.code } : null,
  };
}
async function createEvent(client, args) {
  const { data, error } = await client.rpc('create_calendar_event', args);
  return {
    ok: !error && !!data?.id,
    id: data?.id || null,
    row: data
      ? {
          id: data.id?.slice?.(0, 8) || null,
          category: data.category,
          visibility_scope: data.visibility_scope,
          title: data.title,
          class_id: data.class_id?.slice?.(0, 8) || null,
          student_id: data.student_id?.slice?.(0, 8) || null,
        }
      : null,
    err: error ? { code: error.code, message: (error.message || '').slice(0, 160) } : null,
  };
}
async function updateEvent(client, args) {
  const { data, error } = await client.rpc('update_calendar_event', args);
  return {
    ok: !error && !!data?.id,
    title: data?.title || null,
    err: error ? { code: error.code, message: (error.message || '').slice(0, 160) } : null,
  };
}
async function deleteEvent(client, seat, id) {
  const { error } = await client.rpc('delete_calendar_event', { p_seat: seat, p_id: id });
  return {
    ok: !error,
    err: error ? { code: error.code, message: (error.message || '').slice(0, 160) } : null,
  };
}
function titleIn(list, title) {
  return (Array.isArray(list) ? list : []).some((r) => r.title === title);
}

const evidence = {
  ran_at_ct: null,
  sql_gate: null,
  hermes_context: 't_49e99879',
  migration:
    '20260916000000_calendar_r2_phase_c_event_crud.sql + 20260916000001_list_calendar_items_phase_c_absence_owners.sql',
  pr: '110 @ 50d1c8d',
  fixture_prep: [],
  id_prefixes: {},
  created_event_ids: {},
  cases: [],
  suggested_defects: [],
  overall: null,
};

async function resolveIds(svc) {
  const { data: parentAuth } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 });
  const users = parentAuth?.users || [];
  const byEmail = Object.fromEntries(users.map((u) => [u.email, u.id]));
  const parentId = byEmail['ditl-parent-1@ditl.test'];
  const parent2Id = byEmail['ditl-parent-2@ditl.test'];
  evidence.id_prefixes.parentAuth = parentId?.slice(0, 8) || null;
  evidence.id_prefixes.parent2Auth = parent2Id?.slice(0, 8) || null;

  const { data: links } = await svc.from('parent_students').select('student_id').eq('parent_id', parentId);
  const childIds = (links || []).map((r) => r.student_id);
  const { data: kids } = await svc.from('profiles').select('id, display_name, username').in('id', childIds);
  const s1 = (kids || []).find((k) => /Jordan/i.test(k.display_name));
  const s2 = (kids || []).find((k) => /Jamie/i.test(k.display_name));
  evidence.id_prefixes.children_n = childIds.length;
  evidence.id_prefixes.s1 = s1?.id?.slice(0, 8);
  evidence.id_prefixes.s2 = s2?.id?.slice(0, 8);
  evidence.id_prefixes.math = MATH.slice(0, 8);
  evidence.id_prefixes.eng = ENG.slice(0, 8);

  // Phase B regression fixtures (published-only walls)
  async function setVis(title, vis, dueIso) {
    const { data, error } = await svc
      .from('assignments')
      .update({
        calendar_visibility: vis,
        due_at: dueIso,
        ...(vis === 'published'
          ? { calendar_published_at: new Date().toISOString() }
          : { calendar_published_at: null, calendar_published_by: null }),
      })
      .eq('title', title)
      .select('id, title, calendar_visibility, due_at, class_id');
    evidence.fixture_prep.push({
      title,
      ok: !error && (data?.length || 0) > 0,
      n: data?.length || 0,
      err: error?.message || null,
      vis,
    });
    return data?.[0] || null;
  }
  const quiz = await setVis('ditl-Math Quiz', 'hidden', '2026-09-16T16:00:00.000Z');
  await setVis('ditl-Math HW S1', 'published', '2026-09-15T16:00:00.000Z');
  await setVis('ditl-English HW S1', 'published', '2026-09-17T16:00:00.000Z');
  evidence.id_prefixes.quiz = quiz?.id?.slice(0, 8);

  // Cleanup prior Phase C probe events by title (service)
  const priorTitles = Object.values(TITLES);
  const { data: prior } = await svc
    .from('calendar_events')
    .select('id,title')
    .in('title', priorTitles);
  if (prior?.length) {
    const ids = prior.map((r) => r.id);
    const { error } = await svc.from('calendar_events').delete().in('id', ids);
    evidence.fixture_prep.push({
      title: 'cleanup_prior_phase_c',
      ok: !error,
      n: ids.length,
      err: error?.message || null,
    });
  }

  return { childIds, s1Id: s1?.id, s2Id: s2?.id, quizId: quiz?.id };
}

async function sqlGate() {
  const teacher = await signIn('teacher_a');
  const probe = await teacher.rpc('create_calendar_event', {
    p_seat: 'teacher',
    p_kind: 'personal',
    p_title: '__gate_probe_should_fail_empty__',
    p_starts_at: null,
  });
  const createPresent = !/does not exist|PGRST202|Could not find the function/i.test(
    probe.error?.message || '',
  );
  const listProbe = await teacher.rpc('list_calendar_items', {
    p_from: RANGE.from,
    p_to: RANGE.to,
    p_seat: 'teacher',
    p_class_id: MATH,
    p_child_student_id: null,
    p_categories: null,
    p_calendar_ids: null,
  });
  return {
    ok: createPresent && !listProbe.error,
    create_rpc_present: createPresent,
    list_ok: !listProbe.error,
    create_probe_err: probe.error
      ? { code: probe.error.code, message: (probe.error.message || '').slice(0, 80) }
      : null,
    list_err: listProbe.error
      ? { code: listProbe.error.code, message: (listProbe.error.message || '').slice(0, 80) }
      : null,
  };
}

function pushCase(c) {
  evidence.cases.push(c);
  if (c.result === 'FAIL') {
    evidence.suggested_defects.push({
      sev: 'P1',
      title: `DEFECT [P1]: ${c.case} ${c.detail}`.slice(0, 180),
      repro: c.detail,
      hat: c.role,
      expected: 'PASS per Phase C hat/absence walls',
      actual: c.detail,
      evidence: 'calendar-r2-phase-c-live-jwt-evidence.json',
    });
  }
}

async function runCases(fx) {
  // ---- SQL gate already recorded ----

  // C-OFFICE-01: office create/edit school; teacher cannot edit/delete
  {
    const office = await signIn('admin');
    const created = await createEvent(office, {
      p_seat: 'office',
      p_kind: 'school',
      p_title: TITLES.school,
      p_starts_at: '2026-09-22T15:00:00.000Z',
      p_ends_at: null,
      p_all_day: true,
      p_category: 'school',
      p_body: 'Phase C office school probe',
      p_class_id: null,
      p_child_student_id: null,
    });
    evidence.created_event_ids.school = created.id?.slice(0, 8) || null;
    let updated = { ok: false, err: { message: 'skip' } };
    if (created.ok) {
      updated = await updateEvent(office, {
        p_seat: 'office',
        p_id: created.id,
        p_title: TITLES.school,
        p_starts_at: '2026-09-22T15:00:00.000Z',
        p_ends_at: null,
        p_all_day: true,
        p_category: 'school',
        p_body: 'Phase C office school probe edited',
      });
    }
    const listed = await rpcList(office, 'office');
    const shape = shapeItems(listed.data);
    const teacher = await signIn('teacher_a');
    const tUpdate = created.ok
      ? await updateEvent(teacher, {
          p_seat: 'teacher',
          p_id: created.id,
          p_title: 'HACK',
          p_starts_at: '2026-09-22T15:00:00.000Z',
          p_all_day: true,
        })
      : { ok: true, err: null };
    const tDelete = created.ok
      ? await deleteEvent(teacher, 'teacher', created.id)
      : { ok: true, err: null };
    const tList = await rpcList(teacher, 'teacher', { classId: MATH });
    const tShape = shapeItems(tList.data);
    const ok =
      created.ok &&
      updated.ok &&
      listed.status === 200 &&
      shape.has_school &&
      !tUpdate.ok &&
      !tDelete.ok &&
      tShape.has_school; // teachers still see school layer events (read)
    pushCase({
      case: 'C-OFFICE-01',
      role: 'office→teacher deny write',
      result: ok ? 'PASS' : 'FAIL',
      detail: `create=${created.ok} update=${updated.ok} office_list_has=${shape.has_school} teacher_update_denied=${!tUpdate.ok} teacher_delete_denied=${!tDelete.ok} teacher_sees=${tShape.has_school} create_err=${created.err?.message || null} tUp=${tUpdate.err?.message || null} tDel=${tDelete.err?.message || null}`,
      evidence: {
        create: created,
        update: updated,
        office_shape: shape,
        teacher_update_denied: !tUpdate.ok,
        teacher_delete_denied: !tDelete.ok,
        teacher_shape_has_school: tShape.has_school,
        teacher_update_err: tUpdate.err,
        teacher_delete_err: tDelete.err,
      },
    });
  }

  // C-TEACHER-01: class + personal create; list by hat
  {
    const teacher = await signIn('teacher_a');
    const cls = await createEvent(teacher, {
      p_seat: 'teacher',
      p_kind: 'class',
      p_title: TITLES.class,
      p_starts_at: '2026-09-23T16:00:00.000Z',
      p_all_day: true,
      p_category: 'class',
      p_body: null,
      p_class_id: MATH,
      p_child_student_id: null,
    });
    const personal = await createEvent(teacher, {
      p_seat: 'teacher',
      p_kind: 'personal',
      p_title: TITLES.tPersonal,
      p_starts_at: '2026-09-23T18:00:00.000Z',
      p_all_day: true,
      p_category: 'personal',
      p_body: null,
      p_class_id: null,
      p_child_student_id: null,
    });
    evidence.created_event_ids.class = cls.id?.slice(0, 8) || null;
    evidence.created_event_ids.tPersonal = personal.id?.slice(0, 8) || null;
    const listed = await rpcList(teacher, 'teacher', { classId: MATH });
    const shape = shapeItems(listed.data);
    // student should see class event (enrolled) but not teacher personal
    const student = await signIn('student_s1');
    const sList = await rpcList(student, 'student');
    const sShape = shapeItems(sList.data);
    // office should not see class/personal
    const office = await signIn('admin');
    const oList = await rpcList(office, 'office');
    const oShape = shapeItems(oList.data);
    const denySchool = await createEvent(teacher, {
      p_seat: 'teacher',
      p_kind: 'school',
      p_title: 'ditl-PhaseC Teacher School Deny',
      p_starts_at: '2026-09-23T12:00:00.000Z',
      p_all_day: true,
    });
    const ok =
      cls.ok &&
      personal.ok &&
      shape.has_class &&
      shape.has_tPersonal &&
      sShape.has_class &&
      !sShape.has_tPersonal &&
      !oShape.has_class &&
      !oShape.has_tPersonal &&
      !denySchool.ok;
    pushCase({
      case: 'C-TEACHER-01',
      role: 'teacher_a',
      result: ok ? 'PASS' : 'FAIL',
      detail: `class=${cls.ok} personal=${personal.ok} teacher_has_class=${shape.has_class} teacher_has_personal=${shape.has_tPersonal} student_sees_class=${sShape.has_class} student_no_personal=${!sShape.has_tPersonal} office_no_class=${!oShape.has_class} deny_school=${!denySchool.ok} err=${cls.err?.message || personal.err?.message || null}`,
      evidence: {
        class: cls,
        personal,
        teacher_shape: shape,
        student_shape: { has_class: sShape.has_class, has_tPersonal: sShape.has_tPersonal },
        office_shape: { has_class: oShape.has_class, has_tPersonal: oShape.has_tPersonal },
        deny_school: denySchool,
      },
    });
  }

  // C-STUDENT-01: student personal
  {
    const student = await signIn('student_s1');
    const created = await createEvent(student, {
      p_seat: 'student',
      p_kind: 'personal',
      p_title: TITLES.sPersonal,
      p_starts_at: '2026-09-24T14:00:00.000Z',
      p_all_day: true,
      p_category: 'study',
      p_body: null,
      p_class_id: null,
      p_child_student_id: null,
    });
    evidence.created_event_ids.sPersonal = created.id?.slice(0, 8) || null;
    const listed = await rpcList(student, 'student');
    const shape = shapeItems(listed.data);
    const teacher = await signIn('teacher_a');
    const tList = await rpcList(teacher, 'teacher', { classId: MATH });
    const tShape = shapeItems(tList.data);
    const denyClass = await createEvent(student, {
      p_seat: 'student',
      p_kind: 'class',
      p_title: 'ditl-PhaseC Student Class Deny',
      p_starts_at: '2026-09-24T12:00:00.000Z',
      p_class_id: MATH,
    });
    const ok =
      created.ok &&
      shape.has_sPersonal &&
      !tShape.has_sPersonal &&
      !denyClass.ok;
    pushCase({
      case: 'C-STUDENT-01',
      role: 'student_s1',
      result: ok ? 'PASS' : 'FAIL',
      detail: `create=${created.ok} student_has=${shape.has_sPersonal} teacher_no=${!tShape.has_sPersonal} deny_class=${!denyClass.ok} err=${created.err?.message || null}`,
      evidence: { create: created, student_shape: shape, teacher_has: tShape.has_sPersonal, deny_class: denyClass },
    });
  }

  // C-PARENT-ABS-01 + personal: parent absence for focused child (CH-A) + personal
  let absenceId = null;
  {
    const parent = await signIn('parent_1');
    const personal = await createEvent(parent, {
      p_seat: 'parent',
      p_kind: 'personal',
      p_title: TITLES.pPersonal,
      p_starts_at: '2026-09-24T20:00:00.000Z',
      p_all_day: true,
      p_category: 'personal',
      p_body: null,
      p_class_id: null,
      p_child_student_id: null,
    });
    const abs = await createEvent(parent, {
      p_seat: 'parent',
      p_kind: 'absence',
      p_title: TITLES.absence,
      p_starts_at: '2026-09-25T15:00:00.000Z',
      p_all_day: true,
      p_category: 'absence',
      p_body: 'Jordan out sick Phase C probe',
      p_class_id: null,
      p_child_student_id: fx.s1Id,
    });
    absenceId = abs.id;
    evidence.created_event_ids.pPersonal = personal.id?.slice(0, 8) || null;
    evidence.created_event_ids.absence = abs.id?.slice(0, 8) || null;
    const listed = await rpcList(parent, 'parent', { childId: fx.s1Id });
    const shape = shapeItems(listed.data);
    const ok =
      personal.ok &&
      abs.ok &&
      abs.row?.visibility_scope === 'student_teachers' &&
      abs.row?.category === 'absence' &&
      shape.has_absence &&
      shape.has_pPersonal;
    pushCase({
      case: 'C-PARENT-ABS-01',
      role: 'parent_1+s1',
      result: ok ? 'PASS' : 'FAIL',
      detail: `personal=${personal.ok} abs=${abs.ok} scope=${abs.row?.visibility_scope} list_abs=${shape.has_absence} list_personal=${shape.has_pPersonal} err=${abs.err?.message || personal.err?.message || null}`,
      evidence: { personal, abs, shape },
    });
  }

  // C-ABS-WALL-T: teachers of C's classes see; teacher_c never
  {
    const ta = await signIn('teacher_a');
    const tb = await signIn('teacher_b');
    const tc = await signIn('teacher_c');
    const a = shapeItems((await rpcList(ta, 'teacher', { classId: MATH })).data);
    const b = shapeItems((await rpcList(tb, 'teacher', { classId: ENG })).data);
    const c = shapeItems((await rpcList(tc, 'teacher')).data);
    const ok = a.has_absence && b.has_absence && !c.has_absence;
    pushCase({
      case: 'C-ABS-WALL-T',
      role: 'teacher_a/b vs teacher_c',
      result: ok ? 'PASS' : 'FAIL',
      detail: `ta=${a.has_absence} tb=${b.has_absence} tc=${c.has_absence}`,
      evidence: { ta: a.has_absence, tb: b.has_absence, tc: c.has_absence, tc_n: c.n },
    });
  }

  // C-ABS-WALL-P: owner parents only; never other twin
  {
    const p1 = await signIn('parent_1');
    const p2 = await signIn('parent_2');
    const focusS1 = shapeItems((await rpcList(p1, 'parent', { childId: fx.s1Id })).data);
    const focusS2 = shapeItems((await rpcList(p1, 'parent', { childId: fx.s2Id })).data);
    const p2s1 = shapeItems((await rpcList(p2, 'parent', { childId: fx.s1Id })).data);
    const ok = focusS1.has_absence && !focusS2.has_absence && p2s1.has_absence;
    pushCase({
      case: 'C-ABS-WALL-P',
      role: 'parent owners + twin wall',
      result: ok ? 'PASS' : 'FAIL',
      detail: `p1_s1=${focusS1.has_absence} p1_s2_twin=${focusS2.has_absence} p2_owner_s1=${p2s1.has_absence}`,
      evidence: {
        p1_s1: focusS1.has_absence,
        p1_s2_twin_leak: focusS2.has_absence,
        p2_owner_sees: p2s1.has_absence,
      },
    });
  }

  // C-ABS-WALL-O: never office firehose
  {
    const office = await signIn('admin');
    const shape = shapeItems((await rpcList(office, 'office')).data);
    const ok = !shape.has_absence && shape.has_school;
    pushCase({
      case: 'C-ABS-WALL-O',
      role: 'office',
      result: ok ? 'PASS' : 'FAIL',
      detail: `has_absence=${shape.has_absence} has_school=${shape.has_school} n=${shape.n}`,
      evidence: { has_absence: shape.has_absence, has_school: shape.has_school, n: shape.n, titles: shape.titles_sorted },
    });
  }

  // C-ABS-WALL-S: student never sees own absence v1
  {
    const student = await signIn('student_s1');
    const shape = shapeItems((await rpcList(student, 'student')).data);
    const ok = !shape.has_absence;
    pushCase({
      case: 'C-ABS-WALL-S',
      role: 'student_s1',
      result: ok ? 'PASS' : 'FAIL',
      detail: `has_absence=${shape.has_absence} n=${shape.n}`,
      evidence: { has_absence: shape.has_absence, titles: shape.titles_sorted },
    });
  }

  // C-CR-A-01: create → list_calendar_items sees by hat (rollup)
  {
    const office = await signIn('admin');
    const teacher = await signIn('teacher_a');
    const student = await signIn('student_s1');
    const parent = await signIn('parent_1');
    const o = shapeItems((await rpcList(office, 'office')).data);
    const t = shapeItems((await rpcList(teacher, 'teacher', { classId: MATH })).data);
    const s = shapeItems((await rpcList(student, 'student')).data);
    const p = shapeItems((await rpcList(parent, 'parent', { childId: fx.s1Id })).data);
    const ok =
      o.has_school &&
      !o.has_absence &&
      t.has_school &&
      t.has_class &&
      t.has_tPersonal &&
      t.has_absence &&
      s.has_class &&
      s.has_sPersonal &&
      !s.has_absence &&
      !s.has_tPersonal &&
      p.has_absence &&
      p.has_pPersonal &&
      p.has_class;
    pushCase({
      case: 'C-CR-A-01',
      role: 'all hats list after create',
      result: ok ? 'PASS' : 'FAIL',
      detail: `o_school=${o.has_school} t_class=${t.has_class} t_abs=${t.has_absence} s_class=${s.has_class} s_no_abs=${!s.has_absence} p_abs=${p.has_absence}`,
      evidence: {
        office: { has_school: o.has_school, has_absence: o.has_absence },
        teacher: {
          has_school: t.has_school,
          has_class: t.has_class,
          has_tPersonal: t.has_tPersonal,
          has_absence: t.has_absence,
        },
        student: {
          has_class: s.has_class,
          has_sPersonal: s.has_sPersonal,
          has_absence: s.has_absence,
          has_tPersonal: s.has_tPersonal,
        },
        parent: {
          has_absence: p.has_absence,
          has_pPersonal: p.has_pPersonal,
          has_class: p.has_class,
        },
      },
    });
  }

  // ---- Phase B regression (reuse patterns) ----
  {
    const c = await signIn('student_s1');
    const res = await rpcList(c, 'student', {}, B_RANGE);
    const shape = shapeItems(res.data);
    const ok =
      res.status === 200 &&
      shape.hidden_n === 0 &&
      !shape.has_quiz_title &&
      shape.titles_sorted.includes('ditl-Math HW S1');
    pushCase({
      case: 'B-HAT-S',
      role: 'student_s1',
      result: ok ? 'PASS' : 'FAIL',
      detail: `status=${res.status} hidden_n=${shape.hidden_n} has_quiz=${shape.has_quiz_title} has_hw=${shape.titles_sorted.includes('ditl-Math HW S1')}`,
      evidence: { status: res.status, shape },
    });
  }
  {
    const c = await signIn('parent_1');
    const res = await rpcList(c, 'parent', { childId: fx.s1Id }, B_RANGE);
    const shape = shapeItems(res.data);
    const ok =
      res.status === 200 &&
      shape.hidden_n === 0 &&
      !shape.has_quiz_title &&
      shape.titles_sorted.includes('ditl-Math HW S1');
    pushCase({
      case: 'B-HAT-P',
      role: 'parent_1+s1',
      result: ok ? 'PASS' : 'FAIL',
      detail: `status=${res.status} hidden_n=${shape.hidden_n} has_quiz=${shape.has_quiz_title}`,
      evidence: { status: res.status, shape },
    });
  }
  {
    const c = await signIn('parent_1');
    const res = await rpcList(c, 'parent', { childId: null }, B_RANGE);
    const shape = shapeItems(res.data);
    const ok = fx.childIds.length >= 2 && res.status === 200 && shape.n === 0;
    pushCase({
      case: 'B-CH-A-01',
      role: 'parent_1',
      result: ok ? 'PASS' : 'FAIL',
      detail: `children_n=${fx.childIds.length} n=${shape.n} status=${res.status}`,
      evidence: { children_n: fx.childIds.length, status: res.status, n: shape.n },
    });
  }
  {
    const teacher = await signIn('teacher_a');
    const { data, error } = await teacher.rpc('list_hidden_calendar_dues', { p_class_id: MATH });
    const ok = !error && Array.isArray(data);
    pushCase({
      case: 'B-NEEDS-01',
      role: 'teacher_a',
      result: ok ? 'PASS' : 'FAIL',
      detail: ok
        ? `n=${data.length}`
        : `err=${error?.code}:${(error?.message || '').slice(0, 120)}`,
      evidence: {
        ok,
        n: data?.length ?? 0,
        err: error ? { code: error.code, message: (error.message || '').slice(0, 160) } : null,
      },
    });
  }
  {
    // published-only: family never hidden quiz in Phase C range either (no quiz due in C range — use B range)
    const student = await signIn('student_s1');
    const parent = await signIn('parent_1');
    const s = shapeItems((await rpcList(student, 'student', {}, B_RANGE)).data);
    const p = shapeItems((await rpcList(parent, 'parent', { childId: fx.s1Id }, B_RANGE)).data);
    const ok = s.hidden_n === 0 && p.hidden_n === 0 && !s.has_quiz_title && !p.has_quiz_title;
    pushCase({
      case: 'B-S2-04',
      role: 'family published-only',
      result: ok ? 'PASS' : 'FAIL',
      detail: `s_hidden=${s.hidden_n} p_hidden=${p.hidden_n} quiz_leak=${s.has_quiz_title || p.has_quiz_title}`,
      evidence: { s_hidden: s.hidden_n, p_hidden: p.hidden_n, s_quiz: s.has_quiz_title, p_quiz: p.has_quiz_title },
    });
  }
}

async function main() {
  evidence.ran_at_ct = nowCt();
  const svc = serviceClient();
  const fx = await resolveIds(svc);
  evidence.sql_gate = await sqlGate();
  if (!evidence.sql_gate.ok) {
    evidence.overall = 'FAIL';
    evidence.suggested_defects.push({
      sev: 'P0',
      title: 'DEFECT [P0]: Phase C SQL gate failed — create_calendar_event / list_calendar_items not live',
      repro: JSON.stringify(evidence.sql_gate),
      hat: 'n/a',
      expected: 'Phase C RPCs present after t_d405e090 SQL apply',
      actual: JSON.stringify(evidence.sql_gate),
      evidence: 'calendar-r2-phase-c-live-jwt-evidence.json sql_gate',
    });
  } else {
    await runCases(fx);
  }
  const fail_n = evidence.cases.filter((c) => c.result === 'FAIL').length;
  const pass_n = evidence.cases.filter((c) => c.result === 'PASS').length;
  evidence.pass_n = pass_n;
  evidence.fail_n = fail_n;
  evidence.overall = evidence.sql_gate?.ok && fail_n === 0 ? 'PASS' : 'FAIL';
  evidence.summary = Object.fromEntries(evidence.cases.map((c) => [c.case, c.result]));

  const outPath = path.join(ROOT, 'notes/company/calendar-r2-phase-c-live-jwt-evidence.json');
  fs.writeFileSync(outPath, JSON.stringify(evidence, null, 2) + '\n');
  // Safe stdout: no secrets
  console.log(
    JSON.stringify({
      overall: evidence.overall,
      pass_n,
      fail_n,
      sql_gate: evidence.sql_gate?.ok,
      summary: evidence.summary,
      out: outPath,
      ran_at_ct: evidence.ran_at_ct,
      id_prefixes: evidence.id_prefixes,
      created_event_ids: evidence.created_event_ids,
    }),
  );
}

main().catch((e) => {
  console.error('RUN_FAILED', (e && e.message) || String(e));
  process.exit(1);
});
