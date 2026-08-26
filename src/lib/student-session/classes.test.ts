import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classesNeedTeacherPeople,
  mergeClassTeachers,
  queryParam,
  type StudentClass,
  type StudentPerson,
} from './classes.ts';

function room(partial: Partial<StudentClass> & Pick<StudentClass, 'classId' | 'className'>): StudentClass {
  return {
    feedIcon: null,
    teacherName: null,
    teacherPhotoPath: null,
    teacherPhotoUrl: null,
    ...partial,
  };
}

const teacher: StudentPerson = {
  kind: 'teacher',
  id: 't1',
  profileId: 'p1',
  displayName: 'Ms. Park',
  photoPath: 'teachers/t1.jpg',
  classId: 'c1',
  className: 'Math',
};

test('teacher people hydrate only when the class row has no teacher name', () => {
  assert.equal(classesNeedTeacherPeople([room({ classId: 'c1', className: 'Math' })]), true);
  assert.equal(
    classesNeedTeacherPeople([room({ classId: 'c1', className: 'Math', teacherName: 'Ms. Park' })]),
    false,
  );
  assert.equal(
    classesNeedTeacherPeople([
      room({ classId: 'c1', className: 'Math', teacherName: 'Ms. Park', teacherPhotoPath: null }),
    ]),
    false,
  );
});

test('merge fills missing teacher name and photo from people, leaves named rows', () => {
  const rows = [
    room({ classId: 'c1', className: 'Math' }),
    room({ classId: 'c2', className: 'Read', teacherName: 'Mr. Lee', teacherPhotoPath: 'teachers/lee.jpg' }),
  ];
  const next = mergeClassTeachers(rows, [teacher]);
  assert.equal(next[0]?.teacherName, 'Ms. Park');
  assert.equal(next[0]?.teacherPhotoPath, 'teachers/t1.jpg');
  assert.equal(next[1]?.teacherName, 'Mr. Lee');
  assert.equal(next[1]?.teacherPhotoPath, 'teachers/lee.jpg');
});

test('queryParam reads the first expo-router value', () => {
  assert.equal(queryParam(undefined), '');
  assert.equal(queryParam('c1'), 'c1');
  assert.equal(queryParam(['c2', 'c1']), 'c2');
});
