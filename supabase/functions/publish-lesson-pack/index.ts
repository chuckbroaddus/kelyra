/**
 * Authenticated upload of a lesson pack into private Storage + unpublished
 * lesson_packs. Caller JWT is the actor; service role writes only.
 * Teachers / office may publish. Parents / students / anon = 401.
 * Always writes published: false. Does not assign, flip published, or open the bucket.
 */

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { unzipSync } from 'npm:fflate@0.8.2';

import { isOfficeRole, type ProfileHats } from '../_shared/askToolPolicy.ts';

const SLUG = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
/** Live FoM Ch01 catalog + storage wall. Test ids (…-test) are not live. */
const LIVE_FOM_STORAGE = 'fom-ch01';
const LIVE_FOM_VERSION = 'v4';
const LIVE_FOM_DECK = /^fom-ch01(?:-s\d+)?$/;
const MAX_BYTES = 12_304_812;
const SKIP_DIRS = ['png-original/', 'ava-original/', 'eve-staging/', 'captions/ava-original/'];

function assertUnderQuota(total: number) {
  if (total > MAX_BYTES) {
    throw Object.assign(new Error('pack exceeds size quota'), { status: 413 });
  }
}

type PackFile = { path: string; bytes: Uint8Array };

type PublishFields = {
  deck_id: string;
  version: string;
  storage_deck_id: string;
  title: string;
  beat_start: string;
  beat_end: string;
  kind: string;
  replace_live: boolean;
};

type Manifest = {
  spec?: unknown;
  kind?: unknown;
  deck_id?: unknown;
  version?: unknown;
  storage_deck_id?: unknown;
  beat_start?: unknown;
  beat_end?: unknown;
  items?: unknown;
  beats?: unknown;
};

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...cors(),
    },
  });
}

function canPublish(profile: ProfileHats | null | undefined): boolean {
  if (!profile?.role) return false;
  if (profile.role === 'teacher') return true;
  if (profile.also_teacher) return true;
  if (profile.role === 'superintendent' || profile.role === 'administrator') return true;
  return false;
}

function isLiveFomDeckId(deckId: string): boolean {
  return LIVE_FOM_DECK.test(deckId);
}

function isLiveFomStoragePath(storageDeckId: string, version: string): boolean {
  return storageDeckId === LIVE_FOM_STORAGE && version === LIVE_FOM_VERSION;
}

function skipUpload(rel: string): boolean {
  const path = rel.replace(/^\/+/, '').split('\\').join('/');
  if (!path || path.endsWith('/')) return true;
  if (path.startsWith('.') || path.includes('/.')) return true;
  return SKIP_DIRS.some(
    (prefix) =>
      path === prefix.slice(0, -1) || path.startsWith(prefix) || path.includes('/' + prefix),
  );
}

function mimeOf(path: string): string {
  const ext = path.includes('.') ? path.slice(path.lastIndexOf('.')).toLowerCase() : '';
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js') return 'text/javascript';
  if (ext === '.css') return 'text/css';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.json') return 'application/json';
  if (ext === '.txt') return 'text/plain; charset=utf-8';
  return 'application/octet-stream';
}

function asText(value: FormDataEntryValue | null | undefined): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  return '';
}

