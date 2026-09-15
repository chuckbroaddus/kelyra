/**
 * CAL-R2 Phase B live JWT prove-out (t_421756a9 LIVE2).
 * Never prints JWTs / service keys / passwords.
 */
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { createRequire } from 'module';
import { execSync } from 'child_process';

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
const BRANCH = 'origin/feature/cal-r2-phase-b-t_687f235a';
const RANGE = {
  from: '2026-09-14T00:00:00.000Z',
  to: '2026-09-21T00:00:00.000Z',
};
const ACCOUNTS = {
  teacher_a: { email: 'ditl-teacher-a@ditl.test', pass: 'DITL-teacher-test' },
  student_s1: { email: 'ditl-student-s1@ditl.test', pass: 'DITL-student-test' },
  parent_1: { email: 'ditl-parent-1@ditl.test', pass: 'DITL-parent-test' },
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
    has_probe: titles.includes('ditl-PhaseB Publish Probe'),
    has_assign_probe: titles.includes('ditl-PhaseB Assign NoUnhide'),
    keys_sample: list[0] ? Object.keys(list[0]).sort() : [],
  };
}
async function rpcList(client, seat, opts = {}) {
  const { data, error } = await client.rpc('list_calendar_items', {
    p_from: RANGE.from,
    p_to: RANGE.to,
    p_seat: seat,
    p_class_id: opts.classId ?? null,
    p_child_student_id: opts.childId ?? null,
    p_categories: null,
    p_calendar_ids: null,
  });
  return { status: error ? 400 : 200, data: data ?? [], error: error ? { message: error.message, code: error.code } : null };
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

const evidence = {
  ran_at_ct: null,
  sql_gate: null,
  hermes_context: 't_421756a9',
  migration: '20260914000000_calendar_r2_phase_b_publish.sql + 20260915000000_list_hidden_calendar_dues_teacher_id.sql',
  fixture_prep: [],
  id_prefixes: {},
  cases: [],
  chrome_static: [],
  suggested_defects: [],
  overall: null,
};

async function ensureAssignment(svc, title, category, dueAt) {
  const { data: existing } = await svc.from('assignments').select('id,title,calendar_visibility,due_at,class_id').eq('title', title).maybeSingle();
  if (existing) {
    const { data, error } = await svc
      .from('assignments')
      .update({
        calendar_visibility: 'hidden',
        due_at: dueAt,
        calendar_published_at: null,
        calendar_published_by: null,
        class_id: MATH,
        category,
      })
      .eq('id', existing.id)
      .select('id,title,calendar_visibility,due_at,class_id')
      .single();
    evidence.fixture_prep.push({ title, ok: !error && !!data, n: data ? 1 : 0, err: error?.message || null, vis: 'hidden', action: 'reset' });
    return data;
  }
  const { data, error } = await svc
    .from('assignments')
    .insert({
      title,
      class_id: MATH,
      category,
      kind: 'planned',
      due_at: dueAt,
      calendar_visibility: 'hidden',
    })
    .select('id,title,calendar_visibility,due_at,class_id')
    .single();
  evidence.fixture_prep.push({ title, ok: !error && !!data, n: data ? 1 : 0, err: error?.message || null, vis: 'hidden', action: 'create' });
  return data;
}

async function fixturePrep(svc) {
  const { data: parentAuth } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 });
  const users = parentAuth?.users || [];
  const byEmail = Object.fromEntries(users.map((u) => [u.email, u.id]));
  const parentId = byEmail['ditl-parent-1@ditl.test'];
  evidence.id_prefixes.parentAuth = parentId?.slice(0, 8) || null;

  const { data: links } = await svc.from('parent_students').select('student_id').eq('parent_id', parentId);
  const childIds = (links || []).map((r) => r.student_id);
  const { data: kids } = await svc.from('profiles').select('id, display_name, username').in('id', childIds);
  const s1 = (kids || []).find((k) => /Jordan/i.test(k.display_name));
  const s2 = (kids || []).find((k) => /Jamie/i.test(k.display_name));
  evidence.id_prefixes.children_n = childIds.length;
  evidence.id_prefixes.s1 = s1?.id?.slice(0, 8);
  evidence.id_prefixes.s2 = s2?.id?.slice(0, 8);
  evidence.id_prefixes.math = MATH.slice(0, 8);

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
    evidence.fixture_prep.push({ title, ok: !error && (data?.length || 0) > 0, n: data?.length || 0, err: error?.message || null, vis });
    return data?.[0] || null;
  }

  const quiz = await setVis('ditl-Math Quiz', 'hidden', '2026-09-16T16:00:00.000Z');
  await setVis('ditl-Math HW S1', 'published', '2026-09-15T16:00:00.000Z');
  await setVis('ditl-English HW S1', 'published', '2026-09-17T16:00:00.000Z');
  const probe = await ensureAssignment(svc, 'ditl-PhaseB Publish Probe', 'homework', '2026-09-18T16:00:00.000Z');
  const assignProbe = await ensureAssignment(svc, 'ditl-PhaseB Assign NoUnhide', 'quiz', '2026-09-19T16:00:00.000Z');
  evidence.id_prefixes.quiz = quiz?.id?.slice(0, 8);
  evidence.id_prefixes.probe = probe?.id?.slice(0, 8);
  evidence.id_prefixes.assignProbe = assignProbe?.id?.slice(0, 8);

  return {
    childIds,
    s1Id: s1?.id,
    s2Id: s2?.id,
    quizId: quiz?.id,
    probeId: probe?.id,
    assignProbeId: assignProbe?.id,
  };
}

