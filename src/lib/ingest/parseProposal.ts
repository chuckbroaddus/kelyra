/**
 * Strict IngestProposal parser/validator (FR-AI-04/07/16).
 * Drops unknown paths, clamps confidence, derives status, flags conflicts.
 */
import { isAllowedPath, LOCK_TO_PATHS } from './allowedPaths.ts';
import { normalizeProposalFields } from './normalizeFieldValues.ts';
import type {
  IngestAmbiguity,
  IngestEvidence,
  IngestField,
  IngestFieldStatus,
  IngestProposal,
  IngestWarning,
  IngestWizard,
} from './proposalTypes.ts';

const STATUSES = new Set<IngestFieldStatus>(['proposed', 'needs_review', 'unknown', 'conflict']);

function clamp01(n: unknown, fallback = 0): number {
  const x = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(x)) return fallback;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function asWizard(raw: unknown, kindHint?: unknown): IngestWizard {
  if (raw === 'school' || raw === 'syllabus') return raw;
  if (kindHint === 'school_policy') return 'school';
  if (kindHint === 'syllabus') return 'syllabus';
  return 'syllabus';
}

function asKind(raw: unknown, wizard: IngestWizard): 'syllabus' | 'school_policy' {
  if (raw === 'school_policy' || raw === 'syllabus') return raw;
  return wizard === 'school' ? 'school_policy' : 'syllabus';
}

function parseEvidence(raw: unknown): IngestEvidence {
  if (!raw || typeof raw !== 'object') return { quote: '', page: null, region: null };
  const o = raw as Record<string, unknown>;
  const quote =
    typeof o.quote === 'string'
      ? o.quote.slice(0, 500)
      : typeof o.text === 'string'
        ? o.text.slice(0, 500)
        : '';
  let page: number | null = null;
  if (typeof o.page === 'number' && Number.isFinite(o.page)) page = Math.max(1, Math.floor(o.page));
  else if (typeof o.page === 'string' && /^\d+$/.test(o.page)) page = Math.max(1, parseInt(o.page, 10));
  const region = typeof o.region === 'string' ? o.region.slice(0, 120) : null;
  return { quote, page, region };
}

function deriveStatus(confidence: number, explicit: unknown): IngestFieldStatus {
  if (typeof explicit === 'string' && STATUSES.has(explicit as IngestFieldStatus)) {
    return explicit as IngestFieldStatus;
  }
  if (confidence >= 0.8) return 'proposed';
  if (confidence >= 0.5) return 'needs_review';
  return 'unknown';
}

// --- helpers + parseIngestProposal continue via patch ---
export type ParseOptions = {
  expected_wizard?: IngestWizard;
  expected_kind?: 'syllabus' | 'school_policy';
  source_id?: string;
  locked_paths?: string[];
};

function pathLocked(path: string, locked: string[]): boolean {
  return locked.some((lp) => path === lp || path.startsWith(`${lp}.`) || lp.startsWith(`${path}.`));
}

export function lockedPathsFromMap(locks: Record<string, boolean> | null | undefined): string[] {
  if (!locks) return [];
  const out: string[] = [];
  for (const [key, on] of Object.entries(locks)) {
    if (!on) continue;
    const mapped = LOCK_TO_PATHS[key];
    if (mapped) out.push(...mapped);
    else out.push(key);
  }
  return out;
}

export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    /* continue */
  }
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {
      /* continue */
    }
  }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
  return null;
}

function emptyProposal(
  wizard: IngestWizard,
  kind: 'syllabus' | 'school_policy',
  source_id: string,
  msg: string,
): IngestProposal {
  return {
    source_id,
    wizard,
    kind,
    fields: [],
    ambiguities: [],
    warnings: [{ code: 'parse_failed', message: msg, severity: 'block' }],
    document_kind_guess: null,
    overall_confidence: 0,
  };
}

function parseAmbiguities(raw: unknown): IngestAmbiguity[] {
  if (!Array.isArray(raw)) return [];
  const out: IngestAmbiguity[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    out.push({
      code: typeof o.code === 'string' ? o.code : 'ambiguous',
      message: typeof o.message === 'string' ? o.message : '',
      paths: Array.isArray(o.paths) ? o.paths.filter((p): p is string => typeof p === 'string') : [],
      choices: Array.isArray(o.choices)
        ? o.choices.filter((c): c is string => typeof c === 'string')
        : undefined,
    });
  }
  return out;
}

function parseWarnings(raw: unknown): IngestWarning[] {
  if (!Array.isArray(raw)) return [];
  const out: IngestWarning[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const severity =
      o.severity === 'block' || o.severity === 'warn' || o.severity === 'info' ? o.severity : 'warn';
    out.push({
      code: typeof o.code === 'string' ? o.code : 'warning',
      message: typeof o.message === 'string' ? o.message : '',
      severity,
    });
  }
  return out;
}

