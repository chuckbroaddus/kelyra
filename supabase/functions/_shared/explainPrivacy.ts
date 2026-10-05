/**
 * Explain draft privacy + subject-anchor helpers.
 * Plain TypeScript — importable from Edge and from node --experimental-strip-types.
 */

import { firstNameOnly } from './aiPolicy.ts';

export type ExplainPromptCtx = {
  captureId: string;
  studentBound?: boolean;
  studentFirstName?: string | null;
  keyed?: boolean;
  keyItems?: unknown;
  extract?: unknown;
  assignment_title?: string | null;
  assignment_unit?: string | null;
  assignment_section?: string | null;
};

export type ExplainDraftLike = {
  schema_version?: unknown;
  capture_id?: unknown;
  source?: unknown;
  steps: string[];
  reteach: string | null;
};

export type RedactExplainOpts = {
  studentName?: string | null;
  otherStudentNames?: string[];
};

/** Academic / subject / instructional words that must never be treated as name tokens. */
const ACADEMIC_ALLOWLIST = new Set(
  [
    'science',
    'hypothesis',
    'cell',
    'energy',
    'math',
    'mathematics',
    'fraction',
    'fractions',
    'equation',
    'equations',
    'reading',
    'matter',
    'states',
    'checkpoint',
    'warm',
    'warmup',
    'partner',
    'solid',
    'liquid',
    'gas',
    'addition',
    'subtraction',
    'multiplication',
    'division',
    'geometry',
    'algebra',
    'vocabulary',
    'history',
    'english',
    'writing',
    'problem',
    'problems',
    'worksheet',
    'homework',
    'quiz',
    'test',
    'exam',
    'review',
    'practice',
    'number',
    'numbers',
    'digit',
    'digits',
    'integer',
    'integers',
    'angle',
    'triangle',
    'area',
    'perimeter',
    'slope',
    'variable',
    'variables',
    'evidence',
    'response',
    'context',
    'definition',
    'word',
    'words',
    'order',
    'operations',
    'parenthesis',
    'parentheses',
    'pemdas',
    'unit',
    'section',
    'chapter',
    'lesson',
    'page',
    'sheet',
    'work',
    'skill',
    'skills',
    'student',
    'teacher',
    'class',
    'classmate',
    'classmates',
    // Instructional verbs / sentence starters — not surname pairs ("Ask Taylor").
    'ask',
    'look',
    'open',
    'name',
    'note',
    'observe',
    'identify',
    'connect',
    'together',
    'calculate',
    'calculates',
    'add',
    'adds',
    'coach',
    'remind',
    'remember',
    'complete',
    'check',
    'show',
    'explain',
    'read',
    'write',
    'solve',
    'find',
    'help',
    'have',
    'let',
    'next',
    'then',
    'first',
    'second',
    'third',
    'step',
    'steps',
  ].map((w) => w.toLowerCase()),
);

const NAME_TOKEN = /^[A-Z][a-z]+$/;
const CLASSMATE = 'a classmate';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function wholeWordReplace(text: string, word: string, replacement: string): string {
  const trimmed = word.trim();
  if (!trimmed || trimmed.length < 2) return text;
  const re = new RegExp(`\\b${escapeRegExp(trimmed)}\\b`, 'gi');
  return text.replace(re, replacement);
}

function collapseClassmateDupes(text: string): string {
  // Collapse adjacent "a classmate" runs only; do not eat the space before the next word.
  return text
    .replace(/(?:\ba\s+classmate\b(?:\s*,\s*|\s+and\s+|\s+(?=a\s+classmate)))+/gi, CLASSMATE)
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:!])/g, '$1')
    .trim();
}

function nameParts(full: string | null | undefined): { first: string; surname: string | null; full: string } | null {
  const cleaned = String(full ?? '').trim().replace(/\s+/g, ' ');
  if (!cleaned) return null;
  const parts = cleaned.split(' ').filter(Boolean);
  const first = parts[0] ?? '';
  if (!first) return null;
  const surname = parts.length > 1 ? parts[parts.length - 1]! : null;
  return { first, surname, full: cleaned };
}

function redactOtherStudent(text: string, otherName: string): string {
  const parts = nameParts(otherName);
  if (!parts) return text;
  let out = text;
  // Full name first so "Jamie Ortiz" becomes one classmate, not two.
  out = wholeWordReplace(out, parts.full, CLASSMATE);
  out = wholeWordReplace(out, parts.first, CLASSMATE);
  if (parts.surname && !ACADEMIC_ALLOWLIST.has(parts.surname.toLowerCase())) {
    out = wholeWordReplace(out, parts.surname, CLASSMATE);
  }
  return collapseClassmateDupes(out);
}

function stripBoundSurname(text: string, studentName: string | null | undefined): string {
  const parts = nameParts(studentName);
  if (!parts?.surname) return text;
  if (ACADEMIC_ALLOWLIST.has(parts.surname.toLowerCase())) return text;
  // Drop "First Surname" → "First", then stray surname tokens.
  const pair = new RegExp(
    `\\b${escapeRegExp(parts.first)}\\s+${escapeRegExp(parts.surname)}\\b`,
    'gi',
  );
  let out = text.replace(pair, parts.first);
  out = wholeWordReplace(out, parts.surname, '');
  return out.replace(/\s{2,}/g, ' ').replace(/\s+([,.;:!])/g, '$1').trim();
}

