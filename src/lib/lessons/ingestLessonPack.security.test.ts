import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const edge = 'supabase/functions/ingest-lesson-pack/index.ts';
const helper = 'src/lib/lessons/ingestLessonPack.ts';
const promptNote = 'notes/authoring/fom-ch01-s12-ingest-prompt.md';

test('ingest-lesson-pack is registered with verify_jwt true', () => {
  const toml = read('supabase/config.toml');
  assert.match(toml, /\[functions\.ingest-lesson-pack\]\s*\nverify_jwt\s*=\s*true/);
});

test('teacher / also_teacher / office allowed; parent / student denied; not is_staff / class_teachers', () => {
  const src = read(edge);
  assert.match(src, /function canIngest/);
  assert.match(src, /role === 'teacher'/);
  assert.match(src, /also_teacher/);
  assert.match(src, /superintendent/);
  assert.match(src, /administrator/);
  assert.match(src, /teacher or office seat required/);
  assert.match(src, /json\(\{ error: 'teacher or office seat required' \}, 401\)/);

  const canAt = src.indexOf('function canIngest');
  const canBody = src.slice(canAt, src.indexOf('\n}', canAt) + 2);
  assert.doesNotMatch(canBody, /is_staff|is_staff_profile|class_teachers/);
  assert.doesNotMatch(src, /is_staff_profile|isStaffRole\(/);
  assert.ok(!canBody.includes("role === 'parent'"));
  assert.ok(!canBody.includes("role === 'student'"));

  // getUser via user client; never service-role as actor; never return the key.
  assert.match(src, /auth\.getUser/);
  assert.match(src, /SUPABASE_ANON_KEY/);
  assert.doesNotMatch(src, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(src, /return json\(\{[^}]*SERVICE_ROLE|return json\(\{[^}]*serviceKey/i);
});

test('CORS OPTIONS 204; JSON draft only — no Storage / lesson_packs write / TTS call', () => {
  const src = read(edge);
  assert.match(src, /req\.method === 'OPTIONS'/);
  assert.match(src, /status:\s*204/);
  assert.match(src, /ok:\s*true,\s*pack:/);
  assert.doesNotMatch(src, /storage\.from\(|storage\/v1\/object/);
  assert.doesNotMatch(src, /\.from\('lesson_packs'\)\.(upsert|insert|update)/);
  // Handler must not invoke stills/TTS APIs (prompt may mention GenerateImage as a note).
  const handlerAt = src.indexOf('Deno.serve');
  assert.ok(handlerAt > 0);
  const handler = src.slice(handlerAt);
  assert.doesNotMatch(handler, /text-to-speech|elevenlabs|openai\.audio/i);
  assert.doesNotMatch(handler, /generateContent.*image|images:generate/i);
  assert.doesNotMatch(handler, /writeFile|Deno\.write/);
});

test('stamp constants match FoM 1.2 author-test ids', () => {
  const src = read(edge);
  assert.match(src, /spec:\s*'kelyra\.pack\/1'/);
  assert.match(src, /kind:\s*'lesson'/);
  assert.match(src, /deck_id:\s*'fom-ch01-s12-test'/);
  assert.match(src, /storage_deck_id:\s*'fom-ch01-s12-author-test'/);
  assert.match(src, /version:\s*'v1'/);
  assert.match(src, /title:\s*'FoM · 1\.2 Addition and Subtraction'/);
  assert.match(src, /beat_start:\s*'hook'/);
  assert.match(src, /beat_end:\s*'s12c'/);
  assert.match(src, /style_brief:\s*'kelyra-lesson\/2026-08'/);
  assert.match(src, /voice:\s*'eve'/);
  assert.match(src, /BEAT_IDS = \['hook', 's12t', 's12c'\]/);
  // Live gold must not be the stamp target (strip test ids before checking live ids).
  const withoutTestIds = src
    .replace(/fom-ch01-s12-test/g, '')
    .replace(/fom-ch01-s12-author-test/g, '');
  assert.doesNotMatch(withoutTestIds, /deck_id['":\s]+fom-ch01-s12\b/);
  assert.doesNotMatch(withoutTestIds, /storage_deck_id['":\s]+fom-ch01\b/);
  assert.doesNotMatch(src, /version:\s*'v4'|version": "v4"/);
});

test('callMetered uses lesson-outline; system prompt from ingest note', () => {
  const src = read(edge);
  assert.match(src, /job:\s*'lesson-outline'/);
  assert.match(src, /functionName:\s*'ingest-lesson-pack'/);
  assert.match(src, /callMetered/);
  assert.match(src, /requireXaiKey/);
  assert.match(src, /INGEST_SYSTEM_PROMPT/);

  const note = read(promptNote);
  assert.match(note, /You ingest one section of a teacher PowerPoint/);
  assert.ok(src.includes('You ingest one section of a teacher PowerPoint into a Kelyra lesson pack JSON.'));
  assert.ok(src.includes('deck_id": "fom-ch01-s12-test"'));
  assert.ok(src.includes('storage_deck_id": "fom-ch01-s12-author-test"'));
});

test('pptx not required; accepts slide images and/or extracted text; image cap', () => {
  const src = read(edge);
  assert.match(src, /pptx not accepted|pptx not required|Do not require \.pptx/i);
  assert.match(src, /slide text or images required/);
  assert.match(src, /MAX_IMAGES\s*=\s*16/);
  assert.match(src, /too many images/);
  assert.doesNotMatch(src, /pptx required|\.pptx required/i);
  // Must not treat Office XML as the only accepted input.
  assert.match(src, /multipart\/form-data/);
  assert.match(src, /slide_text|extracted_text/);
  assert.match(src, /input_image/);
});

test('rejects markdown or missing stamps with 400', () => {
  const src = read(edge);
  assert.match(src, /looksLikeMarkdown/);
  assert.match(src, /model returned markdown/);
  assert.match(src, /missing or wrong stamp/);
  assert.match(src, /items\[\{stem\}\] required/);
  assert.match(src, /beats must be exactly/);
  assert.match(src, /JSON\.parse/);
});

test('client helper uses user JWT only; no service role; no assign', () => {
  const src = read(helper);
  assert.match(src, /ingest-lesson-pack/);
  assert.match(src, /getSession|access_token/);
  assert.match(src, /Authorization.*Bearer/);
  assert.doesNotMatch(src, /SERVICE_ROLE|service_role|EXPO_PUBLIC_.*SECRET/);
  assert.doesNotMatch(src, /\bassignLesson\s*\(/);
  assert.doesNotMatch(src, /publishLessonPack/);
});