export function parseIngestProposal(raw: unknown, opts: ParseOptions = {}): IngestProposal {
  const sourceFallback = opts.source_id ?? 'unknown';
  const expectedWizard =
    opts.expected_wizard ??
    (opts.expected_kind === 'school_policy'
      ? 'school'
      : opts.expected_kind === 'syllabus'
        ? 'syllabus'
        : undefined);

  if (raw == null) {
    return emptyProposal(
      expectedWizard ?? 'syllabus',
      expectedWizard === 'school' ? 'school_policy' : 'syllabus',
      sourceFallback,
      'Empty model response',
    );
  }

  let obj: Record<string, unknown>;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return emptyProposal(expectedWizard ?? 'syllabus', 'syllabus', sourceFallback, 'Response was not a JSON object');
      }
      obj = parsed as Record<string, unknown>;
    } catch {
      return emptyProposal(expectedWizard ?? 'syllabus', 'syllabus', sourceFallback, 'Response was not valid JSON');
    }
  } else if (typeof raw === 'object' && !Array.isArray(raw)) {
    obj = raw as Record<string, unknown>;
  } else {
    return emptyProposal(expectedWizard ?? 'syllabus', 'syllabus', sourceFallback, 'Response was not a JSON object');
  }

  let wizard = asWizard(obj.wizard, obj.kind);
  const modelWizard = wizard;
  if (expectedWizard && wizard !== expectedWizard) wizard = expectedWizard;
  const kind = asKind(obj.kind, wizard);
  const source_id = typeof obj.source_id === 'string' && obj.source_id ? obj.source_id : sourceFallback;
  const locked = opts.locked_paths ?? [];
  const dropped: string[] = [];
  const fields: IngestField[] = [];
  const list = Array.isArray(obj.fields) ? obj.fields : [];

  for (const row of list) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const path = typeof o.path === 'string' ? o.path.trim() : '';
    if (!path) continue;
    if (!isAllowedPath(wizard, path)) {
      dropped.push(path);
      continue;
    }
    const confidence = clamp01(o.confidence, 0);
    let status = deriveStatus(confidence, o.status);
    if (pathLocked(path, locked) && confidence >= 0.5) status = 'conflict';
    const source_doc_id =
      typeof o.source_doc_id === 'string'
        ? o.source_doc_id
        : typeof o.source_id === 'string'
          ? o.source_id
          : source_id;
    fields.push({
      path,
      value: o.value === undefined ? null : o.value,
      confidence,
      evidence: parseEvidence(o.evidence),
      status,
      source_doc_id,
    });
  }

  const byPath = new Map<string, IngestField>();
  let retakeDisagrees = false;
  for (const f of fields) {
    const prev = byPath.get(f.path);
    if (
      prev &&
      f.path === 'syllabus.retake' &&
      JSON.stringify(prev.value ?? null) !== JSON.stringify(f.value ?? null)
    ) {
      // Two different retake rules: keep neither, ask the teacher (never pick by confidence).
      retakeDisagrees = true;
    }
    if (!prev || f.confidence > prev.confidence) byPath.set(f.path, f);
  }
  if (retakeDisagrees) {
    const kept = byPath.get('syllabus.retake')!;
    byPath.set('syllabus.retake', {
      ...kept,
      value: null,
      status: 'conflict',
      confidence: Math.min(kept.confidence, 0.4),
    });
  }
  const deduped = [...byPath.values()];
  const warnings = parseWarnings(obj.warnings);
  if (dropped.length) {
    warnings.push({
      code: 'unknown_paths_dropped',
      message: `Dropped unknown paths: ${dropped.slice(0, 12).join(', ')}`,
      severity: 'info',
    });
  }
  if (expectedWizard && modelWizard !== expectedWizard) {
    warnings.push({
      code: 'wizard_mismatch',
      message: `Model guessed ${String(obj.wizard ?? obj.kind)}; kept ${expectedWizard} wizard.`,
      severity: 'warn',
    });
  }
  const overall = clamp01(
    obj.overall_confidence,
    deduped.length ? deduped.reduce((s, f) => s + f.confidence, 0) / deduped.length : 0,
  );
  const base: IngestProposal = {
    source_id,
    wizard,
    kind,
    fields: deduped,
    ambiguities: [
      ...parseAmbiguities(obj.ambiguities),
      ...(retakeDisagrees
        ? [
            {
              code: 'retake_method',
              message: 'The document gives more than one retake rule. Pick the one this class uses.',
              paths: ['syllabus.retake'],
              choices: ['replace', 'higher_of', 'average'],
            },
          ]
        : []),
    ],
    warnings,
    document_kind_guess: typeof obj.document_kind_guess === 'string' ? obj.document_kind_guess : null,
    overall_confidence: overall,
  };
  return normalizeProposalFields(base);
}
