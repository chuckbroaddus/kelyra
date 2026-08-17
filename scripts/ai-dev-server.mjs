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
    if (route === 'ask-assistant') {
      json(res, await askAssistant(supabase, body));
      return;
    }
    if (route === 'classify-capture') {
      json(res, await classifyCapture(body));
      return;
    }
    if (route === 'crop-portrait') {
      json(res, await cropPortrait(body));
      return;
    }
    if (route === 'cutout-portrait') {
      json(res, await cutoutPortrait(body));
      return;
    }
    if (route === 'analyze-answer-key') {
      json(res, await analyzeAnswerKey(body));
      return;
    }
    if (route === 'match-key') {
      json(res, await matchKey(body));
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
  void warmupCutout();
});

async function warmupCutout() {
  try {
    const { PNG } = require('pngjs');
    const tiny = new PNG({ width: 64, height: 64 });
    for (let i = 0; i < tiny.data.length; i += 4) {
      tiny.data[i] = 200;
      tiny.data[i + 1] = 80;
      tiny.data[i + 2] = 80;
      tiny.data[i + 3] = 255;
    }
    console.log('[ai-dev] warming portrait cutout (first run downloads the rembg model)…');
    const { removeBackground } = await import('@imgly/background-removal-node');
    await removeBackground(new Blob([PNG.sync.write(tiny)], { type: 'image/png' }), {
      output: { format: 'image/png' },
    });
    console.log('[ai-dev] portrait cutout ready');
  } catch (err) {
    console.warn(
      `[ai-dev] portrait cutout warmup failed: ${err instanceof Error ? err.message : err}`,
    );
  }
}

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
{"intent":"add_student","captureIntent":null,"studentName":"First Last","parentName":null,"skillLabel":null,"skipGrade":false,"scoreMark":null,"numericScore":null,"gradeKind":null}
intent is add_student, note, capture, or unknown.
captureIntent is homework, roster, portrait, parent_card, student_card, or null.
homework means a Grade (homework, participation, presentation, or behavior) — not only a worksheet.
studentName is a person's name the teacher said, or null.
parentName is a parent/guardian name if they said one, or null.
skillLabel is a short skill/gap if they mentioned one, or null.
skipGrade is true if they said not to grade / no grade / don't grade / forget grading.
scoreMark is numeric, pass, fail, or null.
numericScore is 0-100 if they spoke a number grade, else null.
gradeKind is homework, participation, presentation, behavior, or null.
Rules:
- Do not invent a student name, parent name, score, or skill that was not spoken.
- For add-a-student talk, ignore filler such as "I'd like to", "add another student named", "please".
- "This is a homework sheet for Mateo" → captureIntent homework, studentName Mateo, gradeKind homework.
- "Give Jamal an 88 for class participation today" → captureIntent homework, studentName Jamal, numericScore 88, scoreMark numeric, gradeKind participation.
- "No need to grade this" / "Don't grade" / "Forget trying to grade" → skipGrade true, scoreMark pass.
- "This is the class roster" → captureIntent roster.
- "Profile picture for Priya" → captureIntent portrait, studentName Priya.
- If they only named a student and no job, captureIntent is null.
- If no name is clear, studentName is null.`;

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
  const parentName =
    typeof parsed.parentName === 'string' ? parsed.parentName.replace(/\s+/g, ' ').trim() : '';
  const skillLabel =
    typeof parsed.skillLabel === 'string' ? parsed.skillLabel.replace(/\s+/g, ' ').trim() : '';
  const captureAllowed = new Set(['homework', 'roster', 'portrait', 'parent_card', 'student_card']);
  const captureIntent = captureAllowed.has(parsed.captureIntent) ? parsed.captureIntent : null;
  const intent =
    parsed.intent === 'add_student' ||
    parsed.intent === 'note' ||
    parsed.intent === 'unknown' ||
    parsed.intent === 'capture'
      ? parsed.intent
      : captureIntent
        ? 'capture'
        : studentName
          ? 'add_student'
          : 'unknown';
  return {
    intent,
    captureIntent,
    studentName: studentName || null,
    parentName: parentName || null,
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
  const form = new FormData();
  form.append('format', 'true');
  form.append('language', 'en');
  for (const term of Array.isArray(body.keyterms) ? body.keyterms : []) {
    if (String(term).length > 1) form.append('keyterm', String(term));
  }
  if (body.audioBase64) {
    const bytes = Buffer.from(String(body.audioBase64), 'base64');
    if (bytes.length < 16) throw new Error('Recording was empty.');
    const { filename, mime } = sniffAudioFile(bytes);
    const type = String(body.mimeType ?? mime);
    form.append('file', new Blob([bytes], { type }), filename);
  } else {
    const audioUrl = String(body.audioUrl ?? '');
    if (!audioUrl) throw new Error('audioUrl required');
    await appendAudioFile(form, audioUrl);
  }
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
{"studentName":null,"gaps":[{"label":"short skill name","sortOrder":1}],"draftScore":null,"maxScore":null,"teacherNote":"one short sentence or null","items":[{"n":1,"expected":"answer","seen":"what they wrote","credit":1,"of":1,"gap":null}]}
Rules:
- studentName is required whenever a name is visible. Look at the top of the page first (header, Name:, printed label, handwriting). Copy the name as written. Do not invent a name. Prefer a roster spelling if it clearly matches.
- 1 to 3 gaps for the whole assignment. Labels are short, like "two-digit regrouping" or "thesis clarity".
- If an answer key is provided, score ONLY against that key. draftScore is points earned, maxScore is points possible. Do not invent items. If a blank cannot be read, credit=null and do not fail it.
- If no key is provided, draftScore is a number 0-100 if you can fairly estimate, otherwise null. maxScore null.
- items is required when a key is provided. expected is the key answer. seen is what is on the page. gap is a short skill or null.
- If the images are blank, unreadable, or not student work, return {"studentName":null,"gaps":[],"draftScore":null,"maxScore":null,"teacherNote":null,"items":[]}
- Do not invent extra biography.`;

