import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  ASK_TOOL_POLICY,
  grantsFromAskDefaults,
  isAskToolAllowed,
} from '../../../supabase/functions/_shared/askToolPolicy.ts';
import {
  GAUTH_NEVER_ASK_TOOLS,
  GAUTH_REFUSAL_TITLE,
  gauthRefusalCard,
  isNeverAskTool,
  shouldRefuseAskBeforeVendor,
  stripAskImagesForFamilySeat,
} from '../../../supabase/functions/_shared/askHomeworkRefuse.ts';

const root = process.cwd();

const FAMILY_OMIT_CAPTURE_KEYS = [
  'explain_draft',
  'explain_status',
  'model_draft',
  'draft_score',
  'photo_asset_id',
  'audio_asset_id',
  'guessed_student_id',
  'match_confidence',
] as const;

function omitFamilyCaptureSecrets<T extends Record<string, unknown>>(row: T): Partial<T> {
  const next: Record<string, unknown> = { ...row };
  for (const key of FAMILY_OMIT_CAPTURE_KEYS) delete next[key];
  return next as Partial<T>;
}

const grants = grantsFromAskDefaults();
function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

test('GAUTH-S1-02 explain.manage teacher own; parent/student/office none', () => {
  const matrix = read('src/lib/school/matrix.ts');
  assert.match(
    matrix,
    /id:\s*'explain\.manage'[\s\S]*?superintendent:\s*'none'[\s\S]*?administrator:\s*'none'[\s\S]*?teacher:\s*'own'[\s\S]*?parent:\s*'none'[\s\S]*?student:\s*'none'/,
  );
  assert.doesNotMatch(matrix, /id:\s*'explain\.manage'[\s\S]*?assignments\.manage/);
  assert.equal(grants['explain.manage']?.teacher, 'own');
  assert.equal(grants['explain.manage']?.student, 'none');
  assert.equal(grants['explain.manage']?.parent, 'none');
  assert.equal(grants['explain.manage']?.administrator, 'none');
});

test('GAUTH-S1-03 twin maps + never-register list + unknown denied', () => {
  const client = read('src/lib/ai/askToolPolicy.ts');
  const edge = read('supabase/functions/_shared/askToolPolicy.ts');
  for (const name of ['explain_capture', 'discard_explain_draft', 'attach_explain_as_note']) {
    assert.match(client, new RegExp(`${name}:\\s*\\{[\\s\\S]*?explain\\.manage`));
    assert.match(edge, new RegExp(`${name}:\\s*\\{[\\s\\S]*?explain\\.manage`));
    assert.equal(ASK_TOOL_POLICY[name]?.teacherSeatOnly, true);
    assert.equal(ASK_TOOL_POLICY[name]?.capability, 'explain.manage');
    assert.equal(isAskToolAllowed(name, { role: 'teacher' }, grants), true);
    assert.equal(isAskToolAllowed(name, { role: 'student' }, grants), false);
    assert.equal(isAskToolAllowed(name, { role: 'parent' }, grants), false);
    assert.equal(isAskToolAllowed(name, { role: 'administrator' }, grants), false);
    assert.equal(isAskToolAllowed(name, { role: 'teacher', also_administrator: true }, grants), true);
  }
  for (const name of GAUTH_NEVER_ASK_TOOLS) {
    assert.equal(isAskToolAllowed(name, { role: 'teacher' }, grants), false);
    assert.equal(isAskToolAllowed(name, { role: 'student' }, grants), false);
    assert.ok(isNeverAskTool(name));
    assert.equal(name in ASK_TOOL_POLICY, false);
  }
  assert.equal(isAskToolAllowed('invented_solve', { role: 'superintendent' }, grants), false);
});

