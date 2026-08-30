/**
 * Authenticated Gemini ingest → lesson pack JSON draft only.
 * Teacher / office JWT. No Storage write, no lesson_packs upsert, no TTS/stills.
 * Meters through callMetered job 'lesson-outline'. Prefer GEMINI_API_KEY.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

import { callMetered, outputText, requireXaiKey } from '../_shared/ai.ts';
import { imageDetailFor } from '../_shared/aiPolicy.ts';
import type { ProfileHats } from '../_shared/askToolPolicy.ts';

/** Exact stamps for this FoM 1.2 author-test ingest. */
const STAMP = {
  spec: 'kelyra.pack/1',
  kind: 'lesson',
  deck_id: 'fom-ch01-s12-test',
  storage_deck_id: 'fom-ch01-s12-author-test',
  version: 'v1',
  title: 'FoM · 1.2 Addition and Subtraction',
  beat_start: 'hook',
  beat_end: 's12c',
  style_brief: 'kelyra-lesson/2026-08',
  voice: 'eve',
} as const;

const BEAT_IDS = ['hook', 's12t', 's12c'] as const;
/** One section (1.2), not the whole chapter. Stay under Edge body limits. */
const MAX_IMAGES = 16;
const MAX_IMAGE_BYTES = 4_500_000;
const MAX_TEXT_CHARS = 80_000;

/** From notes/authoring/fom-ch01-s12-ingest-prompt.md (System prompt fence). */
const INGEST_SYSTEM_PROMPT = `You ingest one section of a teacher PowerPoint into a Kelyra lesson pack JSON.

This call: BJU Press Fundamentals of Math (3rd ed.) Chapter 1, section 1.2 Addition and Subtraction only. Ignore 1.1, 1.3–1.7, title slides, and chapter wrap. If a slide is not 1.2, skip it.

This is a NEW pack. Do not clone live Kelyra FoM 1.2 (do not reuse live item ids b1–b6, live stems, live answers, live scene captions, or live Eve lines). Invent new numbers and new wording that still teach the same 1.2 ideas from the PPT: addends/sum, minuend/subtrahend/difference, inverse operations, estimate first, line up decimals, annex zeros, money as hundredths.

Output JSON only. No markdown. No commentary. No HTML. No studio chrome. No student PII.

Stamp these fields exactly:
{
  "spec": "kelyra.pack/1",
  "kind": "lesson",
  "deck_id": "fom-ch01-s12-test",
  "storage_deck_id": "fom-ch01-s12-author-test",
  "version": "v1",
  "title": "FoM · 1.2 Addition and Subtraction",
  "beat_start": "hook",
  "beat_end": "s12c",
  "style_brief": "kelyra-lesson/2026-08",
  "voice": "eve"
}

Beats: exactly three, in this order. One action per beat (Mystery/Khan: the screen is the question).
1. id "hook", role "hook", title "Welcome" — name only. No scored item.
2. id "s12t", role "teach", title "1.2 Teach" — one teach idea + at most one unscored kinetic (type slider or houses, scored false). Not a worksheet.
3. id "s12c", role "check", title "1.2 Check" — scored items, one at a time (about 6–8). Mix text and choice; at most one match set. Last item is still a check item (player turns the last one into Submit later).

Each beat object:
{
  "id": "hook" | "s12t" | "s12c",
  "title": string,
  "role": "hook" | "teach" | "check",
  "eve_script": "Hear this for this screen. Grade 5/6, dry BrainPOP (not Jr). One idea. [pause] allowed. No wallpaper music. No 'great job buddy'. Paper-math spoken in words (two cubed, times, not caret).",
  "caption_script": "One or two sentences describing an ORIGINAL cinematic still (Disney+ app richness: light, depth, paint). Not a BJU page scan. Not Disney/Pixar IP, castles, mouse ears, named worlds. Not clipart. This is a GenerateImage note, not a reprint.",
  "art_note": "Hero scene for this beat: full-bleed original painted still + math model in the midground. 70% world / 30% frosted card. Color script one mood. No textbook screenshot as the hero."
}

Each item object:
{
  "id": "stable kebab or a1-style id unique in the pack",
  "beat": "s12t" | "s12c",
  "type": "text" | "choice" | "match" | "houses" | "slider",
  "scored": true | false,
  "stem": "student-facing stem with PAPER MATH (× ÷ − ±, stacked idea in words if needed). Never 2^3 or * as the displayed operator.",
  "accept": ["ascii alias", "optional unicode"],
  "hint": "must show the typewriter way a Chromebook can type (2^3, 2*2*2, 56.03). Never require superscripts to score.",
  "options": [["value","label"], ...]   // choice only
}

Rules:
- Teach kinetic (if any) scored false; exclude it from skill-gap item_ids later. Check items scored true.
- Accept-sets are aliases. Display is paper math. Input is a normal keyboard. Include comma/no-comma and $ / no-$ when money.
- One stem, one action. No 12 numbered worksheet items on one beat.
- Do not emit skill / skill_id. Gap labels are stem text. Live FoM has no skill tags.
- Do not invent required metrics. Emit does the live FoM bridge later (kelyra.identity, kelyra.lesson, complete_kind this_visit, marks, item_ids, item_stems, skipped, wrong, later_corrected, retried, hinted, duration_ms, correct/incorrect last-ok, hints, audio_used, kinetic_used). You may include a "bridge" object that ONLY lists those names. Do not add new required metric keys.
- Do not write index.html. Do not assign. Do not mention classes. Do not create-class.
- Do not put BJU stills, page scans, or licensed characters in art_note.
- Voice is eve. Shared praise/oops are not your job unless you add three short praise lines and two oops lines in "shared_audio.eve_scripts" (dry, specific).

Top-level JSON shape:
{
  spec, kind, deck_id, storage_deck_id, version, title, beat_start, beat_end, style_brief, voice,
  "beats": [ hook, s12t, s12c ],
  "items": [ ... ],
  "bridge": {
    "identity": "kelyra.identity",
    "event": "kelyra.lesson",
    "complete_kind": "this_visit",
    "reports": ["item_ids","item_stems","later_corrected","hinted","skipped","wrong","retried"]
  }
}`;

