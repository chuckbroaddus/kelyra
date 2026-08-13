import { Platform, Share } from 'react-native';

import { formatPracticeStatus } from '@/lib/parents/api';
import { listRoster } from '@/lib/students/api';
import { requireSupabase } from '@/lib/supabase/client';

export async function buildFamilyDigest(classId: string, className: string): Promise<string> {
  const supabase = requireSupabase();
  const roster = await listRoster(classId);
  const skillIds = roster
    .map((row) => row.current_focus_skill_id)
    .filter((id): id is string => Boolean(id));
  const { data: skills } = skillIds.length
    ? await supabase.from('skills').select('id, label').in('id', skillIds)
    : { data: [] };
  const labelById = new Map((skills ?? []).map((row) => [row.id, row.label]));

  const { data: submissions } = await supabase
    .from('submissions')
    .select('student_id, status, created_at')
    .in(
      'student_id',
      roster.length ? roster.map((row) => row.id) : ['00000000-0000-0000-0000-000000000000'],
    )
    .order('created_at', { ascending: false });

  const latestStatus = new Map<string, string>();
  for (const row of submissions ?? []) {
    if (!latestStatus.has(row.student_id)) latestStatus.set(row.student_id, row.status);
  }

  const lines = [
    `${className} — family update`,
    '',
    ...roster.map((student) => {
      const focus = student.current_focus_skill_id
        ? labelById.get(student.current_focus_skill_id) ?? 'none'
        : 'none';
      const practice = formatPracticeStatus(latestStatus.get(student.id) ?? null);
      const sentence = student.parent_sentence ? ` ${student.parent_sentence}` : '';
      return `${student.display_name}: focus ${focus}. Practice: ${practice}.${sentence}`;
    }),
  ];
  return lines.join('\n');
}

export async function shareFamilyDigest(text: string) {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return 'copied';
  }
  await Share.share({ message: text, title: 'Family update' });
  return 'shared';
}