test('GAUTH-S1-01 refuse-before-vendor; no vision family; no partial hint', () => {
  assert.equal(
    shouldRefuseAskBeforeVendor({ role: 'student', text: 'solve this quiz for me', hasImage: false }),
    true,
  );
  assert.equal(
    shouldRefuseAskBeforeVendor({ role: 'student', text: 'hello', hasImage: true }),
    true,
  );
  assert.equal(
    shouldRefuseAskBeforeVendor({ role: 'parent', text: 'check my work on tonight homework', hasImage: false }),
    true,
  );
  assert.equal(
    shouldRefuseAskBeforeVendor({ role: 'teacher', text: 'solve this quiz', hasImage: true }),
    false,
  );
  assert.equal(
    shouldRefuseAskBeforeVendor({ role: 'student', text: 'what practice do I have?', hasImage: false }),
    false,
  );
  const card = gauthRefusalCard();
  assert.equal(card.title, GAUTH_REFUSAL_TITLE);
  assert.match(card.text, /Graded class work stays between you and your teacher/);
  assert.doesNotMatch(card.text, /answer is|step 1:|here is how to solve/i);

  const stripped = stripAskImagesForFamilySeat([
    { role: 'user', content: [{ type: 'input_image', image_url: 'https://example.com/x.jpg' }, { type: 'input_text', text: 'hi' }] },
  ]) as Array<{ content: Array<{ type: string }> }>;
  assert.ok(!stripped[0]!.content.some((p) => p.type === 'input_image'));

  const edge = read('supabase/functions/ask-assistant/index.ts');
  assert.match(edge, /shouldRefuseAskBeforeVendor/);
  assert.match(edge, /stripAskImagesForFamilySeat/);
  const refuseAt = edge.indexOf('shouldRefuseAskBeforeVendor');
  const meteredAt = edge.indexOf('await callMetered');
  assert.ok(refuseAt > 0 && meteredAt > refuseAt);
  const requireAt = edge.indexOf('requireXaiKey()', edge.indexOf('Deno.serve'));
  assert.ok(requireAt > refuseAt);

  const dev = read('scripts/ai-dev-server.mjs');
  assert.match(dev, /refuse-before-vendor/);
  assert.match(dev, /shouldRefuseAskBeforeVendor/);
});

test('GAUTH-S1-04 family DTO omits explain_draft / extract / draft_score / originals', () => {
  const row = {
    id: 'c1',
    explain_draft: { steps: ['secret'] },
    explain_status: 'draft',
    model_draft: { extract: [1] },
    draft_score: 9,
    photo_asset_id: 'a1',
    parent_sentence: 'ok',
  };
  const safe = omitFamilyCaptureSecrets(row);
  for (const key of FAMILY_OMIT_CAPTURE_KEYS) {
    assert.equal((safe as Record<string, unknown>)[key], undefined);
  }
  assert.equal(safe.parent_sentence, 'ok');
  const migration = read('supabase/migrations/20260904000000_gauth_v1.sql');
  assert.match(migration, /explain_draft/);
  assert.match(migration, /Family must never SELECT|family RPCs omit/i);
});

test('GAUTH-S1-05 explain-capture class_teachers before media/vendor', () => {
  const edge = read('supabase/functions/explain-capture/index.ts');
  assert.match(edge, /class_teachers/);
  assert.match(edge, /isAllowedAskImageUrl/);
  assert.match(edge, /park_explain_draft/);
  assert.doesNotMatch(edge, /approved_score\s*=/);
  assert.doesNotMatch(edge, /EXPO_PUBLIC_/);
  const serve = edge.slice(edge.indexOf('Deno.serve'));
  const taughtAt = serve.indexOf('class_teachers');
  const meteredAt = serve.indexOf('callMetered');
  const signedAt = serve.indexOf('createSignedUrl');
  assert.ok(taughtAt > 0, 'class_teachers missing');
  assert.ok(meteredAt > taughtAt, 'callMetered must follow class_teachers');
  assert.ok(signedAt < 0 || signedAt > taughtAt, 'createSignedUrl must follow class_teachers');
  const toml = read('supabase/config.toml');
  assert.match(toml, /\[functions\.explain-capture\]\s*\nverify_jwt\s*=\s*true/);
  const dev = read('scripts/ai-dev-server.mjs');
  assert.match(dev, /async function explainCapture/);
  const fn = dev.slice(dev.indexOf('async function explainCapture'), dev.indexOf('async function parseClassSyllabus'));
  assert.ok(fn.indexOf('class_teachers') > 0, 'dev explainCapture missing class_teachers');
  assert.ok(fn.indexOf('class_teachers') < fn.indexOf('grokCall'), 'dev authz before grokCall');
});

