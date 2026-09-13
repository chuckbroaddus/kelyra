import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

function extractFn(sql: string, name: string): string {
  const start = sql.indexOf(`create or replace function public.${name}`);
  assert.ok(start >= 0, `missing function ${name}`);
  const rest = sql.slice(start);
  const end = rest.indexOf('\n$$;');
  assert.ok(end > 0, `unclosed function ${name}`);
  return rest.slice(0, end + 4);
}

const sportPath = 'supabase/migrations/20260917000000_calendar_r2_phase_d_sport.sql';
const itemsPath = 'supabase/migrations/20260917000001_list_calendar_items_phase_d_team.sql';

test('unsubscribe_team deletes membership only; parent requires focused child when 2+', () => {
  const unsub = extractFn(read(sportPath), 'unsubscribe_team');
  assert.match(unsub, /p_seat text/);
  assert.match(unsub, /p_calendar_id uuid/);
  assert.match(unsub, /kind is distinct from 'team'/);
  assert.match(unsub, /delete from public\.calendar_team_members/);
  assert.doesNotMatch(unsub, /delete from public\.calendar_events/);
  assert.doesNotMatch(unsub, /insert into public\.(classes|students)/);
  assert.match(unsub, /my_parent_student_count\(\)\s*>=\s*2/);
  assert.match(unsub, /i_parent_of/);
});

test('list_calendars can_unsubscribe true only for team kind', () => {
  const layers = extractFn(read(sportPath), 'list_calendars');
  assert.match(layers, /\(c\.kind = 'team'\) as can_unsubscribe/);
  assert.match(layers, /i_calendar_team_member/);
});

test('class_work remains projection-only in items (no team on class_work)', () => {
  const items = extractFn(read(itemsPath), 'list_calendar_items');
  assert.match(items, /cal\.kind is distinct from 'class_work'/);
  assert.match(items, /cw\.kind = 'class_work'/);
});