const classifyPrompt = `You look at one photo a K-12 teacher just took. Classify the job.
Return JSON only, no markdown:
{"intent":"homework","confidence":0.8,"studentGuessName":null,"parentGuessName":null,"draftScore":null,"gaps":[{"label":"skill"}],"fields":[{"label":"field","value":"value"}],"names":[{"name":"First Last","confidence":0.8}],"note":null}
intent MUST be one of: homework, portrait, parent_card, student_card, roster, unsure.
Rules:
- Prefer homework. Worksheets, quizzes, packets, lined paper, math, writing, photos of a desk with student work = homework.
- portrait: a face filling most of the frame, meant as a profile photo. Not a kid in the corner of a worksheet.
- parent_card: a parent / guardian contact card.
- student_card: student emergency card or printed student details.
- roster: a printed class list or seating chart of many names.
- unsure ONLY if the image is black, blur, ceiling, or truly not a school paper or person.
- Do not pick unsure just because the photo is messy, cropped, or the name is hard to read. That is still homework.
- For homework, always try to read the student name at the top of the page into studentGuessName (as written). Never invent a student.
- gaps: 0-3 short skill labels for homework.
- names: roster names only, 0-40.
- confidence: 0.6+ when you pick homework/roster/portrait.
- Do not approve, file, or create a student.`;

async function classifyCapture(body) {
  const imageUrl = String(body.imageUrl ?? '');
  if (!imageUrl) throw new Error('imageUrl required');
  const roster = Array.isArray(body.rosterFirstNames) ? body.rosterFirstNames : [];
  const rosterText = roster
    .map((row) => (typeof row === 'string' ? row : `${row?.id ?? ''} ${row?.name ?? ''}`))
    .filter(Boolean)
    .join(', ');
  const prepared = await prepareImageForGrok(imageUrl);
  const payload = await xaiResponses(visionModel, [
    {
      role: 'user',
      content: [
        { type: 'input_image', image_url: prepared, detail: 'high' },
        {
          type: 'input_text',
          text: `${classifyPrompt}\n\nRoster (id + name). Guess only from this list:\n${rosterText || '(none)'}`,
        },
      ],
    },
  ]);
  const parsed = extractJson(outputText(payload));
  const rawIntent = parsed.intent === 'metadata' ? 'student_card' : parsed.intent;
  const allowed = new Set(['homework', 'portrait', 'parent_card', 'student_card', 'roster', 'unsure']);
  const intent = allowed.has(rawIntent) ? rawIntent : 'unsure';
  const rosterIds = new Set(
    roster
      .map((row) => (typeof row === 'object' && row ? String(row.id ?? '') : ''))
      .filter(Boolean),
  );
  const guessName =
    typeof parsed.studentGuessName === 'string' ? parsed.studentGuessName.replace(/\s+/g, ' ').trim() : '';
  const guessIdRaw = typeof parsed.studentGuessId === 'string' ? parsed.studentGuessId : null;
  const studentGuessId = guessIdRaw && rosterIds.has(guessIdRaw) ? guessIdRaw : null;
  return {
    intent,
    confidence:
      typeof parsed.confidence === 'number'
        ? parsed.confidence
        : intent === 'unsure'
          ? 0
          : 0.7,
    studentGuessId,
    studentGuessName: guessName || null,
    parentGuessName: typeof parsed.parentGuessName === 'string' ? parsed.parentGuessName : null,
    draftScore: typeof parsed.draftScore === 'number' ? parsed.draftScore : null,
    gaps: Array.isArray(parsed.gaps)
      ? parsed.gaps
          .map((gap) => ({ label: String(gap?.label ?? '').trim() }))
          .filter((gap) => gap.label)
          .slice(0, 3)
      : [],
    fields: Array.isArray(parsed.fields)
      ? parsed.fields
          .map((field) => ({
            label: String(field?.label ?? '').trim(),
            value: String(field?.value ?? '').trim(),
          }))
          .filter((field) => field.label)
      : [],
    names: Array.isArray(parsed.names)
      ? parsed.names
          .map((row) => ({
            name: String(row?.name ?? '').replace(/\s+/g, ' ').trim(),
            confidence: typeof row?.confidence === 'number' ? row.confidence : 0,
          }))
          .filter((row) => row.name)
          .slice(0, 40)
      : [],
    note: typeof parsed.note === 'string' ? parsed.note : null,
  };
}

