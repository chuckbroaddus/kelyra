#!/usr/bin/env node
/**
 * Local development AI gateway.
 *
 * Uses the official Grok CLI OAuth session in ~/.grok/auth.json
 * (created by `grok login`). Tokens stay on this machine — never in the
 * Expo bundle, never in git.
 *
 *   npm run ai:dev
 */

import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { homedir, networkInterfaces } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';

const require = createRequire(import.meta.url);

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
loadEnv(join(root, '.env'));

const port = Number(process.env.AI_DEV_PORT ?? 8787);
const xaiBaseUrl = 'https://api.x.ai/v1';
const visionModel = 'grok-4.6';
const practiceModel = 'grok-4.6';
const authPath = join(homedir(), '.grok', 'auth.json');
const tokenUrl = 'https://auth.x.ai/oauth2/token';

const homeworkPrompt = `You are helping a K-12 teacher review one student's work.
Look only at the photo. Return JSON only, no markdown:
{"gaps":[{"label":"short skill name","sortOrder":1}],"draftScore":null,"teacherNote":"one short sentence or null"}
Rules:
- 1 to 3 gaps. Labels are short, like "two-digit regrouping" or "thesis clarity".
- If the image is blank, unreadable, or not student work, return {"gaps":[],"draftScore":null,"teacherNote":null}
- Do not invent a student name or extra biography.`;

function practicePrompt(skillLabel) {
  return `You write short paper practice items for one K-12 skill: ${skillLabel}.
Return JSON only, no markdown:
{"items":[{"id":"item-1","prompt":"one sentence the student can answer on paper","answerKey":"optional short key"}]}
Rules:
- 4 to 6 items.
- Age-appropriate. No student names. No images.
- Prompts are one or two sentences.`;
}

