/**
 * CAL-R2 Phase D live JWT prove-out (t_90517013).
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
const SCHOOL = 'd1715000-0000-4000-a000-000000000001';

const RANGE = {
  from: '2026-09-20T00:00:00.000Z',
  to: '2026-09-28T00:00:00.000Z',
};
const B_RANGE = {
  from: '2026-09-14T00:00:00.000Z',
  to: '2026-09-21T00:00:00.000Z',
};
const D_RANGE = {
  from: '2026-09-26T00:00:00.000Z',
  to: '2026-10-05T00:00:00.000Z',
};

const ACCOUNTS = {
  admin: { email: 'ditl-admin@ditl.test', pass: 'DITL-admin-test' },
  teacher_a: { email: 'ditl-teacher-a@ditl.test', pass: 'DITL-teacher-test' },
  teacher_c: { email: 'ditl-teacher-c@ditl.test', pass: 'DITL-teacher-test' },
  student_s1: { email: 'ditl-student-s1@ditl.test', pass: 'DITL-student-test' },
  student_s2: { email: 'ditl-student-s2@ditl.test', pass: 'DITL-student-test' },
  parent_1: { email: 'ditl-parent-1@ditl.test', pass: 'DITL-parent-test' },
};

const TITLES = {
  optedGame: 'ditl-PhaseD Soccer Game',
  nonOptedGame: 'ditl-PhaseD Track Meet',
  classEvent: 'ditl-PhaseD Class Field Trip',
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

function shapeLayers(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const byKind = {};
  for (const r of list) byKind[r.kind] = (byKind[r.kind] || 0) + 1;
  const teams = list.filter((r) => r.kind === 'team');
  return {
    n: list.length,
    byKind,
    kinds_sorted: [...new Set(list.map((r) => r.kind))].sort(),
    names_sorted: list.map((r) => r.name).filter(Boolean).sort(),
    team_names: teams.map((t) => t.name).sort(),
    team_default_enabled: teams.map((t) => !!t.default_enabled),
    team_can_unsub: teams.map((t) => !!t.can_unsubscribe),
    has_class_work: list.some((r) => r.kind === 'class_work'),
    has_class: list.some((r) => r.kind === 'class'),
    has_school: list.some((r) => r.kind === 'school'),
    has_personal: list.some((r) => r.kind === 'personal'),
    has_team: teams.length > 0,
    keys_sample: list[0] ? Object.keys(list[0]).sort() : [],
    layers: list.map((r) => ({
      id: r.id?.slice?.(0, 8) || null,
      kind: r.kind,
      name: r.name,
      default_enabled: !!r.default_enabled,
      can_unsubscribe: !!r.can_unsubscribe,
      is_read_only: !!r.is_read_only,
      class_id: r.class_id?.slice?.(0, 8) || null,
    })),
  };
}

function shapeItems(rows) {
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
  return {
    n: list.length,
    titles_sorted: titles,
    hidden_n,
    vis,
    kinds,
    has_quiz_title: titles.includes('ditl-Math Quiz'),
    has_optedGame: titles.includes(TITLES.optedGame),
    has_nonOptedGame: titles.includes(TITLES.nonOptedGame),
    has_classEvent: titles.includes(TITLES.classEvent),
    has_absence: titles.includes(TITLES.absence),
    has_math_hw: titles.includes('ditl-Math HW S1'),
    keys_sample: list[0] ? Object.keys(list[0]).sort() : [],
    by_calendar_id: list.reduce((a, r) => {
      const id = r.calendar_id?.slice?.(0, 8) || 'null';
      a[id] = (a[id] || 0) + 1;
      return a;
    }, {}),
  };
}

async function rpcListCalendars(client, seat, childId = null) {
  const { data, error } = await client.rpc('list_calendars', {
    p_seat: seat,
    p_child_student_id: childId,
  });
  return {
    status: error ? 400 : 200,
    data: data ?? [],
    error: error ? { message: error.message, code: error.code } : null,
  };
}

async function rpcList(client, seat, opts = {}, range = RANGE) {
  const { data, error } = await client.rpc('list_calendar_items', {
    p_from: range.from,
    p_to: range.to,
    p_seat: seat,
    p_class_id: opts.classId ?? null,
    p_child_student_id: opts.childId ?? null,
    p_categories: opts.categories ?? null,
    p_calendar_ids: opts.calendarIds ?? null,
  });
  return {
    status: error ? 400 : 200,
    data: data ?? [],
    error: error ? { message: error.message, code: error.code } : null,
  };
}

async function rpcUnsubscribe(client, seat, calendarId, childId = null) {
  const { error } = await client.rpc('unsubscribe_team', {
    p_seat: seat,
    p_calendar_id: calendarId,
    p_child_student_id: childId,
  });
  return {
    ok: !error,
    err: error ? { code: error.code, message: (error.message || '').slice(0, 160) } : null,
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
        }
      : null,
    err: error ? { code: error.code, message: (error.message || '').slice(0, 160) } : null,
  };
}

// ---- Client prefs/filters (mirror PR 111; filters ≠ security) ----
function defaultCategoryChipIds() {
  return ['academic', 'school', 'personal'];
}
function defaultEnabledCalendarIds(layers) {
  return layers.filter((l) => l.default_enabled && l.kind !== 'team').map((l) => l.id);
}
function applyPreset(preset, layers) {
  switch (preset) {
    case 'all_academic':
      return {
        categoryChipIds: ['academic'],
        enabledCalendarIds: layers
          .filter((l) => l.kind === 'class' || l.kind === 'class_work' || l.role_tint === 'academic')
          .map((l) => l.id),
      };
    case 'school_only':
      return {
        categoryChipIds: ['school'],
        enabledCalendarIds: layers.filter((l) => l.kind === 'school').map((l) => l.id),
      };
    case 'my_sports':
      return {
        categoryChipIds: ['sport'],
        enabledCalendarIds: layers.filter((l) => l.kind === 'team').map((l) => l.id),
      };
    case 'reset':
    default:
      return {
        categoryChipIds: defaultCategoryChipIds(),
        enabledCalendarIds: defaultEnabledCalendarIds(layers),
      };
  }
}
function filterItemsByEnabledLayers(items, enabledIds) {
  if (enabledIds == null) return items;
  const set = new Set(enabledIds);
  return items.filter((it) => set.has(it.calendar_id));
}
function calPrefsKey(profileId, seat, childStudentId) {
  const child = childStudentId && childStudentId.length ? childStudentId : 'none';
  return `calprefs:v1:${profileId}:${seat}:${child}`;
}

const evidence = {
  ran_at_ct: null,
  sql_gate: null,
  hermes_context: 't_90517013',
  migration:
    '20260917000000_calendar_r2_phase_d_sport.sql + 20260917000001_list_calendar_items_phase_d_team.sql',
  pr: '111 @ 411e50c',
  sql_apply: 't_decdbd1e both files HTTP 201',
  fixture_prep: [],
  id_prefixes: {},
  cases: [],
  suggested_defects: [],
  overall: null,
};

function pushCase(c) {
  evidence.cases.push(c);
  if (c.result === 'FAIL') {
    evidence.suggested_defects.push({
      sev: 'P1',
      title: `DEFECT [P1]: ${c.case} ${c.detail}`.slice(0, 180),
      repro: c.detail,
      hat: c.role,
      expected: 'PASS per Phase D LF-A / sport / filter≠security',
      actual: c.detail,
      evidence: 'calendar-r2-phase-d-live-jwt-evidence.json',
    });
  }
}

async function sqlGate() {
  const student = await signIn('student_s1');
  const layers = await student.rpc('list_calendars', { p_seat: 'student', p_child_student_id: null });
  const unsub = await student.rpc('unsubscribe_team', {
    p_seat: 'student',
    p_calendar_id: '00000000-0000-4000-a000-000000000000',
    p_child_student_id: null,
  });
  const listItems = await student.rpc('list_calendar_items', {
    p_from: D_RANGE.from,
    p_to: D_RANGE.to,
    p_seat: 'student',
    p_class_id: null,
    p_child_student_id: null,
    p_categories: null,
    p_calendar_ids: null,
  });
  const listOk = !layers.error;
  const unsubPresent = !/does not exist|PGRST202|Could not find the function/i.test(
    unsub.error?.message || '',
  );
  const itemsOk = !listItems.error;
  return {
    ok: listOk && unsubPresent && itemsOk,
    list_calendars_ok: listOk,
    unsubscribe_present: unsubPresent,
    list_items_ok: itemsOk,
    list_calendars_err: layers.error
      ? { code: layers.error.code, message: (layers.error.message || '').slice(0, 80) }
      : null,
    unsubscribe_probe_err: unsub.error
      ? { code: unsub.error.code, message: (unsub.error.message || '').slice(0, 80) }
      : null,
    list_items_err: listItems.error
      ? { code: listItems.error.code, message: (listItems.error.message || '').slice(0, 80) }
      : null,
  };
}

async function resolveAndFixture(svc) {
  const { data: parentAuth } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 });
  const users = parentAuth?.users || [];
  const byEmail = Object.fromEntries(users.map((u) => [u.email, u.id]));
  const parentId = byEmail['ditl-parent-1@ditl.test'];
  const s1Id = byEmail['ditl-student-s1@ditl.test'];
  const s2Id = byEmail['ditl-student-s2@ditl.test'];
  evidence.id_prefixes.parentAuth = parentId?.slice(0, 8) || null;
  evidence.id_prefixes.s1 = s1Id?.slice(0, 8) || null;
  evidence.id_prefixes.s2 = s2Id?.slice(0, 8) || null;
  evidence.id_prefixes.math = MATH.slice(0, 8);
  evidence.id_prefixes.school = SCHOOL.slice(0, 8);

  // Phase B publish walls for regression
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

  // Cleanup prior Phase D probe teams/events
  const priorTitles = [TITLES.optedGame, TITLES.nonOptedGame, TITLES.classEvent];
  const { data: priorEv } = await svc.from('calendar_events').select('id,title').in('title', priorTitles);
  if (priorEv?.length) {
    const { error } = await svc.from('calendar_events').delete().in(
      'id',
      priorEv.map((r) => r.id),
    );
    evidence.fixture_prep.push({
      title: 'cleanup_prior_phase_d_events',
      ok: !error,
      n: priorEv.length,
      err: error?.message || null,
    });
  }
  const { data: priorTeams } = await svc
    .from('calendar_teams')
    .select('id,name')
    .eq('school_id', SCHOOL)
    .in('name', ['ditl-PhaseD Soccer', 'ditl-PhaseD Track']);
  if (priorTeams?.length) {
    // members cascade; calendars cascade via team_id FK
    const { error } = await svc.from('calendar_teams').delete().in(
      'id',
      priorTeams.map((t) => t.id),
    );
    evidence.fixture_prep.push({
      title: 'cleanup_prior_phase_d_teams',
      ok: !error,
      n: priorTeams.length,
      err: error?.message || null,
    });
  }

  // Create opted + non-opted teams (trigger provisions calendars)
  const { data: soccer, error: soccerErr } = await svc
    .from('calendar_teams')
    .insert({ school_id: SCHOOL, name: 'ditl-PhaseD Soccer' })
    .select('id,name')
    .single();
  evidence.fixture_prep.push({
    title: 'create_soccer_team',
    ok: !soccerErr && !!soccer,
    n: soccer ? 1 : 0,
    err: soccerErr?.message || null,
  });
  const { data: track, error: trackErr } = await svc
    .from('calendar_teams')
    .insert({ school_id: SCHOOL, name: 'ditl-PhaseD Track' })
    .select('id,name')
    .single();
  evidence.fixture_prep.push({
    title: 'create_track_team',
    ok: !trackErr && !!track,
    n: track ? 1 : 0,
    err: trackErr?.message || null,
  });

  // Wait/provision calendars
  let soccerCal = null;
  let trackCal = null;
  for (let i = 0; i < 5; i++) {
    const { data: cals } = await svc
      .from('calendars')
      .select('id,kind,name,team_id,default_enabled,role_tint,is_read_only')
      .in('team_id', [soccer?.id, track?.id].filter(Boolean));
    soccerCal = (cals || []).find((c) => c.team_id === soccer?.id) || null;
    trackCal = (cals || []).find((c) => c.team_id === track?.id) || null;
    if (soccerCal && trackCal) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  evidence.fixture_prep.push({
    title: 'provision_team_calendars',
    ok: !!soccerCal && !!trackCal,
    n: (soccerCal ? 1 : 0) + (trackCal ? 1 : 0),
    err: !soccerCal || !trackCal ? 'missing_team_calendar_row' : null,
    soccer_def: soccerCal?.default_enabled ?? null,
    track_def: trackCal?.default_enabled ?? null,
  });
  evidence.id_prefixes.soccerTeam = soccer?.id?.slice(0, 8);
  evidence.id_prefixes.trackTeam = track?.id?.slice(0, 8);
  evidence.id_prefixes.soccerCal = soccerCal?.id?.slice(0, 8);
  evidence.id_prefixes.trackCal = trackCal?.id?.slice(0, 8);

  // Opt S1 into Soccer only (never Track). S2 not on Soccer.
  const { error: memErr } = await svc.from('calendar_team_members').insert({
    team_id: soccer.id,
    student_id: s1Id,
    role: 'member',
  });
  evidence.fixture_prep.push({
    title: 'opt_s1_soccer',
    ok: !memErr,
    n: 1,
    err: memErr?.message || null,
  });

  // Service-insert team events (create_calendar_event has no sport kind yet — read path only)
  async function insertTeamEvent(cal, teamId, title, starts) {
    const { data, error } = await svc
      .from('calendar_events')
      .insert({
        school_id: SCHOOL,
        calendar_id: cal.id,
        team_id: teamId,
        owner_profile_id: s1Id,
        seat: 'student',
        category: 'sport',
        title,
        starts_at: starts,
        all_day: true,
        visibility_scope: 'team',
        status: 'published',
        source: 'manual',
      })
      .select('id,title,visibility_scope,category,team_id,calendar_id')
      .single();
    evidence.fixture_prep.push({
      title: `event_${title}`,
      ok: !error && !!data,
      n: data ? 1 : 0,
      err: error?.message || null,
    });
    return data;
  }
  const optedEv = await insertTeamEvent(
    soccerCal,
    soccer.id,
    TITLES.optedGame,
    '2026-09-28T17:00:00.000Z',
  );
  const nonOptedEv = await insertTeamEvent(
    trackCal,
    track.id,
    TITLES.nonOptedGame,
    '2026-09-29T17:00:00.000Z',
  );
  evidence.id_prefixes.optedEv = optedEv?.id?.slice(0, 8);
  evidence.id_prefixes.nonOptedEv = nonOptedEv?.id?.slice(0, 8);

  // Class field-trip event on Math class layer (not class_work)
  const teacher = await signIn('teacher_a');
  const classEv = await createEvent(teacher, {
    p_seat: 'teacher',
    p_kind: 'class',
    p_title: TITLES.classEvent,
    p_starts_at: '2026-09-30T15:00:00.000Z',
    p_all_day: true,
    p_category: 'class',
    p_body: 'Phase D class_work disable probe',
    p_class_id: MATH,
    p_child_student_id: null,
  });
  evidence.fixture_prep.push({
    title: 'create_class_field_trip',
    ok: classEv.ok,
    n: classEv.ok ? 1 : 0,
    err: classEv.err?.message || null,
  });
  evidence.id_prefixes.classEv = classEv.id?.slice(0, 8);

  // Math class / class_work calendar ids
  const { data: mathLayers } = await svc
    .from('calendars')
    .select('id,kind,name,default_enabled')
    .eq('class_id', MATH);
  const classLayer = (mathLayers || []).find((c) => c.kind === 'class');
  const workLayer = (mathLayers || []).find((c) => c.kind === 'class_work');
  evidence.id_prefixes.mathClassCal = classLayer?.id?.slice(0, 8);
  evidence.id_prefixes.mathWorkCal = workLayer?.id?.slice(0, 8);

  // Ensure Phase C absence exists for regression (create if missing)
  const { data: absExisting } = await svc
    .from('calendar_events')
    .select('id,title')
    .eq('title', TITLES.absence)
    .maybeSingle();
  if (!absExisting) {
    const parent = await signIn('parent_1');
    const abs = await createEvent(parent, {
      p_seat: 'parent',
      p_kind: 'absence',
      p_title: TITLES.absence,
      p_starts_at: '2026-09-25T15:00:00.000Z',
      p_all_day: true,
      p_category: 'absence',
      p_body: 'Jordan out sick Phase D regression',
      p_class_id: null,
      p_child_student_id: s1Id,
    });
    evidence.fixture_prep.push({
      title: 'ensure_absence',
      ok: abs.ok,
      n: abs.ok ? 1 : 0,
      err: abs.err?.message || null,
    });
  } else {
    evidence.fixture_prep.push({ title: 'ensure_absence', ok: true, n: 1, err: null, action: 'reuse' });
  }

  return {
    s1Id,
    s2Id,
    parentId,
    soccer,
    track,
    soccerCal,
    trackCal,
    classLayer,
    workLayer,
    classEvId: classEv.id,
  };
}

async function runCases(fx) {
  // D-LIST-01: list_calendars stable layers + live shape (Disable/Enable = default_enabled + client prefs)
  {
    const student = await signIn('student_s1');
    const teacher = await signIn('teacher_a');
    const parent = await signIn('parent_1');
    const office = await signIn('admin');
    const s = shapeLayers((await rpcListCalendars(student, 'student')).data);
    const t = shapeLayers((await rpcListCalendars(teacher, 'teacher')).data);
    const p = shapeLayers((await rpcListCalendars(parent, 'parent', fx.s1Id)).data);
    const o = shapeLayers((await rpcListCalendars(office, 'office')).data);
    const keysOk =
      s.keys_sample.includes('default_enabled') &&
      s.keys_sample.includes('can_unsubscribe') &&
      s.keys_sample.includes('kind') &&
      s.keys_sample.includes('name');
    const studentHasStable =
      s.has_school && s.has_class && s.has_class_work && s.has_personal && keysOk;
    const officeSchoolOnly =
      o.has_school && !o.has_class && !o.has_class_work && !o.has_personal && !o.has_team;
    const ok = studentHasStable && t.has_school && p.has_school && officeSchoolOnly;
    pushCase({
      case: 'D-LIST-01',
      role: 'all seats list_calendars',
      result: ok ? 'PASS' : 'FAIL',
      detail: `s_n=${s.n} s_kinds=${s.kinds_sorted.join(',')} t_n=${t.n} p_n=${p.n} o_kinds=${o.kinds_sorted.join(',')} keys=${s.keys_sample.join(',')}`,
      evidence: { student: s, teacher_n: t.n, parent_n: p.n, office: o },
    });
  }

  // D-SPORT-OFF-01: sport/team default_enabled false; presets leave sport off until My sports / opt
  {
    const student = await signIn('student_s1');
    const layers = (await rpcListCalendars(student, 'student')).data;
    const shape = shapeLayers(layers);
    const soccer = layers.find((l) => l.name === 'ditl-PhaseD Soccer');
    const track = layers.find((l) => l.name === 'ditl-PhaseD Track');
    const reset = applyPreset('reset', layers);
    const academic = applyPreset('all_academic', layers);
    const schoolOnly = applyPreset('school_only', layers);
    const sports = applyPreset('my_sports', layers);
    const sportOffDefaults =
      !!soccer &&
      soccer.default_enabled === false &&
      !track && // non-opted team not listed
      !reset.enabledCalendarIds.includes(soccer.id) &&
      !academic.enabledCalendarIds.includes(soccer.id) &&
      !schoolOnly.enabledCalendarIds.includes(soccer.id) &&
      !defaultCategoryChipIds().includes('sport');
    const mySportsOptsIn =
      sports.categoryChipIds.includes('sport') &&
      sports.enabledCalendarIds.includes(soccer.id) &&
      sports.enabledCalendarIds.length === 1;
    const ok = sportOffDefaults && mySportsOptsIn && shape.team_can_unsub.every(Boolean);
    pushCase({
      case: 'D-SPORT-OFF-01',
      role: 'student_s1 presets',
      result: ok ? 'PASS' : 'FAIL',
      detail: `soccer_listed=${!!soccer} soccer_def=${soccer?.default_enabled} track_listed=${!!track} reset_has_team=${reset.enabledCalendarIds.includes(soccer?.id)} my_sports=${sports.enabledCalendarIds.length} can_unsub=${shape.team_can_unsub}`,
      evidence: {
        soccer: soccer
          ? {
              id: soccer.id.slice(0, 8),
              default_enabled: soccer.default_enabled,
              can_unsubscribe: soccer.can_unsubscribe,
            }
          : null,
        track_listed: !!track,
        reset_n: reset.enabledCalendarIds.length,
        my_sports_ids: sports.enabledCalendarIds.map((id) => id.slice(0, 8)),
        chips_default: defaultCategoryChipIds(),
      },
    });
  }

  // D-UNSUB-01: Unsubscribe confirms path (RPC); never Delete events; prefs key per CH-A child
  {
    const student = await signIn('student_s1');
    const before = (await rpcListCalendars(student, 'student')).data;
    const soccer = before.find((l) => l.name === 'ditl-PhaseD Soccer');
    const parentKeyS1 = calPrefsKey(fx.parentId, 'parent', fx.s1Id);
    const parentKeyS2 = calPrefsKey(fx.parentId, 'parent', fx.s2Id);
    const prefsIsolated = parentKeyS1 !== parentKeyS2 && /child-a|parent:/.test('x') === false
      ? parentKeyS1.includes(fx.s1Id) && parentKeyS2.includes(fx.s2Id)
      : parentKeyS1 !== parentKeyS2;

    // wrong calendar (class) must fail — never deletes
    const bad = await rpcUnsubscribe(student, 'student', fx.classLayer.id);
    const { data: classStill } = await serviceClient()
      .from('calendars')
      .select('id')
      .eq('id', fx.classLayer.id)
      .maybeSingle();

    // parent unsub requires focused child when 2+
    const parent = await signIn('parent_1');
    const parentMissingChild = await rpcUnsubscribe(parent, 'parent', soccer.id, null);
    const parentWrongTwin = await rpcUnsubscribe(parent, 'parent', soccer.id, fx.s2Id);

    // student unsubscribe soccer
    const unsub = soccer ? await rpcUnsubscribe(student, 'student', soccer.id) : { ok: false, err: { message: 'no soccer' } };
    const after = shapeLayers((await rpcListCalendars(student, 'student')).data);
    // events remain for others (row still exists)
    const { data: evStill } = await serviceClient()
      .from('calendar_events')
      .select('id,title')
      .eq('title', TITLES.optedGame)
      .maybeSingle();

    // Re-opt S1 for subsequent cases
    const { error: reoptErr } = await serviceClient().from('calendar_team_members').insert({
      team_id: fx.soccer.id,
      student_id: fx.s1Id,
      role: 'member',
    });
    evidence.fixture_prep.push({
      title: 'reopt_s1_after_unsub',
      ok: !reoptErr,
      n: 1,
      err: reoptErr?.message || null,
    });

    const ok =
      !!soccer &&
      soccer.can_unsubscribe === true &&
      !bad.ok &&
      !!classStill &&
      !parentMissingChild.ok &&
      unsub.ok &&
      !after.team_names.includes('ditl-PhaseD Soccer') &&
      !!evStill &&
      prefsIsolated &&
      !parentWrongTwin.ok; // s2 not a member — unsub of non-member is ok vacuously but should not error elevating; accept ok or not-member
    // Actually parentWrongTwin on s2 who isn't member: delete affects 0 rows — RPC may still succeed.
    // Tighten: parentMissingChild must fail with child required.
    const ok2 =
      !!soccer &&
      soccer.can_unsubscribe === true &&
      !bad.ok &&
      !!classStill &&
      !parentMissingChild.ok &&
      /child required/i.test(parentMissingChild.err?.message || '') &&
      unsub.ok &&
      !after.team_names.includes('ditl-PhaseD Soccer') &&
      !!evStill &&
      prefsIsolated;
    pushCase({
      case: 'D-UNSUB-01',
      role: 'student+parent CH-A',
      result: ok2 ? 'PASS' : 'FAIL',
      detail: `can_unsub=${soccer?.can_unsubscribe} bad_class=${!bad.ok} class_intact=${!!classStill} parent_need_child=${!parentMissingChild.ok} msg=${parentMissingChild.err?.message || null} unsub=${unsub.ok} layer_gone=${!after.team_names.includes('ditl-PhaseD Soccer')} event_remains=${!!evStill} prefs_iso=${prefsIsolated}`,
      evidence: {
        bad_class: bad,
        parent_missing_child: parentMissingChild,
        unsub,
        after_teams: after.team_names,
        event_remains: !!evStill,
        prefs_keys: { s1: parentKeyS1.replace(fx.parentId, 'parent…').replace(fx.s1Id, 's1…'), s2: parentKeyS2.replace(fx.parentId, 'parent…').replace(fx.s2Id, 's2…') },
      },
    });
  }

  // D-FILTER-SEC-01: filters ≠ security — hidden / absence walls hold under category + forged calendar_ids
  {
    const student = await signIn('student_s1');
    const forged = '00000000-0000-4000-a000-00000000ffff';
    const withCats = await rpcList(
      student,
      'student',
      { categories: ['quiz', 'test', 'homework', 'sport', 'absence'] },
      B_RANGE,
    );
    const withForge = await rpcList(
      student,
      'student',
      { calendarIds: [forged, fx.soccerCal?.id].filter(Boolean) },
      D_RANGE,
    );
    const sShapeB = shapeItems(withCats.data);
    const sShapeD = shapeItems(withForge.data);
    const parent = await signIn('parent_1');
    const pS2 = shapeItems(
      (
        await rpcList(parent, 'parent', { childId: fx.s2Id, categories: ['absence', 'sport'] }, RANGE)
      ).data,
    );
    const office = await signIn('admin');
    const oShape = shapeItems(
      (await rpcList(office, 'office', { categories: ['absence', 'sport', 'class'] }, RANGE)).data,
    );
    const ok =
      withCats.status === 200 &&
      sShapeB.hidden_n === 0 &&
      !sShapeB.has_quiz_title &&
      !sShapeD.has_nonOptedGame && // forged/opt filter never elevates Track
      !pS2.has_absence && // twin wall
      !oShape.has_absence;
    pushCase({
      case: 'D-FILTER-SEC-01',
      role: 'filters≠security',
      result: ok ? 'PASS' : 'FAIL',
      detail: `student_hidden=${sShapeB.hidden_n} quiz=${sShapeB.has_quiz_title} forge_nonopted=${sShapeD.has_nonOptedGame} twin_abs=${pS2.has_absence} office_abs=${oShape.has_absence}`,
      evidence: {
        student_b: { hidden_n: sShapeB.hidden_n, has_quiz: sShapeB.has_quiz_title, n: sShapeB.n },
        student_forge: {
          has_opted: sShapeD.has_optedGame,
          has_nonopted: sShapeD.has_nonOptedGame,
          n: sShapeD.n,
        },
        parent_s2_abs: pS2.has_absence,
        office_abs: oShape.has_absence,
      },
    });
  }

  // D-TEAM-READ-01: opted team events readable; non-opted not
  {
    const student = await signIn('student_s1');
    const s2 = await signIn('student_s2');
    const parent = await signIn('parent_1');
    const s1 = shapeItems((await rpcList(student, 'student', {}, D_RANGE)).data);
    const s2shape = shapeItems((await rpcList(s2, 'student', {}, D_RANGE)).data);
    const p1 = shapeItems((await rpcList(parent, 'parent', { childId: fx.s1Id }, D_RANGE)).data);
    const p2focus = shapeItems((await rpcList(parent, 'parent', { childId: fx.s2Id }, D_RANGE)).data);
    const layersS1 = shapeLayers((await rpcListCalendars(student, 'student')).data);
    const layersS2 = shapeLayers((await rpcListCalendars(s2, 'student')).data);
    const ok =
      s1.has_optedGame &&
      !s1.has_nonOptedGame &&
      !s2shape.has_optedGame &&
      !s2shape.has_nonOptedGame &&
      p1.has_optedGame &&
      !p1.has_nonOptedGame &&
      !p2focus.has_optedGame &&
      layersS1.team_names.includes('ditl-PhaseD Soccer') &&
      !layersS1.team_names.includes('ditl-PhaseD Track') &&
      !layersS2.team_names.includes('ditl-PhaseD Soccer');
    pushCase({
      case: 'D-TEAM-READ-01',
      role: 'opted vs non-opted',
      result: ok ? 'PASS' : 'FAIL',
      detail: `s1_opted=${s1.has_optedGame} s1_track=${s1.has_nonOptedGame} s2_soccer=${s2shape.has_optedGame} p_s1=${p1.has_optedGame} p_s2=${p2focus.has_optedGame} layers_s1=${layersS1.team_names.join(',')} layers_s2=${layersS2.team_names.join(',')}`,
      evidence: {
        s1,
        s2: { has_optedGame: s2shape.has_optedGame, has_nonOptedGame: s2shape.has_nonOptedGame, n: s2shape.n },
        parent_s1: { has_optedGame: p1.has_optedGame, has_nonOptedGame: p1.has_nonOptedGame },
        parent_s2: { has_optedGame: p2focus.has_optedGame },
        layers_s1: layersS1.team_names,
        layers_s2: layersS2.team_names,
      },
    });
  }

  // D-CLASSWORK-01: Disable class_work ≠ hide class events
  {
    const student = await signIn('student_s1');
    const listed = await rpcList(student, 'student', {}, D_RANGE);
    const items = listed.data || [];
    const classEv = items.find((r) => r.title === TITLES.classEvent);
    const hw = (await rpcList(student, 'student', {}, B_RANGE)).data.find(
      (r) => r.title === 'ditl-Math HW S1',
    );
    const classCalId = fx.classLayer?.id;
    const workCalId = fx.workLayer?.id;
    // Disable class_work only
    const filtered = filterItemsByEnabledLayers(items, [classCalId].filter(Boolean));
    const stillHasClass = filtered.some((r) => r.title === TITLES.classEvent);
    const droppedWork = !filtered.some(
      (r) => r.calendar_id === workCalId && r.source === 'assignment',
    );
    const ok =
      listed.status === 200 &&
      !!classEv &&
      classEv.calendar_id === classCalId &&
      (!!hw ? hw.calendar_id === workCalId : true) &&
      stillHasClass &&
      classCalId !== workCalId;
    pushCase({
      case: 'D-CLASSWORK-01',
      role: 'student class vs class_work',
      result: ok ? 'PASS' : 'FAIL',
      detail: `classEv_cal=${classEv?.calendar_id?.slice(0, 8)} expect_class=${classCalId?.slice(0, 8)} hw_cal=${hw?.calendar_id?.slice(0, 8)} expect_work=${workCalId?.slice(0, 8)} disable_work_keeps_class=${stillHasClass} distinct=${classCalId !== workCalId}`,
      evidence: {
        classEv: classEv
          ? { calendar_id: classEv.calendar_id?.slice(0, 8), source: classEv.source }
          : null,
        hw: hw ? { calendar_id: hw.calendar_id?.slice(0, 8), source: hw.source } : null,
        filtered_titles: filtered.map((r) => r.title).sort(),
        dropped_work_assignments_in_filter: droppedWork,
      },
    });
  }

  // ---- Phase B/C regression MUST ----
  {
    const student = await signIn('student_s1');
    const shape = shapeItems((await rpcList(student, 'student', {}, B_RANGE)).data);
    const ok =
      shape.hidden_n === 0 && !shape.has_quiz_title && shape.has_math_hw;
    pushCase({
      case: 'B-HAT-S',
      role: 'student_s1 regression',
      result: ok ? 'PASS' : 'FAIL',
      detail: `hidden_n=${shape.hidden_n} quiz=${shape.has_quiz_title} hw=${shape.has_math_hw}`,
      evidence: shape,
    });
  }
  {
    const parent = await signIn('parent_1');
    const shape = shapeItems(
      (await rpcList(parent, 'parent', { childId: fx.s1Id }, B_RANGE)).data,
    );
    const ok = shape.hidden_n === 0 && !shape.has_quiz_title && shape.has_math_hw;
    pushCase({
      case: 'B-HAT-P',
      role: 'parent_1 regression',
      result: ok ? 'PASS' : 'FAIL',
      detail: `hidden_n=${shape.hidden_n} quiz=${shape.has_quiz_title} hw=${shape.has_math_hw}`,
      evidence: { hidden_n: shape.hidden_n, has_quiz: shape.has_quiz_title, has_math_hw: shape.has_math_hw, n: shape.n },
    });
  }
  {
    const parent = await signIn('parent_1');
    const missing = shapeItems((await rpcList(parent, 'parent', {}, B_RANGE)).data);
    const ok = missing.n === 0;
    pushCase({
      case: 'B-CH-A-01',
      role: 'parent missing childId',
      result: ok ? 'PASS' : 'FAIL',
      detail: `n=${missing.n}`,
      evidence: { n: missing.n, titles: missing.titles_sorted },
    });
  }
  {
    const teacher = await signIn('teacher_a');
    const { data, error } = await teacher.rpc('list_hidden_calendar_dues', { p_class_id: MATH });
    const ok = !error;
    pushCase({
      case: 'B-NEEDS-01',
      role: 'teacher_a list_hidden',
      result: ok ? 'PASS' : 'FAIL',
      detail: `ok=${ok} n=${Array.isArray(data) ? data.length : 0} err=${error?.message || null}`,
      evidence: {
        ok,
        n: Array.isArray(data) ? data.length : 0,
        err: error ? { code: error.code, message: (error.message || '').slice(0, 80) } : null,
      },
    });
  }
  {
    // absence walls sample
    const teacher = await signIn('teacher_a');
    const teacherC = await signIn('teacher_c');
    const student = await signIn('student_s1');
    const office = await signIn('admin');
    const parent = await signIn('parent_1');
    const ta = shapeItems((await rpcList(teacher, 'teacher', { classId: MATH }, RANGE)).data);
    const tc = shapeItems((await rpcList(teacherC, 'teacher', {}, RANGE)).data);
    const s = shapeItems((await rpcList(student, 'student', {}, RANGE)).data);
    const o = shapeItems((await rpcList(office, 'office', {}, RANGE)).data);
    const pS2 = shapeItems((await rpcList(parent, 'parent', { childId: fx.s2Id }, RANGE)).data);
    const ok = ta.has_absence && !tc.has_absence && !s.has_absence && !o.has_absence && !pS2.has_absence;
    pushCase({
      case: 'C-ABS-WALLS',
      role: 'absence walls regression',
      result: ok ? 'PASS' : 'FAIL',
      detail: `ta=${ta.has_absence} tc=${tc.has_absence} s=${s.has_absence} o=${o.has_absence} twin=${pS2.has_absence}`,
      evidence: {
        ta: ta.has_absence,
        tc: tc.has_absence,
        student: s.has_absence,
        office: o.has_absence,
        twin: pS2.has_absence,
      },
    });
  }
  {
    // publish still present
    const teacher = await signIn('teacher_a');
    const pub = await teacher.rpc('publish_assignment_to_calendar', {
      p_assignment_id: '00000000-0000-4000-a000-000000000000',
    });
    const present = !/does not exist|PGRST202|Could not find the function/i.test(pub.error?.message || '');
    pushCase({
      case: 'B-PUBLISH-RPC',
      role: 'teacher publish rpc present',
      result: present ? 'PASS' : 'FAIL',
      detail: `present=${present} err=${(pub.error?.message || '').slice(0, 80)}`,
      evidence: {
        present,
        err: pub.error ? { code: pub.error.code, message: (pub.error.message || '').slice(0, 80) } : null,
      },
    });
  }
}

async function main() {
  evidence.ran_at_ct = nowCt();
  evidence.sql_gate = await sqlGate();
  if (!evidence.sql_gate.ok) {
    evidence.overall = 'FAIL';
    pushCase({
      case: 'D-SQL-GATE',
      role: 'gate',
      result: 'FAIL',
      detail: JSON.stringify(evidence.sql_gate),
      evidence: evidence.sql_gate,
    });
  } else {
    pushCase({
      case: 'D-SQL-GATE',
      role: 'gate',
      result: 'PASS',
      detail: 'list_calendars + unsubscribe_team + list_calendar_items present',
      evidence: evidence.sql_gate,
    });
  }

  const svc = serviceClient();
  const fx = await resolveAndFixture(svc);
  await runCases(fx);

  const fails = evidence.cases.filter((c) => c.result === 'FAIL');
  evidence.overall = fails.length === 0 ? 'PASS' : 'FAIL';

  const outPath = path.join(ROOT, 'notes/company/calendar-r2-phase-d-live-jwt-evidence.json');
  fs.writeFileSync(outPath, JSON.stringify(evidence, null, 2));
  console.log(
    JSON.stringify(
      {
        overall: evidence.overall,
        ran_at_ct: evidence.ran_at_ct,
        pass: evidence.cases.filter((c) => c.result === 'PASS').map((c) => c.case),
        fail: fails.map((c) => ({ case: c.case, detail: c.detail })),
        out: outPath,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error('RUNNER_ERROR', e?.message || String(e));
  process.exit(1);
});