async function sqlGate() {
  const teacher = await signIn('teacher_a');
  const hidden = await teacher.rpc('list_hidden_calendar_dues', { p_class_id: MATH });
  const pub = await teacher.rpc('publish_assignment_to_calendar', {
    p_assignment_id: '00000000-0000-4000-a000-000000000000',
  });
  const hiddenBroken = !!hidden.error;
  const publishPresent = !/does not exist|PGRST202|Could not find the function/i.test(pub.error?.message || '');
  return {
    ok: publishPresent, // publish RPC is the critical write path; hidden list separately cased
    publish_rpc_present: publishPresent,
    list_hidden_ok: !hiddenBroken,
    list_hidden_err: hidden.error ? { code: hidden.error.code, message: (hidden.error.message || '').slice(0, 120) } : null,
    publish_probe_err: pub.error ? { code: pub.error.code, message: (pub.error.message || '').slice(0, 80) } : null,
  };
}

async function runCases(fx) {
  const cases = [];

  // B-HAT-S
  {
    const c = await signIn('student_s1');
    const res = await rpcList(c, 'student');
    const shape = shapeItems(res.data);
    const ok =
      res.status === 200 &&
      shape.hidden_n === 0 &&
      !shape.has_quiz_title &&
      !shape.has_probe &&
      !shape.has_assign_probe &&
      shape.titles_sorted.includes('ditl-Math HW S1');
    cases.push({
      case: 'B-HAT-S',
      role: 'student_s1',
      result: ok ? 'PASS' : 'FAIL',
      detail: `status=${res.status} shape=${JSON.stringify(shape)} err=${res.error?.message || null}`,
      evidence: { status: res.status, shape, err: res.error },
    });
  }

  // B-HAT-P
  {
    const c = await signIn('parent_1');
    const res = await rpcList(c, 'parent', { childId: fx.s1Id });
    const shape = shapeItems(res.data);
    const ok =
      res.status === 200 &&
      shape.hidden_n === 0 &&
      !shape.has_quiz_title &&
      !shape.has_probe &&
      shape.titles_sorted.includes('ditl-Math HW S1');
    cases.push({
      case: 'B-HAT-P',
      role: 'parent_1+s1',
      result: ok ? 'PASS' : 'FAIL',
      detail: `status=${res.status} shape=${JSON.stringify(shape)} err=${res.error?.message || null}`,
      evidence: { status: res.status, shape, err: res.error },
    });
  }

  // B-CH-A-01 missing childId empty
  {
    const c = await signIn('parent_1');
    const res = await rpcList(c, 'parent', { childId: null });
    const shape = shapeItems(res.data);
    const ok = fx.childIds.length >= 2 && res.status === 200 && shape.n === 0;
    cases.push({
      case: 'B-CH-A-01',
      role: 'parent_1',
      result: ok ? 'PASS' : 'FAIL',
      detail: `children_n=${fx.childIds.length} n=${shape.n} status=${res.status}`,
      evidence: { children_n: fx.childIds.length, status: res.status, shape },
    });
  }

  // B-CH-A-02 no twin merge / both focused scopes published-only
  {
    const c = await signIn('parent_1');
    const r1 = await rpcList(c, 'parent', { childId: fx.s1Id });
    const r2 = await rpcList(c, 'parent', { childId: fx.s2Id });
    const s1 = shapeItems(r1.data);
    const s2 = shapeItems(r2.data);
    const ok =
      r1.status === 200 &&
      r2.status === 200 &&
      s1.hidden_n === 0 &&
      s2.hidden_n === 0 &&
      !s1.has_quiz_title &&
      !s2.has_quiz_title;
    cases.push({
      case: 'B-CH-A-02',
      role: 'parent_1',
      result: ok ? 'PASS' : 'FAIL',
      detail: `s1_n=${s1.n} s2_n=${s2.n} hidden=${s1.hidden_n}/${s2.hidden_n}`,
      evidence: { s1, s2 },
    });
  }

  // B-NEEDS-01 list_hidden_calendar_dues (Needs Publish queue)
  {
    const teacher = await signIn('teacher_a');
    const { data, error } = await teacher.rpc('list_hidden_calendar_dues', { p_class_id: MATH });
    const ok = !error && Array.isArray(data);
    cases.push({
      case: 'B-NEEDS-01',
      role: 'teacher_a',
      result: ok ? 'PASS' : 'FAIL',
      detail: ok
        ? `n=${data.length} titles=${JSON.stringify(data.map((r) => r.title).sort())}`
        : `err=${error?.code}:${(error?.message || '').slice(0, 120)}`,
      evidence: {
        ok,
        n: data?.length ?? 0,
        err: error ? { code: error.code, message: (error.message || '').slice(0, 160) } : null,
      },
    });
    if (!ok) {
      evidence.suggested_defects.push({
        sev: 'P1',
        title: `DEFECT [P1]: list_hidden_calendar_dues failed after teacher_id FIX-NOW (${error?.code || 'unknown'})`,
        repro: `Teacher JWT rpc list_hidden_calendar_dues → ${error?.code}:${(error?.message || '').slice(0, 120)}`,
        hat: 'teacher',
        expected: 'HTTP/RPC success returning hidden dated dues for class_teacher_of (post 20260915000000)',
        actual: (error?.message || 'unknown').slice(0, 160),
        evidence: 'calendar-r2-phase-b-live-jwt-evidence.json B-NEEDS-01 LIVE2',
      });
    }
  }

  // B-PUB-01 publish then family sees
  {
    const teacher = await signIn('teacher_a');
    const beforeT = await rpcList(teacher, 'teacher', { classId: MATH });
    const tBefore = shapeItems(beforeT.data);
    const { data: pub, error: pubErr } = await teacher.rpc('publish_assignment_to_calendar', {
      p_assignment_id: fx.probeId,
    });
    const pubOk = !pubErr && pub?.calendar_visibility === 'published';

    const student = await signIn('student_s1');
    const afterS = shapeItems((await rpcList(student, 'student')).data);
    const parent = await signIn('parent_1');
    const afterP = shapeItems((await rpcList(parent, 'parent', { childId: fx.s1Id })).data);

    const ok =
      tBefore.has_probe &&
      tBefore.has_quiz_title &&
      pubOk &&
      afterS.has_probe &&
      !afterS.has_quiz_title &&
      afterS.hidden_n === 0 &&
      afterP.has_probe &&
      !afterP.has_quiz_title &&
      afterP.hidden_n === 0;

    cases.push({
      case: 'B-PUB-01',
      role: 'teacher→family',
      result: ok ? 'PASS' : 'FAIL',
      detail: `pubOk=${pubOk} pubVis=${pub?.calendar_visibility || null} pubErr=${pubErr?.message || null} student_probe=${afterS.has_probe} parent_probe=${afterP.has_probe} quiz_leak=${afterS.has_quiz_title || afterP.has_quiz_title}`,
      evidence: {
        teacher_before: tBefore,
        publish_vis: pub?.calendar_visibility || null,
        publish_err: pubErr ? { code: pubErr.code, message: (pubErr.message || '').slice(0, 120) } : null,
        student_after: afterS,
        parent_after: afterP,
      },
    });
  }

  // B-PUB-02 assign-to-roster does not unhide
  {
    const svc = serviceClient();
    // Ensure still hidden
    await svc
      .from('assignments')
      .update({ calendar_visibility: 'hidden', calendar_published_at: null, calendar_published_by: null })
      .eq('id', fx.assignProbeId);

    // Assign to roster via submissions cells (product assign path)
    const { data: roster } = await svc.from('enrollments').select('student_id').eq('class_id', MATH);
    const studentIds = (roster || []).map((r) => r.student_id).slice(0, 5);
    let rosterNote = 'no_roster';
    if (studentIds.length) {
      const rows = studentIds.map((student_id) => ({
        assignment_id: fx.assignProbeId,
        student_id,
        status: 'assigned',
      }));
      const { error: insErr } = await svc.from('submissions').upsert(rows, { onConflict: 'assignment_id,student_id' });
      rosterNote = insErr ? 'submissions_err:' + (insErr.message || '').slice(0, 80) : `submissions_upsert_n=${rows.length}`;
    }

    const { data: row } = await svc.from('assignments').select('calendar_visibility').eq('id', fx.assignProbeId).single();
    const student = await signIn('student_s1');
    const sShape = shapeItems((await rpcList(student, 'student')).data);
    const teacher = await signIn('teacher_a');
    const tShape = shapeItems((await rpcList(teacher, 'teacher', { classId: MATH })).data);

    const ok =
      row?.calendar_visibility === 'hidden' &&
      !sShape.has_assign_probe &&
      sShape.hidden_n === 0 &&
      tShape.has_assign_probe;

    cases.push({
      case: 'B-PUB-02',
      role: 'assign≠publish',
      result: ok ? 'PASS' : 'FAIL',
      detail: `vis=${row?.calendar_visibility} roster=${rosterNote} student_has=${sShape.has_assign_probe} teacher_has=${tShape.has_assign_probe}`,
      evidence: {
        assign_vis: row?.calendar_visibility || null,
        rosterNote,
        student_shape: sShape,
        teacher_has_assign_probe: tShape.has_assign_probe,
      },
    });
  }

  // Security law aliases
  {
    const s = cases.find((x) => x.case === 'B-HAT-S');
    const p = cases.find((x) => x.case === 'B-HAT-P');
    const pub = cases.find((x) => x.case === 'B-PUB-01');
    const assign = cases.find((x) => x.case === 'B-PUB-02');
    const cha = cases.find((x) => x.case === 'B-CH-A-01');
    cases.push({
      case: 'B-S1-02',
      role: 'derived',
      result: s?.result === 'PASS' && p?.result === 'PASS' && pub?.result === 'PASS' && assign?.result === 'PASS' ? 'PASS' : 'FAIL',
      detail: 'assign≠publish + family never hidden',
      evidence: { depends: ['B-HAT-S', 'B-HAT-P', 'B-PUB-01', 'B-PUB-02'] },
    });
    cases.push({
      case: 'B-S2-04',
      role: 'derived',
      result: s?.result === 'PASS' && p?.result === 'PASS' ? 'PASS' : 'FAIL',
      detail: 'family published-only',
      evidence: { depends: ['B-HAT-S', 'B-HAT-P'] },
    });
    cases.push({
      case: 'B-S1-03',
      role: 'derived',
      result: cha?.result === 'PASS' ? 'PASS' : 'FAIL',
      detail: 'parent missing childId empty',
      evidence: { depends: ['B-CH-A-01'] },
    });
  }

  return cases;
}

