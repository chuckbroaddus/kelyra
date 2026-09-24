import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

const batches = 'supabase/migrations/20260913000000_ingest_batches.sql';
const storage = 'supabase/migrations/20260913000001_ingest_storage.sql';
const pathBind = 'supabase/migrations/20260923090000_register_ingest_file_path_bind.sql';

function extractFn(sql: string, name: string): string {
  const start = sql.indexOf(`create or replace function public.${name}`);
  assert.ok(start >= 0, `missing function ${name}`);
  const rest = sql.slice(start);
  const end = rest.indexOf('\n$$;');
  assert.ok(end > 0, `unclosed function ${name}`);
  return rest.slice(0, end + 4);
}

/** Strip SQL `--` line comments so forbidden-helper asserts ignore docs. */
function stripSqlComments(sql: string): string {
  return sql
    .split('\n')
    .map((line) => {
      const idx = line.indexOf('--');
      return idx >= 0 ? line.slice(0, idx) : line;
    })
    .join('\n');
}

function policyBlocks(sql: string): string[] {
  return [...sql.matchAll(/create policy[\s\S]*?;/gi)].map((m) => m[0]);
}

test('I0-01 create_ingest_batch exists; SECURITY DEFINER; class_teacher_of; teacher_id=auth.uid()', () => {
  const sql = read(batches);
  const body = extractFn(sql, 'create_ingest_batch');
  assert.match(body, /security definer/i);
  assert.match(body, /set search_path = public/);
  assert.match(body, /class_teacher_of\(p_class_id\)/);
  assert.match(body, /teacher_id,\s*class_id/);
  assert.match(body, /auth\.uid\(\),\s*p_class_id/);
  assert.match(body, /ingest_caller_is_teacher/);
  assert.match(body, /ttl_at/);
  assert.match(sql, /grant execute on function public\.create_ingest_batch[\s\S]*to authenticated/i);
  assert.match(sql, /revoke all on function public\.create_ingest_batch[\s\S]*from public, anon/i);
});