/**
 * Strip surname-shaped second tokens in "First Last" pairs when the second
 * token is not an academic/subject word. If the first name is a known other
 * student, replace the whole pair with "a classmate".
 */
function stripHeuristicSurnames(
  text: string,
  otherFirstNames: Set<string>,
  boundFirstName: string | null,
): string {
  const boundFirst = boundFirstName?.toLowerCase() ?? null;
  return text.replace(/\b([A-Z][a-z]+)\s+([A-Z][a-z]+)\b/g, (full, first: string, last: string) => {
    if (!NAME_TOKEN.test(first) || !NAME_TOKEN.test(last)) return full;
    if (ACADEMIC_ALLOWLIST.has(last.toLowerCase())) return full;
    if (ACADEMIC_ALLOWLIST.has(first.toLowerCase())) return full;
    // "Ask Taylor" — second token is the bound student's first name, not a surname.
    if (boundFirst && last.toLowerCase() === boundFirst) return full;
    if (otherFirstNames.has(first.toLowerCase())) return CLASSMATE;
    return first;
  });
}

function redactText(text: string, opts: RedactExplainOpts): string {
  if (!text) return text;
  let out = text;

  const others = (opts.otherStudentNames ?? [])
    .map((n) => String(n ?? '').trim())
    .filter(Boolean);

  for (const other of others) {
    out = redactOtherStudent(out, other);
  }

  out = stripBoundSurname(out, opts.studentName);

  const boundFirst = opts.studentName ? firstNameOnly(opts.studentName) : null;
  const otherFirstNames = new Set(
    others
      .map((n) => firstNameOnly(n).toLowerCase())
      .filter((n) => n.length > 1),
  );
  out = stripHeuristicSurnames(out, otherFirstNames, boundFirst);
  out = collapseClassmateDupes(out);
  return out;
}

/**
 * Deterministic privacy guard applied AFTER normalize and BEFORE park / response.
 * Leaves capture_id, schema_version, source unchanged.
 */
export function redactExplainDraft<T extends ExplainDraftLike>(draft: T, opts: RedactExplainOpts = {}): T {
  const steps = Array.isArray(draft.steps) ? draft.steps.map((s) => redactText(String(s ?? ''), opts)) : [];
  const reteach =
    typeof draft.reteach === 'string' && draft.reteach.trim()
      ? redactText(draft.reteach, opts)
      : draft.reteach ?? null;
  return {
    ...draft,
    steps,
    reteach,
  };
}

/**
 * Single Explain prompt used by Edge explain-capture and local ai:dev.
 */
export function buildExplainPrompt(ctx: ExplainPromptCtx): string {
  const lines: string[] = [
    'You write a TEACHER Explain draft for one student capture.',
    'Return JSON only, schema_version 1: {"schema_version":1,"source":"keyed|freeform","steps":["step"],"reteach":"note"}',
    'Hard rules:',
    '- Pedagogy DRAFT only — never a grade; no invented totals; prefer key+extract when keyed; 3-8 steps.',
    '- Privacy: first names only. Never write a surname or family name. Never name a classmate.',
    '- If a partner or other student appears on the page, say "a classmate" and do not write their name.',
    '- The bound student\'s first name may be used when provided in context; never their surname.',
    '- Subject anchor: the draft (reteach or a step) MUST name the school subject and the assignment topic in the words of this work.',
    '- If context includes assignment_title / assignment_unit / assignment_section, stay on that subject and name it.',
    '- The page heading is the topic when those fields are absent. The page wins if the context subject is about a different page.',
    '- Do not drift to another subject. Name the subject/topic words printed on this work.',
  ];

  const contextBits: string[] = [`capture_id=${ctx.captureId}`];
  if (ctx.studentBound) {
    const first = ctx.studentFirstName?.trim();
    contextBits.push(first ? `student_first_name=${first}` : 'student bound');
  } else {
    contextBits.push('student unassigned');
  }
  contextBits.push(ctx.keyed ? 'keyed path' : 'freeform path');
  if (ctx.assignment_title?.trim()) contextBits.push(`assignment_title=${ctx.assignment_title.trim()}`);
  if (ctx.assignment_unit?.trim()) contextBits.push(`assignment_unit=${ctx.assignment_unit.trim()}`);
  if (ctx.assignment_section?.trim()) contextBits.push(`assignment_section=${ctx.assignment_section.trim()}`);
  if (ctx.keyItems) contextBits.push(`key_items=${JSON.stringify(ctx.keyItems).slice(0, 4000)}`);
  if (ctx.extract) contextBits.push(`extract_marks=${JSON.stringify(ctx.extract).slice(0, 4000)}`);

  return `${lines.join('\n')}\n\nContext:\n${contextBits.join('\n')}`;
}
