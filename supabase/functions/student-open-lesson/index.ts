/**
 * Mint a short-lived lesson-host URL for the signed-in user.
 * Actor is the user JWT. Calls student_open_lesson (own cell) or, for
 * preview, SELECTs the assignment under RLS (taught class).
 */

import { lessonTtlSec, signLessonJwt } from '../_shared/lessonJwt.ts';

type OpenRow = {
  assignment_id: string;
  submission_id: string;
  title: string;
  deck_id: string;
  lesson_version: string;
  storage_deck_id?: string | null;
  beat_start?: string | null;
  beat_end?: string | null;
  class_id: string;
  class_name: string;
  school_name: string;
  teacher_name: string;
  student_id: string;
  student_name: string;
};

function hostPrefix(storageDeckId: string | null | undefined, deckId: string, version: string): string {
  const storage = (storageDeckId ?? '').trim() || deckId;
  return `${storage}/${version}`;
}

function packSlice(row: {
  deck_id: string;
  lesson_version?: string;
  version?: string;
  storage_deck_id?: string | null;
  beat_start?: string | null;
  beat_end?: string | null;
}) {
  const version = (row.lesson_version ?? row.version ?? '').trim();
  const storage = (row.storage_deck_id ?? '').trim() || row.deck_id;
  const beatStart = (row.beat_start ?? '').trim();
  const beatEnd = (row.beat_end ?? '').trim();
  if (!row.deck_id || !version || !beatStart || !beatEnd) return undefined;
  return {
    deck_id: row.deck_id,
    version,
    storage_deck_id: storage,
    beat_start: beatStart,
    beat_end: beatEnd,
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    },
  });
}

function hostOrigin(supabaseUrl: string): string {
  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/lesson-host`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.toLowerCase().startsWith('bearer ')) return json({ error: 'sign in first' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const secret = Deno.env.get('LESSON_HOST_SECRET') ?? '';
  if (!supabaseUrl || !anon || !secret) return json({ error: 'Lesson host is not configured' }, 503);

  let body: { assignmentId?: string; preview?: boolean } = {};
  try {
    body = (await req.json()) as { assignmentId?: string; preview?: boolean };
  } catch {
    return json({ error: 'assignmentId required' }, 400);
  }
  const assignmentId = String(body.assignmentId ?? '').trim();
  if (!assignmentId) return json({ error: 'assignmentId required' }, 400);

  const preview = body.preview === true;
  const headers = {
    Authorization: auth,
    apikey: anon,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };

  try {
    if (preview) {
      return await previewOpen({ supabaseUrl, headers, secret, assignmentId, auth });
    }
    const rpc = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/student_open_lesson`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ p_assignment_id: assignmentId }),
    });
    const payload = await rpc.json().catch(() => null);
    if (!rpc.ok) {
      const message =
        (payload && (payload.message || payload.error || payload.hint)) || 'Lesson not found';
      const status = rpc.status === 401 ? 401 : 403;
      return json({ error: String(message) }, status);
    }
    const row = (Array.isArray(payload) ? payload[0] : payload) as OpenRow | null;
    if (!row?.assignment_id || !row.deck_id || !row.lesson_version) {
      return json({ error: 'Lesson not found' }, 403);
    }
    const pack = packSlice(row);
    const now = Math.floor(Date.now() / 1000);
    const exp = now + lessonTtlSec();
    const token = await signLessonJwt(
      {
        sub: row.student_id,
        role: 'student',
        aid: row.assignment_id,
        prefix: hostPrefix(row.storage_deck_id, row.deck_id, row.lesson_version),
        iat: now,
        exp,
      },
      secret,
    );
    return json({
      documentUrl: `${hostOrigin(supabaseUrl)}/${token}/index.html`,
      expiresAt: new Date(exp * 1000).toISOString(),
      identity: {
        type: 'kelyra.identity',
        school: { name: row.school_name },
        class: { id: row.class_id, name: row.class_name },
        teacher: { name: row.teacher_name },
        student: { id: row.student_id, name: row.student_name },
        assignment: { id: row.assignment_id, title: row.title },
        ...(pack ? { pack } : {}),
      },
    });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Lesson not found' }, 400);
  }
});