test('I0-02 policies deny parent/office helpers: no teaches_class/is_school_admin/is_staff on ingest_*', () => {
  const sql = stripSqlComments(read(batches));
  const ingestPolicies = policyBlocks(sql).filter((block) =>
    /on public\.ingest_(batches|files|pages|packets)/i.test(block),
  );
  assert.ok(ingestPolicies.length >= 7, `expected ingest_* policies, got ${ingestPolicies.length}`);
  for (const block of ingestPolicies) {
    assert.doesNotMatch(block, /\bteaches_class\b/);
    assert.doesNotMatch(block, /\bis_school_admin\b/);
    assert.doesNotMatch(block, /\bis_staff\b/);
    assert.doesNotMatch(block, /\bmy_school_id\s*\(/);
  }
  // No family widen
  assert.doesNotMatch(sql, /create policy[\s\S]{0,80}ingest_[\s\S]{0,120}parent_of|my_student_id|parent_students/i);
  assert.doesNotMatch(sql, /grant (select|all).*on table public\.ingest_.*to anon/i);
});

test('I0-03 creator wall teacher_id=auth.uid() AND class_teacher_of', () => {
  const sql = read(batches);
  const batchSelect = policyBlocks(sql).find((b) => /ingest_batches_select/i.test(b));
  assert.ok(batchSelect, 'missing ingest_batches_select');
  assert.match(batchSelect!, /teacher_id\s*=\s*auth\.uid\(\)/);
  assert.match(batchSelect!, /class_teacher_of\(class_id\)/);

  const batchInsert = policyBlocks(sql).find((b) => /ingest_batches_insert/i.test(b));
  assert.ok(batchInsert);
  assert.match(batchInsert!, /teacher_id\s*=\s*auth\.uid\(\)/);
  assert.match(batchInsert!, /class_teacher_of\(class_id\)/);

  for (const child of ['ingest_files_all', 'ingest_pages_all', 'ingest_packets_all']) {
    const block = policyBlocks(sql).find((b) => new RegExp(child, 'i').test(b));
    assert.ok(block, `missing ${child}`);
    assert.match(block!, /b\.teacher_id\s*=\s*auth\.uid\(\)/);
    assert.match(block!, /class_teacher_of\(b\.class_id\)/);
  }

  // Co-teacher other uid cannot SELECT creator batch (creator wall)
  assert.match(sql, /teacher_id = auth\.uid\(\)/);
});

test('I0-04 enum batch + captures.ingest_batch_id', () => {
  const sql = read(batches);
  assert.match(
    sql,
    /alter type public\.capture_input_source add value if not exists 'batch'/i,
  );
  assert.match(
    sql,
    /alter table public\.captures\s+add column if not exists ingest_batch_id uuid references public\.ingest_batches/i,
  );
  assert.match(sql, /captures_ingest_batch_id_idx/);
  // Additive only — no capture status machine rewrite
  assert.doesNotMatch(sql, /create type public\.capture_status/);
  assert.doesNotMatch(sql, /drop type public\.capture_status/);
});

test('I0-05 confirm never auto-Approve / never INSERT students / student_id null / unassigned / batch', () => {
  const body = stripSqlComments(extractFn(read(batches), 'confirm_ingest_batch'));
  assert.match(body, /security definer/i);
  assert.match(body, /class_teacher_of/);
  assert.match(body, /teacher_id is distinct from auth\.uid\(\)/);
  assert.match(body, /status\s*=\s*'unassigned'|status,\s*[\s\S]*'unassigned'/);
  assert.match(body, /'batch'/);
  assert.match(body, /student_id[\s\S]{0,40}null/);
  assert.match(body, /input_source/);
  assert.match(body, /ingest_batch_id/);
  assert.match(body, /pageAssetIds/);
  assert.match(body, /teacher_confirmed_split\s*=\s*true/);

  assert.doesNotMatch(body, /insert\s+into\s+public\.students/i);
  assert.doesNotMatch(body, /insert\s+into\s+public\.skill_gaps/i);
  assert.doesNotMatch(body, /approved_score\s*=/);
  assert.doesNotMatch(body, /approved_at\s*=/);
  assert.doesNotMatch(body, /status\s*=\s*'approved'/);
  assert.doesNotMatch(body, /guessed_student_id/);
  assert.doesNotMatch(body, /analyze-homework|analyze_homework|matchName|matcher/i);
  assert.match(body, /NEVER guessed_student_id|never auto-Approve|Confirm ≠ Approve|student_id null/i);
});

test('I0-06 MIME allow-list + byte caps in register_ingest_file', () => {
  const body = extractFn(read(batches), 'register_ingest_file');
  assert.match(body, /application\/pdf/);
  assert.match(body, /image\/jpeg/);
  assert.match(body, /image\/png/);
  assert.match(body, /image\/webp/);
  assert.match(body, /image\/heic/);
  assert.match(body, /image\/heif/);
  assert.match(body, /unsupported_type/);
  assert.match(body, /image_too_large/);
  assert.match(body, /15728640/);
  assert.match(body, /262144000/);
  assert.match(body, /too_large_bytes/);
  assert.match(body, /status not in \('draft', 'receiving'\)/);
  assert.match(body, /teacher_id is distinct from auth\.uid\(\)/);
  assert.match(body, /class_teacher_of/);
  // Idempotent (batch_id, sha256)
  assert.match(body, /sha256 = p_sha256/);
});

test('I0-07 four tables + RLS enabled', () => {
  const sql = read(batches);
  for (const table of ['ingest_batches', 'ingest_files', 'ingest_pages', 'ingest_packets']) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}`, 'i'));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
  }
  assert.match(sql, /pages_per_student[\s\S]*check \(pages_per_student >= 1 and pages_per_student <= 20\)/);
  assert.match(sql, /split_method text not null default 'fixed_n'/);
  assert.doesNotMatch(sql, /thumb_asset_id/);
  assert.match(sql, /ingest_batches_open_sha_uidx/);
  assert.match(sql, /status not in \('abandoned','failed'\)/);
});

test('I0-08 storage uid prefix; files public=false if created', () => {
  const sql = read(storage);
  assert.match(sql, /values\s*\(\s*'files'\s*,\s*'files'\s*,\s*false\s*\)/i);
  assert.match(sql, /on conflict \(id\) do nothing/i);
  assert.match(sql, /set public = false/);
  assert.match(sql, /split_part\(name,\s*'\/',\s*1\)\s*=\s*auth\.uid\(\)::text/);
  assert.match(sql, /is_ingest_batch_storage_owner/);
  assert.match(sql, /split_part\(name,\s*'\/',\s*2\)\s*=\s*'ingest'/);
  assert.match(sql, /files_select_ingest|files_insert_ingest/);
  // Photos convention comment + never sign PDF to model
  assert.match(sql, /p-\{n\}\.jpg|_thumb|p-\{n\}/);
  assert.match(sql, /Never sign the original PDF|never sign.*PDF/i);
  assert.match(sql, /service_role/);
  // Message attachment policy not dropped without recreate of non-ingest path
  assert.match(sql, /Message attachment paths|media_select_message_files/i);
  assert.doesNotMatch(sql, /drop policy if exists media_select_message_files/);
});

test('I0-09 RPCs use class_teacher_of only (not teaches_class office bypass)', () => {
  const sql = read(batches);
  const rpcNames = [
    'create_ingest_batch',
    'register_ingest_file',
    'ingest_mark_received',
    'save_ingest_split',
    'confirm_ingest_batch',
    'abandon_ingest_batch',
    'retry_ingest_remainder',
  ] as const;
  for (const name of rpcNames) {
    const body = stripSqlComments(extractFn(sql, name));
    assert.match(body, /security definer/i);
    assert.match(body, /set search_path = public/);
    assert.match(body, /class_teacher_of/);
    assert.doesNotMatch(body, /\bteaches_class\b/);
    assert.doesNotMatch(body, /\bis_school_admin\b/);
    assert.doesNotMatch(body, /\bis_staff\b/);
  }
  // mark_received sets original_sha256 from sorted file hashes; no captures
  const mark = extractFn(sql, 'ingest_mark_received');
  assert.match(mark, /original_sha256/);
  assert.match(mark, /string_agg\(f\.sha256,\s*E'\\n'\s*order by f\.sort_index\)/);
  assert.match(mark, /No captures at mark-received/);
  assert.doesNotMatch(stripSqlComments(mark), /insert\s+into\s+public\.captures/i);

  // abandon pre-confirm; retry from partial
  const abandon = extractFn(sql, 'abandon_ingest_batch');
  assert.match(abandon, /cannot abandon after confirm|abandoned/);
  // I5: pre-confirm partial/retry_remainder abandonable when no capture_id
  assert.match(abandon, /'partial'|partial/);
  assert.match(abandon, /retry_remainder/);
  assert.match(abandon, /capture_id is not null/);
  assert.match(extractFn(sql, 'retry_ingest_remainder'), /status is distinct from 'partial'|retry_remainder/);
});

test('FL-19 register_ingest_file refuses path outside {uid}/ingest/{batch_id}/', () => {
  const body = extractFn(read(pathBind), 'register_ingest_file');
  assert.match(body, /security definer/i);
  assert.match(body, /invalid_storage_path/);
  assert.match(
    body,
    /auth\.uid\(\)::text\s*\|\|\s*'\/ingest\/'\s*\|\|\s*p_batch_id::text\s*\|\|\s*'\/'/,
  );
  assert.match(body, /left\(p_storage_path,\s*length\(expected_prefix\)\)/);
  assert.match(body, /class_teacher_of/);
  assert.match(body, /teacher_id is distinct from auth\.uid\(\)/);
  // Still keeps MIME + caps + idempotent behavior
  assert.match(body, /unsupported_type/);
  assert.match(body, /sha256 = p_sha256/);
});

test('t_06dd401c: ingest_files.storage_path frozen after insert', () => {
  const sql = read('supabase/migrations/20260923230000_ingest_files_freeze_storage_path.sql');
  assert.match(sql, /create or replace function public\.ingest_files_freeze_storage_path/);
  assert.match(sql, /storage_path_frozen/);
  assert.match(sql, /before update on public\.ingest_files/);
  assert.match(sql, /new\.storage_path is distinct from old\.storage_path/);
});

