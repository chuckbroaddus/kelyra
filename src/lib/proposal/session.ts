import type { SpokenCaptureHint } from '@/lib/matching/captureSpeech';

export type ProposalDraft = {
  uri: string;
  mimeType: string;
  assetId?: string;
  imageUrl?: string;
  spokenAudio?: { uri: string; mimeType: string };
  spokenTranscript?: string;
  spokenPending?: Promise<string>;
  spokenHint?: SpokenCaptureHint;
  audioOnly?: boolean;
  assignmentId?: string;
};

let draft: ProposalDraft | null = null;

export function setProposalDraft(next: ProposalDraft | null) {
  draft = next;
}

export function getProposalDraft(): ProposalDraft | null {
  return draft;
}
