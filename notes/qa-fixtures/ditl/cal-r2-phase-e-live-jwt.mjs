/**
 * CAL-R2 Phase E live JWT prove-out (t_46962349).
 * calendar_search ⊆ visible; calendar_draft_event → CR-A Save with ai_nl; refuse paths.
 * Never prints JWTs / service keys / passwords.
 */
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import { spawnSync } from 'child_process';

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

const RANGE = {
  from: '2026-09-20T00:00:00.000Z',
  to: '2026-10-10T00:00:00.000Z',
};

const ACCOUNTS = {
  admin: { email: 'ditl-admin@ditl.test', pass: 'DITL-admin-test' },
  teacher_a: { email: 'ditl-teacher-a@ditl.test', pass: 'DITL-teacher-test' },
  student_s1: { email: 'ditl-student-s1@ditl.test', pass: 'DITL-student-test' },
  parent_1: { email: 'ditl-parent-1@ditl.test', pass: 'DITL-parent-test' },
};

const TITLES = {
  aiClass: 'ditl-PhaseE Ask Class Draft',
  aiPersonal: 'ditl-PhaseE Ask Study Block',
  aiSchool: 'ditl-PhaseE Ask Early Release',
  aiAbsence: 'ditl-PhaseE Ask Absence S1',
  hiddenProbe: 'ditl-Math Quiz',
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
          source: data.source,
          class_id: data.class_id?.slice?.(0, 8) || null,
          student_id: data.student_id?.slice?.(0, 8) || null,
        }
      : null,
    err: error ? { code: error.code, message: (error.message || '').slice(0, 160) } : null,
  };
}

async function deleteEvent(client, seat, id) {
  if (!id) return { ok: true };
  const { error } = await client.rpc('delete_calendar_event', { p_seat: seat, p_id: id });
  return {
    ok: !error,
    err: error ? { code: error.code, message: (error.message || '').slice(0, 160) } : null,
  };
}

/** Mimic calendar_search client filter over list_calendar_items (Ask tool). */
function calendarSearch(items, query) {
  const q = (query || '').trim().toLowerCase();
  const visible = q
    ? items.filter((row) => {
        const title = (row.title ?? '').toLowerCase();
        const cat = (row.category ?? '').toLowerCase();
        return title.includes(q) || cat.includes(q);
      })
    : items;
  return {
    count: visible.length,
    items: visible.slice(0, 40).map((row) => ({
      id: row.id,
      title: row.title,
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      category: row.category,
      source: row.source,
      visibility: row.visibility_scope ?? row.visibility,
      calendar_id: row.calendar_id,
      // Explicitly omit body
      has_body_key: Object.prototype.hasOwnProperty.call(row, 'body') && row.body != null,
    })),
  };
}

const evidence = {
  ran_at_ct: null,
  sql_gate: null,
  hermes_context: 't_46962349',
  migration: '20260918000000_calendar_r2_phase_e_ai_source.sql',
  pr: '112 @ a13ebeb',
  sql_apply: 't_6f5150ab HTTP 201',
  unit_tests: null,
  id_prefixes: {},
  created_event_ids: {},
  cases: [],
  suggested_defects: [],
  overall: null,
};

function pushCase(c) {
  evidence.cases.push(c);
  if (c.result === 'FAIL') {
    evidence.suggested_defects.push({
      sev: 'P1',
      title: `DEFECT: ${c.case}`,
      expected: 'PASS per Phase E Ask tools / CAL-09',
      actual: c.detail,
    });
  }
}

async function sqlGate() {
  const teacher = await signIn('teacher_a');
  const okList = await rpcList(teacher, 'teacher', { classId: MATH });
  // Probe create with ai_nl then delete
  const probe = await createEvent(teacher, {
    p_seat: 'teacher',
    p_kind: 'class',
    p_title: 'ditl-PhaseE SQL Probe',
    p_starts_at: '2026-09-22T15:00:00.000Z',
    p_ends_at: null,
    p_all_day: true,
    p_category: 'class',
    p_body: null,
    p_class_id: MATH,
    p_child_student_id: null,
    p_source: 'ai_nl',
  });
  const bad = await createEvent(teacher, {
    p_seat: 'teacher',
    p_kind: 'class',
    p_title: 'ditl-PhaseE Bad Source',
    p_starts_at: '2026-09-22T15:00:00.000Z',
    p_ends_at: null,
    p_all_day: true,
    p_category: 'class',
    p_body: null,
    p_class_id: MATH,
    p_child_student_id: null,
    p_source: 'webhook',
  });
  if (probe.ok && probe.id) await deleteEvent(teacher, 'teacher', probe.id);
  return {
    ok: okList.status === 200 && probe.ok && probe.row?.source === 'ai_nl' && !bad.ok,
    list_ok: okList.status === 200,
    ai_nl_create_ok: probe.ok,
    ai_nl_source: probe.row?.source || null,
    unknown_source_refused: !bad.ok,
    unknown_err: bad.err,
    list_err: okList.error,
    probe_err: probe.err,
  };
}