async function askAssistant(supabase, body) {
  const role = body.role === 'student' || body.role === 'parent' ? body.role : 'teacher';
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const last = messages
    .map((item) => `${item?.from === 'assistant' ? 'Ask' : 'User'}: ${String(item?.text ?? '')}`)
    .join('\n');
  let context = '';
  if (role === 'teacher' && body.classId) {
    const [{ count: unassigned }, { count: drafts }, { data: enrollments }] = await Promise.all([
      supabase.from('captures').select('*', { count: 'exact', head: true }).eq('class_id', body.classId).eq('status', 'unassigned'),
      supabase.from('captures').select('*', { count: 'exact', head: true }).eq('class_id', body.classId).eq('status', 'draft'),
      supabase.from('enrollments').select('student_id').eq('class_id', body.classId),
    ]);
    const ids = (enrollments ?? []).map((row) => row.student_id);
    const { data: students } = ids.length
      ? await supabase.from('students').select('display_name').in('id', ids)
      : { data: [] };
    const firsts = (students ?? []).map((row) => String(row.display_name).split(/\s+/)[0]).filter(Boolean);
    context = `Teacher of this class. Roster first names: ${firsts.join(', ') || '(none)'}. Needs a name: ${unassigned ?? 0}. Ready to review: ${drafts ?? 0}. You never Approve. You never insert a student. If a name needs filing, tell them to open Inbox.`;
  } else if (role === 'student') {
    context =
      'You help one student with their assigned practice and approved focus skill only. Never mention other students, drafts, scores, or Grok.';
  } else if (role === 'parent') {
    context =
      'You help a parent. You may talk about their child’s approved focus, assigned/done practice, and the published parent sentence only. Never mention scores, photos, drafts, other children, or Grok.';
  }
  const payload = await xaiResponses(
    practiceModel,
    `You are Ask, a filing assistant for Kelyra. On-screen name is Ask, never the model vendor.\n${context}\nIf unsure: I can’t tell from what’s saved. Open Inbox or the student’s page.\n\n${last}`,
  );
  const text = outputText(payload).trim();
  return { text: text || "I can’t tell from what’s saved. Open Inbox or the student’s page." };
}

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
  const keyUrls = Array.isArray(body.keyImageUrls)
    ? body.keyImageUrls.map((url) => String(url)).filter(Boolean).slice(0, 3)
    : [];
  for (const url of keyUrls) {
    images.push({
      type: 'input_image',
      image_url: await prepareImageForGrok(url),
      detail: 'high',
    });
  }
  const rosterHint = Array.isArray(body.rosterNames)
    ? body.rosterNames.map((name) => String(name ?? '').trim()).filter(Boolean).join(', ')
    : '';
  const keyItems = Array.isArray(body.keyItems) ? body.keyItems : [];
  const keyNotes = String(body.keyNotes ?? '').trim();
  const scoreScheme = String(body.scoreScheme ?? 'numeric');
  const maxScore = Number(body.maxScore);
  const keyBlock = formatKeyForPrompt(keyItems, keyNotes, scoreScheme, Number.isFinite(maxScore) ? maxScore : null);
  const payload = await xaiResponses(visionModel, [
    {
      role: 'user',
      content: [
        ...images,
        {
          type: 'input_text',
          text: `${evaluatePrompt}${
            rosterHint
              ? `\n\nIf a name on the page matches this roster, return that roster spelling: ${rosterHint}`
              : ''
          }${keyBlock}${
            keyUrls.length ? '\n\nThe last image(s) after the student work are the answer key photo(s).' : ''
          }`,
        },
      ],
    },
  ]);
  const parsed = extractJson(outputText(payload));
  const draft = parseHomeworkDraft(parsed);
  const studentName =
    typeof parsed.studentName === 'string' ? parsed.studentName.replace(/\s+/g, ' ').trim() : '';
  return {
    ...draft,
    studentName: studentName || null,
    maxScore: typeof parsed.maxScore === 'number' ? parsed.maxScore : Number.isFinite(maxScore) ? maxScore : null,
    items: parseScoredItems(parsed.items, keyItems),
  };
}