type SlideImage = { dataUrl: string; bytes: number };

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

function canIngest(profile: ProfileHats | null | undefined): boolean {
  if (!profile?.role) return false;
  if (profile.role === 'teacher') return true;
  if (profile.also_teacher) return true;
  if (profile.role === 'superintendent' || profile.role === 'administrator') return true;
  return false;
}

function asText(value: FormDataEntryValue | null | undefined): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  return '';
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function mimeFromName(name: string): string {
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')).toLowerCase() : '';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  return 'image/jpeg';
}

function isImageFileName(name: string): boolean {
  return /\.(png|jpe?g|webp|gif)$/i.test(name);
}

function isPptxName(name: string): boolean {
  return /\.pptx$/i.test(name);
}

function normalizeDataUrl(raw: string, fallbackMime = 'image/jpeg'): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('data:')) {
    const m = trimmed.match(/^data:([^;]+);base64,/);
    if (!m) return null;
    return trimmed;
  }
  // bare base64
  if (/^[A-Za-z0-9+/=\s]+$/.test(trimmed) && trimmed.replace(/\s/g, '').length > 32) {
    return `data:${fallbackMime};base64,${trimmed.replace(/\s/g, '')}`;
  }
  return null;
}

function dataUrlByteLength(dataUrl: string): number {
  const i = dataUrl.indexOf('base64,');
  if (i < 0) return dataUrl.length;
  const b64 = dataUrl.slice(i + 7);
  return Math.floor((b64.length * 3) / 4);
}

async function readBlobBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

type ParsedBody = {
  text: string;
  images: SlideImage[];
  sawPptx: boolean;
};

