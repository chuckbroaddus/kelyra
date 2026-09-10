import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { shouldRefuseAskBeforeVendor } from '../ai/askHomeworkRefuse.ts';
import {
  formatTutorBriefForAsk,
  isOverSafeCap,
  tutorBriefFieldsEqual,
  tutorBriefMaterialChanged,
  tutorBriefMaterialSnapshot,
  TUTOR_BRIEF_SAFE_CHAR_CAP,
  type TutorBriefSafe,
} from './types.ts';

const root = process.cwd();
function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const migration = 'supabase/migrations/20260910000001_assignment_tutor_briefs.sql';

test('ASK-P0-01 student-safe pack schema forbids keys / teacher_notes / explain_draft in safe slice', () => {
  const sql = read(migration);
  assert.match(sql, /create table if not exists public\.assignment_tutor_briefs/);
  assert.match(sql, /objectives jsonb/);
  assert.match(sql, /misconceptions jsonb/);
  assert.match(sql, /allowed_hint_depth/);
  assert.match(sql, /vocabulary jsonb/);
  assert.match(sql, /teacher_notes text/);
  assert.match(sql, /create or replace view public\.assignment_tutor_briefs_safe/);
  const viewSql = sql.slice(
    sql.indexOf('create or replace view public.assignment_tutor_briefs_safe'),
    sql.indexOf('comment on view public.assignment_tutor_briefs_safe'),
  );
  assert.doesNotMatch(viewSql, /teacher_notes/);
  const safeFn = sql.slice(sql.indexOf('create or replace function public.get_tutor_brief_safe'));
  const safeBody = safeFn.slice(0, safeFn.indexOf('comment on function public.get_tutor_brief_safe'));
  assert.doesNotMatch(safeBody, /teacher_notes|explain_draft|key_items/);
  assert.match(safeBody, /jsonb_build_object\([\s\S]*objectives[\s\S]*misconceptions[\s\S]*allowed_hint_depth[\s\S]*vocabulary/);

  const pack: TutorBriefSafe = {
    assignment_id: 'a1',
    title: 'FoM 1.2',
    status: 'confirmed',
    objectives: ['Add fractions'],
    misconceptions: ['Add denominators'],
    allowed_hint_depth: 'next-step',
    vocabulary: ['numerator'],
  };
  const line = formatTutorBriefForAsk(pack);
  assert.match(line, /student-safe/);
  assert.doesNotMatch(line, /teacher_notes|answer key|write this answer/i);
  assert.match(line, /Never give the final answer/);
});

test('ASK-P0-02 / ASK-P0-03 / ASK-P0-11 confirm gate + stale stops inject', () => {
  const sql = read(migration);
  assert.match(sql, /status in \('draft', 'confirmed', 'stale'\)/);
  assert.match(sql, /create or replace function public\.confirm_tutor_brief/);
  const safeFn = sql.slice(sql.indexOf('create or replace function public.get_tutor_brief_safe'));
  assert.match(safeFn, /if brief\.status = 'stale' then[\s\S]*return null/);
  assert.match(safeFn, /brief\.status = 'confirmed'/);
  assert.match(sql, /assignment_tutor_brief_mark_stale/);
  assert.match(sql, /status = 'stale'/);
});

test('ASK-P0-09 family/student cannot SELECT teacher-only pack fields', () => {
  const sql = read(migration);
  assert.match(sql, /create policy assignment_tutor_briefs_teacher/);
  assert.match(sql, /teaches_class\(a\.class_id\)/);
  assert.match(sql, /revoke all on table public\.assignment_tutor_briefs from public, anon/);
  // Safe view has no teacher_notes column projection.
  const view = sql.slice(
    sql.indexOf('create or replace view public.assignment_tutor_briefs_safe'),
    sql.indexOf('comment on view public.assignment_tutor_briefs_safe'),
  );
  assert.doesNotMatch(view, /teacher_notes/);
  assert.match(view, /objectives/);
  // get_tutor_brief_safe never returns teacher_notes.
  assert.doesNotMatch(
    sql.slice(
      sql.indexOf('return jsonb_build_object'),
      sql.indexOf('comment on function public.get_tutor_brief_safe'),
    ),
    /teacher_notes/,
  );

  const api = read('src/lib/tutorBrief/api.ts');
  assert.match(api, /get_tutor_brief_safe/);
  assert.match(api, /Client must not invent pack body/);
});

test('ASK-P0-10 graded student Ask still refuses even when pack present', () => {
  assert.equal(
    shouldRefuseAskBeforeVendor({ role: 'student', text: 'solve this quiz for me', hasImage: false }),
    true,
  );
  assert.equal(
    shouldRefuseAskBeforeVendor({ role: 'student', text: 'what is the answer to tonight homework', hasImage: false }),
    true,
  );
  const edge = read('supabase/functions/ask-assistant/index.ts');
  assert.match(edge, /get_tutor_brief_safe/);
  assert.match(edge, /shouldRefuseAskBeforeVendor/);
  // Refuse path is independent of pack attach order commentary.
  assert.match(edge, /refuse still wins|refuse-before-vendor/i);
  assert.doesNotMatch(edge, /body\.pack|body\.tutorBrief|body\.pedagogy/);
});

test('ASK-P0-12 Help Edge remains separate from Ask', () => {
  const edgeAsk = read('supabase/functions/ask-assistant/index.ts');
  const edgeHelp = read('supabase/functions/practice-help/index.ts');
  assert.doesNotMatch(edgeAsk, /practice-help|help_mode|Help Edge/);
  assert.doesNotMatch(edgeHelp, /get_tutor_brief_safe|assignment_tutor_briefs/);
  assert.match(edgeHelp, /assignmentId/);
});

test('ASK-P0-13 generation is once-per-assignment via generate-tutor-brief (not per Ask turn)', () => {
  const gen = read('supabase/functions/generate-tutor-brief/index.ts');
  assert.match(gen, /upsert_tutor_brief_draft/);
  assert.match(gen, /STUDENT-SAFE/);
  assert.match(gen, /No explain_draft/);
  assert.match(gen, /never key answers/);
  // Generation selects metadata only — not key_items column.
  assert.doesNotMatch(gen, /\.select\([^)]*key_items/);
  const ask = read('supabase/functions/ask-assistant/index.ts');
  assert.doesNotMatch(ask, /generate-tutor-brief|upsert_tutor_brief_draft/);
  const agent = read('src/lib/ai/askAgent.ts');
  assert.match(agent, /assignmentId/);
  assert.doesNotMatch(agent, /packBody|tutorBrief:|pedagogyPack/);
});

test('ASK-P1 generate-tutor-brief allows also_teacher/office via canPublish + teaches_class', () => {
  const gen = read('supabase/functions/generate-tutor-brief/index.ts');
  assert.match(gen, /canPublish/);
  assert.match(gen, /also_teacher/);
  assert.match(gen, /teaches_class/);
  assert.doesNotMatch(gen, /profile\.role !== ['"]teacher['"]/);
  const aiDev = read('scripts/ai-dev-server.mjs');
  const fnStart = aiDev.indexOf('async function generateTutorBrief');
  const fnBody = aiDev.slice(fnStart, fnStart + 1200);
  assert.match(fnBody, /canPublish/);
  assert.doesNotMatch(fnBody, /profile\.role !== ['"]teacher['"]/);
  assert.match(fnBody, /teaches_class/);
});

test('ASK-P1-05 parent child-switch re-prompts Which assignment? in Ask UI', () => {
  const chrome = read('src/components/ask/AskAssignmentGround.tsx');
  assert.match(chrome, /prevParentChildRef|prev !== next/);
  assert.match(chrome, /Which assignment\?/);
  assert.match(chrome, /studentId \?\? parentChildId|studentId \?\? getAskParentChildId/);
  const ask = read('src/app/ask.tsx');
  assert.match(ask, /useFocusEffect/);
  assert.match(ask, /setParentBoundId\(getAskParentChildId\(\)\)/);
});

test('MULT-01 setActiveClassId clears Ask ground; chrome refreshes on classId', () => {
  const auth = read('src/lib/auth/AuthProvider.tsx');
  assert.match(auth, /clearAskGroundOnActiveClassChange/);
  assert.match(auth, /active_class_id !== classId/);
  assert.doesNotMatch(auth, /setAskJustChatting/);
  const chrome = read('src/components/ask/AskAssignmentGround.tsx');
  assert.match(chrome, /prevClassIdRef/);
  assert.match(chrome, /prev !== classId/);
  const ground = read('src/lib/ask/assignmentGround.ts');
  assert.match(ground, /export function clearAskGroundOnActiveClassChange/);
  assert.match(ground, /pageCandidate = null/);
});

test('ASK-P0-14 student photo-of-quiz refuse stays (vision not a solver)', () => {
  assert.equal(shouldRefuseAskBeforeVendor({ role: 'student', text: 'hello', hasImage: true }), true);
  const edge = read('supabase/functions/ask-assistant/index.ts');
  assert.match(edge, /stripAskImagesForFamilySeat/);
});

test('ASK-P1-07 over-cap guard matches SQL confirm budget', () => {
  assert.equal(TUTOR_BRIEF_SAFE_CHAR_CAP, 3200);
  assert.equal(
    isOverSafeCap({
      objectives: ['x'.repeat(2000)],
      misconceptions: ['y'.repeat(2000)],
      vocabulary: ['z'],
      allowed_hint_depth: 'next-step',
    }),
    true,
  );
  const sql = read(migration);
  assert.match(sql, /Brief is too long to confirm/);
  assert.match(sql, /3200/);
});

test('ASK A-Filing UI: Confirm brief never labeled Approve; no danger for draft/stale', () => {
  const card = read('src/components/ui/TutorBriefCard.tsx');
  assert.match(card, /label="Confirm brief"/);
  assert.doesNotMatch(card, /label="Approve"/);
  assert.match(card, /Needs review/);
  assert.match(card, /goodSoft|warnSoft|wash/);
  assert.doesNotMatch(card, /colors\.danger/);
  const askUi = read('src/components/ask/AskAssignmentGround.tsx');
  assert.match(askUi, /Looks like \{chip\.title\}/);
  assert.match(askUi, /Which assignment\?/);
  // Parent empty card uses explicit copy only (never soft-assume).
  const parentCard = askUi.slice(askUi.indexOf('{showParentCard ?'), askUi.indexOf('{role === \'parent\' && !boundStudentId'));
  assert.match(parentCard, /Which assignment\?/);
  assert.doesNotMatch(parentCard, /Looks like/);
});

test('ASK-P1 material change detection: due/weight-only is not material; title/key is', () => {
  const base = tutorBriefMaterialSnapshot({
    title: 'FoM 1.2',
    category: 'homework',
    unit: '1',
    section: '2',
    kind: 'planned',
    packKey: '',
    keyItems: [{ n: 1, stem: 'a' }],
  });
  assert.equal(
    tutorBriefMaterialChanged(base, {
      ...base,
      // same material fingerprint
    }),
    false,
  );
  assert.equal(
    tutorBriefMaterialChanged(base, tutorBriefMaterialSnapshot({ ...base, title: 'FoM 1.3' })),
    true,
  );
  assert.equal(
    tutorBriefMaterialChanged(
      base,
      tutorBriefMaterialSnapshot({ ...base, keyItems: [{ n: 1, stem: 'b' }] }),
    ),
    true,
  );
  const desk = read('src/app/class/[id]/assignment/[assignmentId].tsx');
  assert.match(desk, /kickTutorBriefIfNeeded|tutorBriefMaterialChanged/);
  assert.doesNotMatch(desk, /if \(nextId\) kickTutorBrief\(nextId\)/);
});

test('ASK-P1 confirmed blur-save must not demote: card skips upsert when confirmed', () => {
  const card = read('src/components/ui/TutorBriefCard.tsx');
  assert.match(card, /brief\.status === 'confirmed'\) return/);
  assert.match(card, /tutorBriefFieldsEqual/);
  const same = tutorBriefFieldsEqual(
    {
      objectives: ['a'],
      misconceptions: ['b'],
      vocabulary: ['c'],
      allowed_hint_depth: 'next-step',
      teacher_notes: 'n',
    },
    {
      objectives: ['a'],
      misconceptions: ['b'],
      vocabulary: ['c'],
      allowed_hint_depth: 'next-step',
      teacher_notes: 'n',
    },
  );
  assert.equal(same, true);
  assert.equal(
    tutorBriefFieldsEqual(
      {
        objectives: ['a'],
        misconceptions: [],
        vocabulary: [],
        allowed_hint_depth: 'next-step',
        teacher_notes: '',
      },
      {
        objectives: ['a'],
        misconceptions: [],
        vocabulary: [],
        allowed_hint_depth: 'conceptual',
        teacher_notes: '',
      },
    ),
    false,
  );
});