function formatKeyForPrompt(items, notes, scoreScheme, maxScore) {
  if (!items.length && !notes) return '';
  const lines = items.map((item, index) => {
    const n = item?.n ?? index + 1;
    const stem = String(item?.stem ?? '').trim();
    const answer = String(item?.answer ?? item?.expected ?? '').trim();
    const points = Number(item?.points ?? 1);
    const extra = String(item?.note ?? '').trim();
    return `${n}. ${stem ? `${stem} → ` : ''}${answer || '(needs teacher)'}${Number.isFinite(points) ? ` (${points} pt)` : ''}${extra ? ` — ${extra}` : ''}`;
  });
  return `\n\nANSWER KEY (score only against this):\nScheme: ${scoreScheme}${
    maxScore != null ? `\nMax: ${maxScore}` : ''
  }${notes ? `\nTeacher note: ${notes}` : ''}\n${lines.join('\n') || '(photo key only)'}`;
}

function parseScoredItems(raw, keyItems) {
  const rows = Array.isArray(raw) ? raw : [];
  if (!rows.length && keyItems.length) {
    return keyItems.map((item, index) => ({
      n: item?.n ?? index + 1,
      expected: String(item?.answer ?? ''),
      seen: null,
      credit: null,
      of: Number(item?.points ?? 1),
      gap: null,
    }));
  }
  return rows
    .map((row, index) => ({
      n: Number(row?.n ?? index + 1),
      expected: row?.expected != null ? String(row.expected) : null,
      seen: row?.seen != null ? String(row.seen) : null,
      credit: typeof row?.credit === 'number' ? row.credit : null,
      of: typeof row?.of === 'number' ? row.of : 1,
      gap: typeof row?.gap === 'string' && row.gap.trim() ? row.gap.trim() : null,
    }))
    .slice(0, 40);
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

const cropPortraitPrompt = `You frame one person's head for a circular profile photo AND say how the photo is tilted.
Return JSON only, no markdown:
{"left":0.2,"top":0.1,"width":0.5,"height":0.5,"crown":{"x":0.5,"y":0.18},"chin":{"x":0.5,"y":0.55}}
Rules:
- left/top/width/height are fractions of the full image, 0 to 1.
- The box must contain the entire face AND all visible hair (top, sides, bun, hood). Do not cut forehead, chin, ears, or hair.
- Include a little neck. Do not include the whole body, desk, or extra background.
- If the shot is full-body, zoom to the head. If the face is off-center, move the box to the face.
- Prefer a square.
- crown is the top of the hair / highest point of the head. chin is the bottom of the chin. Both are 0–1 fractions (x right, y down). These two points MUST follow the actual tilt — if the photo is rotated 45°, crown is NOT directly above chin.
- If no face is visible, return {"left":0.15,"top":0.15,"width":0.5,"height":0.5,"crown":{"x":0.5,"y":0.2},"chin":{"x":0.5,"y":0.6}}`;

async function cropPortrait(body) {
  const imageUrl = String(body.imageUrl ?? '');
  if (!imageUrl) throw new Error('imageUrl required');
  const prepared = await prepareImageForGrok(imageUrl);
  return readFaceBox(await detectFaceBox(prepared));
}

const PORTRAIT_SIZE = 640;
const FACE_FILL = 0.68;

async function cutoutPortrait(body) {
  const imageUrl = String(body.imageUrl ?? '');
  if (!imageUrl) throw new Error('imageUrl required');

  const loaded = await loadImageForGrok(imageUrl);
  const boxPromise = detectFaceBox(loaded.dataUrl)
    .then(readFaceBox)
    .catch((err) => {
      console.warn(`[ai-dev] cutout-portrait face box failed: ${err instanceof Error ? err.message : err}`);
      return null;
    });
  const cutPromise = removeBackgroundPng(loaded.bytes, loaded.mime);

  const [box, cutPng] = await Promise.all([boxPromise, cutPromise]);
  let rotate = angleFromCrownChin(box?.crown, box?.chin);
  if (!Number.isFinite(rotate)) rotate = Number(box?.rotate);
  if (!Number.isFinite(rotate)) rotate = 0;
  if (Math.abs(rotate) < 6) {
    const guessed = estimateTiltFromCutout(cutPng);
    if (Math.abs(guessed) >= 6) rotate = guessed;
  }
  rotate = wrapDegrees(rotate);
  let upright = cutPng;
  let frameBox = box;
  if (Math.abs(rotate) >= 6) {
    upright = await rotateTransparentPng(cutPng, rotate);
    // Landmarks were in the tilted photo. After rotate, use the standing silhouette.
    frameBox = null;
    console.log(`[ai-dev] cutout-portrait rotate ${rotate.toFixed(1)}°`);
  }
  const framed = composeCenteredPortrait(upright, frameBox);
  console.log(
    `[ai-dev] cutout-portrait ${framed.length} bytes, face=${frameBox ? 'grok' : 'silhouette'}, rotate=${rotate.toFixed(1)}`,
  );
  return {
    imageBase64: framed.toString('base64'),
    mimeType: 'image/png',
  };
}

async function detectFaceBox(prepared) {
  return xaiResponses(visionModel, [
    {
      role: 'user',
      content: [
        { type: 'input_image', image_url: prepared, detail: 'high' },
        { type: 'input_text', text: cropPortraitPrompt },
      ],
    },
  ]);
}

function readFaceBox(payload) {
  const parsed = extractJson(outputText(payload));
  const num = (value, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };
  let rotate = Number(parsed.rotate);
  if (!Number.isFinite(rotate)) rotate = 0;
  rotate = wrapDegrees(rotate);
  const crown = readPoint(parsed.crown ?? parsed.head ?? parsed.forehead);
  const chin = readPoint(parsed.chin ?? parsed.jaw);
  console.log(
    `[ai-dev] portrait pose rotate=${rotate} crown=${crown ? `${crown.x.toFixed(2)},${crown.y.toFixed(2)}` : '—'} chin=${chin ? `${chin.x.toFixed(2)},${chin.y.toFixed(2)}` : '—'}`,
  );
  return {
    left: num(parsed.left, 0.15),
    top: num(parsed.top, 0.15),
    width: num(parsed.width, 0.7),
    height: num(parsed.height, 0.7),
    rotate,
    crown,
    chin,
  };
}

function readPoint(value) {
  if (!value || typeof value !== 'object') return null;
  const x = Number(value.x);
  const y = Number(value.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (x < -0.05 || x > 1.05 || y < -0.05 || y > 1.05) return null;
  return { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) };
}

/** Clockwise degrees to rotate the image so chin→crown points straight up. */
function angleFromCrownChin(crown, chin) {
  if (!crown || !chin) return null;
  const dx = crown.x - chin.x;
  const dy = crown.y - chin.y;
  if (dx * dx + dy * dy < 0.0004) return null;
  return wrapDegrees((Math.atan2(dx, -dy) * 180) / Math.PI);
}

function wrapDegrees(value) {
  let out = value;
  while (out > 180) out -= 360;
  while (out < -180) out += 360;
  return out;
}

async function rotateTransparentPng(pngBuffer, degrees) {
  const sharp = require('sharp');
  return sharp(pngBuffer)
    .rotate(degrees, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

/** Clockwise degrees to stand a cutout up, from the long axis of the person. 0 if unsure. */
function estimateTiltFromCutout(pngBuffer) {
  try {
    const { PNG } = require('pngjs');
    const src = PNG.sync.read(pngBuffer);
    const { width, height, data } = src;
    let count = 0;
    let meanX = 0;
    let meanY = 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (data[(y * width + x) * 4 + 3] > 24) {
          meanX += x;
          meanY += y;
          count += 1;
        }
      }
    }
    if (count < 80) return 0;
    meanX /= count;
    meanY /= count;
    let xx = 0;
    let yy = 0;
    let xy = 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (data[(y * width + x) * 4 + 3] <= 24) continue;
        const dx = x - meanX;
        const dy = y - meanY;
        xx += dx * dx;
        yy += dy * dy;
        xy += dx * dy;
      }
    }
    xx /= count;
    yy /= count;
    xy /= count;
    const spread = Math.sqrt((xx - yy) * (xx - yy) + 4 * xy * xy);
    if (spread < 1 || Math.abs(xy) < 1e-6 && Math.abs(xx - yy) < 1e-6) return 0;
    // Major-axis angle from +x, then convert so we rotate toward vertical.
    const axis = Math.atan2(2 * xy, xx - yy) / 2;
    let degrees = (axis * 180) / Math.PI;
    // Align the long axis with vertical (image y).
    if (Math.abs(degrees) > 45) degrees = degrees > 0 ? degrees - 90 : degrees + 90;
    if (Math.abs(degrees) < 8 || Math.abs(degrees) > 80) return 0;
    // Prefer the narrower end (head) toward the top after rotate.
    const trial = rotatePointsHint(data, width, height, degrees);
    let out = trial.topNarrower ? degrees : degrees + (degrees > 0 ? -180 : 180);
    if (out > 180) out -= 360;
    if (out < -180) out += 360;
    return Math.abs(out) >= 8 ? out : 0;
  } catch {
    return 0;
  }
}

