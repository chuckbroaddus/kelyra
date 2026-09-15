import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

/** Strip line + block comments so prose may mention forbidden APIs. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[\s;])\/\/.*$/gm, '$1');
}

test('I1-SEC no FileReader / no base64 whole PDF in ingest upload path', () => {
  const files = [
    'src/lib/ingest/uploadClient.ts',
    'src/lib/ingest/hash.ts',
    'src/lib/ingest/runUpload.ts',
    'src/components/ingest/ClassStackBinder.tsx',
    'src/components/ingest/SplitReview.tsx',
    'src/lib/ingest/api.ts',
  ];
  for (const rel of files) {
    const src = stripComments(read(rel));
    assert.doesNotMatch(src, /\bFileReader\b/);
    assert.doesNotMatch(src, /readAsDataURL/);
    assert.doesNotMatch(src, /readAsBinaryString/);
    assert.doesNotMatch(src, /\bbtoa\s*\(/);
  }
});

test('I1-SEC TUS used when over 6 MB; chunk size locked to 6 MiB', () => {
  const src = read('src/lib/ingest/uploadClient.ts');
  assert.match(src, /tus-js-client/);
  assert.match(src, /chunkSize:\s*TUS_CHUNK_BYTES/);
  assert.match(src, /shouldUseTus/);
  assert.match(src, /upload\/resumable/);
  assert.match(src, /\.upload\(\s*input\.storagePath,\s*input\.file/);
});

test('I1-SEC CE-A entry gated to Teach seat; Parent/Office/Student get no chrome', () => {
  const capture = read('src/app/capture.tsx');
  assert.match(capture, /ClassStackBinder/);
  assert.match(capture, /chromeRole === 'teacher'/);

  const binder = read('src/components/ingest/ClassStackBinder.tsx');
  assert.match(binder, /teachSeat/);
  assert.match(binder, /teachSeatOnly|Teach seat/);
});

test('I1-SEC class bound before upload (disabled without classId)', () => {
  const binder = read('src/components/ingest/ClassStackBinder.tsx');
  assert.match(binder, /disabled=\{busy \|\| !classId/);
  assert.match(binder, /pagesPerStudent|Pages per student/);
});
