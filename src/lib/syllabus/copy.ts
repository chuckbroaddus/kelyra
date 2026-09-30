/**
 * GB-18 syllabus copy (FR-TPL-01).
 * Copy from another class bag or school template; never carry locked overrides.
 */
import {
  buildSchoolLockPolicy,
  stripLockedOverrides,
  type SchoolLockPolicy,
  type SyllabusFieldBag,
} from './locks.ts';
import { getSchoolSyllabusTemplate, type SyllabusTemplatePayload } from './templates.ts';

export type CopyableSyllabus = SyllabusFieldBag & {
  title?: string | null;
  categories?: Array<{
    key: string;
    label: string;
    weight_percent: number;
    drop_lowest_n?: number;
    rules?: { drop_lowest_n?: number };
  }>;
  late_rule?: unknown;
  missing_rule?: unknown;
  extra_credit_method?: unknown;
  floor?: number | null;
  book_mode?: unknown;
  engine?: unknown;
  within_category?: unknown;
  retake?: unknown;
  rollup_preset?: unknown;
  exam_weight?: unknown;
};

export type CopyResult = {
  syllabus: CopyableSyllabus;
  source: 'class' | 'template';
  source_key: string | null;
  stripped_lock_keys: string[];
};

function templateToBag(p: SyllabusTemplatePayload): CopyableSyllabus {
  return {
    engine: p.engine,
    within_category: p.within_category,
    categories: p.categories.map((c, i) => ({
      key: c.key,
      label: c.label,
      weight_percent: c.weight_percent,
      sort_order: i,
      active: true,
      rules: { drop_lowest_n: c.drop_lowest_n ?? 0 },
      drop_lowest_n: c.drop_lowest_n ?? 0,
    })),
    late_rule: p.late_rule,
    missing_rule: p.missing_rule,
    floor: p.floor,
    book_mode: p.book_mode,
    extra_credit_method: p.extra_credit_method,
    retake: p.retake,
    scale_id: p.scale_hint,
    title: null,
  };
}

function lockedKeysOf(policy: SchoolLockPolicy): string[] {
  return (Object.keys(policy.locks) as Array<keyof typeof policy.locks>).filter(
    (k) => policy.locks[k],
  );
}

/** Copy from another class syllabus onto a target with school locks. */
export function copySyllabusFromClass(
  source: CopyableSyllabus,
  targetPolicy: SchoolLockPolicy | null,
  opts?: { title?: string | null },
): CopyResult {
  const policy = targetPolicy ?? buildSchoolLockPolicy({});
  const stripped = stripLockedOverrides({ ...source }, policy);
  if (opts?.title !== undefined) stripped.title = opts.title;
  else if (source.title) stripped.title = `${source.title} (copy)`;
  return {
    syllabus: stripped,
    source: 'class',
    source_key: null,
    stripped_lock_keys: lockedKeysOf(policy),
  };
}

/** Copy from a published school template key. */
export function copySyllabusFromTemplate(
  templateKey: string,
  targetPolicy: SchoolLockPolicy | null,
  opts?: { title?: string | null },
): CopyResult {
  const tmpl = getSchoolSyllabusTemplate(templateKey);
  if (!tmpl) {
    throw new Error(`Unknown syllabus template: ${templateKey}`);
  }
  const policy = targetPolicy ?? buildSchoolLockPolicy({});
  const bag = templateToBag(tmpl.payload);
  const stripped = stripLockedOverrides(bag, policy);
  stripped.title = opts?.title ?? tmpl.name;
  return {
    syllabus: stripped,
    source: 'template',
    source_key: templateKey,
    stripped_lock_keys: lockedKeysOf(policy),
  };
}

/** Apply copy result onto a wizard-like draft bag (shallow merge of unlocked fields). */
export function applyCopyToDraftBag(
  draft: Record<string, unknown>,
  copy: CopyResult,
): Record<string, unknown> {
  const s = copy.syllabus;
  const next = { ...draft };
  for (const [k, v] of Object.entries(s)) {
    if (v === undefined) continue;
    if (copy.stripped_lock_keys.includes(k)) continue;
    // rollup pair
    if (k === 'exam_weight' && copy.stripped_lock_keys.includes('rollup')) continue;
    if (k === 'rollup_preset' && copy.stripped_lock_keys.includes('rollup')) continue;
    next[k] = v;
  }
  if (s.title != null) next.title = s.title;
  if (s.categories && !copy.stripped_lock_keys.includes('categories')) {
    next.categories = s.categories;
  }
  next.source = copy.source === 'template' ? 'template' : 'copy';
  return next;
}