function rotatePointsHint(data, width, height, degrees) {
  const rad = (-degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const cx = width / 2;
  const cy = height / 2;
  let minY = Infinity;
  let maxY = -Infinity;
  const pts = [];
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      if (data[(y * width + x) * 4 + 3] <= 24) continue;
      const dx = x - cx;
      const dy = y - cy;
      const ry = -dx * sin + dy * cos;
      pts.push(ry);
      if (ry < minY) minY = ry;
      if (ry > maxY) maxY = ry;
    }
  }
  if (!pts.length || maxY - minY < 8) return { topNarrower: true };
  const mid = (minY + maxY) / 2;
  let top = 0;
  let bot = 0;
  for (const ry of pts) {
    if (ry < mid) top += 1;
    else bot += 1;
  }
  return { topNarrower: top <= bot };
}

async function removeBackgroundPng(bytes, mime) {
  let removeBackground;
  try {
    ({ removeBackground } = await import('@imgly/background-removal-node'));
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'import failed';
    throw new Error(`Background removal is not installed. Run npm install (${detail})`);
  }

  const type = mime === 'image/png' || mime === 'image/webp' || mime === 'image/jpeg' ? mime : 'image/jpeg';
  console.log(`[ai-dev] removing portrait background (${type}, ${bytes.length} bytes)…`);
  // imgly only decodes Blob types it knows. A raw Uint8Array becomes
  // `Blob { type: '' }` and throws "Unsupported format:".
  const blob = await removeBackground(new Blob([bytes], { type }), {
    output: { format: 'image/png' },
  });
  return Buffer.from(await blob.arrayBuffer());
}

