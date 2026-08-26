import { createClient } from 'npm:@supabase/supabase-js@2';

import {
  callMetered,
  outputText,
  parseSubmissionReview,
  requireXaiKey,
  submissionReviewPrompt,
} from '../_shared/ai.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors() });
  }

  try {
    const apiKey = requireXaiKey();
    const reqBody = (await req.json()) as { submissionId?: string; draft?: unknown };
    const { submissionId } = reqBody;
    if (!submissionId) return json({ error: 'submissionId required' }, 400);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    );

    const work = await loadWork(supabase, reqBody);
    if ('error' in work) return json({ error: work.error }, work.status);

    const payload = await callMetered(supabase, apiKey, {
      job: 'review',
      functionName: 'review-submission',
      payload: `${submissionReviewPrompt}\n${work.teacherPrompt}\n\n${work.text}`,
      extra: { max_output_tokens: 1024 },
    });
    const incoming = parseSubmissionReview(outputText(payload));
    if (!incoming.summary && !incoming.gaps.length && !incoming.items.length && incoming.draftScore == null) {
      return json({ error: 'Grok did not return a review. Your notes are still here. Try Ask AI again.' }, 502);
    }
    const draft = mergeDraft(work.prior, incoming);

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

    return json({ ok: true, ...draft });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'review-submission failed';
    const status = message.includes('XAI_API_KEY') ? 501 : 500;
    return json({ error: message }, status);
  }
});

async function loadWork(
  supabase: ReturnType<typeof createClient>,
  body: { submissionId?: string; draft?: unknown },
): Promise<
  | {
      text: string;
      teacherPrompt: string;
      prior: ReturnType<typeof parseSubmissionReview>;
      status: string;
    }
  | { error: string; status: number }
> {
  const { data: submission, error: subError } = await supabase
    .from('submissions')
    .select('id, assignment_id, status, answers, model_draft')
    .eq('id', body.submissionId)
    .maybeSingle();
  if (subError || !submission) return { error: 'Submission not found', status: 404 };

  const { data: assignment, error: assignmentError } = await supabase
    .from('assignments')
    .select('id, title, kind, practice_set_id, key_notes, key_items')
    .eq('id', submission.assignment_id)
    .maybeSingle();
  if (assignmentError || !assignment) return { error: 'Assignment not found', status: 404 };

  let items: Array<{ id?: string; prompt?: string; answerKey?: string }> = [];
  if (assignment.practice_set_id) {
    const { data: set } = await supabase
      .from('practice_sets')
      .select('items')
      .eq('id', assignment.practice_set_id)
      .maybeSingle();
    items = Array.isArray(set?.items) ? set.items : [];
  }

  const dbPrior = parseSubmissionReview(submission.model_draft);
  const prior = body.draft != null ? mergeDraft(parseSubmissionReview(body.draft), dbPrior) : dbPrior;
  return {
    text: formatWork({
      title: String(assignment.title ?? 'Work'),
      kind: String(assignment.kind ?? 'practice'),
      items,
      answers: (submission.answers ?? {}) as Record<string, unknown>,
      keyNotes: typeof assignment.key_notes === 'string' ? assignment.key_notes : null,
      keyItems: assignment.key_items,
    }),
    teacherPrompt: teacherDraftPrompt(prior),
    prior,
    status: String(submission.status ?? 'completed'),
  };
}

