import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { emptyReviewDraft } from './review.ts';
import {
  ACCEPT_RECOMMENDATION_LABEL,
  DECISION_CARD_TITLE,
  DRAFT_ONLY_LABEL,
  EDIT_DRAFT_LABEL,
  RECOMMENDED_DRAFT_LABEL,
  RECOMMENDATION_LABEL,
  buildPackBDecision,
  buildReviewDecision,
} from './reviewDecision.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');

test('buildReviewDecision: recommendation when draft has work', () => {
  const decision = buildReviewDecision({
    draft: {
      ...emptyReviewDraft(),
      summary: 'Missed regrouping.',
      draftScore: 72,
      gaps: [{ label: 'two-digit regrouping', sortOrder: 1 }],
      items: [],
      teacherNote: null,
    },
    scoreText: '',
  });
  assert.equal(decision.kind, 'recommendation');
  assert.equal(decision.title, DECISION_CARD_TITLE);
  assert.equal(decision.recommendationLabel, RECOMMENDATION_LABEL);
  assert.equal(decision.draftOnlyLabel, null);
  assert.equal(decision.recommendedDraftLabel, RECOMMENDED_DRAFT_LABEL);
  assert.equal(decision.recommendedDraftText, '72');
  assert.equal(decision.acceptLabel, ACCEPT_RECOMMENDATION_LABEL);
  assert.equal(decision.editLabel, EDIT_DRAFT_LABEL);
  assert.equal(decision.canAccept, true);
  assert.equal(decision.hasRecommendation, true);
});

test('buildReviewDecision: draft_only when empty draft; score field enables Accept', () => {
  const empty = buildReviewDecision({ draft: emptyReviewDraft(), scoreText: '' });
  assert.equal(empty.kind, 'draft_only');
  assert.equal(empty.draftOnlyLabel, DRAFT_ONLY_LABEL);
  assert.equal(empty.canAccept, false);
  assert.equal(empty.recommendedDraftText, '—');

  const typed = buildReviewDecision({ draft: emptyReviewDraft(), scoreText: '88' });
  assert.equal(typed.kind, 'draft_only');
  assert.equal(typed.canAccept, true);
  assert.equal(typed.recommendedDraftText, '88');
});

test('buildReviewDecision: live scoreText wins over draftScore', () => {
  const decision = buildReviewDecision({
    draft: { ...emptyReviewDraft(), draftScore: 50, summary: 'ok' },
    scoreText: 'Pass',
  });
  assert.equal(decision.recommendedDraftText, 'Pass');
  assert.equal(decision.canAccept, true);
});

test('buildPackBDecision: Accept gated on canPublish; Draft only when blocked', () => {
  const ready = buildPackBDecision({ draftScore: 19, canPublish: true });
  assert.equal(ready.acceptLabel, ACCEPT_RECOMMENDATION_LABEL);
  assert.equal(ready.canAccept, true);
  assert.equal(ready.draftOnlyLabel, null);
  assert.equal(ready.recommendedDraftText, '19');

  const blocked = buildPackBDecision({ draftScore: 19, canPublish: false });
  assert.equal(blocked.canAccept, false);
  assert.equal(blocked.draftOnlyLabel, DRAFT_ONLY_LABEL);
});

test('RS-B source wall: Decision card + Accept recommendation on review screen', () => {
  const screen = readFileSync(join(root, 'src/app/class/[id]/review/[submissionId].tsx'), 'utf8');
  assert.match(screen, /Decision card/);
  assert.match(screen, /Accept recommendation/);
  assert.match(screen, /buildReviewDecision/);
  assert.match(screen, /approveTurnedInReview/);
  assert.match(screen, /What they turned in/);
});

test('RS-B-K source wall: Pack B Decision card Accept; banner is not Accept', () => {
  const packB = readFileSync(join(root, 'src/components/ui/KeygradePackBReview.tsx'), 'utf8');
  assert.match(packB, /Decision card/);
  assert.match(packB, /Accept recommendation/);
  assert.match(packB, /Keyed review · Pack B/);
  assert.match(packB, /buildPackBDecision/);
  assert.match(packB, /Confirm & next/);
  // Pack B banner must not be the Accept CTA
  assert.doesNotMatch(packB, /Keyed review · Pack B[\s\S]{0,120}Accept recommendation/);
  assert.doesNotMatch(packB, /Approve this capture/);
});