async function previewOpen(input: {
  supabaseUrl: string;
  headers: Record<string, string>;
  secret: string;
  assignmentId: string;
  auth: string;
}) {
  const { supabaseUrl, headers, secret, assignmentId } = input;
  const url =
    `${supabaseUrl.replace(/\/$/, '')}/rest/v1/assignments` +
    `?id=eq.${encodeURIComponent(assignmentId)}` +
    `&kind=eq.lesson&select=id,title,class_id,deck_id,lesson_version,storage_deck_id,beat_start,beat_end`;
  const res = await fetch(url, { headers });
  const rows = (await res.json().catch(() => [])) as Array<{
    id: string;
    title: string;
    class_id: string;
    deck_id: string;
    lesson_version: string;
    storage_deck_id?: string | null;
    beat_start?: string | null;
    beat_end?: string | null;
  }>;
  const assignment = Array.isArray(rows) ? rows[0] : null;
  if (!res.ok || !assignment?.deck_id) return json({ error: 'Lesson not found' }, 403);

  const classRes = await fetch(
    `${supabaseUrl.replace(/\/$/, '')}/rest/v1/classes?id=eq.${encodeURIComponent(assignment.class_id)}&select=id,name,teacher_id`,
    { headers },
  );
  const classes = (await classRes.json().catch(() => [])) as Array<{
    id: string;
    name: string;
    teacher_id: string | null;
  }>;
  const klass = Array.isArray(classes) ? classes[0] : null;
  if (!klass) return json({ error: 'Lesson not found' }, 403);

  const schoolRes = await fetch(
    `${supabaseUrl.replace(/\/$/, '')}/rest/v1/schools?select=name&limit=1`,
    { headers },
  );
  const schools = (await schoolRes.json().catch(() => [])) as Array<{ name: string }>;
  const schoolName = Array.isArray(schools) && schools[0]?.name ? schools[0].name : 'School';

  let teacherName = 'Teacher';
  if (klass.teacher_id) {
    const t = await fetch(
      `${supabaseUrl.replace(/\/$/, '')}/rest/v1/teachers?id=eq.${encodeURIComponent(klass.teacher_id)}&select=display_name`,
      { headers },
    );
    const teachers = (await t.json().catch(() => [])) as Array<{ display_name: string | null }>;
    teacherName = teachers[0]?.display_name?.trim() || teacherName;
  }

  let storageDeckId = assignment.storage_deck_id;
  let beatStart = assignment.beat_start;
  let beatEnd = assignment.beat_end;
  if (!storageDeckId || !beatStart || !beatEnd) {
    const packUrl =
      `${supabaseUrl.replace(/\/$/, '')}/rest/v1/lesson_packs` +
      `?deck_id=eq.${encodeURIComponent(assignment.deck_id)}` +
      `&version=eq.${encodeURIComponent(assignment.lesson_version)}` +
      `&select=deck_id,version,storage_deck_id,beat_start,beat_end`;
    const packRes = await fetch(packUrl, { headers });
    const packs = (await packRes.json().catch(() => [])) as Array<{
      deck_id: string;
      version: string;
      storage_deck_id?: string | null;
      beat_start?: string | null;
      beat_end?: string | null;
    }>;
    const catalog = Array.isArray(packs) ? packs[0] : null;
    storageDeckId = storageDeckId || catalog?.storage_deck_id || null;
    beatStart = beatStart || catalog?.beat_start || null;
    beatEnd = beatEnd || catalog?.beat_end || null;
  }

  const pack = packSlice({
    deck_id: assignment.deck_id,
    lesson_version: assignment.lesson_version,
    storage_deck_id: storageDeckId,
    beat_start: beatStart,
    beat_end: beatEnd,
  });
  const now = Math.floor(Date.now() / 1000);
  const exp = now + lessonTtlSec();
  const token = await signLessonJwt(
    {
      sub: `preview:${assignment.id}`,
      role: 'preview',
      aid: assignment.id,
      prefix: hostPrefix(storageDeckId, assignment.deck_id, assignment.lesson_version),
      iat: now,
      exp,
    },
    secret,
  );
  return json({
    documentUrl: `${hostOrigin(supabaseUrl)}/${token}/index.html`,
    expiresAt: new Date(exp * 1000).toISOString(),
    identity: {
      type: 'kelyra.identity',
      school: { name: schoolName },
      class: { id: klass.id, name: klass.name },
      teacher: { name: teacherName },
      student: { id: null, name: 'Preview' },
      assignment: { id: assignment.id, title: assignment.title },
      preview: true,
      ...(pack ? { pack } : {}),
    },
  });
}