async function parseRequest(req: Request): Promise<ParsedBody> {
  const contentType = (req.headers.get('Content-Type') ?? '').toLowerCase();
  const images: SlideImage[] = [];
  let text = '';
  let sawPptx = false;
  let imageBytes = 0;

  const pushImage = (dataUrl: string) => {
    const bytes = dataUrlByteLength(dataUrl);
    if (images.length >= MAX_IMAGES) {
      throw Object.assign(new Error(`too many images (max ${MAX_IMAGES} for section 1.2)`), {
        status: 413,
      });
    }
    if (imageBytes + bytes > MAX_IMAGE_BYTES) {
      throw Object.assign(new Error('slide images exceed size cap'), { status: 413 });
    }
    imageBytes += bytes;
    images.push({ dataUrl, bytes });
  };

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    text = [
      asText(form.get('text')),
      asText(form.get('slide_text')),
      asText(form.get('outline')),
      asText(form.get('extracted_text')),
    ]
      .filter(Boolean)
      .join('\n\n')
      .trim();

    for (const [key, value] of form.entries()) {
      if (typeof value === 'string') {
        if (
          (key === 'image_url' || key === 'input_image' || key.startsWith('image_')) &&
          value.startsWith('data:')
        ) {
          const dataUrl = normalizeDataUrl(value);
          if (dataUrl) pushImage(dataUrl);
        }
        continue;
      }
      const file = value as File;
      const name = String(file.name || key || '');
      if (isPptxName(name) || isPptxName(key)) {
        sawPptx = true;
        continue;
      }
      if (
        key === 'input_image' ||
        key === 'files' ||
        key === 'file' ||
        key === 'image' ||
        key === 'images' ||
        key.startsWith('slide') ||
        isImageFileName(name) ||
        (file.type && file.type.startsWith('image/'))
      ) {
        if (file.type && !file.type.startsWith('image/') && !isImageFileName(name)) continue;
        const bytes = await readBlobBytes(file);
        const mime = (file.type && file.type.startsWith('image/') ? file.type : mimeFromName(name))
          .split(';')[0];
        pushImage(`data:${mime};base64,${bytesToBase64(bytes)}`);
      }
    }
    return { text, images, sawPptx };
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    throw Object.assign(new Error('multipart or JSON body required'), { status: 400 });
  }

  text = [
    String(body.text ?? ''),
    String(body.slide_text ?? ''),
    String(body.outline ?? ''),
    String(body.extracted_text ?? ''),
  ]
    .map((s) => s.trim())
    .filter(Boolean)
    .join('\n\n')
    .trim();

  if (typeof body.pptx_base64 === 'string' && body.pptx_base64) sawPptx = true;
  if (body.pptx || body.pptx_file) sawPptx = true;

  if (Array.isArray(body.images)) {
    for (const entry of body.images) {
      if (!entry || typeof entry !== 'object') continue;
      const row = entry as {
        mime?: unknown;
        content_type?: unknown;
        data_base64?: unknown;
        bytes_base64?: unknown;
        image_url?: unknown;
        url?: unknown;
      };
      const mime = String(row.mime ?? row.content_type ?? 'image/jpeg').split(';')[0] || 'image/jpeg';
      const fromUrl = String(row.image_url ?? row.url ?? '');
      if (fromUrl.startsWith('data:')) {
        const dataUrl = normalizeDataUrl(fromUrl, mime);
        if (dataUrl) pushImage(dataUrl);
        continue;
      }
      // Reject non-data https here — ingest does not fetch arbitrary URLs (SSRF).
      if (fromUrl && !fromUrl.startsWith('data:')) {
        throw Object.assign(new Error('image_url must be a data: URL'), { status: 400 });
      }
      const b64 = String(row.data_base64 ?? row.bytes_base64 ?? '');
      const dataUrl = normalizeDataUrl(b64, mime);
      if (dataUrl) pushImage(dataUrl);
    }
  }

  // Optional xAI-style input with input_image / input_text parts.
  if (Array.isArray(body.input)) {
    for (const item of body.input) {
      if (!item || typeof item !== 'object') continue;
      const content = (item as { content?: unknown }).content;
      const parts = Array.isArray(content) ? content : content != null ? [content] : [];
      for (const part of parts) {
        if (!part || typeof part !== 'object') continue;
        const row = part as { type?: string; text?: string; image_url?: string };
        if (row.type === 'input_text' || row.type === 'text') {
          const t = String(row.text ?? '').trim();
          if (t) text = text ? `${text}\n\n${t}` : t;
        }
        if (row.type === 'input_image' && typeof row.image_url === 'string') {
          if (!row.image_url.startsWith('data:')) {
            throw Object.assign(new Error('image_url must be a data: URL'), { status: 400 });
          }
          const dataUrl = normalizeDataUrl(row.image_url);
          if (dataUrl) pushImage(dataUrl);
        }
      }
    }
  }

  if (typeof body.image_base64 === 'string' && body.image_base64) {
    const dataUrl = normalizeDataUrl(
      body.image_base64,
      String(body.image_mime ?? 'image/jpeg'),
    );
    if (dataUrl) pushImage(dataUrl);
  }

  return { text, images, sawPptx };
}