test('GAUTH-S1-06 ignore body.role; dual-hat parent denied explain tools', () => {
  const edge = read('supabase/functions/ask-assistant/index.ts');
  assert.doesNotMatch(edge, /body\.role\b/);
  assert.match(edge, /filterAskToolDefs/);
  const parentTeacher = { role: 'parent' as const, also_teacher: true };
  assert.equal(isAskToolAllowed('explain_capture', parentTeacher, grants), false);
  const teacherParent = { role: 'teacher' as const, parent_id: 'p1' };
  assert.equal(isAskToolAllowed('explain_capture', teacherParent, grants), true);
});

test('GAUTH-S1-07 create_class officeOnly; no approve_work; never-register holds', () => {
  assert.equal(ASK_TOOL_POLICY.create_class?.officeOnly, true);
  assert.equal(isAskToolAllowed('create_class', { role: 'teacher' }, grants), false);
  assert.equal(isAskToolAllowed('approve_work', { role: 'teacher' }, grants), false);
});

test('GAUTH-S1-08 keys server-side; verify_jwt; no EXPO_PUBLIC', () => {
  const edge = read('supabase/functions/explain-capture/index.ts');
  assert.doesNotMatch(edge, /EXPO_PUBLIC_/);
  const ask = read('supabase/functions/ask-assistant/index.ts');
  assert.doesNotMatch(ask, /EXPO_PUBLIC_/);
  const toml = read('supabase/config.toml');
  assert.match(toml, /\[functions\.ask-assistant\]\s*\nverify_jwt\s*=\s*true/);
});

test('GAUTH-S1-09 attach default Keep private; Confirm; parked draft only', () => {
  const tools = read('src/lib/ai/askTools.ts');
  assert.match(tools, /attach_explain_as_note/);
  assert.match(tools, /confirmed !== true/);
  assert.match(tools, /Keep private/);
  const ui = read('src/components/ui/ExplainDraftCard.tsx');
  assert.match(ui, /Keep private/);
  assert.match(ui, /Confirm attach/);
  assert.match(ui, /confirmAttach/);
  const sql = read('supabase/migrations/20260904000000_gauth_v1.sql');
  assert.match(sql, /attach_explain_as_note/);
  assert.match(sql, /explain_status = 'noted'/);
  assert.doesNotMatch(sql, /approved_score/);
});

test('GAUTH-S1-10/12/14 ask_messages hygiene + actor line + on-demand Explain', () => {
  const ui = read('src/components/ui/ExplainDraftCard.tsx');
  assert.match(ui, /label=\"Explain\"/);
  assert.doesNotMatch(ui, /auto-?run|useEffect\(\(\) => \{\s*void runExplain/i);
  const policy = read('src/lib/ai/askToolPolicy.ts');
  assert.match(policy, /askActorSystemLine/);
});

test('GAUTH G2 help_mode default off; assign form chips; no G4 player', () => {
  const sql = read('supabase/migrations/20260904000000_gauth_v1.sql');
  assert.match(sql, /help_mode text not null default 'off'/);
  assert.match(sql, /off.*hints.*steps_after_try.*check_work/s);
  const form = read('src/components/ui/AssignmentForm.tsx');
  assert.match(form, /Student help/);
  assert.match(form, /helpMode: 'off'/);
  assert.doesNotMatch(form, /Practice Help player|Snap & Solve/);
  // No Help Edge in this card
  assert.equal(existsSync(join(root, 'supabase/functions/practice-help/index.ts')), false);
});

test('GAUTH G3 refusal copy exact', () => {
  const card = gauthRefusalCard();
  assert.equal(card.title, "Can't help with that");
  assert.equal(
    card.text,
    "Can't help with that\nGraded class work stays between you and your teacher.\nIf you have practice assigned, open it for hints.",
  );
  const ask = read('src/app/ask.tsx');
  assert.match(ask, /GAUTH_REFUSAL_TITLE/);
});

test('GAUTH policy twins still sync for explain tools', () => {
  const client = read('src/lib/ai/askToolPolicy.ts');
  const edge = read('supabase/functions/_shared/askToolPolicy.ts');
  const ask = read('src/lib/ai/askTools.ts');
  for (const name of ['explain_capture', 'discard_explain_draft', 'attach_explain_as_note']) {
    assert.match(ask, new RegExp(`${name}:\\s*\\{`));
    assert.match(client, new RegExp(`${name}:`));
    assert.match(edge, new RegExp(`${name}:`));
  }
});
