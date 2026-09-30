/**
 * mergeProposalIntoDraft — FR-AI-07 / FR-AI-14.
 * Never overwrites source==='user' unless replace_user_edits.
 * Low confidence (<0.5) does not fill; 0.5–0.79 fills + needs_review.
 */
import type {
  DraftField,
  IngestableDraft,
  IngestField,
  IngestProposal,
  MergeOptions,
  MergeResult,
} from './proposalTypes.ts';

function confThresholds(opts: MergeOptions) {
  return {
    min: opts.min_fill_confidence ?? 0.5,
    high: opts.high_confidence ?? 0.8,
  };
}

function evidenceString(field: IngestField): string | null {
  const page = field.evidence.page != null ? `p. ${field.evidence.page}: ` : '';
  const q = field.evidence.quote?.trim() ?? '';
  const s = `${page}${q}`.trim();
  return s || null;
}

function isLocked(path: string, locked: string[]): boolean {
  return locked.some((lp) => path === lp || path.startsWith(`${lp}.`) || lp.startsWith(`${path}.`));
}

/**
 * Merge an IngestProposal into a path-keyed draft.
 * AI never publishes — only fills draft fields a human confirms later.
 */
export function mergeProposalIntoDraft(
  draft: IngestableDraft,
  proposal: IngestProposal,
  opts: MergeOptions = {},
): MergeResult {
  const { min, high } = confThresholds(opts);
  const locked = opts.locked_paths ?? [];
  const replaceUser = opts.replace_user_edits === true;

  const fields: Record<string, DraftField> = { ...draft.fields };
  const applied: string[] = [];
  const skipped_user: string[] = [];
  const skipped_low: string[] = [];
  const conflicts: string[] = [];
  const needs_review: string[] = [];

  // Higher confidence first so re-ingest prefers stronger values among AI fields
  const sorted = [...proposal.fields].sort((a, b) => b.confidence - a.confidence);

  for (const pf of sorted) {
    const path = pf.path;
    const existing = fields[path];

    if (pf.status === 'conflict' || isLocked(path, locked)) {
      // Keep locked/current value; attach evidence as reference only
      if (existing) {
        fields[path] = {
          ...existing,
          evidence: evidenceString(pf) ?? existing.evidence,
          status: 'conflict',
          needs_review: true,
        };
      } else {
        fields[path] = {
          value: null,
          source: 'ai',
          confidence: pf.confidence,
          evidence: evidenceString(pf),
          status: 'conflict',
          needs_review: true,
        };
      }
      conflicts.push(path);
      needs_review.push(path);
      continue;
    }

    if (pf.confidence < min || pf.status === 'unknown') {
      skipped_low.push(path);
      // Ambiguity-only: do not write value
      if (existing) {
        fields[path] = {
          ...existing,
          evidence: evidenceString(pf) ?? existing.evidence,
          needs_review: true,
          status: 'unknown',
        };
        needs_review.push(path);
      }
      continue;
    }

    if (existing?.source === 'user' && !replaceUser) {
      skipped_user.push(path);
      continue;
    }

    // Re-ingest among AI fills: higher confidence wins (FR-AI-14). Defaults/templates yield.
    if (
      existing &&
      (existing.source === 'ai' || existing.source === 'ingest') &&
      typeof existing.confidence === 'number' &&
      existing.confidence > pf.confidence &&
      !replaceUser
    ) {
      continue;
    }

    const needsReview = pf.confidence < high || pf.status === 'needs_review';
    const status = needsReview ? 'needs_review' : 'proposed';

    fields[path] = {
      value: pf.value,
      source: 'ai',
      confidence: pf.confidence,
      evidence: evidenceString(pf),
      needs_review: needsReview,
      status,
    };
    applied.push(path);
    if (needsReview) needs_review.push(path);
  }

  return {
    draft: { ...draft, fields },
    applied,
    skipped_user,
    skipped_low,
    conflicts,
    needs_review: [...new Set(needs_review)],
  };
}

/** Accept one proposed field as a user edit (review UX). */
export function acceptField(
  draft: IngestableDraft,
  path: string,
  value?: unknown,
): IngestableDraft {
  const cur = draft.fields[path];
  if (!cur && value === undefined) return draft;
  return {
    ...draft,
    fields: {
      ...draft.fields,
      [path]: {
        value: value !== undefined ? value : cur?.value,
        source: 'user',
        confidence: 1,
        evidence: cur?.evidence ?? null,
        needs_review: false,
        status: 'proposed',
      },
    },
  };
}

/** Reject a proposed field — restore previous or clear AI value. */
export function rejectField(draft: IngestableDraft, path: string, previous?: DraftField | null): IngestableDraft {
  const next = { ...draft.fields };
  if (previous) next[path] = previous;
  else delete next[path];
  return { ...draft, fields: next };
}

/** Convert school SetupDraft-like object into IngestableDraft. */
export function asIngestableDraft(
  kind: IngestableDraft['kind'],
  fields: Record<string, { value: unknown; source: string; confidence?: number | null; evidence?: string | null }>,
): IngestableDraft {
  const out: Record<string, DraftField> = {};
  for (const [path, f] of Object.entries(fields)) {
    out[path] = {
      value: f.value,
      source: (f.source as DraftField['source']) || 'default',
      confidence: f.confidence ?? null,
      evidence: f.evidence ?? null,
    };
  }
  return { kind, fields: out };
}

/** Apply accepted AI fields onto a plain object by path (syllabus wizard helpers). */
export function proposalFieldsToMap(proposal: IngestProposal): Record<string, unknown> {
  const map: Record<string, unknown> = {};
  for (const f of proposal.fields) {
    if (f.status === 'unknown' || f.status === 'conflict') continue;
    if (f.confidence < 0.5) continue;
    map[f.path] = f.value;
  }
  return map;
}
