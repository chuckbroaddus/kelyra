import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertLatePolicyEditable,
  buildSchoolLockPolicy,
  lockedPathsFromLocks,
  parseLocks,
  rejectLockedFieldEdits,
  resolveInheritedSyllabus,
  setLock,
  stripLockedOverrides,
} from './locks.ts';
import { copySyllabusFromClass, copySyllabusFromTemplate } from './copy.ts';
import { getSchoolSyllabusTemplate, listSchoolSyllabusTemplates, templateKeys } from './templates.ts';

test('parseLocks defaults scale+rollup on; retake/assignment_max off', () => {
  const L = parseLocks({});
  assert.equal(L.scale, true);
  assert.equal(L.rollup, true);
  assert.equal(L.late, false);
  assert.equal(L.retake, false);
  assert.equal(L.assignment_max, false);
});

test('resolveInheritedSyllabus applies locked late + engine', () => {
  const policy = buildSchoolLockPolicy({
    locks: { late: true, engine: true, scale: false, rollup: false },
    lock_reasons: { late: 'District late rule −10%/day.' },
    values: {
      late_rule: { type: 'per_day', amount: 10, unit: 'percent' },
      engine: 'weighted_percent_inside',
    },
  });
  const resolved = resolveInheritedSyllabus(
    {
      engine: 'total_points',
      late_rule: { type: 'none' },
      floor: 40,
    },
    policy,
  );
  assert.equal(resolved.engine, 'weighted_percent_inside');
  assert.deepEqual(resolved.late_rule, { type: 'per_day', amount: 10, unit: 'percent' });
  assert.equal(resolved.floor, 40);
});

test('§11 item 9 locked late policy cannot be edited', () => {
  const policy = buildSchoolLockPolicy({
    locks: { late: true, scale: false, rollup: false },
    lock_reasons: { late: 'Campus late policy locked.' },
    values: { late_rule: { type: 'flat', amount: 10, unit: 'percent' } },
  });
  const baseline = { late_rule: { type: 'flat', amount: 10, unit: 'percent' } };
  const hit = assertLatePolicyEditable(baseline.late_rule, { type: 'none' }, policy);
  assert.ok(hit);
  assert.equal(hit!.field, 'late');
  assert.match(hit!.message, /cannot be edited/);
  const ok = assertLatePolicyEditable(baseline.late_rule, baseline.late_rule, policy);
  assert.equal(ok, null);
});

test('rejectLockedFieldEdits blocks engine change when locked', () => {
  const policy = buildSchoolLockPolicy({
    locks: { engine: true, scale: false, rollup: false },
    values: { engine: 'total_points' },
  });
  const rejections = rejectLockedFieldEdits(
    { engine: 'total_points' },
    { engine: 'weighted_percent_inside' },
    policy,
  );
  assert.equal(rejections.length, 1);
  assert.equal(rejections[0]!.field, 'engine');
});

test('lockedPathsFromLocks maps late + categories', () => {
  const paths = lockedPathsFromLocks({ late: true, categories: true });
  assert.ok(paths.includes('syllabus.late_rule'));
  assert.ok(paths.includes('syllabus.categories'));
});

test('stripLockedOverrides drops late override then reinherits school value', () => {
  const policy = buildSchoolLockPolicy({
    locks: { late: true, scale: false, rollup: false },
    values: { late_rule: { type: 'flat', amount: 5, unit: 'percent' } },
  });
  const out = stripLockedOverrides(
    { title: 'Alg', late_rule: { type: 'none' }, engine: 'total_points' },
    policy,
  );
  assert.deepEqual(out.late_rule, { type: 'flat', amount: 5, unit: 'percent' });
  assert.equal(out.engine, 'total_points');
  assert.equal((out as { locks?: unknown }).locks, undefined);
});

test('setLock toggles reason', () => {
  let p = buildSchoolLockPolicy({ locks: { scale: false, rollup: false } });
  p = setLock(p, 'late', true, 'Board policy 4.2');
  assert.equal(p.locks.late, true);
  assert.equal(p.lock_reasons.late, 'Board policy 4.2');
  p = setLock(p, 'late', false);
  assert.equal(p.locks.late, false);
  assert.equal(p.lock_reasons.late, undefined);
});

test('FR-TPL-02 seeds three named templates', () => {
  const keys = templateKeys();
  assert.ok(keys.includes('spring_isd_50_50'));
  assert.ok(keys.includes('homework_cap_10'));
  assert.ok(keys.includes('texas_70_retake_cap'));
  assert.equal(listSchoolSyllabusTemplates().length, 3);
  const tx = getSchoolSyllabusTemplate('texas_70_retake_cap');
  assert.equal(tx!.payload.retake?.cap_pct, 70);
  assert.equal(tx!.payload.floor, 50);
});

test('copy from template then locked late does not keep template none', () => {
  const policy = buildSchoolLockPolicy({
    locks: { late: true, scale: false, rollup: false },
    values: { late_rule: { type: 'per_day', amount: 10, unit: 'percent' } },
  });
  const copy = copySyllabusFromTemplate('spring_isd_50_50', policy);
  assert.equal(copy.source, 'template');
  assert.deepEqual(copy.syllabus.late_rule, {
    type: 'per_day',
    amount: 10,
    unit: 'percent',
  });
  assert.ok(Array.isArray(copy.syllabus.categories));
  assert.equal((copy.syllabus.categories as unknown[]).length, 2);
});

test('copy from class never carries locked category overrides', () => {
  const policy = buildSchoolLockPolicy({
    locks: { categories: true, scale: false, rollup: false },
    values: {
      categories: [{ key: 'major', label: 'Major', weight_percent: 100 }],
    },
  });
  const copy = copySyllabusFromClass(
    {
      title: 'Bio',
      engine: 'total_points',
      categories: [
        { key: 'hw', label: 'HW', weight_percent: 100 },
      ],
    },
    policy,
  );
  assert.deepEqual(copy.syllabus.categories, [
    { key: 'major', label: 'Major', weight_percent: 100 },
  ]);
  assert.equal(copy.syllabus.engine, 'total_points');
  assert.equal(copy.syllabus.title, 'Bio (copy)');
});
