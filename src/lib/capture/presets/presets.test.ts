import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const types = readFileSync(join(root, 'src/lib/capture/presets/types.ts'), 'utf8');
const main = readFileSync(join(root, 'src/lib/capture/presets/main.ts'), 'utf8');
const syllabus = readFileSync(join(root, 'src/lib/capture/presets/syllabus.ts'), 'utf8');
const index = readFileSync(join(root, 'src/lib/capture/presets/index.ts'), 'utf8');
const route = readFileSync(join(root, 'src/app/capture.tsx'), 'utf8');
const surface = readFileSync(join(root, 'src/components/capture/CaptureSurface.tsx'), 'utf8');

test('capture presets export main + syllabus resolver', () => {
  assert.match(types, /showClassStack/);
  assert.match(types, /showIntentBox/);
  assert.match(types, /primaryActionLabel/);
  assert.match(types, /onSubmit/);
  assert.match(main, /id: 'main'/);
  assert.match(main, /showClassStack: true/);
  assert.match(main, /showIntentBox: true/);
  assert.match(syllabus, /id: 'syllabus'/);
  assert.match(syllabus, /showClassStack: false/);
  assert.match(syllabus, /showIntentBox: false/);
  assert.match(syllabus, /primaryActionLabel: 'Import'/);
  assert.match(syllabus, /parse-class-syllabus/);
  assert.match(syllabus, /putSyllabusIngestHandoff/);
  assert.match(index, /resolveCapturePreset/);
  assert.match(index, /buildSyllabusCapturePreset/);
  assert.match(route, /resolveCapturePreset/);
  assert.match(route, /CaptureSurface/);
  assert.match(surface, /externalSubmit/);
  assert.match(surface, /showClassStack/);
  assert.match(surface, /showIntentBox/);
  assert.match(surface, /runExternalSubmit/);
});