function composeCenteredPortrait(pngBuffer, box) {
  const { PNG } = require('pngjs');
  const src = PNG.sync.read(pngBuffer);
  const imgW = src.width;
  const imgH = src.height;
  const data = src.data;
  const safe =
    box && box.width > 0.04 && box.height > 0.04 ? box : faceFromAlpha(data, imgW, imgH);

  const fw = Math.max(8, clamp01(safe.width) * imgW);
  const fh = Math.max(8, clamp01(safe.height) * imgH);
  const cx = clamp01(safe.left) * imgW + fw / 2;
  const cy = clamp01(safe.top) * imgH + fh / 2;
  const scale = (PORTRAIT_SIZE * FACE_FILL) / Math.max(fw, fh);

  const out = new PNG({ width: PORTRAIT_SIZE, height: PORTRAIT_SIZE });
  const dest = out.data;
  for (let y = 0; y < PORTRAIT_SIZE; y += 1) {
    const srcY = Math.round((y - PORTRAIT_SIZE / 2) / scale + cy);
    if (srcY < 0 || srcY >= imgH) continue;
    for (let x = 0; x < PORTRAIT_SIZE; x += 1) {
      const srcX = Math.round((x - PORTRAIT_SIZE / 2) / scale + cx);
      if (srcX < 0 || srcX >= imgW) continue;
      const si = (srcY * imgW + srcX) * 4;
      const di = (y * PORTRAIT_SIZE + x) * 4;
      dest[di] = data[si];
      dest[di + 1] = data[si + 1];
      dest[di + 2] = data[si + 2];
      dest[di + 3] = data[si + 3];
    }
  }
  return PNG.sync.write(out);
}

function faceFromAlpha(data, width, height) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] > 24) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX <= minX || maxY <= minY) {
    return { left: 0.15, top: 0.15, width: 0.7, height: 0.7 };
  }
  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const heightPx = bh > bw * 1.35 ? Math.max(bw, Math.round(bh * 0.38)) : bh;
  return {
    left: minX / width,
    top: minY / height,
    width: bw / width,
    height: heightPx / height,
  };
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

