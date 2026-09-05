/**
 * GAUTH G0/G3 — student Ask refuse control plane.
 * Prompt text is not the wall: refuse before vendor; no vision; no partial hints.
 * Parent (co-educator) never refuses before vendor; may attach photos.
 */

export const GAUTH_NEVER_ASK_TOOLS = [
  'solve_photo',
  'snap_solve',
  'grade_photo',
  'approve_work',
  'reveal_answer_key',
  'check_work',
] as const;

export const GAUTH_REFUSAL_TITLE = "Can't help with that";
export const GAUTH_REFUSAL_LINES = [
  'Graded class work stays between you and your teacher.',
  'If you have practice assigned, open it for hints.',
] as const;

export type GauthRefusalCard = {
  refusal: true;
  title: string;
  text: string;
  /** Optional navigation only — assigned practice, never Help. */
  practiceHref?: string | null;
};

/** Student seat only — parent is co-educator, not a refuse/vision-strip seat. */
export function isFamilyAskSeat(role: string | null | undefined): boolean {
  return role === 'student';
}

/** Homework / quiz / exit-ticket solve intents (assistive; fail closed). */
const SOLVE_INTENT =
  /\b(solve|answer|do\s+(my|this|the)\s+homework|finish\s+(my|this)\s+(quiz|test|homework|worksheet)|what('?s| is)\s+the\s+answer|give\s+me\s+the\s+(answers?|key)|check\s+my\s+work|grade\s+(this|my)|snap\s*&?\s*solve|show\s+(me\s+)?(the\s+)?(steps?|solution|work)|help\s+me\s+(solve|answer|finish)|explain\s+like\s+i('?m| am)\s+checking)\b/i;

const GRADED_WORK =
  /\b(quiz|test|exam|exit\s*ticket|homework|worksheet|problem\s*set|graded\s+work|tonight'?s\s+(quiz|hw|homework)|class\s+work)\b/i;

/** Multi-step stem heuristic — uncertainty still refuses for student seats. */
const MULTI_STEP_STEM =
  /(?:^\s*\d+[\).:]|\n\s*\d+[\).:]|(?:find|compute|evaluate|simplify|solve for)\b.+\b(?:show|explain|steps?)\b)/im;

export function extractAskUserText(input: unknown): string {
  if (typeof input === 'string') return input;
  if (!Array.isArray(input)) return '';
  const chunks: string[] = [];
  for (const item of input) {
    if (!item || typeof item !== 'object') continue;
    const row = item as { role?: string; from?: string; content?: unknown; text?: string };
    const role = row.role ?? row.from;
    if (role === 'assistant') continue;
    if (typeof row.text === 'string') chunks.push(row.text);
    if (typeof row.content === 'string') chunks.push(row.content);
    if (Array.isArray(row.content)) {
      for (const part of row.content as Array<{ type?: string; text?: string }>) {
        if (part?.type === 'input_text' && typeof part.text === 'string') chunks.push(part.text);
        if (typeof part?.text === 'string' && !part.type) chunks.push(part.text);
      }
    }
  }
  return chunks.join('\n').trim();
}

export function askInputHasImage(input: unknown): boolean {
  if (!Array.isArray(input)) return false;
  for (const item of input) {
    if (!item || typeof item !== 'object') continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content as Array<{ type?: string; image_url?: string }>) {
      if (part?.type === 'input_image' && typeof part.image_url === 'string' && part.image_url) return true;
    }
  }
  return false;
}

/**
 * True when student Ask must return the G3 card without calling the vendor.
 * Parent (co-educator) never refuses before vendor (text or image).
 * Any vision attachment for student refuses. Text intents refuse for student only.
 */
export function shouldRefuseAskBeforeVendor(input: {
  role: string | null | undefined;
  text?: string;
  hasImage?: boolean;
  rawInput?: unknown;
}): boolean {
  // CEO v1.1: parent co-teacher may Ask step-by-step for linked children.
  // Student seat keeps G0/G3 refuse-before-vendor. Token-only /parent never reaches Ask.
  if (input.role === 'parent') return false;
  if (!isFamilyAskSeat(input.role)) return false;
  const text =
    (input.text && input.text.trim()) ||
    (input.rawInput !== undefined ? extractAskUserText(input.rawInput) : '');
  const hasImage =
    input.hasImage === true || (input.rawInput !== undefined && askInputHasImage(input.rawInput));
  if (hasImage) return true;
  if (!text) return false;
  if (SOLVE_INTENT.test(text)) return true;
  if (GRADED_WORK.test(text) && (SOLVE_INTENT.test(text) || MULTI_STEP_STEM.test(text) || text.length > 80)) {
    return true;
  }
  // Uncertainty: long pasted stem that looks like schoolwork.
  if (MULTI_STEP_STEM.test(text) && text.length > 40) return true;
  return false;
}

/** Drop image parts for student seats before hydrate / vendor. Parent may attach photos. */
export function stripAskImagesForFamilySeat(input: unknown): unknown {
  if (!Array.isArray(input)) return input;
  return input.map((item) => {
    if (!item || typeof item !== 'object') return item;
    const row = item as { content?: unknown };
    if (!Array.isArray(row.content)) return item;
    const content = (row.content as Array<{ type?: string; text?: string }>).flatMap((part) => {
      if (part?.type === 'input_image') return [];
      return [part];
    });
    return { ...row, content };
  });
}

export function gauthRefusalCard(practiceHref?: string | null): GauthRefusalCard {
  const text = `${GAUTH_REFUSAL_TITLE}\n${GAUTH_REFUSAL_LINES.join('\n')}`;
  return {
    refusal: true,
    title: GAUTH_REFUSAL_TITLE,
    text,
    ...(practiceHref ? { practiceHref } : {}),
  };
}

export function isNeverAskTool(name: string): boolean {
  return (GAUTH_NEVER_ASK_TOOLS as readonly string[]).includes(name);
}
