import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { showHeaderCapture } from '../chrome/headerCapture.ts';
import {
  directoryPersonKindLabel,
  seatAllowsCaptureJob,
  seatMayCreatePersonFromPhoto,
  seatRefusesClassworkGrade,
  seatRefusesCreateFromPhoto,
  seatSeesPersonPhotoChoice,
  seatShowsCaptureComposerExtras,
  seatShowsCapturePhotoFileIcons,
  seatUnsureIntentOptions,
} from './seatJobs.ts';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

/** AC-SC-1 — header Open Capture on office seats (not Messages / My children). */
test('AC-SC-1: office seats show Open Capture left of Search; hide Messages and My children', () => {
  assert.equal(showHeaderCapture('/', 'superintendent'), true);
  assert.equal(showHeaderCapture('/', 'administrator'), true);
  assert.equal(showHeaderCapture('/capture', 'superintendent'), true);
  assert.equal(showHeaderCapture('/messages', 'superintendent'), false);
  assert.equal(showHeaderCapture('/messages/t1', 'administrator'), false);
  assert.equal(showHeaderCapture('/parent', 'superintendent'), false);
  assert.equal(showHeaderCapture('/parent/ride', 'administrator'), false);

  const header = read('src/components/ui/AppHeader.tsx');
  assert.match(header, /accessibilityLabel="Open Capture"/);
  assert.match(header, /showHeaderCapture\(pathname,\s*chromeState\.role\)/);
  // Photograph grant is seat-based — not matrix capture.use (PM lock).
  assert.doesNotMatch(header, /can\(profile,\s*'capture\.use'/);
  const capture = header.indexOf('showCapture ?');
  const search = header.indexOf('showSearch ?');
  assert.ok(capture > 0 && search > capture);
});

test('AC-SC-1 / AC-SC-6: every signed-in seat gets the header camera; not a tray tab', () => {
  assert.equal(showHeaderCapture('/', 'teacher'), true);
  assert.equal(showHeaderCapture('/', 'parent'), true);
  assert.equal(showHeaderCapture('/parent', 'parent'), true);
  assert.equal(showHeaderCapture('/todo', 'student'), true);
  assert.equal(showHeaderCapture('/', 'student'), true);
  assert.equal(showHeaderCapture('/messages', 'parent'), false);
  assert.equal(showHeaderCapture('/messages', 'student'), false);
  assert.equal(showHeaderCapture('/', 'none'), false);

  const tray = read('src/lib/chrome/trayTabs.ts');
  assert.doesNotMatch(tray, /key:\s*'capture'/);
});

/** AC-SC-4 / AC-SC-31 — office person-photo choice; shared list; no classwork grade. */
test('AC-SC-4 / AC-SC-31: both office seats see person-photo choice; teacher/parent/student do not', () => {
  assert.equal(seatSeesPersonPhotoChoice('superintendent'), true);
  assert.equal(seatSeesPersonPhotoChoice('administrator'), true);
  assert.equal(seatSeesPersonPhotoChoice('teacher'), false);
  assert.equal(seatSeesPersonPhotoChoice('parent'), false);
  assert.equal(seatSeesPersonPhotoChoice('student'), false);

  assert.equal(seatMayCreatePersonFromPhoto('superintendent'), true);
  assert.equal(seatMayCreatePersonFromPhoto('administrator'), true);
  assert.equal(seatMayCreatePersonFromPhoto('teacher'), false);
  assert.equal(seatMayCreatePersonFromPhoto('parent'), false);
  assert.equal(seatMayCreatePersonFromPhoto('student'), false);

  for (const role of ['superintendent', 'administrator'] as const) {
    assert.ok(seatAllowsCaptureJob(role, 'school_logo'));
    assert.ok(seatAllowsCaptureJob(role, 'parent_card'));
    assert.ok(seatAllowsCaptureJob(role, 'roster'));
    assert.ok(seatAllowsCaptureJob(role, 'create_class'));
    assert.ok(seatAllowsCaptureJob(role, 'person_photo_choice'));
    assert.equal(seatRefusesClassworkGrade(role), true);
    assert.ok(!seatUnsureIntentOptions(role).some(([key]) => key === 'homework'));
  }

  const officeSuper = seatUnsureIntentOptions('superintendent').map(([k]) => k).sort();
  const officeAdmin = seatUnsureIntentOptions('administrator').map(([k]) => k).sort();
  assert.deepEqual(officeSuper, officeAdmin);
});

/** AC-SC-12 — person photo waits for choice; class/roster waits for confirm; other seats refuse create. */
test('AC-SC-12: create class/roster/person refused off office; office person create is choice not silent', () => {
  assert.equal(seatRefusesCreateFromPhoto('teacher', 'class'), true);
  assert.equal(seatRefusesCreateFromPhoto('teacher', 'roster'), true);
  assert.equal(seatRefusesCreateFromPhoto('teacher', 'person'), true);
  assert.equal(seatRefusesCreateFromPhoto('parent', 'person'), true);
  assert.equal(seatRefusesCreateFromPhoto('student', 'person'), true);
  assert.equal(seatRefusesCreateFromPhoto('superintendent', 'class'), false);
  assert.equal(seatRefusesCreateFromPhoto('administrator', 'roster'), false);
  assert.equal(seatRefusesCreateFromPhoto('administrator', 'person'), false);

  const capture = read('src/app/capture.tsx');
  assert.match(capture, /personPhotoChoice|seatSeesPersonPhotoChoice|seatMayCreatePersonFromPhoto/);
  assert.match(capture, /Cancel before the choice|personPhotoChoice === 'choose'|setPersonPhotoChoice/);
  // No silent office person insert before choice — null or choose both block Confirm.
  assert.match(
    capture,
    /personPhotoChoiceOpen && \(personPhotoChoice == null \|\| personPhotoChoice === 'choose'\)/,
  );
  assert.match(capture, /seatSeesPersonPhotoChoice\(chromeRole\)/);
  assert.match(capture, /Avatar on someone who already exists/);
  assert.match(capture, /Create a new person/);
  assert.match(capture, /Choose before filing/);
});

test('AC-SC-31: directory rows say student, parent, or staff', () => {
  assert.equal(directoryPersonKindLabel({ student_id: 's1' }), 'student');
  assert.equal(directoryPersonKindLabel({ parent_id: 'p1' }), 'parent');
  assert.equal(directoryPersonKindLabel({ role: 'teacher' }), 'staff');
  assert.equal(directoryPersonKindLabel({ role: 'superintendent' }), 'staff');
});

/** AC-SC-32 — office + Teach get Photo/Files; mic and web drop stay Teach. */
test('AC-SC-32: office and Teach show Photo or Video and Files; parent/student do not; other extras stay Teach', () => {
  assert.equal(seatShowsCapturePhotoFileIcons('teacher'), true);
  assert.equal(seatShowsCapturePhotoFileIcons('superintendent'), true);
  assert.equal(seatShowsCapturePhotoFileIcons('administrator'), true);
  assert.equal(seatShowsCapturePhotoFileIcons('parent'), false);
  assert.equal(seatShowsCapturePhotoFileIcons('student'), false);
  assert.equal(seatShowsCapturePhotoFileIcons('none'), false);

  // Mic + web drop remain Teach-only (AC-SC-3 for those extras).
  assert.equal(seatShowsCaptureComposerExtras('teacher'), true);
  assert.equal(seatShowsCaptureComposerExtras('superintendent'), false);
  assert.equal(seatShowsCaptureComposerExtras('administrator'), false);
  assert.equal(seatShowsCaptureComposerExtras('parent'), false);
  assert.equal(seatShowsCaptureComposerExtras('student'), false);

  const capture = read('src/app/capture.tsx');
  assert.match(capture, /photoFileIcons \? \(/);
  assert.match(capture, /label="Photo or Video"/);
  assert.match(capture, /label="Files"/);
  assert.match(capture, /composerExtras \? \(/);
  assert.match(capture, /Platform\.OS === 'web' && composerExtras/);
  assert.match(capture, /seatShowsCapturePhotoFileIcons/);
  assert.match(capture, /seatShowsCaptureComposerExtras/);
  // Upload class stack stays teachSeat, not office photo/file gate.
  assert.match(capture, /teachSeat \? \(/);
  assert.match(capture, /Upload class stack/);
});

test('capture screen wires seat jobs and Open Capture route; no tray Capture tab', () => {
  const capture = read('src/app/capture.tsx');
  assert.match(capture, /seatUnsureIntentOptions/);
  assert.match(capture, /seatShowsCaptureComposerExtras/);
  assert.match(capture, /seatShowsCapturePhotoFileIcons/);
  assert.match(capture, /school_logo/);
  assert.match(capture, /create_class/);
  assert.doesNotMatch(capture, /aria-label=\{'Choose what to photograph'\}/);

  const chrome = read('src/lib/chrome/ChromeProvider.tsx');
  assert.match(chrome, /router\.push\('\/capture'\)/);
});
