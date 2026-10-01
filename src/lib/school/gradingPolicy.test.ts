import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyLevelDefaults,
  canPublish,
  createEmptyDraft,
  draftToPayload,
  hardErrors,
  planCalendarBinding,
  planPublish,
  setField,
  validatePolicyPayload,
  validateScaleBands,
  validateQualityPoints,
} from './gradingPolicy.ts';
import { makeScaleFromTemplate } from '../grade/scale/scale.ts';
import { DEFAULT_QUALITY_TABLES } from '../grade/gpa/gpa.ts';

test('default high draft validates and can publish', () => {
  const draft = createEmptyDraft('school-1', 'high');
  const payload = draftToPayload(draft);
  const issues = validatePolicyPayload(payload);
  assert.equal(hardErrors(issues).length, 0, JSON.stringify(issues));
  assert.equal(canPublish(payload), true);
});

test('lock_reasons round-trip on payload (GB-18)', () => {
  let draft = createEmptyDraft('school-1', 'high');
  draft = setField(
    draft,
    'locks.map',
    {
      engine: false,
      categories: false,
      scale: false,
      floor: false,
      late: true,
      drop_lowest: false,
      retake: false,
      assignment_max: false,
      book_mode: false,
      rollup: false,
    },
    'user',
  );
  draft = setField(draft, 'locks.reasons', { late: 'Board late rule' }, 'user');
  const payload = draftToPayload(draft);
  assert.equal(payload.locks.late, true);
  assert.equal(payload.lock_reasons.late, 'Board late rule');
});

test('elementary draft turns GPA off and credit none', () => {
  const draft = createEmptyDraft('school-1', 'elementary');
  const payload = draftToPayload(draft);
  assert.equal(payload.gpa_mode, 'off');
  assert.equal(payload.credit_policy.unit, 'none');
  assert.equal(payload.credit_policy.exam_exemption?.enabled, false);
  assert.equal(canPublish(payload), true);
});

test('applyLevelDefaults rebuilds calendar template', () => {
  let draft = createEmptyDraft('school-1', 'high');
  draft = applyLevelDefaults(draft, 'middle');
  const payload = draftToPayload(draft);
  assert.equal(payload.level, 'middle');
  assert.equal(payload.calendar_template, 'nine_weeks');
  assert.ok(payload.calendar.periods.length > 0);
});

test('rollups on default calendar sum to 1', () => {
  const payload = draftToPayload(createEmptyDraft('s', 'high'));
  for (const r of payload.calendar.rollups) {
    const sum = r.components.reduce((a, c) => a + c.weight, 0);
    assert.ok(Math.abs(sum - 1) < 0.0001, String(sum));
  }
});

test('scale bands gap is an error', () => {
  const issues = validateScaleBands(
    [
      { min_pct: 0, max_pct: 59, letter: 'F', passing: false },
      { min_pct: 70, max_pct: 100, letter: 'A', passing: true },
    ],
    'percent',
  );
  assert.ok(issues.some((i) => i.message.includes('gap')));
});

test('scale bands overlap is an error', () => {
  const issues = validateScaleBands(
    [
      { min_pct: 0, max_pct: 80, letter: 'F', passing: false },
      { min_pct: 70, max_pct: 100, letter: 'A', passing: true },
    ],
    'percent',
  );
  assert.ok(issues.some((i) => i.message.includes('overlap')));
});

test('template scale bands cover 0-100', () => {
  const scale = makeScaleFromTemplate('texas_no_d');
  assert.equal(validateScaleBands(scale.bands, 'percent').length, 0);
});

test('every letter needs quality points', () => {
  const scale = makeScaleFromTemplate('us_10');
  const table = {
    ...DEFAULT_QUALITY_TABLES['tx-4'],
    rows: DEFAULT_QUALITY_TABLES['tx-4'].rows.filter((r) => r.letter !== 'D'),
  };
  const issues = validateQualityPoints([table], [scale]);
  assert.ok(issues.some((i) => i.message.includes('letter D')));
});

test('draft -> payload -> publish bumps version', () => {
  const payload = draftToPayload(createEmptyDraft('s', 'high'));
  const plan = planPublish(payload, 2, '2026-09-30T12:00:00.000Z');
  assert.equal(plan.next_version, 3);
  assert.equal(plan.status, 'published');
  assert.equal(plan.published_at_iso, '2026-09-30T12:00:00.000Z');
});

test('planPublish throws when invalid', () => {
  const payload = draftToPayload(createEmptyDraft('s', 'high'));
  payload.scales = [];
  assert.throws(() => planPublish(payload, null));
});

test('calendar binding plan dedupes class ids', () => {
  const plan = planCalendarBinding({
    school_id: 'sch',
    calendar_id: 'cal',
    class_ids: ['a', 'a', 'b', ''],
  });
  assert.deepEqual(plan.class_ids, ['a', 'b']);
});

test('SetupDraft fields carry source confidence evidence', () => {
  const draft = createEmptyDraft('s', 'high');
  const f = draft.fields['level'];
  assert.ok(f);
  assert.equal(f.source, 'default');
  assert.equal(f.confidence, 1);
  assert.equal(f.evidence, null);
  assert.equal(f.value, 'high');
});