function normalizeRel(path: string): string {
  return path.replace(/^\/+/, '').split('\\').join('/').replace(/^\.\//, '');
}

async function readBlobBytes(blob: Blob): Promise<Uint8Array> {
  const buf = await blob.arrayBuffer();
  return new Uint8Array(buf);
}

function unzipPack(bytes: Uint8Array): PackFile[] {
  const entries = unzipSync(bytes);
  const out: PackFile[] = [];
  for (const [name, data] of Object.entries(entries)) {
    const path = normalizeRel(name);
    if (skipUpload(path)) continue;
    out.push({ path, bytes: data });
  }
  return out;
}

const META_KEYS = new Set([
  'deck_id',
  'version',
  'storage_deck_id',
  'title',
  'beat_start',
  'beat_end',
  'kind',
  'replace_live',
  'zip',
  'pack',
  'files',
  'file',
]);

async function parseRequest(req: Request): Promise<{ fields: PublishFields; files: PackFile[] }> {
  const contentType = (req.headers.get('Content-Type') ?? '').toLowerCase();
  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    const fields: PublishFields = {
      deck_id: asText(form.get('deck_id')),
      version: asText(form.get('version')),
      storage_deck_id: asText(form.get('storage_deck_id')),
      title: asText(form.get('title')),
      beat_start: asText(form.get('beat_start')),
      beat_end: asText(form.get('beat_end')),
      kind: asText(form.get('kind')) || 'lesson',
      replace_live: asText(form.get('replace_live')) === 'true' || form.get('replace_live') === 'true',
    };
    const files: PackFile[] = [];
    let zipBytes: Uint8Array | null = null;
    for (const [key, value] of form.entries()) {
      if (typeof value === 'string') continue;
      const file = value as File;
      const fileName = normalizeRel(file.name || '');
      if (key === 'zip' || key === 'pack' || fileName.endsWith('.zip')) {
        zipBytes = await readBlobBytes(file);
        continue;
      }
      const relative =
        typeof (file as File & { webkitRelativePath?: string }).webkitRelativePath === 'string'
          ? (file as File & { webkitRelativePath?: string }).webkitRelativePath
          : '';
      let path = normalizeRel(relative || fileName || key);
      // Author may send the relative path as the form field name.
      if (META_KEYS.has(key) && (key === 'files' || key === 'file')) {
        // keep path from filename / webkitRelativePath
      } else if (!META_KEYS.has(key)) {
        path = normalizeRel(key);
      }
      if (!path || skipUpload(path)) continue;
      files.push({ path, bytes: await readBlobBytes(file) });
    }
    if (zipBytes) files.push(...unzipPack(zipBytes));
    const multiparts = dedupeFiles(files);
    assertUnderQuota(multiparts.reduce((sum, f) => sum + f.bytes.byteLength, 0));
    return { fields, files: multiparts };
  }

  // zip + JSON sidecar: metadata JSON with zip_base64 and/or files[].
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    throw Object.assign(new Error('multipart or JSON body required'), { status: 400 });
  }
  const fields: PublishFields = {
    deck_id: String(body.deck_id ?? '').trim(),
    version: String(body.version ?? '').trim(),
    storage_deck_id: String(body.storage_deck_id ?? '').trim(),
    title: String(body.title ?? '').trim(),
    beat_start: String(body.beat_start ?? '').trim(),
    beat_end: String(body.beat_end ?? '').trim(),
    kind: String(body.kind ?? 'lesson').trim() || 'lesson',
    replace_live: body.replace_live === true,
  };
  const files: PackFile[] = [];
  if (typeof body.zip_base64 === 'string' && body.zip_base64) {
    const bin = Uint8Array.from(atob(body.zip_base64), (c) => c.charCodeAt(0));
    files.push(...unzipPack(bin));
  }
  if (Array.isArray(body.files)) {
    for (const entry of body.files) {
      if (!entry || typeof entry !== 'object') continue;
      const row = entry as { path?: unknown; content_base64?: unknown; bytes_base64?: unknown };
      const path = normalizeRel(String(row.path ?? ''));
      const b64 = String(row.content_base64 ?? row.bytes_base64 ?? '');
      if (!path || !b64 || skipUpload(path)) continue;
      files.push({ path, bytes: Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)) });
    }
  }
  const jsonFiles = dedupeFiles(files);
  assertUnderQuota(jsonFiles.reduce((sum, f) => sum + f.bytes.byteLength, 0));
  return { fields, files: jsonFiles };
}

function dedupeFiles(files: PackFile[]): PackFile[] {
  const map = new Map<string, PackFile>();
  for (const file of files) {
    const path = normalizeRel(file.path);
    if (!path || skipUpload(path)) continue;
    map.set(path, { path, bytes: file.bytes });
  }
  return [...map.values()];
}

function validateFields(fields: PublishFields): string | null {
  if (!fields.deck_id || !SLUG.test(fields.deck_id)) return 'bad deck_id';
  if (!fields.version || !SLUG.test(fields.version)) return 'bad version';
  if (!fields.storage_deck_id || !SLUG.test(fields.storage_deck_id)) return 'bad storage_deck_id';
  if (!fields.beat_start || !SLUG.test(fields.beat_start)) return 'bad beat_start';
  if (!fields.beat_end || !SLUG.test(fields.beat_end)) return 'bad beat_end';
  if (!fields.title.trim()) return 'title required';
  if (fields.kind !== 'lesson') return 'kind must be lesson';
  return null;
}

