import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  applyClosestVehicleGuard,
  CLOSEST_VEHICLE_RULES,
  guardVehicleFields,
  MULTIPLE_VEHICLES,
} from '../../../supabase/functions/_shared/closestVehicle.ts';
import { shapeRideLprResult } from '../../../supabase/functions/_shared/rideLprResult.ts';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

// Mocked model output (shape the ride-lpr prompt asks for).
const car = (over: Record<string, unknown> = {}) => ({
  document_kind: 'vehicle_photo',
  plate: 'KTW 4863',
  plateFront: null,
  plateBack: null,
  make: 'Toyota',
  model: 'Camry',
  side: 'back',
  tag_number: null,
  riders: [],
  authorized_pickups: [],
  confidence: 0.95,
  unreadable: false,
  reject_reason: null,
  other_plates_seen: [],
  ...over,
});

test('guard: no other vehicles → ok regardless of confidence', () => {
  assert.deepEqual(applyClosestVehicleGuard({ plates: ['ABC123'], other_plates_seen: [], confidence: 0.2 }), { ok: true });
});

test('guard: returned plate is also listed as another car → not ok', () => {
  const v = applyClosestVehicleGuard({ plates: ['PLR-2957'], other_plates_seen: ['plr 2957'], confidence: 0.99 });
  assert.deepEqual(v, { ok: false, reason: 'plate_in_other_plates' });
});

test('guard: other cars seen + confidence < 0.8 (or missing) → not ok; ≥ 0.8 → ok', () => {
  assert.equal(applyClosestVehicleGuard({ plates: ['KTW4863'], other_plates_seen: ['PLR2957'], confidence: 0.79 }).ok, false);
  assert.equal(applyClosestVehicleGuard({ plates: ['KTW4863'], other_plates_seen: ['PLR2957'], confidence: undefined }).ok, false);
  assert.equal(applyClosestVehicleGuard({ plates: ['KTW4863'], other_plates_seen: ['PLR2957'], confidence: 0.8 }).ok, true);
});

test('ride-lpr: confident foreground read with a background car keeps the plate and lists the other plate', () => {
  const r = shapeRideLprResult(car({ other_plates_seen: ['PLR 2957'], confidence: 0.92 }));
  assert.equal(r.plate, 'KTW4863');
  assert.equal(r.make, 'Toyota');
  assert.equal(r.unreadable, false);
  assert.equal(r.reject_reason, null);
  assert.deepEqual(r.other_plates_seen, ['PLR2957']);
});

test('ride-lpr: model returned the background plate (also in other_plates_seen) → unreadable, multiple vehicles', () => {
  const r = shapeRideLprResult(
    car({ plate: 'TRC5186', make: 'Nissan', model: 'Altima', other_plates_seen: ['TRC5186', 'MXH7342'], confidence: 0.97 }),
  );
  assert.equal(r.document_kind, 'vehicle_photo');
  assert.equal(r.plate, null);
  assert.equal(r.plateBack, null);
  assert.equal(r.make, null);
  assert.equal(r.model, null);
  assert.equal(r.unreadable, true);
  assert.equal(r.reject_reason, MULTIPLE_VEHICLES);
  assert.deepEqual(r.other_plates_seen, ['TRC5186', 'MXH7342']);
});

test('ride-lpr: other cars + low confidence → unreadable, multiple vehicles', () => {
  const r = shapeRideLprResult(car({ plate: 'HGM6258', other_plates_seen: ['DWN3471'], confidence: 0.6 }));
  assert.equal(r.plate, null);
  assert.equal(r.unreadable, true);
  assert.equal(r.reject_reason, MULTIPLE_VEHICLES);
});

test('ride-lpr: model says "multiple vehicles" → vehicle_photo unreadable, not a rejected document', () => {
  const r = shapeRideLprResult(
    car({ document_kind: 'unknown', plate: null, make: null, model: null, unreadable: true, reject_reason: 'Multiple vehicles', other_plates_seen: ['HGM6258', 'DWN3471'], confidence: 0.4 }),
  );
  assert.equal(r.document_kind, 'vehicle_photo');
  assert.equal(r.reject_reason, MULTIPLE_VEHICLES);
  assert.equal(r.unreadable, true);
  assert.equal(r.plate, null);
});

test('ride-lpr: single car unchanged; negatives still rejected; hang tag unaffected', () => {
  const single = shapeRideLprResult(car({ confidence: 0.5 }));
  assert.equal(single.plate, 'KTW4863');
  assert.equal(single.plateBack, 'KTW4863');
  assert.equal(single.unreadable, false);
  const neg = shapeRideLprResult({ document_kind: 'rejected', plate: 'X', reject_reason: 'cafeteria menu' });
  assert.equal(neg.document_kind, 'rejected');
  assert.equal(neg.plate, null);
  assert.equal(neg.reject_reason, 'cafeteria menu');
  assert.deepEqual(neg.other_plates_seen, []);
  const tag = shapeRideLprResult({ document_kind: 'hang_tag', plate: 'FNR 6624', tag_number: 'TAG # 2087', riders: ['Ivy Patel'], confidence: 0.9 });
  assert.equal(tag.plate, 'FNR6624');
  assert.equal(tag.tag_number, 'TAG2087');
  assert.equal(tag.unreadable, false);
});

test('ride-lpr: missing other_plates_seen is treated as []', () => {
  const { other_plates_seen, ...rest } = car();
  void other_plates_seen;
  const r = shapeRideLprResult(rest);
  assert.equal(r.plate, 'KTW4863');
  assert.deepEqual(r.other_plates_seen, []);
});

test('classify-capture vehicle fields: guard drops plate/make/model when the plate belongs to another car', () => {
  const fields = [
    { label: 'plate', value: 'PLR 2957' },
    { label: 'make', value: 'Ford' },
    { label: 'model', value: 'Escape' },
    { label: 'riders', value: 'Mila Torres' },
  ];
  const bad = guardVehicleFields(fields, ['PLR2957'], 0.9);
  assert.equal(bad.vehicle_reject_reason, MULTIPLE_VEHICLES);
  assert.deepEqual(bad.fields, [{ label: 'riders', value: 'Mila Torres' }]);
  const ok = guardVehicleFields(fields, ['KTW4863'], 0.9);
  assert.equal(ok.vehicle_reject_reason, null);
  assert.equal(ok.fields.length, 4);
  assert.equal(guardVehicleFields(fields, ['KTW4863'], 0.5).vehicle_reject_reason, MULTIPLE_VEHICLES);
  assert.equal(guardVehicleFields(fields, [], 0.1).vehicle_reject_reason, null);
});

test('both prompts carry the closest-vehicle rules; classify-capture vehicle hint asks for high detail', () => {
  assert.match(CLOSEST_VEHICLE_RULES, /closest vehicle/);
  assert.match(CLOSEST_VEHICLE_RULES, /reflections/);
  assert.match(CLOSEST_VEHICLE_RULES, /multiple vehicles/);
  assert.match(CLOSEST_VEHICLE_RULES, /same vehicle as the plate/);
  const lpr = read('supabase/functions/ride-lpr/index.ts');
  assert.match(lpr, /\$\{CLOSEST_VEHICLE_RULES\}/);
  assert.match(lpr, /"other_plates_seen":\[\]/);
  assert.match(lpr, /shapeRideLprResult/);
  const classify = read('supabase/functions/classify-capture/index.ts');
  assert.match(classify, /\$\{CLOSEST_VEHICLE_RULES\}/);
  assert.match(classify, /guardVehicleFields/);
  assert.match(classify, /detail: vehicleHint \? 'high' : imageDetailFor\('cheap'\)/);
});