const analyzeKeyPrompt = `You read one K-12 worksheet photo that a teacher is attaching as an ANSWER KEY.
Return JSON only, no markdown:
{"pageState":"blank","header":"printed title","items":[{"n":1,"stem":"12 + 9 =","answer":"21","points":1,"needsTeacher":false,"note":null}],"maxScore":21,"teacherNote":null}
Rules:
- pageState is blank (no student/teacher fills in the blanks), filled (answers already written), or unsure.
- header is the printed title / first direction line, or null.
- Only items that are actually on the page. Do not invent questions.
- If pageState is blank: SOLVE each keyed item when it is objectively answerable (math fact, multiple choice, word-bank, short factual blank). If it is opinion, explain, or open writing, set needsTeacher=true and answer="".
- If pageState is filled: EXTRACT the written/circled answers. Do not replace them with what you think is correct.
- points: use printed point values if present, else 1.
- maxScore is the sum of points.
- teacherNote is one short sentence or null.
- Never invent a student. This is not grading a child.`;

async function analyzeAnswerKey(body) {
  const imageUrl = String(body.imageUrl ?? '');
  if (!imageUrl) throw new Error('imageUrl required');
  const loaded = await loadImageForGrok(imageUrl);
  const signature = await pageSignature(loaded.bytes);
  const payload = await xaiResponses(visionModel, [
    {
      role: 'user',
      content: [
        { type: 'input_image', image_url: loaded.dataUrl, detail: 'high' },
        { type: 'input_text', text: analyzeKeyPrompt },
      ],
    },
  ]);
  const parsed = extractJson(outputText(payload));
  const pageState = ['blank', 'filled', 'unsure'].includes(parsed.pageState) ? parsed.pageState : 'unsure';
  const items = parseKeyItemsFromModel(parsed.items);
  const maxScore =
    typeof parsed.maxScore === 'number'
      ? parsed.maxScore
      : items.reduce((sum, item) => sum + (item.points ?? 1), 0) || null;
  return {
    pageState,
    header: typeof parsed.header === 'string' ? parsed.header.replace(/\s+/g, ' ').trim() : signature.header,
    items,
    maxScore,
    teacherNote: typeof parsed.teacherNote === 'string' ? parsed.teacherNote : null,
    phash: signature.phash,
    layout: signature.layout,
  };
}

const matchKeyPrompt = `You compare one student's worksheet photo to answer-key photos of printed worksheets.
Return JSON only, no markdown:
{"assignmentId":null,"confidence":0.0}
Rules:
- assignmentId must be one of the ids listed, or null if none is the same printed form.
- Same printed title, numbering, and blanks = a match even if the student wrote in the blanks.
- Different worksheets (HW 16 vs 17) are not a match.
- Do not invent an id. Prefer null when unsure.`;

async function matchKey(body) {
  const imageUrl = String(body.imageUrl ?? '');
  if (!imageUrl) throw new Error('imageUrl required');
  const keys = Array.isArray(body.keys) ? body.keys : [];
  if (!keys.length) return { assignmentId: null, confidence: 0, scores: [] };

  const loaded = await loadImageForGrok(imageUrl);
  const probe = await pageSignature(loaded.bytes);
  const scored = keys
    .map((row) => {
      const id = String(row?.id ?? '');
      const title = String(row?.title ?? '');
      const phash = typeof row?.phash === 'string' ? row.phash : '';
      const layout = Array.isArray(row?.layout) ? row.layout.map((n) => Number(n)) : [];
      const header = String(row?.header ?? '');
      const hashScore = phash && probe.phash ? 1 - hammingHex(phash, probe.phash) / 64 : 0;
      const layoutScore = layout.length && probe.layout.length ? 1 - meanAbsDiff(layout, probe.layout) : 0;
      const headerScore = tokenOverlap(header, probe.header);
      const score = hashScore * 0.45 + layoutScore * 0.35 + headerScore * 0.2;
      return { id, title, score, hashScore, layoutScore, headerScore, imageUrl: row?.imageUrl ?? null };
    })
    .filter((row) => row.id)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) return { assignmentId: null, confidence: 0, scores: [] };

  const best = scored[0];
  const second = scored[1];
  const lead = second ? best.score - second.score : best.score;
  if (best.score >= 0.62 && lead >= 0.08) {
    return { assignmentId: best.id, confidence: best.score, scores: scored.slice(0, 4) };
  }

  const shortlist = scored.filter((row) => row.score >= 0.42).slice(0, 3);
  if (!shortlist.length) {
    return { assignmentId: null, confidence: best.score, scores: scored.slice(0, 4) };
  }

  const withPhotos = [];
  for (const row of shortlist) {
    if (!row.imageUrl) continue;
    try {
      withPhotos.push({
        ...row,
        prepared: await prepareImageForGrok(String(row.imageUrl)),
      });
    } catch {
      // Hash score still counts; skip vision for this key.
    }
  }
  if (!withPhotos.length) {
    return {
      assignmentId: best.score >= 0.55 ? best.id : null,
      confidence: best.score,
      scores: scored.slice(0, 4),
    };
  }

  const listed = withPhotos.map((row) => `${row.id} — ${row.title}`).join('\n');
  const content = [
    { type: 'input_image', image_url: loaded.dataUrl, detail: 'high' },
    ...withPhotos.map((row) => ({ type: 'input_image', image_url: row.prepared, detail: 'low' })),
    {
      type: 'input_text',
      text: `${matchKeyPrompt}\n\nCandidate keys (in the same order as the images after the student page):\n${listed}`,
    },
  ];
  const payload = await xaiResponses(visionModel, [{ role: 'user', content }]);
  const parsed = extractJson(outputText(payload));
  const allowed = new Set(withPhotos.map((row) => row.id));
  const picked = typeof parsed.assignmentId === 'string' && allowed.has(parsed.assignmentId) ? parsed.assignmentId : null;
  const confidence =
    typeof parsed.confidence === 'number' ? parsed.confidence : picked ? Math.max(best.score, 0.7) : 0;
  return { assignmentId: picked, confidence, scores: scored.slice(0, 4) };
}

