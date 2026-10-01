/**
 * Human-readable school template cards — derived from payload, not hand-written per key.
 */
import type { SyllabusTemplateDef, SyllabusTemplatePayload } from './templates.ts';

const ENGINE_LABEL: Record<string, { label: string; plain: string }> = {
  total_points: {
    label: 'Total points',
    plain: 'Every point counts the same. A 100-point test outweighs a 10-point quiz.',
  },
  weighted_points_inside: {
    label: 'Weighted, points count',
    plain: 'Categories have weights. Inside one, a 100-point test counts more than a 20-point quiz.',
  },
  weighted_percent_inside: {
    label: 'Weighted, all equal',
    plain:
      'Categories have weights. Inside one, every assignment counts the same. 80/100 and 16/20 are both 80%.',
  },
  item_weights: {
    label: 'Each assignment weighted',
    plain: 'You give each assignment its own weight. Categories are just labels.',
  },
  none: {
    label: 'No overall grade',
    plain: 'Keep scores without figuring an overall average for the grading period.',
  },
};

function engineLine(engine: string): string {
  const eng = ENGINE_LABEL[engine] ?? { label: engine, plain: engine };
  return `Grading engine: ${eng.label}. ${eng.plain}`;
}

function lateLine(p: SyllabusTemplatePayload): string {
  const r = p.late_rule;
  if (!r || r.type === 'none') return 'Late work: adjust by hand (no automatic penalty).';
  const amount = r.amount != null ? String(r.amount) : '';
  const unit = r.unit === 'points' ? 'points' : 'percent';
  if (r.type === 'flat') return `Late work: one-time ${amount}${unit === 'percent' ? '%' : ` ${unit}`} penalty.`;
  if (r.type === 'per_day') return `Late work: ${amount}${unit === 'percent' ? '%' : ` ${unit}`} off per day.`;
  if (r.type === 'per_hour') return `Late work: ${amount}${unit === 'percent' ? '%' : ` ${unit}`} off per hour.`;
  return `Late work: ${r.type}${amount ? ` (${amount} ${unit})` : ''}.`;
}

function missingLine(p: SyllabusTemplatePayload): string {
  if (p.missing_rule === 'zero') return 'Missing work counts as 0 until a score is entered.';
  if (p.missing_rule === 'floor') {
    return p.floor != null
      ? `Missing work gets the lowest grade allowed (${p.floor}%).`
      : 'Missing work gets the lowest grade allowed for the period.';
  }
  return 'Missing work is left out until a score is entered.';
}

function floorLine(p: SyllabusTemplatePayload): string | null {
  if (p.missing_rule === 'floor') return null;
  if (p.floor == null) return 'No grade floor set by this template.';
  return `Lowest grade allowed (floor): ${p.floor}%.`;
}

function extraCreditLine(p: SyllabusTemplatePayload): string {
  if (p.extra_credit_method === 'A') return 'Extra credit: raises or replaces a score (not bonus on top).';
  if (p.extra_credit_method === 'C') return 'Extra credit: its own category weight on top of the regular 100%.';
  return 'Extra credit: bonus points added on top of earned points.';
}

function retakeLine(p: SyllabusTemplatePayload): string {
  const r = p.retake;
  if (!r || !r.enabled) return 'Retakes: not set up by this template.';
  const method =
    r.method === 'replace'
      ? 'replace the first score'
      : r.method === 'higher_of'
        ? 'keep the higher score'
        : r.method === 'average'
          ? 'average the attempts'
          : r.method === 'cap_at_N'
            ? 'cap the retake score'
            : r.method;
  const cap = r.cap_pct != null ? ` Cap at ${r.cap_pct}%.` : '';
  return `Retakes: on — ${method}.${cap}`;
}

function bookLine(p: SyllabusTemplatePayload): string {
  return p.book_mode === 'rolling_year'
    ? 'Periods: one running average all year (scores carry across periods).'
    : 'Periods: start fresh each grading period.';
}

function scaleLine(p: SyllabusTemplatePayload): string | null {
  if (!p.scale_hint) return null;
  if (p.scale_hint === 'texas_no_d') return 'Scale hint: Texas-style (no D band).';
  if (p.scale_hint === 'us_10') return 'Scale hint: common US 10-point letter bands.';
  return `Scale hint: ${p.scale_hint}.`;
}

function categoryLines(p: SyllabusTemplatePayload): string {
  if (!p.categories.length) return 'Categories: none (engine may not need weights).';
  const parts = p.categories.map((c) => {
    let s = `${c.label} ${c.weight_percent}%`;
    const drop = c.drop_lowest_n ?? 0;
    if (drop > 0) s += `, drop lowest ${drop}`;
    if (c.max_weight_hint != null) s += `, weight capped at ${c.max_weight_hint}%`;
    return s;
  });
  return `Categories & weights: ${parts.join('; ')}.`;
}

function dropsLine(p: SyllabusTemplatePayload): string | null {
  const drops = p.categories.filter((c) => (c.drop_lowest_n ?? 0) > 0);
  if (!drops.length) return 'Drop lowest: none.';
  return `Drop lowest: ${drops.map((c) => `${c.drop_lowest_n} from ${c.label}`).join('; ')}.`;
}

/** Multi-sentence explanation for a school template card. */
export function describeSchoolSyllabusTemplate(t: SyllabusTemplateDef): string {
  const p = t.payload;
  const lines: string[] = [engineLine(p.engine), categoryLines(p)];
  const drops = dropsLine(p);
  if (drops) lines.push(drops);
  lines.push(lateLine(p));
  lines.push(missingLine(p));
  const floor = floorLine(p);
  if (floor) lines.push(floor);
  lines.push(extraCreditLine(p));
  lines.push(retakeLine(p));
  lines.push(bookLine(p));
  // Rounding is not on the seed payload yet — say so plainly when absent.
  lines.push('Rounding: uses the class default (template does not override).');
  const scale = scaleLine(p);
  if (scale) lines.push(scale);
  if (p.notes?.trim()) lines.push(p.notes.trim());
  return lines.join('\n');
}

export function describeAllSchoolSyllabusTemplates(
  list: SyllabusTemplateDef[],
): Array<{ key: string; name: string; explanation: string }> {
  return list.map((t) => ({
    key: t.key,
    name: t.name,
    explanation: describeSchoolSyllabusTemplate(t),
  }));
}