function teacherDraftPrompt(draft: {
  gaps: Array<{ label: string }>;
  items: Array<{ prompt: string }>;
  teacherNote: string | null;
}): string {
  const gaps = draft.gaps.map((gap) => gap.label).filter(Boolean);
  const items = draft.items.map((item) => item.prompt).filter(Boolean);
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

function mergeDraft(
  prior: ReturnType<typeof parseSubmissionReview>,
  incoming: ReturnType<typeof parseSubmissionReview>,
): ReturnType<typeof parseSubmissionReview> {
  const gaps: Array<{ label: string; sortOrder: number }> = [];
  const gapSeen = new Set<string>();
  for (const gap of [...prior.gaps, ...incoming.gaps]) {
    const key = gap.label.trim().toLowerCase();
    if (!key || gapSeen.has(key)) continue;
    gapSeen.add(key);
    gaps.push({ label: gap.label.trim(), sortOrder: gaps.length + 1 });
    if (gaps.length >= 3) break;
  }
  const items: Array<{ id: string; prompt: string; answerKey?: string }> = [];
  const itemSeen = new Set<string>();
  for (const item of [...prior.items, ...incoming.items]) {
    const prompt = item.prompt.trim();
    if (!prompt) continue;
    const key = prompt.toLowerCase();
    if (itemSeen.has(key)) continue;
    itemSeen.add(key);
    items.push({
      id: item.id || `item-${items.length + 1}`,
      prompt,
      ...(item.answerKey ? { answerKey: item.answerKey } : {}),
    });
    if (items.length >= 8) break;
  }
  return {
    summary: incoming.summary || prior.summary,
    teacherNote: incoming.teacherNote || prior.teacherNote,
    draftScore: incoming.draftScore ?? prior.draftScore,
    gaps,
    items,
  };
}

function formatWork(input: {
  title: string;
  kind: string;
  items: Array<{ id?: string; prompt?: string; answerKey?: string }>;
  answers: Record<string, unknown>;
  keyNotes: string | null;
  keyItems: unknown;
}): string {
  const parts = [`Assignment: ${input.title}`, `Kind: ${input.kind}`];
  if (input.keyNotes?.trim()) parts.push(`Teacher key note: ${input.keyNotes.trim()}`);
  const keyRows = Array.isArray(input.keyItems) ? input.keyItems : [];
  if (keyRows.length) {
    parts.push('Answer key:');
    for (const [index, row] of keyRows.entries()) {
      const item = (row ?? {}) as { n?: number; stem?: string; answer?: string };
      parts.push(
        `  ${item.n ?? index + 1}. ${String(item.stem ?? '').trim()}${item.answer ? ` → ${item.answer}` : ''}`,
      );
    }
  }
  if (input.items.length) {
    parts.push('');
    for (const [index, item] of input.items.entries()) {
      const id = String(item.id ?? `item-${index + 1}`);
      const answer = input.answers[id];
      const student = typeof answer === 'string' ? answer.trim() : answer == null ? '' : String(answer);
      parts.push(`${index + 1}. ${String(item.prompt ?? '').trim() || 'Item'}`);
      if (item.answerKey) parts.push(`   Expected: ${item.answerKey}`);
      parts.push(`   Student: ${student || '(blank)'}`);
    }
  } else if (input.kind === 'lesson') {
    parts.push('');
    parts.push(formatLessonAnswers(input.answers));
  }
  return parts.join('\n');
}

function formatLessonAnswers(answers: Record<string, unknown>): string {
  const extras = (answers.extras && typeof answers.extras === 'object' && !Array.isArray(answers.extras)
    ? (answers.extras as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const marks = unwrapMarks(answers.marks);
  const stems =
    extras.item_stems && typeof extras.item_stems === 'object' && !Array.isArray(extras.item_stems)
      ? (extras.item_stems as Record<string, unknown>)
      : {};
  const ids = Array.isArray(extras.item_ids)
    ? extras.item_ids.filter((id): id is string => typeof id === 'string')
    : Object.keys(marks);
  const parts: string[] = [];
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
  for (const [index, id] of ids.entries()) {
    const mark = marks[id] ?? {};
    const stem = typeof stems[id] === 'string' && stems[id].trim() ? String(stems[id]).trim() : id;
    const ok = mark.ok;
    const outcome = ok === true ? 'Correct' : ok === false ? 'Incorrect' : 'Skipped';
    const bits = [outcome];
    if (typeof mark.user === 'string' && mark.user.trim()) bits.push(mark.user.trim());
    if (typeof mark.tries === 'number' && mark.tries > 1) bits.push(`${mark.tries} tries`);
    if (mark.later_corrected === true || (ok === true && mark.first_ok === false)) bits.push('corrected after a miss');
    if (typeof mark.hints === 'number' && mark.hints > 0) {
      bits.push(mark.hints === 1 ? '1 hint' : `${mark.hints} hints`);
    }
    parts.push(`${index + 1}. ${stem} — ${bits.join(' · ')}`);
  }
  return parts.join('\n');
}

function unwrapMarks(marks: unknown): Record<string, Record<string, unknown>> {
  if (!marks || typeof marks !== 'object' || Array.isArray(marks)) return {};
  const row = marks as Record<string, unknown>;
  const inner = row.answers;
  const source =
    inner && typeof inner === 'object' && !Array.isArray(inner)
      ? (inner as Record<string, unknown>)
      : row;
  const out: Record<string, Record<string, unknown>> = {};
  for (const [id, value] of Object.entries(source)) {
    if (id === 'slider37' || id === 'who') continue;
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    out[id] = value as Record<string, unknown>;
  }
  return out;
}

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: cors() });
}
