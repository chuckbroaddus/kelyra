/**
 * REVIEW-SUM RS-B — Decision card model for teacher submission review.
 * Pure helpers only. No schema. Accept recommendation → approveTurnedInReview.
 */
import { asDraftScore, reviewDraftHasWork, type SubmissionReviewDraft } from './review.ts';

export const DECISION_CARD_TITLE = 'Decision card';
export const RECOMMENDATION_LABEL = 'Recommendation';
export const DRAFT_ONLY_LABEL = 'Draft only';
export const RECOMMENDED_DRAFT_LABEL = 'Recommended draft';
export const ACCEPT_RECOMMENDATION_LABEL = 'Accept recommendation';
export const EDIT_DRAFT_LABEL = 'Edit draft';

export type ReviewDecisionKind = 'recommendation' | 'draft_only';

export type ReviewDecision = {
  kind: ReviewDecisionKind;
  title: typeof DECISION_CARD_TITLE;
  recommendationLabel: typeof RECOMMENDATION_LABEL;
  draftOnlyLabel: typeof DRAFT_ONLY_LABEL | null;
  recommendedDraftLabel: typeof RECOMMENDED_DRAFT_LABEL;
  recommendedDraftText: string;
  acceptLabel: typeof ACCEPT_RECOMMENDATION_LABEL;
  editLabel: typeof EDIT_DRAFT_LABEL;
  /** True when there is a usable draft score (typed or recommended) to approve. */
  canAccept: boolean;
  /** True when AI/teacher draft work exists beyond a blank score field. */
  hasRecommendation: boolean;
};

export type BuildReviewDecisionInput = {
  draft: SubmissionReviewDraft | null | undefined;
  /** Live score field on the review screen (may be Pass/Fail or 0–100). */
  scoreText: string;
};

function recommendedDraftText(draft: SubmissionReviewDraft | null | undefined, scoreText: string): string {
  const typed = scoreText.trim();
  if (typed) return typed;
  if (draft?.draftScore != null) return String(draft.draftScore);
  return '—';
}

/**
 * Build the RS-B Decision card view-model.
 * - recommendation: draft has summary/gaps/items/note or a numeric draftScore
 * - draft_only: editable score only / empty AI draft — still Accept when score present
 */
export function buildReviewDecision(input: BuildReviewDecisionInput): ReviewDecision {
  const draft = input.draft ?? null;
  const hasRecommendation = reviewDraftHasWork(draft);
  const scoreFromField = input.scoreText.trim();
  const numeric = asDraftScore(scoreFromField) ?? draft?.draftScore ?? null;
  const canAccept = Boolean(scoreFromField) || numeric != null;
  const kind: ReviewDecisionKind = hasRecommendation ? 'recommendation' : 'draft_only';

  return {
    kind,
    title: DECISION_CARD_TITLE,
    recommendationLabel: RECOMMENDATION_LABEL,
    draftOnlyLabel: kind === 'draft_only' ? DRAFT_ONLY_LABEL : null,
    recommendedDraftLabel: RECOMMENDED_DRAFT_LABEL,
    recommendedDraftText: recommendedDraftText(draft, input.scoreText),
    acceptLabel: ACCEPT_RECOMMENDATION_LABEL,
    editLabel: EDIT_DRAFT_LABEL,
    canAccept,
    hasRecommendation,
  };
}

/** Pack B (RS-B-K) Decision card — same Accept copy; gate on confirm-each + student. */
export function buildPackBDecision(input: {
  draftScore: number | null;
  canPublish: boolean;
}): ReviewDecision {
  const hasScore = input.draftScore != null;
  return {
    kind: hasScore ? 'recommendation' : 'draft_only',
    title: DECISION_CARD_TITLE,
    recommendationLabel: RECOMMENDATION_LABEL,
    draftOnlyLabel: input.canPublish ? null : DRAFT_ONLY_LABEL,
    recommendedDraftLabel: RECOMMENDED_DRAFT_LABEL,
    recommendedDraftText: hasScore ? String(input.draftScore) : '—',
    acceptLabel: ACCEPT_RECOMMENDATION_LABEL,
    editLabel: EDIT_DRAFT_LABEL,
    canAccept: input.canPublish,
    hasRecommendation: hasScore,
  };
}
