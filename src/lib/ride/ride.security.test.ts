import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  assertParentTripSafe,
  formatCheckInSuccess,
  plateNorm,
  RIDE_FAIL_MESSAGE,
  vehicleValidOn,
} from './plate.ts';
import { conflictFirst, rankGraph, staffWalkOrder } from './order.ts';
import { parentCheckInMessage, nudgeCopy } from './copy.ts';

const root = process.cwd();
function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const schema = 'supabase/migrations/20260907000000_ride_schema.sql';
const rpcs = 'supabase/migrations/20260907000001_ride_rpcs.sql';

test('RIDE-S1-01 schema stamps school_id on every ride table', () => {
  const sql = read(schema);
  for (const table of [
    'dismissal_lines',
    'parent_vehicles',
    'pickup_restrictions',
    'dismissal_duty',
    'line_photos',
    'queue_events',
  ]) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}[\\s\\S]*?school_id uuid not null`));
  }
});

test('RIDE-S1-02 duty wall uses dismissal_duty not is_staff', () => {
  const sql = read(schema) + read(rpcs);
  assert.match(sql, /ride_has_duty/);
  assert.match(sql, /dismissal_duty/);
  const dutyFn = sql.slice(sql.indexOf('create or replace function public.ride_has_duty'));
  const body = dutyFn.slice(0, dutyFn.indexOf('$$;') + 3);
  assert.doesNotMatch(body, /\bis_staff\b/);
  assert.match(body, /dismissal_duty/);
});

test('RIDE-S1-03 no client INSERT policies on order tables', () => {
  const sql = read(schema);
  assert.doesNotMatch(sql, /create policy[\s\S]*queue_events[\s\S]*for insert/i);
  assert.doesNotMatch(sql, /create policy[\s\S]*line_photos[\s\S]*for insert/i);
  assert.doesNotMatch(sql, /create policy[\s\S]*parent_vehicles[\s\S]*for insert/i);
  assert.match(sql, /for select/i);
});

test('RIDE-S1-04 parent check-in fail has no reason; success XX no total', () => {
  const sql = read(rpcs);
  assert.match(sql, /Check in failed/);
  assert.match(sql, /Check in successful, you are %s vehicle in line/);
  assert.doesNotMatch(sql, /of %s|total_count|neighbor_plate/i);
});

test('RIDE-S1-05 my_trip DTO has no total / neighbor plates', () => {
  const sql = read(rpcs);
  const fn = sql.slice(sql.indexOf('create or replace function public.dismissal_my_trip'));
  const body = fn.slice(0, fn.indexOf('$$;') + 3);
  assert.match(body, /position_xx/);
  assert.doesNotMatch(body, /total_count|'neighbor/);
  assert.match(body, /Own XX only/);
  assert.doesNotMatch(body, /jsonb_build_object\([\s\S]*plate_norm/);
  assertParentTripSafe({
    ok: true,
    status: 'in_line',
    position_xx: 3,
    line_id: 'x',
    student_ids: [],
    message: formatCheckInSuccess(3),
  });
  assert.equal(parentCheckInMessage({ ok: false }), RIDE_FAIL_MESSAGE);
  assert.equal(parentCheckInMessage({ ok: true, position_xx: 1 }), formatCheckInSuccess(1));
});

test('RIDE-S1-06 superintendent archive only; admin cannot', () => {
  const sql = read(rpcs);
  const fn = sql.slice(sql.indexOf('superintendent_archive_day_photos'));
  const body = fn.slice(0, fn.indexOf('$$;') + 3);
  assert.match(body, /ride_is_superintendent/);
  assert.doesNotMatch(body, /ride_is_office\(\)/);
  assert.match(body, /write_audit/);
});

test('RIDE-S1-07 7-day purge photos+events; archived photos skip', () => {
  const sql = read(rpcs);
  const fn = sql.slice(sql.indexOf('dismissal_purge_old'));
  const body = fn.slice(0, fn.indexOf('$$;') + 3);
  assert.match(body, /ride_school_date\(\) - 7/);
  assert.match(body, /delete from public\.queue_events/);
  assert.match(body, /archived_at is null/);
});

test('RIDE-S1-08 LPR edge: verify_jwt, no EXPO_PUBLIC, never inserts people', () => {
  const edge = read('supabase/functions/ride-lpr/index.ts');
  const cfg = read('supabase/config.toml');
  assert.match(cfg, /\[functions\.ride-lpr\][\s\S]*?verify_jwt = true/);
  assert.match(edge, /requireXaiKey/);
  assert.doesNotMatch(edge, /EXPO_PUBLIC_/);
  assert.match(edge, /Never invent a person/);
  assert.doesNotMatch(edge, /\.from\('parents'\)\s*\.insert/i);
  const attach = read(rpcs);
  assert.match(attach, /staff_attach_vehicle/);
  assert.match(attach, /never insert people/i);
});

test('RIDE-S1-09 token parent / student deny on ride RPCs', () => {
  const sql = read(rpcs);
  assert.match(sql, /ride_deny_student/);
  assert.match(sql, /ride_my_parent_id\(\) is null/);
  assert.match(sql, /Token \/parent or unsigned/);
});

test('RIDE-S1-10 restriction fail-closed; twins unlabeled empty', () => {
  const sql = read(rpcs);
  assert.match(sql, /cardinality\(linked\) = 0/);
  assert.match(sql, /ride_is_restricted/);
  assert.match(sql, /restrict_block/);
});

test('RIDE-S1-11 vehicle validity today/range/indefinite', () => {
  assert.equal(vehicleValidOn('indefinite', null, null, '2026-09-05'), true);
  assert.equal(vehicleValidOn('today', '2026-09-05', '2026-09-05', '2026-09-05'), true);
  assert.equal(vehicleValidOn('today', '2026-09-05', '2026-09-05', '2026-09-06'), false);
  assert.equal(vehicleValidOn('range', '2026-09-01', '2026-09-10', '2026-09-05'), true);
  assert.equal(vehicleValidOn('range', '2026-09-01', '2026-09-04', '2026-09-05'), false);
  assert.equal(plateNorm('ab-12 34'), 'AB1234');
});

test('RIDE-S1-12 order: walk spine beats graph; two firsts conflict', () => {
  const walk = staffWalkOrder([
    { parentId: 'b', staffSeq: 2 },
    { parentId: 'a', staffSeq: 1 },
  ]);
  assert.deepEqual(
    walk.map((w) => w.parentId),
    ['a', 'b'],
  );
  const slots = [
    { parentId: 'p1', studentIds: ['s1'], kind: 'im_first' as const, occurredAt: '2026-09-05T15:00:00Z' },
    { parentId: 'p2', studentIds: ['s2'], kind: 'im_first' as const, occurredAt: '2026-09-05T15:01:00Z' },
  ];
  assert.equal(conflictFirst(slots), true);
  const ranked = rankGraph([
    {
      parentId: 'p2',
      studentIds: ['s2'],
      kind: 'check_in' as const,
      positionXx: 2,
      occurredAt: '2026-09-05T15:02:00Z',
    },
    { parentId: 'p1', studentIds: ['s1'], kind: 'im_first' as const, occurredAt: '2026-09-05T15:00:00Z' },
  ]);
  assert.equal(ranked[0]?.parentId, 'p1');
});

test('RIDE-S1-13 nudge copy has no neighbor PII', () => {
  const copy = nudgeCopy();
  assert.doesNotMatch(copy, /plate|ABC|child|neighbor/i);
  const sql = read(rpcs);
  assert.match(sql, /dismissal_nudge/);
  assert.match(sql, /No neighbor PII/);
});

test('RIDE-S1-14 private line photo storage policy', () => {
  const sql = read(schema);
  assert.match(sql, /is_ride_line_photo/);
  assert.match(sql, /media_select_ride_line_photos/);
  assert.match(sql, /bucket_id = 'photos'/);
});

test('RIDE-S1-15 parent does not pick own car at check-in RPC', () => {
  const sql = read(rpcs);
  const fn = sql.slice(sql.indexOf('dismissal_parent_check_in'));
  const sig = fn.slice(0, 500);
  assert.doesNotMatch(sig, /p_vehicle_id|p_own_plate/i);
});

test('RIDE-S1-16 release is curb duty; photo check-in does not release', () => {
  const sql = read(rpcs);
  assert.match(sql, /dismissal_release/);
  const release = sql.slice(sql.indexOf('create or replace function public.dismissal_release'));
  const releaseBody = release.slice(0, release.indexOf('$$;') + 3);
  assert.match(releaseBody, /'released'/);
  assert.match(releaseBody, /ride_has_duty\(p_line_id, 'curb'\)/);
  const checkIn = sql.slice(sql.indexOf('create or replace function public.dismissal_parent_check_in'));
  const checkInBody = checkIn.slice(0, checkIn.indexOf('$$;') + 3);
  assert.doesNotMatch(checkInBody, /ev_kind := 'released'/);
  assert.doesNotMatch(checkInBody, /values \(\s*school, p_line_id, today, 'released'/);
});

test('RIDE-S1-17 two lines independent via line_id', () => {
  const sql = read(schema) + read(rpcs);
  assert.match(sql, /dismissal_lines/);
  assert.match(sql, /office_ensure_default_dismissal_lines/);
  assert.match(sql, /K–2/);
  assert.match(sql, /3–5/);
});

test('RIDE-S1-18 matrix capabilities for ride', () => {
  const matrix = read('src/lib/school/matrix.ts');
  assert.match(matrix, /ride\.check_in/);
  assert.match(matrix, /ride\.duty/);
  assert.match(matrix, /ride\.archive/);
  assert.match(
    matrix,
    /id:\s*'ride\.archive'[\s\S]*?superintendent:\s*'school'[\s\S]*?administrator:\s*'none'/,
  );
});

test('RIDE-S1-19 no Ask dismissal tool registration', () => {
  const ask = read('supabase/functions/_shared/askToolPolicy.ts');
  assert.doesNotMatch(ask, /dismissal_|ride_lpr|car_rider/);
});

test('RIDE-S1-20 STT stores plate text not audio by default', () => {
  const sql = read(rpcs);
  assert.match(sql, /plate_stt|p_plate_source/);
  assert.doesNotMatch(sql, /audio_asset_id/);
});

test('RIDE-S1-21 parent UI routes exist; fail copy constant', () => {
  assert.ok(read('src/app/parent/ride.tsx').length > 100);
  assert.ok(read('src/app/parent/vehicles.tsx').length > 100);
  assert.ok(read('src/app/ride/index.tsx').length > 100);
  assert.ok(read('src/app/admin/ride/index.tsx').length > 50);
  assert.equal(RIDE_FAIL_MESSAGE, 'Check in failed');
});
