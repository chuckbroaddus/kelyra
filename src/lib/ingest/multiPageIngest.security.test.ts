import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

test('pickNormalizedPhotos enables multi-select and 20-cap; single pick kept', () => {
  const src = read('src/lib/media/pickPhoto.ts');
  assert.match(src, /export async function pickNormalizedPhoto\b/);
  assert.match(src, /export async function pickNormalizedPhotos\b/);
  assert.match(src, /allowsMultipleSelection:\s*true/);
  assert.match(src, /selectionLimit:\s*max/);
  assert.match(src, /MAX_GRADING_DOC_PAGES/);
});

test('syllabus + school policy ingest send all pages in one invoke', () => {
  const syllabus = read('src/app/class/[id]/syllabus.tsx');
  // Capture import tray icon moved into SyllabusWizard (preset=syllabus route).
  const wizard = read('src/components/syllabus/SyllabusWizard.tsx');
  const school = read('src/app/school/grading-policy/index.tsx');
  const syllabusPreset = read('src/lib/capture/presets/syllabus.ts');
  assert.match(syllabus, /uploadGradingDocPages/);
  assert.match(syllabus, /storage_paths:\s*uploaded\.storage_paths/);
  assert.match(syllabus, /image_urls:\s*uploaded\.image_urls/);
  assert.match(syllabus, /readingStatusForPages/);
  assert.match(wizard, /capture\?preset=syllabus/);
  assert.match(syllabusPreset, /MAX_GRADING_DOC_PAGES/);
  assert.match(syllabusPreset, /uploadGradingDocPages/);
  assert.match(syllabusPreset, /putSyllabusIngestHandoff/);
  assert.match(school, /uploadGradingDocPages/);
  assert.match(school, /pickNormalizedPhotos/);
  assert.match(school, /storage_paths:\s*uploaded\.storage_paths/);
  assert.match(school, /image_urls:\s*uploaded\.image_urls/);
  assert.match(school, /readingStatusForPages/);
  assert.match(school, /MAX_GRADING_DOC_PAGES/);
  assert.match(school, /IngestPendingPagesCard/);
});

test('web fixture hook exposes multi-page __kelyraIngestFromUris', () => {
  const hook = read('src/lib/ingest/webIngestFixtureHook.ts');
  assert.match(hook, /__kelyraIngestFromUris/);
  assert.match(hook, /__kelyraIngestFromUri/);
});

test('S13 multipage fixture keeps weights on page 2', () => {
  const expected = JSON.parse(
    fs.readFileSync(
      path.join(root, 'notes/qa-fixtures/gradebook-ingest/S13/expected.json'),
      'utf8',
    ),
  );
  const cats = expected.fields.find((f: { path: string }) => f.path === 'syllabus.categories');
  assert.ok(cats);
  assert.equal(cats.evidence.page, 2);
  assert.equal(cats.value.length, 3);
  const meta = JSON.parse(
    fs.readFileSync(
      path.join(root, 'notes/qa-fixtures/gradebook-ingest/S13/eval-meta.json'),
      'utf8',
    ),
  );
  assert.equal(meta.multi_page, true);
  assert.deepEqual(meta.pages, ['page-1.png', 'page-2.png']);
  for (const name of meta.pages) {
    assert.ok(
      fs.existsSync(path.join(root, 'notes/qa-fixtures/gradebook-ingest/S13', name)),
      name,
    );
  }
});

test('server prompt notes page order; vision uses image_urls only (no PDF rasterize)', () => {
  const edge = read('supabase/functions/ingest-grading-doc/index.ts');
  assert.match(edge, /Max 20 pages or images per ingest/);
  assert.match(edge, /Storage paths \(page order\)/);
  assert.match(edge, /input_image/);
  // PDF is mentioned in header comment only — no server-side PDF decode.
  assert.doesNotMatch(edge, /pdfjs|pdftoppm|rasterizePdf|application\/pdf/);
  const clientDoc = read('src/lib/ingest/gradingDocPages.ts');
  assert.match(clientDoc, /multi-page PDF is NOT rasterized/i);
});