function parseManifest(raw: Uint8Array): Manifest {
  const text = new TextDecoder().decode(raw);
  return JSON.parse(text) as Manifest;
}

function validateManifest(manifest: Manifest, fields: PublishFields): string | null {
  if (manifest.spec !== 'kelyra.pack/1') return 'manifest spec must be kelyra.pack/1';
  if (manifest.kind !== 'lesson') return 'manifest kind must be lesson';
  if (String(manifest.deck_id ?? '') !== fields.deck_id) return 'manifest deck_id mismatch';
  if (String(manifest.version ?? '') !== fields.version) return 'manifest version mismatch';
  if (String(manifest.storage_deck_id ?? '') !== fields.storage_deck_id) {
    return 'manifest storage_deck_id mismatch';
  }
  if (String(manifest.beat_start ?? '') !== fields.beat_start) return 'manifest beat_start mismatch';
  if (String(manifest.beat_end ?? '') !== fields.beat_end) return 'manifest beat_end mismatch';
  if (!Array.isArray(manifest.items) || manifest.items.length === 0) {
    return 'manifest items required';
  }
  for (const item of manifest.items) {
    if (!item || typeof item !== 'object') return 'manifest items[{id,stem}] required';
    const row = item as { id?: unknown; stem?: unknown };
    if (!String(row.id ?? '').trim() || !String(row.stem ?? '').trim()) {
      return 'manifest items[{id,stem}] required';
    }
  }
  const beatIds = new Set<string>();
  if (Array.isArray(manifest.beats)) {
    for (const beat of manifest.beats) {
      if (beat && typeof beat === 'object' && typeof (beat as { id?: unknown }).id === 'string') {
        beatIds.add((beat as { id: string }).id);
      }
    }
  }
  for (const item of manifest.items) {
    const beat = (item as { beat?: unknown }).beat;
    if (typeof beat === 'string' && beat) beatIds.add(beat);
  }
  // F14: always require beat_start/beat_end in beats[] and/or items[].beat.
  if (beatIds.size === 0) {
    return 'beat_start/beat_end must exist in the pack';
  }
  if (!beatIds.has(fields.beat_start) || !beatIds.has(fields.beat_end)) {
    return 'beat_start/beat_end must exist in the pack';
  }
  return null;
}

async function listPrefix(admin: SupabaseClient, prefix: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(folder: string) {
    const { data, error } = await admin.storage.from('lessons').list(folder, {
      limit: 1000,
      offset: 0,
    });
    if (error) throw error;
    for (const entry of data ?? []) {
      const name = entry.name;
      if (!name) continue;
      const full = folder ? `${folder}/${name}` : name;
      // Storage folders have null id; files have an id.
      if (entry.id) out.push(full);
      else await walk(full);
    }
  }
  await walk(prefix);
  return out;
}