function chromeStatic() {
  function show(p) {
    try {
      return execSync(`git -C ${ROOT} show ${BRANCH}:${p}`, { encoding: 'utf8', maxBuffer: 5_000_000 });
    } catch {
      return '';
    }
  }
  function exists(p) {
    try {
      execSync(`git -C ${ROOT} cat-file -e ${BRANCH}:${p}`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
  const cal = show('src/app/calendar.tsx');
  const desk = show('src/app/class/[id]/index.tsx');
  const drawer = show('src/components/ui/HamburgerDrawer.tsx');
  const classTabs = show('src/components/ui/ClassTabs.tsx');
  const pkg = show('package.json');
  const rows = [];

  const agendaDay =
    /type PhoneView = 'agenda' \| 'day'/.test(cal) &&
    exists('src/components/calendar/AgendaList.tsx') &&
    exists('src/components/calendar/DayColumn.tsx') &&
    /label="Agenda"/.test(cal) &&
    /label="Day"/.test(cal);
  rows.push({
    case: 'B-VW-A',
    result: agendaDay ? 'PASS' : 'FAIL',
    detail: 'Phone Agenda+Day chips + AgendaList/DayColumn on PR branch',
  });

  const todayThisWeek =
    /label: 'Today'/.test(classTabs) && /label: 'This week'/.test(classTabs) && /DeskSpanTabs/.test(desk);
  const deskLink = /accessibilityLabel="Open Calendar"|Calendar<\/Text>/.test(desk) || /Calendar/.test(desk);
  const classTabKeys = [...classTabs.matchAll(/\{ key: '([^']+)', label: '([^']+)'/g)].map(m => m[1]+':'+m[2]);
  const trayCalendarPeer = classTabKeys.some(k => /calendar/i.test(k));
  rows.push({
    case: 'B-CE-A',
    result: todayThisWeek && deskLink && !trayCalendarPeer && /Calendar/.test(drawer) ? 'PASS' : 'FAIL',
    detail: `todayThisWeek=${todayThisWeek} deskLink=${!!deskLink} trayCalendarPeer=${trayCalendarPeer} keys=${JSON.stringify(classTabKeys)} drawer=${/Calendar/.test(drawer)}`,
  });

  // Dependencies only (ignore explanatory comments in source)
  const deps = JSON.stringify(JSON.parse(pkg).dependencies || {});
  const noFc = !/fullcalendar|react-big-calendar|@fullcalendar|expo-calendar/i.test(deps);
  rows.push({
    case: 'B-NG-01',
    result: noFc ? 'PASS' : 'FAIL',
    detail: 'package.json dependencies lack FullCalendar/Wix/expo-calendar',
  });

  rows.push({
    case: 'B-CH-A-UI',
    result: /parentNeedsChild|parentChildMissing|children\.length >= 2/.test(cal) ? 'PASS' : 'FAIL',
    detail: 'CH-A fail-closed in calendar.tsx',
  });

  const publishUi =
    /Publish to calendar|publishAssignmentToCalendar|listHiddenCalendarDues/.test(
      desk + show('src/lib/calendar/api.ts') + show('src/components/ui/AssignmentForm.tsx'),
    );
  rows.push({
    case: 'B-DP-A-UI',
    result: publishUi ? 'PASS' : 'FAIL',
    detail: 'Needs Publish + assignment form calendar visibility chrome',
  });

  return rows;
}

async function main() {
  evidence.ran_at_ct = nowCt();
  const svc = serviceClient();
  const fx = await fixturePrep(svc);
  const gate = await sqlGate();
  evidence.sql_gate = gate.publish_rpc_present ? 'green' : 'red';
  evidence.sql_gate_detail = gate;

  if (!gate.publish_rpc_present) {
    evidence.overall = 'BLOCKED';
    evidence.cases = [{ case: 'SQL-GATE', result: 'BLOCKED', detail: JSON.stringify(gate) }];
  } else {
    evidence.cases = await runCases(fx);
  }
  evidence.chrome_static = chromeStatic();

  const liveFails = evidence.cases.filter((c) => c.result === 'FAIL' || c.result === 'BLOCKED');
  const chromeFails = evidence.chrome_static.filter((c) => c.result === 'FAIL');
  if (evidence.overall !== 'BLOCKED') {
    evidence.overall = liveFails.length || chromeFails.length ? 'FAIL' : 'PASS';
  }

  // MUST gate for parent report: family walls + CH-A + published-only + publish path
  const mustIds = ['B-HAT-S', 'B-HAT-P', 'B-CH-A-01', 'B-CH-A-02', 'B-PUB-01', 'B-PUB-02', 'B-S1-02', 'B-S1-03', 'B-S2-04'];
  evidence.must_summary = mustIds.map((id) => {
    const c = evidence.cases.find((x) => x.case === id);
    return { case: id, result: c?.result || 'MISSING' };
  });

  const outPath = path.join(ROOT, 'notes/company/calendar-r2-phase-b-live-jwt-evidence.json');
  fs.writeFileSync(outPath, JSON.stringify(evidence, null, 2));
  console.log(
    JSON.stringify(
      {
        overall: evidence.overall,
        sql_gate: evidence.sql_gate,
        list_hidden_ok: gate.list_hidden_ok,
        live: evidence.cases.map((c) => ({ case: c.case, result: c.result })),
        chrome: evidence.chrome_static.map((c) => ({ case: c.case, result: c.result })),
        suggested_defects: evidence.suggested_defects.map((d) => d.title),
        out: outPath,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error('FATAL', e.message);
  process.exit(1);
});
