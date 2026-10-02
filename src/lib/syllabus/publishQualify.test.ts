/**
 * publish_class_syllabus UPDATE must not collide locals with class_syllabi
 * columns. Qualifying DECLARE locals as publish_class_syllabus.<name> is wrong
 * (Postgres treats that as a table → missing FROM-clause). Newest migration
 * renames locals (v_title, …). Text-only — devops-release applies.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../../..');
const MIGRATION = 'supabase/migrations/20261002140000_gb_syllabus_publish_rename_locals.sql';
const BAD_QUALIFY = 'supabase/migrations/20261002130000_gb_syllabus_locked_fields_preserve.sql';
const OLD_PUBLISH = 'supabase/migrations/20261002100000_gb_syllabus_ec_over_100.sql';

test('bug is older than EC migration: bare title = title on UPDATE', () => {
  const old = fs.readFileSync(path.join(ROOT, OLD_PUBLISH), 'utf8');
  const publish = old.slice(old.indexOf('create or replace function public.publish_class_syllabus'));
  assert.match(publish, /title = title, term_structure = term_structure, active_term = active_term/);
  const should = fs.readFileSync(
    path.join(ROOT, 'supabase/migrations/20261001230000_gb_syllabus_should.sql'),
    'utf8',
  );
  assert.match(should, /title = title, term_structure = term_structure, active_term = active_term/);
});

test('bad qualify migration used function-name locals (runtime FROM-clause bug)', () => {
  const sql = fs.readFileSync(path.join(ROOT, BAD_QUALIFY), 'utf8');
  const publish = sql.slice(sql.indexOf('create or replace function public.publish_class_syllabus'));
  assert.match(publish, /title = publish_class_syllabus\.title/);
  assert.match(publish, /syllabus_replace_categories\(row\.id, publish_class_syllabus\.categories\)/);
});

test('new migration: renamed locals; no function-name table refs; no bare collisions', () => {
  const sql = fs.readFileSync(path.join(ROOT, MIGRATION), 'utf8');
  const publish = sql.slice(sql.indexOf('create or replace function public.publish_class_syllabus'));
  assert.doesNotMatch(publish, /publish_class_syllabus\.(title|term_structure|active_term|policies|terms|categories)\b/);
  assert.doesNotMatch(publish, /title = title/);
  assert.doesNotMatch(publish, /term_structure = term_structure/);
  assert.doesNotMatch(publish, /active_term = active_term/);
  assert.doesNotMatch(publish, /policies = policies/);
  assert.doesNotMatch(publish, /terms = terms/);
  assert.match(publish, /v_title text;/);
  assert.match(publish, /v_policies jsonb;/);
  assert.match(publish, /v_categories jsonb;/);
  assert.match(publish, /title = v_title/);
  assert.match(publish, /term_structure = v_term_structure/);
  assert.match(publish, /active_term = v_active_term/);
  assert.match(publish, /policies = v_policies/);
  assert.match(publish, /terms = v_terms/);
  assert.match(publish, /v_title, 'category_weight'/);
  assert.match(publish, /syllabus_replace_categories\(row\.id, v_categories\)/);
});

test('new migration: keeps EC weight rule, teacher gate, locks, grants', () => {
  const sql = fs.readFileSync(path.join(ROOT, MIGRATION), 'utf8');
  const publish = sql.slice(sql.indexOf('create or replace function public.publish_class_syllabus'));
  assert.match(publish, /weights_error := public\.syllabus_publish_weights_error\(row\.id, row\.extra_credit_method\);/);
  assert.doesNotMatch(publish, /if abs\(weight_sum - 100\) > 0\.01 then raise exception/);
  assert.match(publish, /syllabus version conflict/);
  assert.match(publish, /not public\.class_teacher_of\(p_class_id\)/);
  assert.match(publish, /gb_assert_syllabus_locked_fields/);
  assert.match(publish, /gb_force_locked_syllabus_v2/);
  assert.match(publish, /retake = retake_val/);
  assert.match(publish, /security definer/);
  assert.match(publish, /set search_path = public/);
  assert.match(sql, /revoke all on function public\.publish_class_syllabus\(uuid, jsonb, int\) from public, anon;/);
  assert.match(sql, /grant execute on function public\.publish_class_syllabus\(uuid, jsonb, int\) to authenticated;/);
});

test('new migration is the newest publish_class_syllabus definition', () => {
  const later = fs
    .readdirSync(path.join(ROOT, 'supabase/migrations'))
    .filter((f) => f > path.basename(MIGRATION))
    .filter((f) =>
      /function public\.publish_class_syllabus\b/.test(
        fs.readFileSync(path.join(ROOT, 'supabase/migrations', f), 'utf8'),
      ),
    );
  assert.deepEqual(later, []);
});