const server = createServer(async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`);
  const route = normalizeRoute(url.pathname);

  try {
    if (req.method === 'GET' && route === 'health') {
      const session = await readSession();
      json(res, {
        ok: true,
        auth: 'grok-oauth',
        expiresAt: session.expires_at ?? null,
        model: visionModel,
      });
      return;
    }

    if (req.method !== 'POST') {
      json(res, { error: 'not found' }, 404);
      return;
    }

    const authorization = req.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      json(res, { error: 'Sign in to Kelyra first.' }, 401);
      return;
    }

    const supabase = supabaseFromAuth(authorization);
    const body = await readJson(req);

    if (route === 'analyze-homework') {
      json(res, await analyzeHomework(supabase, body));
      return;
    }
    if (route === 'generate-practice') {
      json(res, await generatePractice(body));
      return;
    }
    if (route === 'transcribe') {
      json(res, await transcribe(supabase, body));
      return;
    }
    if (route === 'extract-roster') {
      json(res, await extractRoster(body));
      return;
    }
    if (route === 'transcribe-audio') {
      json(res, await transcribeAudio(body));
      return;
    }
    if (route === 'interpret-speech') {
      json(res, await interpretSpeech(body));
      return;
    }
    if (route === 'evaluate-homework') {
      json(res, await evaluateHomework(body));
      return;
    }

    json(res, { error: `unknown function ${route || '(empty)'}` }, 404);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI gateway failed';
    const status = /not set|Sign in|grok login|Capture must|required/i.test(message)
      ? 400
      : 500;
    console.error(`[ai-dev] ${route}: ${message}`);
    json(res, { error: message }, status);
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log('Kelyra AI — Grok OAuth (local development)');
  for (const url of listenUrls(port)) {
    console.log(`  ${url}`);
  }
  console.log('Tokens stay in ~/.grok/auth.json. Restart Expo after setting EXPO_PUBLIC_AI_DEV_URL.');
});

function normalizeRoute(pathname) {
  return pathname
    .replace(/^\/functions\/v1\//, '/')
    .replace(/^\//, '')
    .replace(/\/$/, '');
}

function supabaseFromAuth(authorization) {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error('Supabase is not configured in .env');
  }
  return createClient(url, anon, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function analyzeHomework(supabase, body) {
  const captureId = String(body.captureId ?? '');
  if (!captureId) throw new Error('captureId required');

  const { data: capture, error: captureError } = await supabase
    .from('captures')
    .select('id, student_id, photo_asset_id')
    .eq('id', captureId)
    .single();
  if (captureError || !capture?.student_id || !capture.photo_asset_id) {
    throw new Error('Capture must have a student and a photo');
  }

  const { data: asset, error: assetError } = await supabase
    .from('assets')
    .select('storage_path')
    .eq('id', capture.photo_asset_id)
    .single();
  if (assetError || !asset) throw new Error('Photo asset missing');

  const { data: signed, error: signedError } = await supabase.storage
    .from('photos')
    .createSignedUrl(asset.storage_path, 120);
  if (signedError || !signed?.signedUrl) throw new Error('Could not sign photo URL');

  const draft = await draftFromPhoto(signed.signedUrl);

  await supabase.from('skill_gaps').delete().eq('capture_id', captureId).eq('source', 'model');
  if (draft.gaps.length) {
    const { error: gapError } = await supabase.from('skill_gaps').insert(
      draft.gaps.map((gap, index) => ({
        capture_id: captureId,
        student_id: capture.student_id,
        label: gap.label,
        source: 'model',
        status: 'draft',
        sort_order: gap.sortOrder ?? index + 1,
      })),
    );
    if (gapError) throw gapError;
  }

  const { error: updateError } = await supabase
    .from('captures')
    .update({
      status: draft.gaps.length ? 'draft' : 'attached',
      model_draft: draft,
      draft_score: draft.draftScore,
      teacher_note: draft.teacherNote,
    })
    .eq('id', captureId);
  if (updateError) throw updateError;

  return { ok: true, gaps: draft.gaps };
}

const rosterPrompt = `You extract student names from a class list, seating chart, or attendance sheet photo.
Return JSON only, no markdown:
{"names":[{"name":"First Last","confident":true}]}
Rules:
- Only personal names of students. Skip headers, period labels, Present/Absent, dates, room numbers, teacher names, and page titles.
- Keep the name as printed. Do not invent a student who is not on the page.
- confident=false if the line is unclear or might not be a student name.
- 0 to 40 names.`;

async function extractRoster(body) {
  const imageUrl = String(body.imageUrl ?? '');
  if (!imageUrl) throw new Error('imageUrl required');
  const prepared = await prepareImageForGrok(imageUrl);
  const payload = await xaiResponses(visionModel, [
    {
      role: 'user',
      content: [
        { type: 'input_image', image_url: prepared, detail: 'high' },
        { type: 'input_text', text: rosterPrompt },
      ],
    },
  ]);
  const parsed = extractJson(outputText(payload));
  const names = Array.isArray(parsed.names)
    ? parsed.names
        .map((row) => ({
          name: String(row?.name ?? '').replace(/\s+/g, ' ').trim(),
          confident: row?.confident !== false,
        }))
        .filter((row) => row.name.length > 1)
        .slice(0, 40)
    : [];
  return { names };
}

const speechPrompt = `You interpret what a K-12 teacher just said.
Return JSON only, no markdown:
{"intent":"add_student","studentName":"First Last","skillLabel":null}
intent is add_student, note, or unknown.
studentName is a person's name the teacher said, or null.
skillLabel is a short skill/gap if they mentioned one, or null.
Rules:
- Do not invent a student name or skill that was not spoken.
- For add-a-student talk, ignore filler such as "I'd like to", "add another student named", "please".
- Example: "I'd like to add another student named Jamal Washington" → {"intent":"add_student","studentName":"Jamal Washington","skillLabel":null}
- Example: "Mateo is showing a gap in his understanding of long division remainders" → {"intent":"note","studentName":"Mateo","skillLabel":"long division remainders"}
- If no name is clear, studentName is null and intent is unknown.`;

async function interpretSpeech(body) {
  const transcript = String(body.transcript ?? '').replace(/\s+/g, ' ').trim();
  if (!transcript) throw new Error('transcript required');
  const payload = await xaiResponses(
    practiceModel,
    `${speechPrompt}\n\nTeacher said:\n${transcript}`,
  );
  const parsed = extractJson(outputText(payload));
  const studentName =
    typeof parsed.studentName === 'string' ? parsed.studentName.replace(/\s+/g, ' ').trim() : '';
  const skillLabel =
    typeof parsed.skillLabel === 'string' ? parsed.skillLabel.replace(/\s+/g, ' ').trim() : '';
  const intent =
    parsed.intent === 'add_student' || parsed.intent === 'note' || parsed.intent === 'unknown'
      ? parsed.intent
      : studentName
        ? 'add_student'
        : 'unknown';
  return {
    intent,
    studentName: studentName || null,
    skillLabel: skillLabel || null,
  };
}

async function generatePractice(body) {
  const skillLabel = String(body.skillLabel ?? '').trim();
  if (!skillLabel) throw new Error('skillLabel required');

  const payload = await xaiResponses(practiceModel, practicePrompt(skillLabel));
  const parsed = extractJson(outputText(payload));
  const items = Array.isArray(parsed.items)
    ? parsed.items
        .map((item, index) => ({
          id: String(item.id ?? `item-${index + 1}`),
          prompt: String(item.prompt ?? '').trim(),
          ...(item.answerKey ? { answerKey: String(item.answerKey) } : {}),
        }))
        .filter((item) => item.prompt)
        .slice(0, 8)
    : [];
  if (!items.length) throw new Error('Grok returned no practice items');
  return { items };
}

async function transcribe(supabase, body) {
  const captureId = String(body.captureId ?? '');
  if (!captureId) throw new Error('captureId required');

  const { data: capture, error: captureError } = await supabase
    .from('captures')
    .select('id, audio_asset_id, class_id')
    .eq('id', captureId)
    .single();
  if (captureError || !capture?.audio_asset_id) {
    throw new Error('Capture has no audio');
  }

  const { data: asset, error: assetError } = await supabase
    .from('assets')
    .select('storage_path')
    .eq('id', capture.audio_asset_id)
    .single();
  if (assetError || !asset) throw new Error('Audio asset missing');

  const { data: signed, error: signedError } = await supabase.storage
    .from('audio')
    .createSignedUrl(asset.storage_path, 120);
  if (signedError || !signed?.signedUrl) throw new Error('Could not sign audio URL');

  const form = new FormData();
  form.append('format', 'true');
  form.append('language', 'en');
  for (const term of await rosterKeyterms(supabase, capture.class_id)) {
    form.append('keyterm', term);
  }
  await appendAudioFile(form, signed.signedUrl);
  return { text: await sttFromForm(form) };
}

async function transcribeAudio(body) {
  const audioUrl = String(body.audioUrl ?? '');
  if (!audioUrl) throw new Error('audioUrl required');
  const form = new FormData();
  form.append('format', 'true');
  form.append('language', 'en');
  for (const term of Array.isArray(body.keyterms) ? body.keyterms : []) {
    if (String(term).length > 1) form.append('keyterm', String(term));
  }
  await appendAudioFile(form, audioUrl);
  return { text: await sttFromForm(form) };
}

async function appendAudioFile(form, audioUrl) {
  const response = await fetch(audioUrl);
  if (!response.ok) throw new Error('Could not download the recording.');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 16) throw new Error('Recording was empty.');
  const { filename, mime } = sniffAudioFile(bytes);
  form.append('file', new Blob([bytes], { type: mime }), filename);
}

function sniffAudioFile(bytes) {
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WAVE') {
    return { filename: 'audio.wav', mime: 'audio/wav' };
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) {
    return { filename: 'audio.mp3', mime: 'audio/mpeg' };
  }
  if (bytes.length >= 4 && bytes.toString('ascii', 0, 4) === 'OggS') {
    return { filename: 'audio.ogg', mime: 'audio/ogg' };
  }
  if (bytes.length >= 12 && bytes.toString('ascii', 4, 8) === 'ftyp') {
    return { filename: 'audio.m4a', mime: 'audio/mp4' };
  }
  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return { filename: 'audio.webm', mime: 'audio/webm' };
  }
  return { filename: 'audio.wav', mime: 'audio/wav' };
}

async function sttFromForm(form) {
  const stt = await xaiFetch(`${xaiBaseUrl}/stt`, { method: 'POST', body: form });
  if (!stt.ok) {
    throw new Error(`STT failed: ${stt.status} ${await stt.text()}`);
  }
  const result = await stt.json();
  return result.text ?? '';
}

async function rosterKeyterms(supabase, classId) {
  const { data } = await supabase.from('enrollments').select('student_id').eq('class_id', classId);
  const ids = (data ?? []).map((row) => row.student_id);
  if (!ids.length) return [];
  const { data: students } = await supabase.from('students').select('display_name').in('id', ids);
  return (students ?? [])
    .map((row) => String(row.display_name).split(/\s+/)[0] ?? '')
    .filter((name) => name.length > 1)
    .slice(0, 40);
}

const evaluatePrompt = `You are helping a K-12 teacher review one student's work.
The images are pages of one assignment, in order. Look at all pages together. Return JSON only, no markdown:
{"studentName":null,"gaps":[{"label":"short skill name","sortOrder":1}],"draftScore":null,"teacherNote":"one short sentence or null"}
Rules:
- studentName is a name printed or written on any page, or null if none is clearly visible. Do not invent a name.
- 1 to 3 gaps for the whole assignment. Labels are short, like "two-digit regrouping" or "thesis clarity".
- draftScore is a number 0-100 if the work is scored or you can fairly estimate, otherwise null.
- If the images are blank, unreadable, or not student work, return {"studentName":null,"gaps":[],"draftScore":null,"teacherNote":null}
- Do not invent extra biography.`;

async function evaluateHomework(body) {
  const urls = Array.isArray(body.imageUrls)
    ? body.imageUrls.map((url) => String(url)).filter(Boolean)
    : [String(body.imageUrl ?? '')].filter(Boolean);
  if (!urls.length) throw new Error('imageUrl required');
  const images = [];
  for (const url of urls.slice(0, 8)) {
    images.push({
      type: 'input_image',
      image_url: await prepareImageForGrok(url),
      detail: 'high',
    });
  }
  const payload = await xaiResponses(visionModel, [
    {
      role: 'user',
      content: [...images, { type: 'input_text', text: evaluatePrompt }],
    },
  ]);
  const parsed = extractJson(outputText(payload));
  const draft = parseHomeworkDraft(parsed);
  const studentName =
    typeof parsed.studentName === 'string' ? parsed.studentName.replace(/\s+/g, ' ').trim() : '';
  return { ...draft, studentName: studentName || null };
}

function parseHomeworkDraft(parsed) {
  const gaps = Array.isArray(parsed.gaps)
    ? parsed.gaps
        .map((gap, index) => ({
          label: String(gap.label ?? '').trim(),
          sortOrder: Number(gap.sortOrder ?? index + 1),
        }))
        .filter((gap) => gap.label)
        .slice(0, 3)
    : [];
  return {
    gaps,
    draftScore: typeof parsed.draftScore === 'number' ? parsed.draftScore : null,
    teacherNote: typeof parsed.teacherNote === 'string' ? parsed.teacherNote : null,
  };
}

async function draftFromPhoto(imageUrl) {
  const prepared = await prepareImageForGrok(imageUrl);
  const payload = await xaiResponses(visionModel, [
    {
      role: 'user',
      content: [
        { type: 'input_image', image_url: prepared, detail: 'high' },
        { type: 'input_text', text: homeworkPrompt },
      ],
    },
  ]);
  return parseHomeworkDraft(extractJson(outputText(payload)));
}

async function prepareImageForGrok(imageUrl) {
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error('Could not download the homework photo.');
  const bytes = Buffer.from(await response.arrayBuffer());
  const kind = sniffImage(bytes);

  let body = bytes;
  let mime = 'image/jpeg';
  if (kind === 'jpeg') mime = 'image/jpeg';
  else if (kind === 'png') mime = 'image/png';
  else if (kind === 'webp') mime = 'image/webp';
  else {
    try {
      const convert = require('heic-convert');
      body = Buffer.from(
        await convert({
          buffer: bytes,
          format: 'JPEG',
          quality: 0.85,
        }),
      );
      mime = 'image/jpeg';
      console.log(`[ai-dev] converted ${kind} photo to jpeg (${body.length} bytes)`);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'convert failed';
      throw new Error(
        `That photo is not a JPEG/PNG/WebP (often iPhone HEIC) and conversion failed: ${detail}`,
      );
    }
  }

  return `data:${mime};base64,${body.toString('base64')}`;
}

function sniffImage(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg';
  }
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'png';
  }
  if (
    bytes.length >= 12 &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp';
  }
  if (bytes.length >= 12 && bytes.toString('ascii', 4, 8) === 'ftyp') {
    const brand = bytes.toString('ascii', 8, 12).replace(/\0/g, '').trim();
    if (['heic', 'heif', 'mif1', 'msf1', 'heix', 'hevc'].includes(brand)) return 'heic';
    if (brand === 'avif') return 'avif';
  }
  return 'unknown';
}

async function xaiResponses(model, input) {
  const response = await xaiFetch(`${xaiBaseUrl}/responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, input }),
  });
  if (!response.ok) {
    throw new Error(`Grok failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

async function xaiFetch(url, init, retried = false) {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(url, { ...init, headers });
  if (response.status === 401 && !retried) {
    await refreshSession(true);
    return xaiFetch(url, init, true);
  }
  return response;
}

async function getAccessToken() {
  const session = await readSession();
  const expires = session.expires_at ? Date.parse(session.expires_at) : 0;
  if (!session.key) throw new Error('No Grok OAuth token. Run: grok login');
  if (expires && expires - Date.now() < 60_000) {
    return refreshSession(false);
  }
  return session.key;
}

async function readSession() {
  if (!existsSync(authPath)) {
    throw new Error('No Grok OAuth session. Run: grok login');
  }
  const auth = JSON.parse(await readFile(authPath, 'utf8'));
  const key = Object.keys(auth)[0];
  const session = key ? auth[key] : null;
  if (!session || typeof session !== 'object') {
    throw new Error('Grok auth.json is empty. Run: grok login');
  }
  return { ...session, _key: key, _auth: auth };
}

async function refreshSession(force) {
  const session = await readSession();
  if (!session.refresh_token || !session.oidc_client_id) {
    throw new Error('Grok OAuth expired. Run: grok login');
  }
  const expires = session.expires_at ? Date.parse(session.expires_at) : 0;
  if (!force && expires - Date.now() > 60_000 && session.key) return session.key;

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: session.refresh_token,
      client_id: session.oidc_client_id,
    }),
  });
  if (!response.ok) {
    throw new Error(`Grok OAuth expired. Run: grok login (${response.status})`);
  }
  const tokens = await response.json();
  if (!tokens.access_token) {
    throw new Error('Grok OAuth refresh returned no access token. Run: grok login');
  }

  const next = { ...session };
  delete next._key;
  delete next._auth;
  next.key = tokens.access_token;
  if (tokens.refresh_token) next.refresh_token = tokens.refresh_token;
  if (typeof tokens.expires_in === 'number') {
    next.expires_at = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  }
  const auth = session._auth;
  auth[session._key] = next;
  await writeFile(authPath, `${JSON.stringify(auth, null, 2)}\n`, { mode: 0o600 });
  return next.key;
}

function outputText(payload) {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text;
  }
  return (payload.output ?? [])
    .flatMap((item) => item.content ?? [])
    .map((part) => part.text ?? '')
    .join('');
}

function extractJson(raw) {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return {};
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return {};
  }
}

function listenUrls(listenPort) {
  const urls = [`http://127.0.0.1:${listenPort}`];
  for (const nets of Object.values(networkInterfaces())) {
    for (const net of nets ?? []) {
      if (net.family === 'IPv4' && !net.internal) {
        urls.push(`http://${net.address}:${listenPort}`);
      }
    }
  }
  return urls;
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
}

function json(res, body, status = 200) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}
