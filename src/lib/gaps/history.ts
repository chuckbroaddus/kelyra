import type { StudentCapture } from '@/lib/gaps/api';
import type { StudentPractice } from '@/lib/practice/api';
import { focusLogFromMetadata } from '@/lib/students/api';
import { requireSupabase } from '@/lib/supabase/client';
import type { StudentRow } from '@/lib/supabase/types';

export type SkillHistoryRow = {
  id: string;
  at: string;
  label: string;
  detail: string;
  isFocus: boolean;
};

export function focusSkillLabel(
  student: StudentRow | null,
  captures: StudentCapture[],
  storedLabel?: string | null,
): string | null {
  if (storedLabel?.trim()) return storedLabel.trim();
  if (!student?.current_focus_skill_id) return null;
  for (const capture of captures) {
    for (const gap of capture.gaps) {
      if (gap.skill_id === student.current_focus_skill_id || gap.status === 'approved') {
        return gap.label;
      }
    }
  }
  return null;
}

export async function loadFocusSkillLabel(skillId: string | null): Promise<string | null> {
  if (!skillId) return null;
  const { data, error } = await requireSupabase()
    .from('skills')
    .select('label')
    .eq('id', skillId)
    .maybeSingle();
  if (error || !data?.label) return null;
  return data.label;
}

export function buildSkillHistory(
  student: StudentRow | null,
  captures: StudentCapture[],
  practice: StudentPractice[],
): SkillHistoryRow[] {
  const focusId = student?.current_focus_skill_id ?? null;
  const rows: SkillHistoryRow[] = [];

  for (const capture of captures) {
    const liveGaps = capture.gaps.filter((gap) => gap.status !== 'dismissed' && gap.label.trim());
    if (liveGaps.length) {
      for (const gap of liveGaps) {
        rows.push({
          id: `gap-${gap.id}`,
          at: gap.created_at,
          label: gap.label,
          detail: `${formatWhen(gap.created_at)} · ${gap.status}${
            gap.source === 'model' ? ' · from Grok' : ''
          }`,
          isFocus: Boolean(focusId && gap.skill_id === focusId),
        });
      }
    } else if (capture.status === 'note_only' || capture.transcript) {
      rows.push({
        id: `note-${capture.id}`,
        at: capture.created_at,
        label: capture.transcript?.trim() || 'Note',
        detail: `${formatWhen(capture.created_at)} · note`,
        isFocus: false,
      });
    }
  }

  for (const item of focusLogFromMetadata(student?.metadata)) {
    rows.push({
      id: `focus-${item.at}-${item.label}`,
      at: item.at,
      label: item.label,
      detail: `${formatWhen(item.at)} · ${item.result}`,
      isFocus: false,
    });
  }

  for (const item of practice) {
    const label = item.title.replace(/^Practice:\s*/i, '').trim() || item.title;
    rows.push({
      id: `practice-${item.id}`,
      at: item.submitted_at ?? item.created_at,
      label,
      detail: `${formatWhen(item.submitted_at ?? item.created_at)} · practice ${item.status}`,
      isFocus: false,
    });
  }

  return rows.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
