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
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';
import {
  CHEAP_MODEL,
  DEFAULT_MONTHLY_CAP_USD,
  FLAGSHIP_MODEL,
  MODEL_JPEG_QUALITY,
  MODEL_MAX_EDGE,
  PRACTICE_MODEL,
  asPass,
  estimateUsd,
  firstNameOnly,
  homeworkDraftExists,
  imageDetailFor,
  modelFor,
  parseUsage,
  reasoningEffortFor,
} from './lib/ai-policy.mjs';
import { isAllowedAskImageUrl } from './lib/ask-image-url.mjs';
import {
  askActorSystemLine,
  filterAskToolDefs,
  mergeAskGrants,
} from '../supabase/functions/_shared/askToolPolicy.ts';
import {
  gauthRefusalCard,
  isFamilyAskSeat,
  shouldRefuseAskBeforeVendor,
  stripAskImagesForFamilySeat,
} from '../supabase/functions/_shared/askHomeworkRefuse.ts';

const require = createRequire(import.meta.url);

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
loadEnv(join(root, '.env'));

const port = Number(process.env.AI_DEV_PORT ?? 8787);
const xaiBaseUrl = 'https://api.x.ai/v1';
const visionModel = CHEAP_MODEL;
const practiceModel = PRACTICE_MODEL;
const flagshipModel = FLAGSHIP_MODEL;
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
    if (route === 'review-submission') {
      json(res, await reviewSubmission(supabase, body));
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
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData.user?.id) {
        json(res, { error: 'Sign in to Kelyra first.' }, 401);
        return;
      }
      const { data: profileRow, error: profileError } = await supabase
        .from('profiles')
        .select('id, role, also_administrator, also_teacher, parent_id, display_name, username')
        .eq('id', userData.user.id)
        .maybeSingle();
      if (profileError || !profileRow?.role) {
        json(res, { error: 'Sign in to Kelyra first.' }, 401);
        return;
      }
      json(res, await askAssistant(supabase, body, userData.user.id, profileRow));
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
    if (route === 'cutout-logo') {
      json(res, await cutoutLogo(body));
      return;
    }
    if (route === 'analyze-answer-key') {
      json(res, await analyzeAnswerKey(body));
      return;
    }
    if (route === 'parse-class-syllabus') {
      json(res, await parseClassSyllabus(supabase, body));
      return;
    }
    if (route === 'practice-help') {
      json(res, await practiceHelp(supabase, body));
      return;
    }
    if (route === 'explain-capture') {
      json(res, await explainCapture(supabase, body));
      return;
    }
    if (route === 'match-key') {
      json(res, await matchKey(body));
      return;
    }
    if (route === 'process-ai-jobs') {
      json(res, await processAiJobs(supabase, authorization));
      return;
    }
    if (route === 'ai-spend') {
      json(res, await readAiSpend(supabase));
      return;
    }
    if (route === 'draft-lesson-from-outline') {
      json(res, await draftLessonFromOutline(supabase, body));
      return;
    }
    if (route === 'build-practice-lesson') {
      json(res, await buildPracticeLesson(supabase, authorization, body));
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
  const pass = asPass(body.pass);

  const { data: capture, error: captureError } = await supabase
    .from('captures')
    .select('id, student_id, photo_asset_id, model_draft')
    .eq('id', captureId)
    .single();
  if (captureError || !capture?.student_id || !capture.photo_asset_id) {
    throw new Error('Capture must have a student and a photo');
  }
  if (pass !== 'look-again' && homeworkDraftExists(capture.model_draft)) {
    return { ok: true, skipped: true, gaps: capture.model_draft?.gaps ?? [] };
  }
  if (body.queue && pass !== 'look-again') {
    const { data: schoolId } = await supabase.rpc('my_school_id');
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from('ai_jobs').insert({
      school_id: schoolId,
      teacher_id: userData.user?.id ?? null,
      capture_id: captureId,
      kind: 'homework_draft',
      pass: 'cheap',
      status: 'pending',
    });
    await supabase.from('captures').update({ ai_status: 'pending', model_draft: { pending: true } }).eq('id', captureId);
    return { ok: true, queued: true };
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

  const draft = await draftFromPhoto(signed.signedUrl, pass, supabase, captureId);

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
      ai_status: 'done',
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
  const payload = await grokCall('roster', [
    {
      role: 'user',
      content: [
        { type: 'input_image', image_url: prepared, detail: imageDetailFor('cheap') },
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
  const payload = await grokCall(
    'speech',
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

  const payload = await grokCall('practice', practicePrompt(skillLabel), {}, { functionName: 'generate-practice' });
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

const submissionReviewPrompt = `You are helping a K-12 teacher review one student's submitted work.
Return JSON only, no markdown:
{"summary":"one or two sentences","draftScore":null,"teacherNote":"short Glow/Grow or null","gaps":[{"label":"short skill name","sortOrder":1}],"items":[{"id":"item-1","prompt":"one sentence the student can answer on paper","answerKey":"short key"}]}
Rules:
- summary is what they turned in, not a biography.
- draftScore is 0-100 when you can grade the work, otherwise null.
- 0 to 3 gaps. Labels are short, like "two-digit regrouping". Empty if there is no skill gap worth follow-up.
- If there is at least one gap, items must be 4 to 6 short follow-up practice questions for the first gap.
- If there is no gap, items must be [].
- Keep any teacher-typed gap labels and practice questions listed below. You may add more, not delete theirs.
- Age-appropriate. No student names. No images.
- For lessons, skipped items, extra tries, answers that were wrong first then corrected, and hints can show a skill gap even when the last answer is right. Prefer a gap when those cluster. Do not invent a gap from clean first-try work.`;

async function reviewSubmission(supabase, body) {
  const submissionId = String(body.submissionId ?? '').trim();
  if (!submissionId) throw new Error('submissionId required');

  const { data: submission, error: subError } = await supabase
    .from('submissions')
    .select('id, assignment_id, student_id, status, answers, model_draft')
    .eq('id', submissionId)
    .maybeSingle();
  if (subError || !submission) throw new Error('Submission not found');

  const { data: assignment, error: assignmentError } = await supabase
    .from('assignments')
    .select('id, title, kind, practice_set_id, key_notes, key_items')
    .eq('id', submission.assignment_id)
    .maybeSingle();
  if (assignmentError || !assignment) throw new Error('Assignment not found');

  let items = [];
  if (assignment.practice_set_id) {
    const { data: set } = await supabase
      .from('practice_sets')
      .select('items')
      .eq('id', assignment.practice_set_id)
      .maybeSingle();
    items = Array.isArray(set?.items) ? set.items : [];
  }

  const kind = String(assignment.kind ?? 'practice');
  const answers = submission.answers ?? {};
  const dbPrior = parseSubmissionReview(submission.model_draft ?? {});
  const stemGaps = await loadModelDraftGaps(supabase, submissionId);
  const seededPrior = dbPrior.gaps.length ? dbPrior : { ...dbPrior, gaps: stemGaps };
  const prior =
    body.draft != null
      ? mergeSubmissionDraft(parseSubmissionReview(body.draft), seededPrior)
      : seededPrior;

  if (body.queued && kind === 'lesson' && !lessonHasStruggle(answers)) {
    return { ok: true, skipped: true, reason: 'no_struggle', ...prior };
  }

  const work = formatSubmissionWork({
    title: String(assignment.title ?? 'Work'),
    kind,
    items,
    answers,
    keyNotes: assignment.key_notes ?? null,
    keyItems: assignment.key_items,
  });
  const ac = new AbortController();
  const payload = await withTimeout(
    grokCall(
      'review',
      `${submissionReviewPrompt}\n${teacherDraftPrompt(prior)}\n\n${work}`,
      { max_output_tokens: 1024 },
      { supabase, functionName: 'review-submission', signal: ac.signal },
    ),
    30_000,
    'Grok took too long. Your notes are still here. Try Ask AI again.',
    () => ac.abort(),
  );
  const incoming = parseSubmissionReview(extractJson(outputText(payload)));
  if (
    !incoming.summary &&
    !incoming.gaps.length &&
    !incoming.items.length &&
    incoming.draftScore == null
  ) {
    throw new Error('Grok did not return a review. Your notes are still here. Try Ask AI again.');
  }
  const draft = mergeSubmissionDraft(prior, incoming);
  const update = {
    model_draft: draft,
    draft_score: draft.draftScore,
  };
  const { error: updateError } = await supabase.from('submissions').update(update).eq('id', submissionId);
  if (updateError) {
    const { model_draft: _draft, ...withoutDraft } = update;
    const retry = await supabase.from('submissions').update(withoutDraft).eq('id', submissionId);
    if (retry.error) throw retry.error;
  }
  await replaceSubmissionModelGaps(supabase, {
    submissionId,
    studentId: submission.student_id,
    gaps: draft.gaps,
  });
  return { ok: true, ...draft };
}

async function loadModelDraftGaps(supabase, submissionId) {
  const { data } = await supabase
    .from('skill_gaps')
    .select('label, sort_order')
    .eq('submission_id', submissionId)
    .eq('source', 'model')
    .eq('status', 'draft')
    .order('sort_order', { ascending: true });
  return (data ?? [])
    .map((row, index) => ({
      label: String(row.label ?? '').trim(),
      sortOrder: Number(row.sort_order ?? index + 1) || index + 1,
    }))
    .filter((gap) => gap.label)
    .slice(0, 3);
}

async function replaceSubmissionModelGaps(supabase, input) {
  const live = (input.gaps ?? [])
    .map((gap) => String(gap.label ?? '').trim())
    .filter(Boolean)
    .slice(0, 3);
  // Never delete existing stem drafts down to zero when the model returned no labels.
  if (!live.length) return;
  await supabase
    .from('skill_gaps')
    .delete()
    .eq('submission_id', input.submissionId)
    .eq('source', 'model')
    .eq('status', 'draft');
  const { error } = await supabase.from('skill_gaps').insert(
    live.map((label, index) => ({
      capture_id: null,
      submission_id: input.submissionId,
      student_id: input.studentId,
      label,
      source: 'model',
      status: 'draft',
      sort_order: index + 1,
    })),
  );
  if (error) throw error;
}

function lessonHasStruggle(answers) {
  if (String(answers?.state ?? '') !== 'complete') return false;
  const extras =
    answers.extras && typeof answers.extras === 'object' && !Array.isArray(answers.extras)
      ? answers.extras
      : {};
  const marks = unwrapLessonMarks(answers.marks);
  const laterSet = new Set(
    Array.isArray(extras.later_corrected)
      ? extras.later_corrected.filter((id) => typeof id === 'string' && id.trim())
      : [],
  );
  const hintedSet = new Set(
    Array.isArray(extras.hinted) ? extras.hinted.filter((id) => typeof id === 'string' && id.trim()) : [],
  );
  const ids = Array.isArray(extras.item_ids)
    ? extras.item_ids.filter((id) => typeof id === 'string' && id !== 'slider37' && id !== 'who')
    : Object.keys(marks);
  for (const id of ids) {
    const mark = marks[id] ?? {};
    const hasOk = typeof mark.ok === 'boolean';
    const ok = hasOk ? Boolean(mark.ok) : null;
    const tries =
      typeof mark.tries === 'number' && Number.isFinite(mark.tries) ? Math.max(0, Math.round(mark.tries)) : 0;
    const hints = Math.max(
      typeof mark.hints === 'number' && Number.isFinite(mark.hints) ? Math.max(0, Math.round(mark.hints)) : 0,
      hintedSet.has(id) ? 1 : 0,
    );
    const laterCorrected =
      mark.later_corrected === true || laterSet.has(id) || (ok === true && mark.first_ok === false);
    if (!hasOk || ok === false || laterCorrected || tries >= 3 || hints >= 2) return true;
  }
  return false;
}

function parseSubmissionReview(parsed) {
  parsed = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  const gaps = Array.isArray(parsed.gaps)
    ? parsed.gaps
        .map((gap, index) => ({
          label: String(gap.label ?? '').trim(),
          sortOrder: Number(gap.sortOrder ?? index + 1),
        }))
        .filter((gap) => gap.label)
        .slice(0, 3)
    : [];
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
  const summary = typeof parsed.summary === 'string' ? parsed.summary.replace(/\s+/g, ' ').trim() : '';
  const teacherNote =
    typeof parsed.teacherNote === 'string' ? parsed.teacherNote.replace(/\s+/g, ' ').trim() : '';
  const score =
    typeof parsed.draftScore === 'number'
      ? parsed.draftScore
      : typeof parsed.draftScore === 'string'
        ? Number(parsed.draftScore)
        : null;
  return {
    summary: summary || null,
    gaps,
    draftScore: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : null,
    teacherNote: teacherNote || null,
    items,
  };
}

function teacherDraftPrompt(draft) {
  if (!draft) return '';
  const gaps = Array.isArray(draft.gaps) ? draft.gaps.map((gap) => gap.label).filter(Boolean) : [];
  const items = Array.isArray(draft.items) ? draft.items.map((item) => item.prompt).filter(Boolean) : [];
  if (!gaps.length && !items.length && !draft.teacherNote) return '';
  const lines = [
    '',
    'The teacher already started a draft. Keep their gap labels and practice questions. You may add more, not delete theirs.',
  ];
  if (gaps.length) lines.push(`Teacher gaps: ${gaps.join('; ')}`);
  if (items.length) {
    lines.push('Teacher questions:');
    items.forEach((prompt, index) => lines.push(`  ${index + 1}. ${prompt}`));
  }
  if (draft.teacherNote) lines.push(`Teacher note: ${draft.teacherNote}`);
  return `\n${lines.join('\n')}`;
}

function mergeSubmissionDraft(prior, incoming) {
  const prev = prior ?? parseSubmissionReview({});
  const next = incoming ?? parseSubmissionReview({});
  const gaps = [];
  const gapSeen = new Set();
  for (const gap of [...(prev.gaps ?? []), ...(next.gaps ?? [])]) {
    const key = String(gap.label ?? '').trim().toLowerCase();
    if (!key || gapSeen.has(key)) continue;
    gapSeen.add(key);
    gaps.push({ label: String(gap.label).trim(), sortOrder: gaps.length + 1 });
    if (gaps.length >= 3) break;
  }
  const items = [];
  const itemSeen = new Set();
  for (const item of [...(prev.items ?? []), ...(next.items ?? [])]) {
    const prompt = String(item.prompt ?? '').trim();
    if (!prompt) continue;
    const key = prompt.toLowerCase();
    if (itemSeen.has(key)) continue;
    itemSeen.add(key);
    items.push({
      id: String(item.id ?? `item-${items.length + 1}`),
      prompt,
      ...(item.answerKey ? { answerKey: item.answerKey } : {}),
    });
    if (items.length >= 8) break;
  }
  return {
    summary: next.summary || prev.summary,
    teacherNote: next.teacherNote || prev.teacherNote,
    draftScore: next.draftScore ?? prev.draftScore,
    gaps,
    items,
  };
}

function withTimeout(promise, ms, message, onTimeout) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      try {
        onTimeout?.();
      } catch {
        // Abort is best-effort.
      }
      reject(new Error(message));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        if (err && (err.name === 'AbortError' || /aborted/i.test(String(err.message ?? '')))) {
          reject(new Error(message));
          return;
        }
        reject(err);
      },
    );
  });
}

function formatSubmissionWork(input) {
  const parts = [`Assignment: ${input.title}`, `Kind: ${input.kind}`];
  if (String(input.keyNotes ?? '').trim()) parts.push(`Teacher key note: ${String(input.keyNotes).trim()}`);
  const keyRows = Array.isArray(input.keyItems) ? input.keyItems : [];
  if (keyRows.length) {
    parts.push('Answer key:');
    for (const [index, row] of keyRows.entries()) {
      const item = row ?? {};
      parts.push(`  ${item.n ?? index + 1}. ${String(item.stem ?? '').trim()}${item.answer ? ` → ${item.answer}` : ''}`);
    }
  }
  if (input.items.length) {
    parts.push('');
    for (const [index, item] of input.items.entries()) {
      const id = String(item.id ?? `item-${index + 1}`);
      const answer = input.answers?.[id];
      const student = typeof answer === 'string' ? answer.trim() : answer == null ? '' : String(answer);
      parts.push(`${index + 1}. ${String(item.prompt ?? '').trim() || 'Item'}`);
      if (item.answerKey) parts.push(`   Expected: ${item.answerKey}`);
      parts.push(`   Student: ${student || '(blank)'}`);
    }
  } else if (input.kind === 'lesson') {
    parts.push('');
    parts.push(formatLessonAnswers(input.answers ?? {}));
  }
  return parts.join('\n');
}

function formatLessonAnswers(answers) {
  const extras =
    answers.extras && typeof answers.extras === 'object' && !Array.isArray(answers.extras)
      ? answers.extras
      : {};
  const marks = unwrapLessonMarks(answers.marks);
  const stems =
    extras.item_stems && typeof extras.item_stems === 'object' && !Array.isArray(extras.item_stems)
      ? extras.item_stems
      : {};
  const laterSet = new Set(
    Array.isArray(extras.later_corrected)
      ? extras.later_corrected.filter((id) => typeof id === 'string' && id.trim())
      : [],
  );
  const hintedSet = new Set(
    Array.isArray(extras.hinted) ? extras.hinted.filter((id) => typeof id === 'string' && id.trim()) : [],
  );
  const ids = Array.isArray(extras.item_ids)
    ? extras.item_ids.filter((id) => typeof id === 'string' && id !== 'slider37' && id !== 'who')
    : Object.keys(marks);
  const parts = [];
  if (answers.state) parts.push(`Status: ${String(answers.state)}`);
  const correct = ids.filter((id) => marks[id]?.ok === true).length;
  const incorrect = ids.filter((id) => marks[id]?.ok === false).length;
  const skipped = ids.filter((id) => typeof marks[id]?.ok !== 'boolean').length;
  if (ids.length) parts.push(`Score: ${correct} correct, ${incorrect} incorrect, ${skipped} skipped`);
  else if (typeof answers.correct === 'number' || typeof answers.incorrect === 'number') {
    parts.push(`Score: ${Number(answers.correct) || 0} correct, ${Number(answers.incorrect) || 0} incorrect`);
  }
  if (typeof answers.duration_ms === 'number') {
    const sec = Math.max(0, Math.round(answers.duration_ms / 1000));
    parts.push(`Time: ${sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}m ${sec % 60}s`}`);
  }
  if (typeof answers.hints === 'number' && answers.hints > 0) parts.push(`Hints: ${answers.hints}`);
  if (answers.audio_used === true) parts.push('Heard this');
  if (answers.kinetic_used === true) parts.push('Used a slider or drag');
  const struggleBits = [];
  if (incorrect) struggleBits.push(incorrect === 1 ? '1 still incorrect' : `${incorrect} still incorrect`);
  if (skipped) struggleBits.push(skipped === 1 ? '1 skipped' : `${skipped} skipped`);
  if (laterSet.size) {
    struggleBits.push(
      laterSet.size === 1 ? '1 corrected after a miss' : `${laterSet.size} corrected after a miss`,
    );
  }
  if (struggleBits.length) parts.push(`Struggle: ${struggleBits.join(' · ')}`);
  for (const [index, id] of ids.entries()) {
    const mark = marks[id] ?? {};
    const stem = typeof stems[id] === 'string' && stems[id].trim() ? String(stems[id]).trim() : id;
    const ok = mark.ok;
    const outcome = ok === true ? 'Correct' : ok === false ? 'Incorrect' : 'Skipped';
    const bits = [outcome];
    if (typeof mark.user === 'string' && mark.user.trim()) bits.push(mark.user.trim());
    if (typeof mark.tries === 'number' && mark.tries > 1) bits.push(`${mark.tries} tries`);
    if (mark.later_corrected === true || laterSet.has(id) || (ok === true && mark.first_ok === false)) {
      bits.push('corrected after a miss');
    }
    const hintCount = Math.max(
      typeof mark.hints === 'number' && mark.hints > 0 ? mark.hints : 0,
      hintedSet.has(id) ? 1 : 0,
    );
    if (hintCount === 1) bits.push('1 hint');
    else if (hintCount > 1) bits.push(`${hintCount} hints`);
    const guesses = Array.isArray(mark.guesses)
      ? mark.guesses.filter((g) => typeof g === 'string' && g.trim()).slice(-8)
      : [];
    parts.push(`${index + 1}. ${stem} — ${bits.join(' · ')}`);
    if (guesses.length) parts.push(`   Earlier tries: ${guesses.join(', ')}`);
  }
  return parts.join('\n');
}

function unwrapLessonMarks(marks) {
  if (!marks || typeof marks !== 'object' || Array.isArray(marks)) return {};
  const inner = marks.answers;
  const source = inner && typeof inner === 'object' && !Array.isArray(inner) ? inner : marks;
  const out = {};
  for (const [id, value] of Object.entries(source)) {
    if (id === 'slider37' || id === 'who') continue;
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    out[id] = value;
  }
  return out;
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
    .map((row) =>
      typeof row === 'string'
        ? firstNameOnly(row)
        : `${row?.id ?? ''} ${firstNameOnly(row?.name ?? '')}`.trim(),
    )
    .filter(Boolean)
    .join(', ');
  const prepared = await prepareImageForGrok(imageUrl);
  const payload = await grokCall('classify', [
    {
      role: 'user',
      content: [
        { type: 'input_image', image_url: prepared, detail: imageDetailFor('cheap') },
        {
          type: 'input_text',
          text: `${classifyPrompt}\n\nRoster first names only (id + first name). Guess only from this list:\n${rosterText || '(none)'}`,
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

const ASK_FALLBACK = "I can’t tell from what’s saved. Open Needs or the student’s page.";
const ASK_PHOTO_FAILED = '(A photo was attached but could not be opened.)';

async function hydrateAskImages(input) {
  if (!Array.isArray(input)) return input;
  const next = [];
  for (const item of input) {
    if (!item || !Array.isArray(item.content)) {
      next.push(item);
      continue;
    }
    const content = [];
    for (const part of item.content) {
      if (part?.type === 'input_image' && typeof part.image_url === 'string' && !part.image_url.startsWith('data:')) {
        if (!isAllowedAskImageUrl(part.image_url)) {
          content.push({ type: 'input_text', text: ASK_PHOTO_FAILED });
          continue;
        }
        try {
          content.push({
            ...part,
            image_url: await prepareImageForGrok(part.image_url),
            detail: part.detail === 'high' ? 'high' : imageDetailFor('cheap'),
          });
        } catch (err) {
          console.error(`[ai-dev] ask photo: ${err instanceof Error ? err.message : err}`);
          content.push({ type: 'input_text', text: ASK_PHOTO_FAILED });
        }
      } else {
        content.push(part);
      }
    }
    next.push({ ...item, content });
  }
  return next;
}

async function askAssistant(supabase, body, uid, profileRow) {
  const started = Date.now();
  const { data: grantRows } = await supabase
    .from('capability_grants')
    .select('capability_id, role, access');
  const grants = mergeAskGrants(grantRows);
  // Seat comes from profiles for this uid only — never from the client claim.
  const requested = Array.isArray(body.tools) ? body.tools : [];
  const tools = filterAskToolDefs(requested, profileRow, grants);
  console.log(
    `[ai-dev] ask-assistant getUser=${uid} role=${profileRow.role} tools=${tools.length}/${requested.length} (policy)`,
  );

  const extra = {};
  if (tools.length) extra.tools = tools;
  const actor = askActorSystemLine(profileRow);
  const clientInstructions =
    typeof body.instructions === 'string' && body.instructions.trim() ? body.instructions.trim() : '';
  extra.instructions = clientInstructions ? `${actor}\n\n${clientInstructions}` : actor;

  const raw = Array.isArray(body.input) && body.input.length
    ? body.input
    : Array.isArray(body.messages)
      ? body.messages
          .map((item) => ({
            role: item?.from === 'assistant' ? 'assistant' : 'user',
            content: String(item?.text ?? '').trim(),
          }))
          .filter((item) => item.content)
      : [{ role: 'user', content: 'Hello' }];
  const familySeat = isFamilyAskSeat(profileRow.role);
  const gatedInput = familySeat ? stripAskImagesForFamilySeat(raw) : raw;
  if (shouldRefuseAskBeforeVendor({ role: profileRow.role, rawInput: raw })) {
    const card = gauthRefusalCard();
    console.log(`[ai-dev] ask-assistant getUser=${uid} role=${profileRow.role} refuse-before-vendor`);
    return { text: card.text, refusal: true, title: card.title };
  }
  const input = await hydrateAskImages(gatedInput);
  const payload = await grokCall('ask', input.length ? input : [{ role: 'user', content: 'Hello' }], extra, {
    supabase,
    functionName: 'ask-assistant',
  });
  const calls = functionCallsFrom(payload);
  const responseId = typeof payload.id === 'string' ? payload.id : undefined;
  console.log(
    `[ai-dev] ask-assistant ${Date.now() - started}ms tools=${tools.length} (policy) items=${Array.isArray(input) ? input.length : 0} calls=${calls.length}`,
  );
  if (calls.length) return { toolCalls: calls, responseId };
  const text = outputText(payload).trim();
  return { text: text || ASK_FALLBACK, responseId };
}

function functionCallsFrom(payload) {
  const output = Array.isArray(payload?.output) ? payload.output : [];
  return output
    .filter((item) => item?.type === 'function_call' || item?.type === 'tool_call')
    .map((item) => {
      const fn = item.function ?? item;
      const args = fn.arguments ?? item.arguments;
      return {
        call_id: String(item.call_id ?? item.id ?? ''),
        name: String(fn.name ?? item.name ?? ''),
        arguments: typeof args === 'string' ? args : JSON.stringify(args ?? {}),
      };
    })
    .filter((item) => item.call_id && item.name);
}

async function evaluateHomework(body) {
  const pass = asPass(body.pass);
  const urls = Array.isArray(body.imageUrls)
    ? body.imageUrls.map((url) => String(url)).filter(Boolean)
    : [String(body.imageUrl ?? '')].filter(Boolean);
  if (!urls.length) throw new Error('imageUrl required');
  const detail = imageDetailFor(pass);
  const images = [];
  for (const url of urls.slice(0, 8)) {
    images.push({
      type: 'input_image',
      image_url: await prepareImageForGrok(url),
      detail,
    });
  }
  const keyUrls = Array.isArray(body.keyImageUrls)
    ? body.keyImageUrls.map((url) => String(url)).filter(Boolean).slice(0, 3)
    : [];
  for (const url of keyUrls) {
    images.push({
      type: 'input_image',
      image_url: await prepareImageForGrok(url),
      detail,
    });
  }
  const rosterHint = Array.isArray(body.rosterNames)
    ? body.rosterNames.map((name) => firstNameOnly(String(name ?? ''))).filter(Boolean).join(', ')
    : '';
  const keyItems = Array.isArray(body.keyItems) ? body.keyItems : [];
  const keyNotes = String(body.keyNotes ?? '').trim();
  const scoreScheme = String(body.scoreScheme ?? 'numeric');
  const maxScore = Number(body.maxScore);
  const keyBlock = formatKeyForPrompt(keyItems, keyNotes, scoreScheme, Number.isFinite(maxScore) ? maxScore : null);
  const payload = await grokCall('homework', [
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
  ], {}, { pass, functionName: 'evaluate-homework' });
  const parsed = extractJson(outputText(payload));
  const draft = parseHomeworkDraft(parsed);
  const studentName =
    typeof parsed.studentName === 'string' ? parsed.studentName.replace(/\s+/g, ' ').trim() : '';
  return {
    ...draft,
    studentName: studentName || null,
    maxScore: typeof parsed.maxScore === 'number' ? parsed.maxScore : Number.isFinite(maxScore) ? maxScore : null,
    items: parseScoredItems(parsed.items, keyItems),
    costUsd: payload.__kelyraUsd ?? null,
    model: payload.__kelyraModel ?? null,
    pass,
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

async function draftFromPhoto(imageUrl, pass = 'cheap', supabase = null, captureId = null) {
  const prepared = await prepareImageForGrok(imageUrl);
  const payload = await grokCall(
    'homework',
    [
      {
        role: 'user',
        content: [
          { type: 'input_image', image_url: prepared, detail: imageDetailFor(pass) },
          { type: 'input_text', text: homeworkPrompt },
        ],
      },
    ],
    {},
    { pass, supabase, functionName: 'analyze-homework', captureId },
  );
  return {
    ...parseHomeworkDraft(extractJson(outputText(payload))),
    costUsd: payload.__kelyraUsd ?? null,
    model: payload.__kelyraModel ?? null,
    pass,
  };
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

const LOGO_SIZE = 512;
const LOGO_FILL = 0.9;

const logoLayoutPrompt = `You look at a school logo, seal, crest, or wordmark photo. The school needs a transparent mark for a light header — anything that is backdrop, padding, or a solid plate around the mark must go.
Return JSON only, no markdown:
{"shape":"circle","cx":0.5,"cy":0.5,"radius":0.48,"bg":[10,16,36],"plate":true}
Rules:
- shape is circle if the mark is a circular seal, badge, or round icon (even if it sits on a square photo). roundedRect is a rounded-square app icon. irregular is a wordmark, mascot, or shield that is not a disk.
- cx, cy: center of the mark, 0–1 from the left and top of the image.
- radius: outer radius of a circular mark, 0–1 as a fraction of min(image width, image height). Include the full disk (outer ring), not only inner artwork.
- bg: RGB of the field outside the mark (corners / studio plate). That color must become transparent.
- plate is true when the mark sits on a solid rectangle or square that should be fully removed, including everything outside a circular mark.
- If already a cutout, still return the shape; plate false.`;

async function cutoutLogo(body) {
  const imageUrl = String(body.imageUrl ?? '');
  if (!imageUrl) throw new Error('imageUrl required');
  const loaded = await loadImageForGrok(imageUrl);
  console.log(`[ai-dev] cutout-logo ${loaded.mime}, ${loaded.bytes.length} bytes`);
  const layoutPromise = detectLogoLayout(loaded.dataUrl).catch((err) => {
    console.warn(`[ai-dev] cutout-logo layout failed: ${err instanceof Error ? err.message : err}`);
    return null;
  });
  const pngPromise = decodeToRgbaPng(loaded.bytes);
  const [layout, pngBuffer] = await Promise.all([layoutPromise, pngPromise]);
  const cut = punchLogoBackground(pngBuffer, layout);
  const framed = composeLogoSquare(cut);
  console.log(
    `[ai-dev] cutout-logo framed ${framed.length} bytes shape=${layout?.shape ?? 'none'} plate=${Boolean(layout?.plate)}`,
  );
  return {
    imageBase64: framed.toString('base64'),
    mimeType: 'image/png',
  };
}

async function detectLogoLayout(prepared) {
  const payload = await grokCall('portrait', [
    {
      role: 'user',
      content: [
        { type: 'input_image', image_url: prepared, detail: imageDetailFor('cheap') },
        { type: 'input_text', text: logoLayoutPrompt },
      ],
    },
  ], {}, { functionName: 'cutout-logo' });
  const parsed = extractJson(outputText(payload));
  const num = (value, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };
  const shape =
    parsed.shape === 'circle' || parsed.shape === 'roundedRect' || parsed.shape === 'irregular'
      ? parsed.shape
      : 'irregular';
  const cx = Math.min(1, Math.max(0, num(parsed.cx, 0.5)));
  const cy = Math.min(1, Math.max(0, num(parsed.cy, 0.5)));
  const radius = Math.min(0.5, Math.max(0.08, num(parsed.radius, 0.48)));
  let bg = null;
  if (Array.isArray(parsed.bg) && parsed.bg.length >= 3) {
    bg = parsed.bg.slice(0, 3).map((value) => Math.max(0, Math.min(255, Number(value) || 0)));
  }
  console.log(
    `[ai-dev] logo layout shape=${shape} c=${cx.toFixed(2)},${cy.toFixed(2)} r=${radius.toFixed(2)} plate=${Boolean(parsed.plate)} bg=${bg ? bg.join(',') : '—'}`,
  );
  return { shape, cx, cy, radius, bg, plate: Boolean(parsed.plate) };
}

async function decodeToRgbaPng(bytes) {
  const sharp = require('sharp');
  return sharp(bytes).ensureAlpha().png().toBuffer();
}

function punchLogoBackground(pngBuffer, layout) {
  const { PNG } = require('pngjs');
  const src = PNG.sync.read(pngBuffer);
  const { width, height, data } = src;
  const sampled = sampleCornerColor(data, width, height);
  const bg = layout?.bg && colorDist(layout.bg, sampled) < 80 ? layout.bg : sampled;
  const square = isSquareish(width, height);
  const uniform = cornersSimilar(data, width, height, 36);
  // Connected plate first (keeps dark ink inside the seal).
  floodClearBackground(data, width, height, bg, 58);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] && colorDist([data[i], data[i + 1], data[i + 2]], bg) < 42) data[i + 3] = 0;
  }
  // A circular seal on a square photo: the inscribed circle puts the four
  // dark corners outside the mark. Never use r > 0.5 or those corners stay.
  const wantCircle = layout?.shape === 'circle' || layout?.plate || (square && uniform);
  if (wantCircle) {
    const cx = layout?.shape === 'circle' ? layout.cx : 0.5;
    const cy = layout?.shape === 'circle' ? layout.cy : 0.5;
    const grokR = layout?.shape === 'circle' ? layout.radius : 0.5;
    const radius = Math.min(0.5, grokR);
    applyCircleMask(data, width, height, cx, cy, radius, Math.max(1.2, Math.min(width, height) * 0.008));
  }
  return PNG.sync.write(src);
}

function cornersSimilar(data, width, height, maxDist) {
  const pts = [
    [1, 1],
    [width - 2, 1],
    [1, height - 2],
    [width - 2, height - 2],
  ];
  const baseI = (pts[0][1] * width + pts[0][0]) * 4;
  const base = [data[baseI], data[baseI + 1], data[baseI + 2]];
  return pts.every(([x, y]) => {
    const i = (y * width + x) * 4;
    return colorDist([data[i], data[i + 1], data[i + 2]], base) <= maxDist;
  });
}

function sampleCornerColor(data, width, height) {
  const pts = [
    [1, 1],
    [4, 4],
    [width - 2, 1],
    [width - 5, 4],
    [1, height - 2],
    [4, height - 5],
    [width - 2, height - 2],
    [Math.floor(width / 2), 1],
    [1, Math.floor(height / 2)],
  ];
  const rs = [];
  const gs = [];
  const bs = [];
  for (const [x, y] of pts) {
    const i = (y * width + x) * 4;
    rs.push(data[i]);
    gs.push(data[i + 1]);
    bs.push(data[i + 2]);
  }
  const med = (arr) => [...arr].sort((a, b) => a - b)[Math.floor(arr.length / 2)];
  return [med(rs), med(gs), med(bs)];
}

function colorDist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function floodClearBackground(data, width, height, bg, threshold) {
  const seen = new Uint8Array(width * height);
  const stack = [];
  const visit = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (seen[idx]) return;
    seen[idx] = 1;
    const i = idx * 4;
    if (colorDist([data[i], data[i + 1], data[i + 2]], bg) > threshold) return;
    data[i + 3] = 0;
    stack.push(x, y);
  };
  for (let x = 0; x < width; x += 1) {
    visit(x, 0);
    visit(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    visit(0, y);
    visit(width - 1, y);
  }
  while (stack.length) {
    const y = stack.pop();
    const x = stack.pop();
    visit(x + 1, y);
    visit(x - 1, y);
    visit(x, y + 1);
    visit(x, y - 1);
  }
}

function applyCircleMask(data, width, height, cx, cy, radius, feather) {
  const px = cx * width;
  const py = cy * height;
  const r = radius * Math.min(width, height);
  const f = Math.max(1, feather);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const d = Math.hypot(x + 0.5 - px, y + 0.5 - py);
      let keep = 1;
      if (d >= r + f) keep = 0;
      else if (d > r) keep = 1 - (d - r) / f;
      const i = (y * width + x) * 4 + 3;
      data[i] = Math.round(data[i] * keep);
    }
  }
}

function opaqueBounds(data, width, height) {
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
    return { minX: 0, minY: 0, maxX: width - 1, maxY: height - 1, w: width, h: height };
  }
  return { minX, minY, maxX, maxY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function isSquareish(w, h) {
  const long = Math.max(w, h);
  const short = Math.min(w, h);
  return long > 8 && short / long >= 0.86;
}

function isMostlyDisk(data, width, height, ink) {
  const cx = (ink.minX + ink.maxX + 1) / 2;
  const cy = (ink.minY + ink.maxY + 1) / 2;
  const r = Math.max(ink.w, ink.h) / 2;
  if (r < 8) return false;
  let inside = 0;
  let opaque = 0;
  for (let y = ink.minY; y <= ink.maxY; y += 2) {
    for (let x = ink.minX; x <= ink.maxX; x += 2) {
      if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) > r) continue;
      inside += 1;
      if (data[(y * width + x) * 4 + 3] > 24) opaque += 1;
    }
  }
  return inside > 40 && opaque / inside >= 0.55;
}

function composeLogoSquare(pngBuffer) {
  const { PNG } = require('pngjs');
  const src = PNG.sync.read(pngBuffer);
  const imgW = src.width;
  const imgH = src.height;
  const data = src.data;
  let minX = imgW;
  let minY = imgH;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < imgH; y += 1) {
    for (let x = 0; x < imgW; x += 1) {
      if (data[(y * imgW + x) * 4 + 3] > 24) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX <= minX || maxY <= minY) {
    minX = 0;
    minY = 0;
    maxX = imgW - 1;
    maxY = imgH - 1;
  }
  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const cx = minX + bw / 2;
  const cy = minY + bh / 2;
  const scale = (LOGO_SIZE * LOGO_FILL) / Math.max(bw, bh);
  const out = new PNG({ width: LOGO_SIZE, height: LOGO_SIZE });
  const dest = out.data;
  for (let y = 0; y < LOGO_SIZE; y += 1) {
    const srcY = Math.round((y - LOGO_SIZE / 2) / scale + cy);
    if (srcY < 0 || srcY >= imgH) continue;
    for (let x = 0; x < LOGO_SIZE; x += 1) {
      const srcX = Math.round((x - LOGO_SIZE / 2) / scale + cx);
      if (srcX < 0 || srcX >= imgW) continue;
      const si = (srcY * imgW + srcX) * 4;
      const di = (y * LOGO_SIZE + x) * 4;
      dest[di] = data[si];
      dest[di + 1] = data[si + 1];
      dest[di + 2] = data[si + 2];
      dest[di + 3] = data[si + 3];
    }
  }
  return PNG.sync.write(out);
}

async function detectFaceBox(prepared) {
  return grokCall('portrait', [
    {
      role: 'user',
      content: [
        { type: 'input_image', image_url: prepared, detail: imageDetailFor('cheap') },
        { type: 'input_text', text: cropPortraitPrompt },
      ],
    },
  ], {}, { functionName: 'crop-portrait' });
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

const syllabusParsePrompt = `You extract a CLASS GRADING POLICY (syllabus weights) from a photo for a teacher.
Return JSON only, no markdown, schema_version 1:
{
  "schema_version": 1,
  "document_kind": "syllabus_policy|rubric|mixed|unknown",
  "document_kind_confidence": 0.0,
  "warnings": [{"code":"string","message":"string","severity":"info|warn|block"}],
  "title": {"value":"string|null","confidence":0.0,"selected":true},
  "term_structure": {"value":"quarters|semesters|year|custom|null","confidence":0.0,"selected":true},
  "categories": [{
    "label": {"value":"Tests","confidence":0.0,"selected":true},
    "key": {"value":"test","confidence":0.0,"selected":true},
    "weight_percent": {"value":40,"confidence":0.0,"selected":true},
    "default_include_in_average": {"value":false,"confidence":1.0,"selected":true}
  }],
  "policies": {
    "missing_as_zero": {"value":false,"confidence":1.0,"selected":true},
    "rounding": {"value":"nearest_whole","confidence":1.0,"selected":true},
    "publish_to_family": {"value":true,"confidence":1.0,"selected":true},
    "extra_credit_allowed": {"value":false,"confidence":0.0,"selected":false}
  },
  "rubric_draft": {"present":false,"criteria":[]},
  "ocr_notes": null,
  "overall_confidence": 0.0
}
Hard rules:
- Classify document_kind first. Rubric criteria must NEVER become category weights.
- Extract % weights only from grading-policy / final-grade tables.
- Prefer keys: homework, quiz, test, midterm, final, project, presentation, participation, behavior, other.
- Always default_include_in_average=false. Never set true because key is quiz/test.
- missing_as_zero default false. Do not invent 40/60 defaults. If unreadable, empty categories + warning.
- No roster, SIS ids, IEP text, or student score tables in categories.
- If the page is a grade list / student-filled rubric, document_kind=unknown or rubric with empty categories.`;


async function practiceHelp(supabase, body) {
  const assignmentId = String(body.assignmentId ?? '').trim();
  const studentId = String(body.studentId ?? '').trim();
  const itemId = String(body.itemId ?? '').trim();
  const actionRaw = String(body.action ?? 'hint').trim();
  const attemptText = typeof body.attemptText === 'string' ? body.attemptText : '';
  if (!assignmentId || !studentId || !itemId) throw new Error('assignmentId, studentId, and itemId are required.');
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user?.id) throw new Error('Sign in first.');
  const { data: profile } = await supabase.from('profiles').select('id, role').eq('id', userData.user.id).maybeSingle();
  if (!profile || profile.role !== 'student') throw new Error('Practice Help is only for the signed-in student.');
  const { data: me } = await supabase.rpc('student_me');
  const meRow = Array.isArray(me) ? me[0] : me;
  const myStudentId = typeof meRow?.student_id === 'string' ? meRow.student_id : '';
  if (!myStudentId || myStudentId !== studentId) throw new Error('Practice Help is only for your own roster row.');
  const { data: assignment } = await supabase.from('assignments').select('id, class_id, kind, help_mode, practice_set_id').eq('id', assignmentId).maybeSingle();
  if (!assignment) throw new Error('Assignment not found.');
  if (assignment.kind !== 'practice') throw new Error('Practice Help is only for practice sets — not graded captures.');
  const helpMode = String(assignment.help_mode ?? 'off');
  if (helpMode === 'off') {
    const err = new Error('Help is off for this assignment.');
    err.refused = true;
    throw err;
  }
  const { data: enrolled } = await supabase.from('enrollments').select('student_id').eq('class_id', assignment.class_id).eq('student_id', studentId).maybeSingle();
  if (!enrolled) throw new Error('Not enrolled in this class.');
  const { data: submission } = await supabase.from('submissions').select('id, answers').eq('assignment_id', assignmentId).eq('student_id', studentId).maybeSingle();
  if (!submission) throw new Error('No practice submission cell for this student.');
  const answers = submission.answers ?? {};
  const attempted = Boolean(attemptText.trim()) || Boolean(String(answers[itemId] ?? '').trim());
  const needsAttempt = ['next_step', 'isomorphic', 'full_item', 'check_work'].includes(actionRaw);
  if (needsAttempt && !attempted) {
    const err = new Error('Try the item first. Full help unlocks after an attempt.');
    err.attempt_gate = true;
    throw err;
  }
  // G5 count (soft-fail). Re-read help_mode inside RPC. No approved_score / no bulk key / no keystroke log.
  let helpUsed;
  try {
    const { data: counted } = await supabase.rpc('record_practice_help_use', {
      p_assignment_id: assignmentId,
      p_item_id: itemId,
      p_action: actionRaw,
    });
    helpUsed = counted ?? undefined;
  } catch {
    helpUsed = undefined;
  }
  return {
    ok: true,
    help_mode: helpMode,
    action: actionRaw,
    item_id: itemId,
    text: 'Practice Help (dev): try the next smaller step on this item.',
    approved_score_written: false,
    ...(helpUsed !== undefined ? { help_used: helpUsed } : {}),
  };
}

async function explainCapture(supabase, body) {
  const captureId = String(body.captureId ?? "").trim();
  const classId = String(body.classId ?? "").trim();
  let imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
  if (!captureId) throw new Error("captureId required");
  if (!classId) throw new Error("classId required");

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user?.id) throw new Error("Sign in first.");
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, parent_id")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (!profile || (profile.role !== "teacher" && profile.role !== "parent")) {
    throw new Error("Explain is not available for this seat.");
  }
  const { data: loaded, error: loadError } = await supabase.rpc("gauth_load_explain_capture", {
    p_capture_id: captureId,
  });
  if (loadError) throw new Error(loadError.message || "Explain not allowed.");
  const capture = loaded;
  if (!capture?.id) throw new Error("Capture not found.");
  if (capture.class_id !== classId) throw new Error("Capture does not belong to that class.");
  if (profile.role === "teacher" && capture.seat !== "teacher") {
    throw new Error("You can only explain a capture for a class you teach.");
  }
  if (profile.role === "parent" && capture.seat !== "parent") {
    throw new Error("You can only explain work for a linked child.");
  }
  // class_teachers wall lives inside gauth_load_explain_capture for teacher seat.

  let keyItems = capture.key_items ?? null;
  let extract = capture.extract ?? null;
  const keyed = Boolean(keyItems) || Boolean(extract);
  if (imageUrl && !isAllowedAskImageUrl(imageUrl)) throw new Error("Image URL is not allowed.");

  const prompt = `You write a TEACHER Explain draft for one student capture.
Return JSON only. Pedagogy DRAFT only — never a grade.`;
  const contextBits = [
    `capture_id=${captureId}`,
    capture.student_id ? "student bound" : "student unassigned",
    keyed ? "keyed path" : "freeform path",
    keyItems ? `key_items=${JSON.stringify(keyItems).slice(0, 4000)}` : null,
    extract ? `extract_marks=${JSON.stringify(extract).slice(0, 4000)}` : null,
  ].filter(Boolean).join("\n");
  const content = [{ type: "input_text", text: `${prompt}\n\nContext:\n${contextBits}` }];
  if (imageUrl) {
    content.unshift({
      type: "input_image",
      image_url: await prepareImageForGrok(imageUrl),
      detail: imageDetailFor("cheap"),
    });
  }
  const payload = await grokCall("ask", [{ role: "user", content }], {}, {
    supabase,
    functionName: "explain-capture",
  });
  const parsed = extractJson(outputText(payload)) || {};
  const stepsRaw = Array.isArray(parsed.steps) ? parsed.steps : [];
  const steps = stepsRaw.map((s) => String(s ?? "").trim()).filter(Boolean).slice(0, 12);
  const draft = {
    schema_version: 1,
    capture_id: captureId,
    source: parsed.source === "keyed" || keyed ? "keyed" : "freeform",
    steps: steps.length ? steps : ["Review the work with the student and note the first missed skill."],
    reteach: typeof parsed.reteach === "string" && parsed.reteach.trim() ? parsed.reteach.trim() : null,
  };
  if (profile.role === "teacher") {
    const { data: parked, error: parkError } = await supabase.rpc("park_explain_draft", {
      p_capture_id: captureId,
      p_draft: draft,
    });
    if (parkError) throw new Error(parkError.message);
    return {
      ok: true,
      explain_draft: draft,
      explain_status: "draft",
      parked: true,
      capture: { id: parked?.id ?? captureId, explain_status: "draft" },
    };
  }
  return {
    ok: true,
    explain_draft: draft,
    explain_status: "ephemeral",
    parked: false,
    ephemeral: true,
    capture: { id: captureId },
  };
}

async function parseClassSyllabus(supabase, body) {
  const classId = String(body.classId ?? '').trim();
  const imageUrl = String(body.imageUrl ?? '');
  if (!classId) throw new Error('classId required');
  if (!imageUrl) throw new Error('imageUrl required');
  if (!isAllowedAskImageUrl(imageUrl)) throw new Error('Image URL is not allowed.');

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user?.id) throw new Error('Sign in first.');
  const { data: taught } = await supabase
    .from('class_teachers')
    .select('class_id')
    .eq('class_id', classId)
    .eq('teacher_id', userData.user.id)
    .maybeSingle();
  if (!taught) throw new Error('You can only parse a syllabus for a class you teach.');

  // Side-effect free re: publish — return draft JSON only.
  try {
    const loaded = await loadImageForGrok(imageUrl);
    const payload = await grokCall(
      'syllabus',
      [
        {
          role: 'user',
          content: [
            { type: 'input_image', image_url: loaded.dataUrl, detail: imageDetailFor('cheap') },
            { type: 'input_text', text: syllabusParsePrompt },
          ],
        },
      ],
      {},
      { supabase, functionName: 'parse-class-syllabus' },
    );
    const parsed = extractJson(outputText(payload));
    return normalizeSyllabusDraft(parsed, classId);
  } catch (err) {
    return {
      schema_version: 1,
      class_id: classId,
      document_kind: 'unknown',
      document_kind_confidence: 0,
      categories: [],
      policies: {
        missing_as_zero: { value: false, confidence: 1, selected: true },
        rounding: { value: 'nearest_whole', confidence: 1, selected: true },
        publish_to_family: { value: true, confidence: 1, selected: true },
      },
      warnings: [
        {
          code: 'low_ocr',
          message: err instanceof Error ? err.message : 'Could not read this page.',
          severity: 'block',
        },
      ],
      overall_confidence: 0,
      status: 'proposed',
    };
  }
}

function normalizeSyllabusDraft(parsed, classId) {
  const kind = ['syllabus_policy', 'rubric', 'mixed', 'unknown'].includes(parsed?.document_kind)
    ? parsed.document_kind
    : 'unknown';
  const categories = Array.isArray(parsed?.categories) ? parsed.categories : [];
  const forced = categories.map((row, index) => {
    const label =
      typeof row?.label === 'string'
        ? row.label
        : typeof row?.label?.value === 'string'
          ? row.label.value
          : `Category ${index + 1}`;
    const keyRaw =
      typeof row?.key === 'string'
        ? row.key
        : typeof row?.key?.value === 'string'
          ? row.key.value
          : 'other';
    const weight =
      typeof row?.weight_percent === 'number'
        ? row.weight_percent
        : Number(row?.weight_percent?.value ?? 0);
    const conf =
      typeof row?.weight_percent?.confidence === 'number'
        ? row.weight_percent.confidence
        : typeof row?.label?.confidence === 'number'
          ? row.label.confidence
          : 0.5;
    const selected = conf >= 0.55 && kind !== 'rubric';
    return {
      temp_id: `c${index + 1}`,
      label: { value: label, confidence: conf, selected },
      key: { value: String(keyRaw).toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 32) || 'other', confidence: conf, selected },
      weight_percent: { value: Number.isFinite(weight) ? weight : 0, confidence: conf, selected },
      default_include_in_average: { value: false, confidence: 1, selected: true },
    };
  });
  return {
    schema_version: 1,
    class_id: classId,
    document_kind: kind,
    document_kind_confidence: typeof parsed?.document_kind_confidence === 'number' ? parsed.document_kind_confidence : 0,
    warnings: Array.isArray(parsed?.warnings) ? parsed.warnings : [],
    title: parsed?.title ?? { value: null, confidence: 0, selected: false },
    term_structure: parsed?.term_structure ?? { value: 'year', confidence: 0, selected: true },
    categories: kind === 'rubric' ? [] : forced,
    policies: {
      rounding: { value: 'nearest_whole', confidence: 1, selected: true },
      publish_to_family: { value: true, confidence: 1, selected: true },
      extra_credit_allowed: { value: false, confidence: 1, selected: true },
      ...(parsed?.policies && typeof parsed.policies === 'object' ? parsed.policies : {}),
      // Force fail-closed defaults after any model suggestion.
      missing_as_zero: { value: false, confidence: 1, selected: true },
    },
    rubric_draft: parsed?.rubric_draft ?? { present: kind === 'rubric' || kind === 'mixed', criteria: [] },
    ocr_notes: typeof parsed?.ocr_notes === 'string' ? parsed.ocr_notes : null,
    overall_confidence: typeof parsed?.overall_confidence === 'number' ? parsed.overall_confidence : 0,
    status: 'proposed',
  };
}

async function analyzeAnswerKey(body) {
  const imageUrl = String(body.imageUrl ?? '');
  if (!imageUrl) throw new Error('imageUrl required');
  const loaded = await loadImageForGrok(imageUrl);
  const signature = await pageSignature(loaded.bytes);
  const payload = await grokCall('key', [
    {
      role: 'user',
      content: [
        { type: 'input_image', image_url: loaded.dataUrl, detail: imageDetailFor('cheap') },
        { type: 'input_text', text: analyzeKeyPrompt },
      ],
    },
  ], {}, { functionName: 'analyze-answer-key' });
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
    { type: 'input_image', image_url: loaded.dataUrl, detail: imageDetailFor('cheap') },
    ...withPhotos.map((row) => ({ type: 'input_image', image_url: row.prepared, detail: 'low' })),
    {
      type: 'input_text',
      text: `${matchKeyPrompt}\n\nCandidate keys (in the same order as the images after the student page):\n${listed}`,
    },
  ];
  const payload = await grokCall('match-key', [{ role: 'user', content }], {}, { functionName: 'match-key' });
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

const imagePrepCache = new Map();

async function prepareImageForGrok(imageUrl) {
  const hit = imagePrepCache.get(imageUrl);
  if (hit) return hit;
  const loaded = await loadImageForGrok(imageUrl);
  imagePrepCache.set(imageUrl, loaded.dataUrl);
  if (imagePrepCache.size > 24) {
    const oldest = imagePrepCache.keys().next().value;
    if (oldest) imagePrepCache.delete(oldest);
  }
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

  try {
    const sharp = require('sharp');
    body = await sharp(body)
      .rotate()
      .resize({
        width: MODEL_MAX_EDGE,
        height: MODEL_MAX_EDGE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: Math.round(MODEL_JPEG_QUALITY * 100), mozjpeg: true })
      .toBuffer();
    mime = 'image/jpeg';
  } catch {
    // Keep the converted bytes if sharp is unavailable.
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

async function grokCall(job, input, extra = {}, opts = {}) {
  const pass = asPass(opts.pass);
  await assertUnderCap(opts.supabase);
  const model = opts.model ?? modelFor(job, pass);
  const effort = reasoningEffortFor(model, pass);
  const payload = await xaiResponses(
    model,
    input,
    {
      ...(effort ? { reasoning_effort: effort } : {}),
      ...extra,
    },
    opts.signal,
  );
  const usage = parseUsage(payload);
  const usd = estimateUsd(model, usage.inputTokens, usage.outputTokens);
  await logAiUsage(opts.supabase, {
    functionName: opts.functionName ?? job,
    model,
    captureId: opts.captureId ?? null,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    usd,
  });
  payload.__kelyraUsd = usd;
  payload.__kelyraModel = model;
  return payload;
}

async function assertUnderCap(supabase) {
  if (!supabase) return;
  try {
    const { data } = await supabase.rpc('ai_spend_this_month');
    const row = Array.isArray(data) ? data[0] : data;
    const spent = Number(row?.usd ?? 0);
    const capRaw = row?.cap_usd;
    const cap = capRaw == null || capRaw === '' ? DEFAULT_MONTHLY_CAP_USD : Number(capRaw);
    if (Number.isFinite(cap) && cap > 0 && spent >= cap) {
      throw new Error(`This school is over its monthly AI budget ($${cap}).`);
    }
  } catch (err) {
    if (err instanceof Error && /budget/.test(err.message)) throw err;
  }
}

async function logAiUsage(supabase, row) {
  if (!supabase || !row.usd) return;
  try {
    const { data: schoolId } = await supabase.rpc('my_school_id');
    const { data: userData } = await supabase.auth.getUser();
    if (!schoolId) return;
    await supabase.from('ai_usage').insert({
      school_id: schoolId,
      teacher_id: userData.user?.id ?? null,
      function: row.functionName,
      model: row.model,
      capture_id: row.captureId,
      input_tokens: row.inputTokens,
      output_tokens: row.outputTokens,
      usd: row.usd,
    });
  } catch {
    // Meter is best-effort.
  }
}

async function readAiSpend(supabase) {
  const { data, error } = await supabase.rpc('ai_spend_this_month');
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    usd: Number(row?.usd ?? 0),
    capUsd: row?.cap_usd == null ? DEFAULT_MONTHLY_CAP_USD : Number(row.cap_usd),
  };
}

async function processAiJobs(supabase, authorization) {
  const { data: jobs, error } = await supabase
    .from('ai_jobs')
    .select('id, capture_id, submission_id, pass, kind')
    .eq('status', 'pending')
    .in('kind', ['homework_draft', 'submission_review'])
    .order('created_at', { ascending: true })
    .limit(20);
  if (error) throw error;
  const results = [];
  for (const job of jobs ?? []) {
    await supabase.from('ai_jobs').update({ status: 'running' }).eq('id', job.id);
    try {
      if (job.kind === 'submission_review') {
        if (!job.submission_id) throw new Error('submission_id required');
        await reviewSubmission(supabase, { submissionId: job.submission_id, queued: true });
      } else {
        await analyzeHomework(supabase, { captureId: job.capture_id, pass: job.pass });
      }
      await supabase
        .from('ai_jobs')
        .update({ status: 'done', finished_at: new Date().toISOString() })
        .eq('id', job.id);
      results.push({ id: job.id, ok: true });
    } catch (err) {
      await supabase
        .from('ai_jobs')
        .update({
          status: 'error',
          error: err instanceof Error ? err.message : 'failed',
          finished_at: new Date().toISOString(),
        })
        .eq('id', job.id);
      results.push({ id: job.id, ok: false });
    }
  }
  void authorization;
  return { ok: true, processed: results.length, results };
}

async function buildPracticeLesson(supabase, authorization, body) {
  const classId = String(body.classId ?? '').trim();
  const items = (Array.isArray(body.items) ? body.items : [])
    .map((item, index) => ({
      id: String(item.id ?? `item-${index + 1}`),
      prompt: String(item.prompt ?? '').trim(),
      ...(item.answerKey ? { answerKey: String(item.answerKey).trim() } : {}),
    }))
    .filter((item) => item.prompt);
  if (!classId || !items.length) throw new Error('classId and items required');
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user?.id) throw new Error('Sign in first.');
  const { data: taught } = await supabase
    .from('class_teachers')
    .select('class_id')
    .eq('class_id', classId)
    .eq('teacher_id', userData.user.id)
    .maybeSingle();
  if (!taught) throw new Error('You can only assign to a class you teach.');

  const page = await import(pathToFileURL(join(root, 'supabase/functions/_shared/practicePage.ts')).href);
  const fallback = page.specFromItems(
    String(body.title ?? '').trim() || `Practice: ${body.skillLabel ?? 'skill'}`,
    items,
  );
  let spec = fallback;
  try {
    const payload = await grokCall(
      'lesson-outline',
      `${page.PRACTICE_PAGE_STYLE_PROMPT}

Skill: ${String(body.skillLabel ?? fallback.title)}
Source assignment: ${String(body.title ?? '')}
${body.instruction ? `Teacher revision: ${body.instruction}\n` : ''}Questions:
${items.map((item, index) => `${index + 1}. ${item.prompt}${item.answerKey ? ` (key: ${item.answerKey})` : ''}`).join('\n')}`,
      {},
      { supabase, functionName: 'build-practice-lesson' },
    );
    spec = page.parsePracticePageSpec(extractJson(outputText(payload)), fallback);
  } catch {
    spec = fallback;
  }
  if (!spec.beats.length) spec = fallback;
  const html = page.buildPracticeLessonHtml(spec);
  const window = page.practiceBeatWindow(spec);
  const admin = serviceSupabase();
  let deckId = `prac-${crypto.randomUUID()}`;
  let version = 'v1';
  const assignmentId = String(body.assignmentId ?? '').trim();
  if (assignmentId) {
    const { data: assignment } = await supabase
      .from('assignments')
      .select('id, class_id, deck_id, lesson_version, storage_deck_id')
      .eq('id', assignmentId)
      .maybeSingle();
    if (!assignment || assignment.class_id !== classId) throw new Error('Assignment not found.');
    if (page.isPracticePackId(assignment.storage_deck_id) || page.isPracticePackId(assignment.deck_id)) {
      deckId = assignment.storage_deck_id || assignment.deck_id;
      version = assignment.lesson_version || 'v1';
    }
  }
  const object = `${deckId}/${version}/index.html`;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Need SUPABASE_SERVICE_ROLE_KEY to store the practice page.');
  const uploaded = await fetch(`${url.replace(/\/$/, '')}/storage/v1/object/lessons/${object}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      'Content-Type': 'text/html; charset=utf-8',
      'x-upsert': 'true',
    },
    body: html,
  });
  if (!uploaded.ok) throw new Error(await uploaded.text());
  if (!assignmentId) {
    const { error: packError } = await admin.from('lesson_packs').insert({
      deck_id: deckId,
      version,
      title: spec.title,
      published: false,
      storage_deck_id: deckId,
      beat_start: window.start,
      beat_end: window.end,
    });
    if (packError) throw packError;
  } else {
    await admin
      .from('lesson_packs')
      .update({ title: spec.title, beat_start: window.start, beat_end: window.end })
      .eq('deck_id', deckId)
      .eq('version', version);
  }
  void authorization;
  return {
    ok: true,
    deckId,
    version,
    storageDeckId: deckId,
    beatStart: window.start,
    beatEnd: window.end,
    title: spec.title,
  };
}

function serviceSupabase() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Need SUPABASE_SERVICE_ROLE_KEY to store the practice page.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function draftLessonFromOutline(supabase, body) {
  const outline = String(body.outline ?? body.text ?? '').trim();
  if (!outline) throw new Error('outline required');
  const payload = await grokCall(
    'lesson-outline',
    `You turn teacher slide notes into a Kelyra interactive lesson outline. JSON only:
{"title":"","sections":[{"id":"1.1","title":"","teach":"spoken teach script","check":"spoken check script","items":[{"stem":"","accept":[""],"hint":""}]}]}
Rules:
- One section per major slide idea. Keep teach/check under 40 words each.
- Items are paper-short. No student names. Do not copy textbook paragraphs.
- Source notes:\n${outline.slice(0, 20000)}`,
    {},
    { supabase, functionName: 'draft-lesson-from-outline' },
  );
  return { ok: true, ...extractJson(outputText(payload)), costUsd: payload.__kelyraUsd ?? null };
}

async function xaiResponses(model, input, extra = {}, signal) {
  const response = await xaiFetch(`${xaiBaseUrl}/responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ store: false, model, input, ...extra }),
    signal,
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