async function pageSignature(bytes) {
  try {
    const sharp = require('sharp');
    const { data, info } = await sharp(bytes)
      .rotate()
      .greyscale()
      .resize(32, 32, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const cells = [];
    for (let gy = 0; gy < 8; gy += 1) {
      for (let gx = 0; gx < 8; gx += 1) {
        let sum = 0;
        let count = 0;
        for (let y = gy * 4; y < gy * 4 + 4; y += 1) {
          for (let x = gx * 4; x < gx * 4 + 4; x += 1) {
            sum += data[y * info.width + x];
            count += 1;
          }
        }
        cells.push(count ? sum / count / 255 : 0);
      }
    }
    const mean = cells.reduce((a, b) => a + b, 0) / cells.length;
    let bits = 0n;
    for (let i = 0; i < 64; i += 1) {
      if (cells[i] >= mean) bits |= 1n << BigInt(63 - i);
    }
    return { phash: bits.toString(16).padStart(16, '0'), layout: cells, header: '' };
  } catch (err) {
    console.warn(`[ai-dev] page signature skipped: ${err instanceof Error ? err.message : err}`);
    return { phash: '', layout: [], header: '' };
  }
}

function hammingHex(a, b) {
  const left = BigInt(`0x${a || '0'}`);
  const right = BigInt(`0x${b || '0'}`);
  let xor = left ^ right;
  let count = 0;
  while (xor) {
    xor &= xor - 1n;
    count += 1;
  }
  return count;
}

function meanAbsDiff(a, b) {
  const n = Math.min(a.length, b.length);
  if (!n) return 1;
  let sum = 0;
  for (let i = 0; i < n; i += 1) {
    const left = Number.isFinite(a[i]) ? a[i] : 0;
    const right = Number.isFinite(b[i]) ? b[i] : 0;
    sum += Math.abs(left - right);
  }
  return sum / n;
}

function tokenOverlap(a, b) {
  const left = new Set(String(a).toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2));
  const right = new Set(String(b).toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2));
  if (!left.size || !right.size) return 0;
  let hit = 0;
  for (const token of left) if (right.has(token)) hit += 1;
  return hit / Math.max(left.size, right.size);
}

function parseKeyItemsFromModel(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row, index) => ({
      n: Number(row?.n ?? index + 1),
      stem: String(row?.stem ?? '').trim(),
      answer: String(row?.answer ?? '').trim(),
      points: Number.isFinite(Number(row?.points)) ? Number(row.points) : 1,
      needsTeacher: row?.needsTeacher === true || !String(row?.answer ?? '').trim(),
      note: typeof row?.note === 'string' && row.note.trim() ? row.note.trim() : undefined,
    }))
    .filter((row) => row.stem || row.answer || row.needsTeacher)
    .slice(0, 40);
}

async function prepareImageForGrok(imageUrl) {
  const loaded = await loadImageForGrok(imageUrl);
  return loaded.dataUrl;
}

async function loadImageForGrok(imageUrl) {
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

  return {
    bytes: body,
    mime,
    dataUrl: `data:${mime};base64,${body.toString('base64')}`,
  };
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
