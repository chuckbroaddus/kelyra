import type { AssignmentRow } from '@/lib/supabase/types';

export type AnswerKeyKind = 'none' | 'photo' | 'items' | 'both';

/** v1 KEYGRADE item types — short/work always residual (needsTeacher). */
export type KeyItemType = 'mc' | 'numeric' | 'short' | 'work';

export type AnswerKeyItem = {
  n: number;
  stem?: string;
  answer: string;
  points?: number;
  note?: string;
  needsTeacher?: boolean;
  type?: KeyItemType;
  choices?: string[];
};

export function emptyKeyItem(n = 1): AnswerKeyItem {
  return { n, stem: '', answer: '', points: 1 };
}

export function deriveKeyKind(hasPhoto: boolean, items: AnswerKeyItem[]): AnswerKeyKind {
  const useful = items.some((item) => item.answer.trim() || item.stem?.trim() || item.needsTeacher);
  if (hasPhoto && useful) return 'both';
  if (hasPhoto) return 'photo';
  if (useful) return 'items';
  return 'none';
}

const MC_ANSWER = /^(?:[a-e]|true|false|t|f|yes|no|y|n)$/i;
const NUMERIC_ANSWER = /^-?\d[\d,]*(?:\.\d+)?%?$/;

/** Infer type from answer shape when author omitted `type`. */
export function inferKeyItemType(item: AnswerKeyItem): KeyItemType {
  if (item.type === 'mc' || item.type === 'numeric' || item.type === 'short' || item.type === 'work') {
    return item.type;
  }
  if (item.needsTeacher) return 'short';
  const answer = String(item.answer ?? '').trim();
  if (!answer) return 'short';
  if (MC_ANSWER.test(answer) || (item.choices && item.choices.length > 0)) return 'mc';
  if (NUMERIC_ANSWER.test(answer)) return 'numeric';
  return 'short';
}

export function normalizeKeyItems(items: AnswerKeyItem[] | null | undefined): AnswerKeyItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item, index) => {
      const base: AnswerKeyItem = {
        n: Number.isFinite(item.n) ? Number(item.n) : index + 1,
        stem: String(item.stem ?? '').trim(),
        answer: String(item.answer ?? '').trim(),
        points: Number.isFinite(item.points) ? Number(item.points) : 1,
        note: String(item.note ?? '').trim() || undefined,
        needsTeacher: Boolean(item.needsTeacher),
        choices: Array.isArray(item.choices)
          ? item.choices.map((c) => String(c)).filter(Boolean)
          : undefined,
      };
      const type = item.type ?? inferKeyItemType(base);
      return { ...base, type };
    })
    .filter((item) => item.answer || item.stem || item.needsTeacher);
}

export function keyMaxScore(items: AnswerKeyItem[]): number | null {
  const rows = normalizeKeyItems(items);
  if (!rows.length) return null;
  const total = rows.reduce((sum, item) => sum + (item.points ?? 1), 0);
  return total > 0 ? total : null;
}

export function keySummary(row: AssignmentRow): string | null {
  const kind = row.key_kind ?? 'none';
  if (kind === 'none') return null;
  const count = Array.isArray(row.key_items) ? row.key_items.length : 0;
  if (count) return `Key · ${count} item${count === 1 ? '' : 's'}`;
  if (row.key_asset_id || kind === 'photo') return 'Key · photo';
  return 'Key';
}

export function parseKeyItems(raw: unknown): AnswerKeyItem[] {
  if (!Array.isArray(raw)) return [];
  return normalizeKeyItems(
    raw.map((row, index) => {
      const item = (row ?? {}) as Record<string, unknown>;
      const typeRaw = item.type;
      const type =
        typeRaw === 'mc' || typeRaw === 'numeric' || typeRaw === 'short' || typeRaw === 'work'
          ? typeRaw
          : undefined;
      return {
        n: Number(item.n ?? index + 1),
        stem: String(item.stem ?? ''),
        answer: String(item.answer ?? item.expected ?? ''),
        points: item.points != null ? Number(item.points) : 1,
        note: item.note ? String(item.note) : undefined,
        needsTeacher: Boolean(item.needsTeacher),
        type,
        choices: Array.isArray(item.choices)
          ? item.choices.map((c) => String(c))
          : undefined,
      };
    }),
  );
}
