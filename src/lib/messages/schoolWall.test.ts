import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applySchoolWallToThread,
  filterDirectoryBySchool,
  filterMembersBySchool,
  isSameSchool,
  titleIsOnlyOutOfSchoolName,
  type SchoolWallPerson,
} from './schoolWall.ts';

const SCHOOL_A = 'school-a';
const SCHOOL_B = 'school-b';

function person(
  id: string,
  schoolId: string | null,
  name: string,
  role: SchoolWallPerson['role'] = 'parent',
): SchoolWallPerson {
  return {
    id,
    school_id: schoolId,
    username: id,
    display_name: name,
    role,
    photoUrl: null,
  };
}

test('isSameSchool: null school is never in the school', () => {
  assert.equal(isSameSchool(SCHOOL_A, SCHOOL_A), true);
  assert.equal(isSameSchool(SCHOOL_A, SCHOOL_B), false);
  assert.equal(isSameSchool(SCHOOL_A, null), false);
  assert.equal(isSameSchool(null, SCHOOL_A), false);
  assert.equal(isSameSchool('', SCHOOL_A), false);
  assert.equal(isSameSchool(SCHOOL_A, ''), false);
});

test('AC-TRAY-SCHOOL-2: direct with only other-school person is hidden (bad link stays)', () => {
  const jacquee = person('jacquee', SCHOOL_B, 'Jacquee Broaddus');
  const byId = new Map([[jacquee.id, jacquee]]);
  const walled = applySchoolWallToThread(
    SCHOOL_A,
    {
      id: 'thread-bad',
      kind: 'direct',
      title: null,
      lastMessageAt: '2026-09-27T00:00:00Z',
      lastBody: 'hi',
      lastFromMe: false,
      photoUrl: null,
      muted: false,
      unread: true,
      pinned: true,
      otherIds: [jacquee.id],
    },
    byId,
  );
  assert.equal(walled, null);
});

test('AC-TRAY-SCHOOL-3: in-school parent (Taylor Lee) still appears', () => {
  const taylor = person('taylor', SCHOOL_A, 'Taylor Lee');
  const byId = new Map([[taylor.id, taylor]]);
  const walled = applySchoolWallToThread(
    SCHOOL_A,
    {
      id: 'thread-taylor',
      kind: 'direct',
      title: null,
      lastMessageAt: '2026-09-27T00:00:00Z',
      lastBody: 'need',
      lastFromMe: false,
      photoUrl: null,
      muted: false,
      unread: true,
      pinned: false,
      otherIds: [taylor.id],
    },
    byId,
  );
  assert.ok(walled);
  assert.equal(walled!.other?.display_name, 'Taylor Lee');
  assert.equal(walled!.faces.length, 1);
  assert.equal(walled!.faces[0]!.name, 'Taylor Lee');
});

test('AC-TRAY-SCHOOL-1: tray faces omit other-school people; in-school stay', () => {
  const taylor = person('taylor', SCHOOL_A, 'Taylor Lee');
  const jacquee = person('jacquee', SCHOOL_B, 'Jacquee Broaddus');
  const byId = new Map([
    [taylor.id, taylor],
    [jacquee.id, jacquee],
  ]);
  const walled = applySchoolWallToThread(
    SCHOOL_A,
    {
      id: 'thread-group',
      kind: 'group',
      title: null,
      lastMessageAt: '2026-09-27T00:00:00Z',
      lastBody: null,
      lastFromMe: false,
      photoUrl: null,
      muted: false,
      unread: false,
      pinned: false,
      otherIds: [taylor.id, jacquee.id],
    },
    byId,
  );
  assert.ok(walled);
  assert.deepEqual(
    walled!.faces.map((face) => face.name),
    ['Taylor Lee'],
  );
  assert.equal(walled!.memberCount, 2);
});

test('group whose saved title is only the other-school name does not show that name', () => {
  const taylor = person('taylor', SCHOOL_A, 'Taylor Lee');
  const jacquee = person('jacquee', SCHOOL_B, 'Jacquee Broaddus');
  assert.equal(titleIsOnlyOutOfSchoolName('Jacquee Broaddus', [jacquee]), true);
  assert.equal(titleIsOnlyOutOfSchoolName('Math Team', [jacquee]), false);
  const byId = new Map([
    [taylor.id, taylor],
    [jacquee.id, jacquee],
  ]);
  const walled = applySchoolWallToThread(
    SCHOOL_A,
    {
      id: 'thread-titled',
      kind: 'group',
      title: 'Jacquee Broaddus',
      lastMessageAt: '2026-09-27T00:00:00Z',
      lastBody: null,
      lastFromMe: false,
      photoUrl: null,
      muted: false,
      unread: false,
      pinned: true,
      otherIds: [taylor.id, jacquee.id],
    },
    byId,
  );
  assert.ok(walled);
  assert.equal(walled!.title, null);
  assert.equal(walled!.faces[0]!.name, 'Taylor Lee');
});

test('group with only other-school members is hidden even when pinned locally', () => {
  const jacquee = person('jacquee', SCHOOL_B, 'Jacquee Broaddus');
  const byId = new Map([[jacquee.id, jacquee]]);
  const walled = applySchoolWallToThread(
    SCHOOL_A,
    {
      id: 'thread-pin-bad',
      kind: 'group',
      title: 'Friends',
      lastMessageAt: '2026-09-27T00:00:00Z',
      lastBody: 'hey',
      lastFromMe: true,
      photoUrl: null,
      muted: false,
      unread: true,
      pinned: true,
      otherIds: [jacquee.id],
    },
    byId,
  );
  assert.equal(walled, null);
});

test('null my school_id fails closed — no tray row', () => {
  const taylor = person('taylor', SCHOOL_A, 'Taylor Lee');
  const byId = new Map([[taylor.id, taylor]]);
  assert.equal(
    applySchoolWallToThread(
      null,
      {
        id: 't1',
        kind: 'direct',
        title: null,
        lastMessageAt: '2026-09-27T00:00:00Z',
        lastBody: null,
        lastFromMe: false,
        photoUrl: null,
        muted: false,
        unread: false,
        pinned: false,
        otherIds: [taylor.id],
      },
      byId,
    ),
    null,
  );
});

test('compose / directory wall: admin merge cannot resurrect other-school person', () => {
  const rows = [
    person('taylor', SCHOOL_A, 'Taylor Lee'),
    person('jacquee', SCHOOL_B, 'Jacquee Broaddus'),
    person('null-school', null, 'No School'),
  ];
  const filtered = filterDirectoryBySchool(SCHOOL_A, rows);
  assert.deepEqual(
    filtered.map((row) => row.id),
    ['taylor'],
  );
  assert.deepEqual(filterDirectoryBySchool(null, rows), []);
});

test('thread member list omits other-school person; keeps self', () => {
  const me = person('me', SCHOOL_A, 'Teacher A', 'teacher');
  const taylor = person('taylor', SCHOOL_A, 'Taylor Lee');
  const jacquee = person('jacquee', SCHOOL_B, 'Jacquee Broaddus');
  const filtered = filterMembersBySchool('me', SCHOOL_A, [me, taylor, jacquee]);
  assert.deepEqual(
    filtered.map((row) => row.id),
    ['me', 'taylor'],
  );
});
