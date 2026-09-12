import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const source = readFileSync(join(process.cwd(), 'src/app/capture.tsx'), 'utf8');

test('capture camera focus effect depends on the stable chrome setter', () => {
  assert.match(source, /const setForceHidden = chrome\.setForceHidden/);
  assert.match(source, /\[cameraOpen, setForceHidden\]/);
  assert.doesNotMatch(source, /\[cameraOpen, chrome\]/);
});

test('unified Capture: Image Preview, icon row, text+mic, Ask AI, inline confirm', () => {
  assert.doesNotMatch(source, /SectionHeader[^\n]*Image Preview|label="Image Preview"/);
  assert.match(source, /mediaHits:[\s\S]*?justifyContent:\s*'space-evenly'/);
  assert.match(source, /label="Camera"/);
  assert.match(source, /label="Photo or Video"/);
  assert.match(source, /label="Files"/);
  assert.match(source, /Ask AI to process/);
  assert.match(source, /This will be/);
  assert.match(source, /classify-capture/);
  assert.match(source, /MediaTypeOptions\.All/);
  assert.match(source, /pickMessageDocument/);
  assert.match(source, /transcribeAudioDirect/);
  assert.match(source, /startLiveDictation/);
  assert.match(source, /isLiveDictationSupported/);
  assert.match(source, /dictationBaseRef/);
  assert.match(source, /onDrop/);
  assert.doesNotMatch(source, /Who is this\?/);
  assert.doesNotMatch(source, /Ask AI to guess the name/);
  assert.doesNotMatch(source, /Record the name/);
});

test('PhotoFrame empty well uses Image Preview and drops one-student meta', () => {
  const frame = readFileSync(join(process.cwd(), 'src/components/ui/PhotoFrame.tsx'), 'utf8');
  assert.match(frame, /Image Preview/);
  assert.doesNotMatch(frame, /Photograph the work/);
  assert.doesNotMatch(frame, /One student per photo/);
});

test('Pack B Approve path remains reachable on Capture', () => {
  assert.match(source, /KeygradePackBReview/);
  assert.match(source, /canApproveKeygrade/);
  assert.match(source, /persistCapture\('approve'/);
});

test('Capture recognizes syllabus intent and respects teacher note', () => {
  assert.match(source, /'syllabus'/);
  assert.match(source, /spokenSuggestsSyllabus|spokenSuggestsIntent/);
  assert.match(source, /teacherNote:\s*spokenName/);
  assert.match(source, /This will be a class syllabus \/ grading policy/);
  assert.match(source, /\['syllabus', 'Syllabus'\]/);
  assert.match(source, /parse-class-syllabus/);
  assert.match(source, /upsertSyllabusAskDraft/);
  assert.match(source, /Parse syllabus for \$\{name\}/);
  assert.match(source, /Parse syllabus for this class/);
  assert.doesNotMatch(
    source,
    /nextIntent === 'unsure' && \(result\.studentGuessName \|\| result\.gaps\?\.length \|\| spokenName\.trim\(\)\)\)/,
  );
});

test('Capture syllabus confirm asks which class when none is selected', () => {
  assert.match(source, /function syllabusConfirmLabel/);
  assert.match(source, /Choose which class/);
  assert.match(source, /title="Which class\?"/);
  assert.match(source, /syllabusClassOverride/);
  assert.match(source, /setClassPickerOpen\(true\)/);
  assert.match(source, /taughtClasses\.length === 1/);
  assert.match(source, /Which class should we parse this syllabus for/);
  assert.doesNotMatch(source, /intent === 'syllabus'[\s\S]{0,220}Name a class/);
  assert.doesNotMatch(source, /intent === 'syllabus'[\s\S]{0,280}router\.replace\('\/\?switch=1'\)/);
});

test('Capture classifies answer_key / vehicle / hold intents and wires confirms', () => {
  assert.match(source, /'answer_key'/);
  assert.match(source, /'vehicle'/);
  assert.match(source, /'lesson_plan'/);
  assert.match(source, /'lesson_materials'/);
  assert.match(source, /'feed_photo'/);
  assert.match(source, /This will be an answer key for an assignment/);
  assert.match(source, /This will be a Ride vehicle \/ license plate/);
  assert.match(source, /Recognized — lesson plan surface not shipping yet/);
  assert.match(source, /Recognized — feed photo post not shipping yet/);
  assert.match(source, /\['answer_key', 'Answer key'\]/);
  assert.match(source, /\['vehicle', 'Vehicle \/ plate'\]/);
  assert.match(source, /\['lesson_plan', 'Lesson plan'\]/);
  assert.match(source, /\['lesson_materials', 'Lesson materials'\]/);
  assert.match(source, /\['feed_photo', 'Feed photo'\]/);
  assert.match(source, /analyze-answer-key/);
  assert.match(source, /updateAssignment/);
  assert.match(source, /Attach key to assignment/);
  assert.match(source, /invokeRideLpr/);
  assert.match(source, /staffAttachVehicle/);
  assert.match(source, /vehiclePlateFront/);
  assert.match(source, /vehicleMake/);
  assert.match(source, /saveHoldConfirm/);
  assert.match(source, /spokenSuggestsIntent/);
});

test('classify-capture Edge allowlists the five new intents', () => {
  const edge = readFileSync(join(process.cwd(), 'supabase/functions/classify-capture/index.ts'), 'utf8');
  assert.match(edge, /answer_key/);
  assert.match(edge, /vehicle/);
  assert.match(edge, /lesson_plan/);
  assert.match(edge, /lesson_materials/);
  assert.match(edge, /feed_photo/);
  assert.match(edge, /teacherNote/);
  assert.match(edge, /spokenName/);
});

test('ride-lpr returns make/model and front/back plates', () => {
  const edge = readFileSync(join(process.cwd(), 'supabase/functions/ride-lpr/index.ts'), 'utf8');
  assert.match(edge, /plateFront/);
  assert.match(edge, /plateBack/);
  assert.match(edge, /"make"/);
  assert.match(edge, /"model"/);
  assert.match(edge, /Never invent a person/);
});