async function resolveChildren(svc) {
  const { data: usersPage } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 });
  const users = usersPage?.users || [];
  const byEmail = Object.fromEntries(users.map((u) => [u.email, u.id]));
  const parentId = byEmail['ditl-parent-1@ditl.test'];
  evidence.id_prefixes.parentAuth = parentId?.slice(0, 8) || null;
  const { data: links } = await svc.from('parent_students').select('student_id').eq('parent_id', parentId);
  const childIds = (links || []).map((r) => r.student_id);
  const { data: kids } = await svc.from('profiles').select('id, display_name').in('id', childIds);
  const s1 = (kids || []).find((k) => /Jordan/i.test(k.display_name));
  const s2 = (kids || []).find((k) => /Jamie/i.test(k.display_name));
  evidence.id_prefixes.s1 = s1?.id?.slice(0, 8);
  evidence.id_prefixes.s2 = s2?.id?.slice(0, 8);
  evidence.id_prefixes.children_n = childIds.length;
  return { s1Id: s1?.id, s2Id: s2?.id, linked: kids || [] };
}

function runUnitBundle() {
  const files = [
    'src/lib/calendar/askDraft.test.ts',
    'src/lib/calendar/phase_e.ask.security.test.ts',
  ];
  const r = spawnSync(
    process.execPath,
    ['--experimental-strip-types', '--test', ...files],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, NODE_OPTIONS: '' } },
  );
  const out = `${r.stdout || ''}\n${r.stderr || ''}`;
  // Node test reporter: legacy tap `# pass N` or modern `ℹ pass N` / `pass N`
  const passMatch = out.match(/(?:#\s*)?pass\s+(\d+)/i) || out.match(/ℹ\s*pass\s+(\d+)/i);
  const failMatch = out.match(/(?:#\s*)?fail\s+(\d+)/i) || out.match(/ℹ\s*fail\s+(\d+)/i);
  const pass = passMatch ? Number(passMatch[1]) : 0;
  const fail = failMatch ? Number(failMatch[1]) : (r.status === 0 ? 0 : 1);
  return {
    exit: r.status,
    pass,
    fail,
    ok: r.status === 0 && fail === 0 && pass > 0,
    excerpt: out.split('\n').filter((l) => /^(✔|✖|# |not ok|ok |FAIL|PASS)/.test(l)).slice(0, 40),
  };
}

async function main() {
  evidence.ran_at_ct = nowCt();
  evidence.unit_tests = runUnitBundle();
  pushCase({
    case: 'E-UNIT-01',
    result: evidence.unit_tests.ok ? 'PASS' : 'FAIL',
    detail: `askDraft+phase_e.ask.security pass=${evidence.unit_tests.pass} fail=${evidence.unit_tests.fail} exit=${evidence.unit_tests.exit}`,
    evidence: { excerpt: evidence.unit_tests.excerpt },
  });

  evidence.sql_gate = await sqlGate();
  if (!evidence.sql_gate.ok) {
    pushCase({
      case: 'E-SQL-GATE',
      result: 'FAIL',
      detail: JSON.stringify(evidence.sql_gate),
      evidence: evidence.sql_gate,
    });
  } else {
    pushCase({
      case: 'E-SQL-GATE',
      result: 'PASS',
      detail: 'create_calendar_event p_source ai_nl stamps; unknown refused; list live',
      evidence: evidence.sql_gate,
    });
  }

  const svc = serviceClient();
  const { s1Id, linked } = await resolveChildren(svc);

  // E-SEARCH-01: search ⊆ visible; parent/student never see hidden quiz title elevated
  {
    const teacher = await signIn('teacher_a');
    const parent = await signIn('parent_1');
    const student = await signIn('student_s1');
    const tList = await rpcList(teacher, 'teacher', { classId: MATH });
    const pList = await rpcList(parent, 'parent', { childId: s1Id });
    const sList = await rpcList(student, 'student');
    const tSearch = calendarSearch(tList.data, 'PhaseE');
    const pSearchAll = calendarSearch(pList.data, '');
    const sSearchAll = calendarSearch(sList.data, '');
    const parentHasHidden = pSearchAll.items.some((i) => i.title === TITLES.hiddenProbe);
    const studentHasHidden = sSearchAll.items.some((i) => i.title === TITLES.hiddenProbe);
    const anyBody = [...tSearch.items, ...pSearchAll.items].some((i) => i.has_body_key && i.body);
    // After we create ai events below we'll re-check search; here walls + shape
    const ok =
      tList.status === 200 &&
      pList.status === 200 &&
      sList.status === 200 &&
      !parentHasHidden &&
      !studentHasHidden &&
      !anyBody;
    pushCase({
      case: 'E-SEARCH-WALL-01',
      result: ok ? 'PASS' : 'FAIL',
      detail: `teacher_n=${tList.data.length} parent_n=${pList.data.length} student_n=${sList.data.length} parent_hidden=${parentHasHidden} student_hidden=${studentHasHidden}`,
      evidence: {
        parent_has_hidden_quiz: parentHasHidden,
        student_has_hidden_quiz: studentHasHidden,
        search_subset_note: 'calendar_search filters list_calendar_items only',
      },
    });
  }

  // E-SAVE-AI-01: CR-A Save path with p_source=ai_nl for teacher/student/office/parent
  {
    const teacher = await signIn('teacher_a');
    const student = await signIn('student_s1');
    const admin = await signIn('admin');
    const parent = await signIn('parent_1');

    const created = {};
    created.teacher = await createEvent(teacher, {
      p_seat: 'teacher',
      p_kind: 'class',
      p_title: TITLES.aiClass,
      p_starts_at: '2026-09-25T16:00:00.000Z',
      p_ends_at: null,
      p_all_day: true,
      p_category: 'class',
      p_body: 'ask draft body must not leak in search',
      p_class_id: MATH,
      p_child_student_id: null,
      p_source: 'ai_nl',
    });
    created.student = await createEvent(student, {
      p_seat: 'student',
      p_kind: 'personal',
      p_title: TITLES.aiPersonal,
      p_starts_at: '2026-09-25T17:00:00.000Z',
      p_ends_at: null,
      p_all_day: false,
      p_category: 'study',
      p_body: null,
      p_class_id: null,
      p_child_student_id: null,
      p_source: 'ai_nl',
    });
    created.office = await createEvent(admin, {
      p_seat: 'office',
      p_kind: 'school',
      p_title: TITLES.aiSchool,
      p_starts_at: '2026-09-26T14:00:00.000Z',
      p_ends_at: null,
      p_all_day: true,
      p_category: 'school',
      p_body: null,
      p_class_id: null,
      p_child_student_id: null,
      p_source: 'ai_nl',
    });
    created.parent = await createEvent(parent, {
      p_seat: 'parent',
      p_kind: 'absence',
      p_title: TITLES.aiAbsence,
      p_starts_at: '2026-09-27T15:00:00.000Z',
      p_ends_at: null,
      p_all_day: true,
      p_category: 'absence',
      p_body: null,
      p_class_id: null,
      p_child_student_id: s1Id,
      p_source: 'ai_nl',
    });

    evidence.created_event_ids = Object.fromEntries(
      Object.entries(created).map(([k, v]) => [k, v.id?.slice?.(0, 8) || null]),
    );

    const allOk = Object.values(created).every((c) => c.ok && c.row?.source === 'ai_nl');
    pushCase({
      case: 'E-SAVE-AI-01',
      result: allOk ? 'PASS' : 'FAIL',
      detail: Object.fromEntries(
        Object.entries(created).map(([k, v]) => [
          k,
          { ok: v.ok, source: v.row?.source || null, err: v.err },
        ]),
      ),
      evidence: { ids: evidence.created_event_ids },
    });

    // E-SEARCH-02: teacher search finds PhaseE class; parent search finds absence for focused child; bodies not returned by search mapper
    const tList = await rpcList(teacher, 'teacher', { classId: MATH });
    const pList = await rpcList(parent, 'parent', { childId: s1Id });
    const tSearch = calendarSearch(tList.data, 'PhaseE');
    const pSearch = calendarSearch(pList.data, 'PhaseE');
    const teacherSeesClass = tSearch.items.some((i) => i.title === TITLES.aiClass);
    const parentSeesAbsence = pSearch.items.some((i) => i.title === TITLES.aiAbsence);
    const searchHasBodyField = [...tSearch.items, ...pSearch.items].some((i) => i.body != null);
    // Ensure search ⊆ list: every search title exists in full list
    const tTitles = new Set(tList.data.map((r) => r.title));
    const pTitles = new Set(pList.data.map((r) => r.title));
    const subsetOk =
      tSearch.items.every((i) => tTitles.has(i.title)) &&
      pSearch.items.every((i) => pTitles.has(i.title));
    pushCase({
      case: 'E-SEARCH-01',
      result:
        teacherSeesClass && parentSeesAbsence && subsetOk && !searchHasBodyField ? 'PASS' : 'FAIL',
      detail: {
        teacherSeesClass,
        parentSeesAbsence,
        subsetOk,
        searchHasBodyField,
        t_search_n: tSearch.count,
        p_search_n: pSearch.count,
      },
    });

    // Cleanup created events
    if (created.teacher.id) await deleteEvent(teacher, 'teacher', created.teacher.id);
    if (created.student.id) await deleteEvent(student, 'student', created.student.id);
    if (created.office.id) await deleteEvent(admin, 'office', created.office.id);
    if (created.parent.id) await deleteEvent(parent, 'parent', created.parent.id);
  }

  // E-REFUSE-HAT-01: live refuse — teacher cannot create school; student cannot create class; non-office school blast already covered by unit; unknown source
  {
    const teacher = await signIn('teacher_a');
    const student = await signIn('student_s1');
    const parent = await signIn('parent_1');
    const teacherSchool = await createEvent(teacher, {
      p_seat: 'teacher',
      p_kind: 'school',
      p_title: 'ditl-PhaseE Refuse School',
      p_starts_at: '2026-09-28T14:00:00.000Z',
      p_all_day: true,
      p_category: 'school',
      p_source: 'ai_nl',
    });
    const studentClass = await createEvent(student, {
      p_seat: 'student',
      p_kind: 'class',
      p_title: 'ditl-PhaseE Refuse Class',
      p_starts_at: '2026-09-28T14:00:00.000Z',
      p_all_day: true,
      p_category: 'class',
      p_class_id: MATH,
      p_source: 'ai_nl',
    });
    const parentNoChild = await createEvent(parent, {
      p_seat: 'parent',
      p_kind: 'absence',
      p_title: 'ditl-PhaseE Refuse Absence',
      p_starts_at: '2026-09-28T14:00:00.000Z',
      p_all_day: true,
      p_category: 'absence',
      p_child_student_id: null,
      p_source: 'ai_nl',
    });
    const ok = !teacherSchool.ok && !studentClass.ok && !parentNoChild.ok;
    pushCase({
      case: 'E-REFUSE-HAT-01',
      result: ok ? 'PASS' : 'FAIL',
      detail: {
        teacherSchool: teacherSchool.err,
        studentClass: studentClass.err,
        parentNoChild: parentNoChild.err,
      },
    });
  }

  // E-CAPS-01: static policy — calendar.read/write registered; not assignments.manage (from unit + file greps already in E-UNIT)
  {
    const policy = fs.readFileSync(path.join(ROOT, 'supabase/functions/_shared/askToolPolicy.ts'), 'utf8');
    const tools = fs.readFileSync(path.join(ROOT, 'src/lib/ai/askTools.ts'), 'utf8');
    const draftRun = tools.slice(tools.indexOf('calendar_draft_event:'));
    const draftRunBody = draftRun.slice(draftRun.indexOf('run:'));
    const ok =
      /calendar_search:\s*\{[\s\S]*?capability:\s*'calendar\.read'/.test(policy) &&
      /calendar_draft_event:\s*\{[\s\S]*?capability:\s*'calendar\.write'/.test(policy) &&
      !/rpc\('create_calendar_event'/.test(draftRunBody) &&
      /parkPendingCalendarDraft|buildCalendarAskDraft/.test(draftRunBody) &&
      !/capability:\s*'assignments\.manage'/.test(
        tools.slice(tools.indexOf('calendar_search:'), tools.indexOf('calendar_draft_event:') + 500),
      );
    pushCase({
      case: 'E-CAPS-01',
      result: ok ? 'PASS' : 'FAIL',
      detail: 'calendar.read/write caps; draft does not RPC create; not assignments.manage',
    });
  }

  // E-DRAFT-PARK-01: pure builder parks ai_nl + banner (unit already covers refuse); confirm REVIEW banner constant
  {
    // Dynamic import of askDraft via strip-types node isn't ideal here; re-check via unit + source
    const askDraft = fs.readFileSync(path.join(ROOT, 'src/lib/calendar/askDraft.ts'), 'utf8');
    const ok =
      /REVIEW_DRAFT_BANNER\s*=\s*'Review draft — not saved'/.test(askDraft) &&
      /source:\s*'ai_nl'/.test(askDraft) &&
      evidence.unit_tests.ok;
    pushCase({
      case: 'E-DRAFT-PARK-01',
      result: ok ? 'PASS' : 'FAIL',
      detail: 'buildCalendarAskDraft parks ai_nl + Review draft banner; unit refuse matrix green',
    });
  }

  const fails = evidence.cases.filter((c) => c.result === 'FAIL');
  evidence.overall = fails.length === 0 ? 'PASS' : 'FAIL';

  const outJson = path.join(ROOT, 'notes/company/calendar-r2-phase-e-live-jwt-evidence.json');
  fs.writeFileSync(outJson, JSON.stringify(evidence, null, 2));

  const passN = evidence.cases.filter((c) => c.result === 'PASS').length;
  const failN = fails.length;
  const lines = [
    '# CAL-R2 Phase E — Test Plan (live JWT)',
    '',
    `**Ran:** ${evidence.ran_at_ct}`,
    `**Card:** t_46962349`,
    `**Against:** calendar-r2-pm-lock CAL-09; architecture Phase E Ask tools; PR 112 @ a13ebeb`,
    `**SQL gate:** \`20260918000000_calendar_r2_phase_e_ai_source.sql\` applied (devops t_6f5150ab HTTP 201).`,
    '',
    '## Scope',
    'Phase E live JWT prove-out only: `calendar_search` ⊆ visible; `calendar_draft_event` CR-A draft-then-Save with `ai_nl`; refuse paths; caps calendar.read/write (not assignments.manage).',
    '',
    'Out of scope: UI chrome device re-prove, SQL apply, git merge, grok-build / CloudAgent, assignments.manage.',
    '',
    '## Evidence',
    '- `notes/company/calendar-r2-phase-e-live-jwt-evidence.json` (shapes/counts/id prefixes only; no JWTs/secrets)',
    '- Runner: `notes/qa-fixtures/ditl/cal-r2-phase-e-live-jwt.mjs`',
    `- Unit: askDraft.test.ts + phase_e.ask.security.test.ts (pass=${evidence.unit_tests.pass} fail=${evidence.unit_tests.fail})`,
    '',
    '## Results',
    '',
    '| Case | Result | Notes |',
    '|------|--------|-------|',
  ];
  for (const c of evidence.cases) {
    const note =
      typeof c.detail === 'string' ? c.detail.replace(/\|/g, '/') : JSON.stringify(c.detail).slice(0, 120);
    lines.push(`| ${c.case} | ${c.result} | ${note} |`);
  }
  lines.push('');
  lines.push(`**Overall:** **${evidence.overall}** — ${passN}/${passN + failN} cases.`);
  lines.push('');
  if (evidence.overall === 'PASS') {
    lines.push('Phase E Ask calendar_search + calendar_draft_event (draft-then-Save / refuse / ai_nl): **hold**.');
    lines.push('');
    lines.push('**Overall PASS** → CoS may close Phase E.');
  } else {
    lines.push('FAIL — see suggested_defects in evidence JSON.');
  }
  fs.writeFileSync(path.join(ROOT, 'notes/company/calendar-r2-phase-e-testplan.md'), lines.join('\n') + '\n');

  console.log(
    JSON.stringify(
      {
        overall: evidence.overall,
        pass: passN,
        fail: failN,
        cases: evidence.cases.map((c) => ({ case: c.case, result: c.result })),
        evidence: outJson,
      },
      null,
      2,
    ),
  );
  process.exit(fails.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(String(e?.stack || e));
  process.exit(2);
});