function looksLikeMarkdown(raw: string): boolean {
  const t = raw.trim();
  if (t.startsWith('```')) return true;
  if (/```(?:json)?/i.test(t)) return true;
  if (/^#{1,6}\s/m.test(t)) return true;
  return false;
}

function validateDraft(parsed: Record<string, unknown>): string | null {
  for (const [key, expected] of Object.entries(STAMP)) {
    if (String(parsed[key] ?? '') !== expected) {
      return `missing or wrong stamp: ${key}`;
    }
  }
  if (!Array.isArray(parsed.beats) || parsed.beats.length !== 3) {
    return 'beats must be exactly [hook, s12t, s12c]';
  }
  for (let i = 0; i < 3; i++) {
    const beat = parsed.beats[i];
    if (!beat || typeof beat !== 'object') return 'beats[{id}] required';
    const id = String((beat as { id?: unknown }).id ?? '');
    if (id !== BEAT_IDS[i]) return `beat[${i}] must be id ${BEAT_IDS[i]}`;
  }
  if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
    return 'items required';
  }
  for (const item of parsed.items) {
    if (!item || typeof item !== 'object') return 'items[{stem}] required';
    if (!String((item as { stem?: unknown }).stem ?? '').trim()) {
      return 'items[{stem}] required';
    }
  }
  return null;
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
  if (!supabaseUrl || !anon) return json({ error: 'not configured' }, 503);

  // Caller JWT only — never service-role as the actor.
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
  if (!canIngest(profile)) return json({ error: 'teacher or office seat required' }, 401);

  let parsedBody: ParsedBody;
  try {
    parsedBody = await parseRequest(req);
  } catch (err) {
    const status =
      typeof err === 'object' && err && 'status' in err
        ? Number((err as { status: number }).status)
        : 400;
    const message = err instanceof Error ? err.message : 'bad request';
    return json({ error: message }, status || 400);
  }

  if (parsedBody.text.length > MAX_TEXT_CHARS) {
    return json({ error: 'slide text too long' }, 413);
  }

  // Do not require .pptx — Gemini cannot parse Office XML.
  if (!parsedBody.text && parsedBody.images.length === 0) {
    if (parsedBody.sawPptx) {
      return json(
        { error: 'pptx not accepted; send slide images and/or extracted text' },
        400,
      );
    }
    return json({ error: 'slide text or images required' }, 400);
  }

  let apiKey: string;
  try {
    apiKey = requireXaiKey();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI key is not set';
    return json({ error: message }, 501);
  }

  const content: Array<Record<string, unknown>> = [];
  for (const image of parsedBody.images) {
    content.push({
      type: 'input_image',
      image_url: image.dataUrl,
      detail: imageDetailFor('cheap'),
    });
  }
  const userText = [
    'Ingest section 1.2 only. Return the lesson pack JSON object with the exact stamps.',
    parsedBody.text ? `Extracted slide text:\n${parsedBody.text}` : 'Slide images attached; extract 1.2 content from them.',
  ].join('\n\n');
  content.push({ type: 'input_text', text: userText });

  let payload: Record<string, unknown>;
  try {
    payload = await callMetered(userClient, apiKey, {
      job: 'lesson-outline',
      functionName: 'ingest-lesson-pack',
      payload: [{ role: 'user', content }],
      extra: {
        instructions: INGEST_SYSTEM_PROMPT,
        max_output_tokens: 8192,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'ingest failed';
    const status =
      message.includes('GEMINI_API_KEY') || message.includes('XAI_API_KEY') || message.includes('budget')
        ? 501
        : 502;
    return json({ error: message }, status);
  }

  const raw = outputText(payload).trim();
  if (!raw) return json({ error: 'empty model response' }, 400);
  if (looksLikeMarkdown(raw)) {
    return json({ error: 'model returned markdown; JSON only required' }, 400);
  }

  let draft: Record<string, unknown>;
  try {
    draft = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return json({ error: 'model returned non-JSON' }, 400);
  }
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
    return json({ error: 'model returned non-object JSON' }, 400);
  }

  const stampError = validateDraft(draft);
  if (stampError) return json({ error: stampError }, 400);

  // JSON draft only — no Storage, no lesson_packs upsert, no stills, no TTS.
  return json({ ok: true, pack: draft });
});
