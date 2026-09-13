import assert from 'node:assert/strict';
import test from 'node:test';

import { REVIEW_DRAFT_BANNER, buildCalendarAskDraft } from './askDraft.ts';

function err(input: Parameters<typeof buildCalendarAskDraft>[0]): string {
  const r = buildCalendarAskDraft(input);
  assert.equal(r.ok, false);
  return r.ok ? '' : r.error;
}

test('CAL-09 refuse: class-create, student-insert, grade Approve, twin merge, diary, school blast', () => {
  assert.match(err({ seat: 'teacher', title: 'x', createClass: true }), /cannot create a class/i);
  assert.match(err({ seat: 'teacher', title: 'x', addStudent: true }), /cannot insert a student/i);
  assert.match(err({ seat: 'teacher', title: 'x', approveGrade: true }), /never Approve/i);
  assert.match(err({ seat: 'parent', title: 'x', twinMerge: true }), /Twins stay separate/i);
  assert.match(err({ seat: 'parent', title: 'x', fileDiary: true }), /does not file Diary/i);
  assert.match(
    err({ seat: 'teacher', title: 'Assembly', schoolBlast: true, kind: 'school' }),
    /Only office/i,
  );
});

test('CAL-09 teacher class draft binds classId; school refused', () => {
  const bad = buildCalendarAskDraft({ seat: 'teacher', title: 'Trip', kind: 'class' });
  assert.equal(bad.ok, false);
  const ok = buildCalendarAskDraft({
    seat: 'teacher',
    title: 'Field trip',
    kind: 'class',
    classId: 'class-1',
    startDate: '2026-09-18',
  });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.draft.classId, 'class-1');
    assert.equal(ok.draft.source, 'ai_nl');
    assert.equal(ok.banner, REVIEW_DRAFT_BANNER);
  }
  const school = buildCalendarAskDraft({ seat: 'teacher', title: 'Holiday', kind: 'school' });
  assert.equal(school.ok, false);
});

test('CAL-09 parent absence uses focused child; twins ambiguous refuse', () => {
  const twins = [
    { id: 'a', display_name: 'Saydee Broaddus' },
    { id: 'b', display_name: 'Sydnee Broaddus' },
  ];
  const amb = buildCalendarAskDraft({
    seat: 'parent',
    title: 'Doctor',
    kind: 'absence',
    childName: 'S',
    linkedChildren: twins,
  });
  assert.equal(amb.ok, false);
  assert.match(amb.error ?? '', /Twins never merge|Which child/i);

  const focused = buildCalendarAskDraft({
    seat: 'parent',
    title: 'Doctor pull-out',
    kind: 'absence',
    childStudentId: 'a',
    startDate: '2026-09-16',
    allDay: false,
    startsAt: '2026-09-16T17:00:00.000Z',
  });
  assert.equal(focused.ok, true);
  if (focused.ok) {
    assert.equal(focused.draft.childStudentId, 'a');
    assert.equal(focused.draft.kind, 'absence');
    assert.match(focused.visibilityCaption, /teachers/i);
  }
});

test('CAL-09 student study only; office school only', () => {
  const student = buildCalendarAskDraft({
    seat: 'student',
    title: 'Study block',
    kind: 'personal',
    category: 'study',
  });
  assert.equal(student.ok, true);
  const studentSchool = buildCalendarAskDraft({ seat: 'student', title: 'Holiday', kind: 'school' });
  assert.equal(studentSchool.ok, false);
  const office = buildCalendarAskDraft({ seat: 'office', title: 'Early release', kind: 'school' });
  assert.equal(office.ok, true);
  const officeAbsence = buildCalendarAskDraft({ seat: 'office', title: 'Absence', kind: 'absence' });
  assert.equal(officeAbsence.ok, false);
});