async function putObject(
  supabaseUrl: string,
  serviceKey: string,
  object: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<Response> {
  return await fetch(`${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/lessons/${object}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body: bytes,
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors() });
  }
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.toLowerCase().startsWith('bearer ')) return json({ error: 'sign in first' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !anon) return json({ error: 'not configured' }, 503);
  if (!serviceKey) return json({ error: 'service role not configured' }, 503);

  const userClient = createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: auth } },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user?.id) return json({ error: 'sign in first' }, 401);

  const { data: profileRow, error: profileError } = await userClient
    .from('profiles')
    .select('id, role, also_administrator, also_teacher, parent_id, display_name, username')
    .eq('id', authData.user.id)
    .maybeSingle();
  if (profileError || !profileRow?.role) return json({ error: 'sign in first' }, 401);
  const profile = profileRow as ProfileHats;
  // Authz: teacher | also_teacher | superintendent | administrator. Not is_staff. Not class_teachers.
  if (!canPublish(profile)) return json({ error: 'teacher or office seat required' }, 401);

  // Reject oversized uploads before buffering the full body into memory (t_7c3a2473).
  const declared = Number(req.headers.get('Content-Length') ?? '');
  if (Number.isFinite(declared) && declared > MAX_BYTES) {
    return json({ error: 'pack exceeds size quota', max: MAX_BYTES }, 413);
  }

  let fields: PublishFields;
  let files: PackFile[];
  try {
    const parsed = await parseRequest(req);
    fields = parsed.fields;
    files = parsed.files;
  } catch (err) {
    const status = typeof err === 'object' && err && 'status' in err ? Number((err as { status: number }).status) : 400;
    const message = err instanceof Error ? err.message : 'bad request';
    return json({ error: message }, status || 400);
  }

  const fieldError = validateFields(fields);
  if (fieldError) return json({ error: fieldError }, 400);

  const hasIndex = files.some((f) => f.path === 'index.html');
  const manifestFile = files.find((f) => f.path === 'manifest.json');
  if (!hasIndex) return json({ error: 'index.html required' }, 400);
  if (!manifestFile) return json({ error: 'manifest.json required' }, 400);

  let manifest: Manifest;
  try {
    manifest = parseManifest(manifestFile.bytes);
  } catch {
    return json({ error: 'manifest.json invalid' }, 400);
  }
  const manifestError = validateManifest(manifest, fields);
  if (manifestError) return json({ error: manifestError }, 400);

  const bytes = files.reduce((sum, f) => sum + f.bytes.byteLength, 0);
  if (bytes > MAX_BYTES) return json({ error: 'pack exceeds size quota', bytes, max: MAX_BYTES }, 413);

  const office = isOfficeRole(profile);
  const liveHit =
    isLiveFomDeckId(fields.deck_id) || isLiveFomStoragePath(fields.storage_deck_id, fields.version);
  if (liveHit && !(office && fields.replace_live)) {
    return json({ error: 'live FoM is protected; office replace_live required' }, 409);
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: sharedRows, error: sharedError } = await admin
    .from('lesson_packs')
    .select('deck_id')
    .eq('storage_deck_id', fields.storage_deck_id)
    .eq('version', fields.version)
    .neq('deck_id', fields.deck_id)
    .limit(1);
  if (sharedError) {
    console.error('publish-lesson-pack shared-folder lookup failed', sharedError.message);
    return json({ error: 'catalog lookup failed' }, 502);
  }
  if ((sharedRows ?? []).length > 0 && !(office && fields.replace_live)) {
    return json({ error: 'shared-folder lock; office replace_live required to slice' }, 409);
  }

  const prefix = `${fields.storage_deck_id}/${fields.version}`;
  const uploadedPaths = new Set<string>();
  for (const file of files) {
    const object = `${prefix}/${file.path}`;
    const uploaded = await putObject(supabaseUrl, serviceKey, object, file.bytes, mimeOf(file.path));
    if (!uploaded.ok) {
      const detail = await uploaded.text().catch(() => '');
      console.error('publish-lesson-pack storage write failed', object, detail);
      return json({ error: 'storage write failed' }, 502);
    }
    uploadedPaths.add(object);
  }

  // Replace-prefix: delete orphans under this version not in this request.
  // F13: when another lesson_packs row already shares the prefix, skip orphan
  // deletes (catalog-only slice) so sibling packs' objects are not wiped.
  const sharedPrefix = (sharedRows ?? []).length > 0;
  if (!sharedPrefix) {
    try {
      const existing = await listPrefix(admin, prefix);
      const orphans = existing.filter((path) => !uploadedPaths.has(path));
      if (orphans.length) {
        const { error: removeError } = await admin.storage.from('lessons').remove(orphans);
        if (removeError) {
          console.error('publish-lesson-pack orphan remove failed', removeError.message);
          return json({ error: 'storage write failed' }, 502);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'storage list failed';
      console.error('publish-lesson-pack storage list failed', message);
      return json({ error: 'storage write failed' }, 502);
    }
  }

  // published must always be present and false — SQL default is true.
  const packRow = {
    deck_id: fields.deck_id,
    version: fields.version,
    title: fields.title,
    published: false,
    storage_deck_id: fields.storage_deck_id,
    beat_start: fields.beat_start,
    beat_end: fields.beat_end,
  };
  const { error: upsertError } = await admin.from('lesson_packs').upsert(packRow, {
    onConflict: 'deck_id,version',
  });
  if (upsertError) {
    console.error('publish-lesson-pack catalog upsert failed', upsertError.message);
    return json({ error: 'catalog write failed' }, 502);
  }

  return json({
    ok: true,
    deck_id: fields.deck_id,
    version: fields.version,
    storage_deck_id: fields.storage_deck_id,
    beat_start: fields.beat_start,
    beat_end: fields.beat_end,
    title: fields.title,
    published: false,
    bytes,
  });
});
