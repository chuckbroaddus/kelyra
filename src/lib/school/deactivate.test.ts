import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { canDeactivatePerson, deactivateConfirmCopy, isDeactivated } from './deactivate.ts';

const sup = { id: 's1', role: 'superintendent' } as never;
const admin = { id: 'a1', role: 'administrator' } as never;
const teacher = { id: 't1', role: 'teacher' } as never;

test('office can delete (deactivate) people; never self; protected staff only by superintendent', () => {
  assert.equal(canDeactivatePerson(sup, { id: 't2', role: 'teacher' } as never), true);
  assert.equal(canDeactivatePerson(admin, { id: 't2', role: 'teacher' } as never), true);
  assert.equal(canDeactivatePerson(admin, { id: 'a2', role: 'administrator' } as never), false);
  assert.equal(canDeactivatePerson(sup, { id: 'a2', role: 'administrator' } as never), true);
  assert.equal(canDeactivatePerson(sup, { id: 's1', role: 'superintendent' } as never), false);
  assert.equal(canDeactivatePerson(teacher, { id: 't2', role: 'teacher' } as never), false);
});

test('deactivated flag and confirm copy say records stay', () => {
  assert.equal(isDeactivated({ deactivated_at: '2026-09-25T18:00:00Z' }), true);
  assert.equal(isDeactivated({ deactivated_at: null }), false);
  const copy = deactivateConfirmCopy('Ms. Lee');
  assert.match(copy.body, /not be able to sign in/);
  assert.match(copy.body, /records stay/);
  assert.doesNotMatch(copy.body, /cannot be undone/);
});

test('People wires Delete + Restore and the server migration bans + hides', () => {
  const ui = readFileSync(new URL('../../components/ui/PeopleAdmin.tsx', import.meta.url), 'utf8');
  assert.match(ui, /key: 'delete',\s*label: 'Delete',\s*tone: 'danger'/);
  assert.match(ui, /key: 'restore',\s*label: 'Restore'/);
  assert.match(ui, /listDirectory\(\{ includeDeactivated: true \}\)/);
  assert.match(ui, /tone="primary"/);
  const sql = readFileSync(
    new URL('../../../supabase/migrations/20260925140000_deactivate_person.sql', import.meta.url),
    'utf8',
  );
  assert.match(sql, /banned_until = 'infinity'/);
  assert.match(sql, /delete from auth\.sessions/);
  assert.match(sql, /is_protected_staff/);
  assert.match(sql, /p_profile_id = auth\.uid\(\)/);
});
