/** Shared Capture surface preset contract (main, syllabus, future person-card, …). */

export type CaptureItem = {
  key: string;
  uri: string;
  mimeType: string;
  name?: string;
  kind: 'image' | 'file';
};

/** What the media tray accepts. */
export type CaptureAccept = 'images' | 'images_pdf' | 'images_pdf_docs' | 'all';

export type CaptureSubmitResult = {
  /** expo-router path after a successful import/process. */
  returnTo: string;
};

/**
 * Config for CaptureSurface. Main Capture keeps internal Ask-AI / intent flow
 * when `onSubmit` is omitted. External presets (syllabus, …) supply `onSubmit`.
 */
export type CapturePreset = {
  id: string;
  showClassStack: boolean;
  /** "What is this?" text field + mic. */
  showIntentBox: boolean;
  /**
   * Sticky primary label when using external `onSubmit`.
   * Main Capture ignores this and keeps dynamic CTAs (Ask AI, Save, …).
   */
  primaryActionLabel?: string;
  accept: CaptureAccept;
  maxItems: number;
  /** Optional fixed class (syllabus import). */
  classId?: string | null;
  /**
   * When set: no classify/intent cards; primary CTA runs this with collected items.
   * Throw to stay on capture with the error message.
   */
  onSubmit?: (items: CaptureItem[]) => Promise<CaptureSubmitResult>;
};
