import { invokeAi } from '@/lib/ai/invoke';
import { requireSupabase } from '@/lib/supabase/client';
import type { CaptureRow } from '@/lib/supabase/types';

export type ExplainDraft = {
  schema_version: 1;
  capture_id: string;
  source: 'keyed' | 'freeform';
  steps: string[];
  reteach: string | null;
};

export type ExplainStatus = 'none' | 'draft' | 'noted';

export const TEACHER_CAPTURE_SELECT =
  'id, class_id, student_id, kind, photo_asset_id, audio_asset_id, transcript, input_source, status, guessed_student_id, match_confidence, model_draft, draft_score, approved_score, score_mark, grade_kind, teacher_note, parent_sentence, created_at, attached_at, approved_at, assignment_id, ai_status, explain_draft, explain_status';

export const FAMILY_CAPTURE_SELECT =
  'id, class_id, student_id, status, approved_score, teacher_note, parent_sentence, approved_at, created_at, assignment_id';

export const FAMILY_OMIT_CAPTURE_KEYS = [
  'explain_draft',
  'explain_status',
  'model_draft',
  'draft_score',
  'photo_asset_id',
  'audio_asset_id',
  'guessed_student_id',
  'match_confidence',
] as const;

export function omitFamilyCaptureSecrets<T extends Record<string, unknown>>(row: T): Partial<T> {
  const next: Record<string, unknown> = { ...row };
  for (const key of FAMILY_OMIT_CAPTURE_KEYS) {
    delete next[key];
  }
  return next as Partial<T>;
}

export function parseExplainDraft(raw: unknown): ExplainDraft | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const steps = Array.isArray(row.steps)
    ? row.steps.map((s) => String(s ?? '').trim()).filter(Boolean)
    : [];
  if (!steps.length && !row.reteach) return null;
  return {
    schema_version: 1,
    capture_id: typeof row.capture_id === 'string' ? row.capture_id : '',
    source: row.source === 'keyed' ? 'keyed' : 'freeform',
    steps,
    reteach: typeof row.reteach === 'string' && row.reteach.trim() ? row.reteach.trim() : null,
  };
}

export async function requestExplainCapture(input: {
  captureId: string;
  classId: string;
  imageUrl?: string | null;
}): Promise<ExplainDraft> {
  const result = await invokeAi<{
    error?: string;
    explain_draft?: ExplainDraft;
    draft?: ExplainDraft;
  }>('explain-capture', {
    captureId: input.captureId,
    classId: input.classId,
    imageUrl: input.imageUrl ?? null,
  });
  if (result.error) throw new Error(String(result.error));
  const draft = parseExplainDraft(result.explain_draft ?? result.draft);
  if (!draft) throw new Error('Explain did not return a draft.');
  return draft;
}

function asCapture(data: unknown): CaptureRow {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Explain RPC returned no capture.');
  }
  return data as CaptureRow;
}

export async function discardExplainDraft(captureId: string): Promise<CaptureRow> {
  const { data, error } = await requireSupabase().rpc('discard_explain_draft' as never, {
    p_capture_id: captureId,
  } as never);
  if (error) throw error;
  return asCapture(data);
}

export async function attachExplainAsNote(captureId: string): Promise<CaptureRow> {
  const { data, error } = await requireSupabase().rpc('attach_explain_as_note' as never, {
    p_capture_id: captureId,
  } as never);
  if (error) throw error;
  return asCapture(data);
}

export async function saveEditedExplainDraft(
  captureId: string,
  draft: ExplainDraft,
): Promise<CaptureRow> {
  const { data, error } = await requireSupabase().rpc('park_explain_draft' as never, {
    p_capture_id: captureId,
    p_draft: { ...draft, schema_version: 1, capture_id: captureId },
  } as never);
  if (error) throw error;
  return asCapture(data);
}
