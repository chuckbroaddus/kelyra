import { Platform, Share } from 'react-native';

import { formatPracticeStatus } from '@/lib/parents/api';
import { focusLogFromMetadata, listRoster } from '@/lib/students/api';
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

export async function buildWeeklyFamilyDigest(classId: string, className: string): Promise<string> {
  const supabase = requireSupabase();
  const roster = await listRoster(classId);
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const studentIds = roster.map((row) => row.id);
  if (!studentIds.length) return `${className} — this week\n\nNo students on the roster yet.`;

  const [{ data: captures }, { data: submissions }] = await Promise.all([
    supabase
      .from('captures')
      .select('student_id, approved_at, teacher_note, parent_sentence')
      .eq('class_id', classId)
      .not('student_id', 'is', null)
      .gte('approved_at', since),
    supabase.from('submissions').select('student_id, status, submitted_at, created_at').in('student_id', studentIds),
  ]);

  const { data: gaps } = await supabase
    .from('skill_gaps')
    .select('student_id, label, status, created_at')
    .in('student_id', studentIds)
    .eq('status', 'approved')
    .gte('created_at', since);

  const linesByStudent = new Map<string, string[]>();
  const add = (studentId: string, line: string) => {
    const list = linesByStudent.get(studentId) ?? [];
    list.push(line);
    linesByStudent.set(studentId, list);
  };

  for (const gap of gaps ?? []) {
    add(gap.student_id, `working on ${gap.label}`);
  }
  for (const capture of captures ?? []) {
    if (capture.student_id && capture.parent_sentence) add(capture.student_id, capture.parent_sentence);
  }
  for (const row of submissions ?? []) {
    const when = row.submitted_at ?? row.created_at;
    if (!when || when < since) continue;
    if (row.status === 'submitted') add(row.student_id, 'practice submitted');
    else if (row.status === 'assigned') add(row.student_id, 'practice assigned');
  }
  for (const student of roster) {
    for (const item of focusLogFromMetadata(student.metadata)) {
      if (item.at < since) continue;
      add(student.id, item.result === 'proficient' ? `proficient in ${item.label}` : `focus dismissed: ${item.label}`);
    }
  }

  const blocks = roster.flatMap((student) => {
    const items = [...new Set(linesByStudent.get(student.id) ?? [])];
    if (!items.length) return [];
    return [`${student.display_name}: ${items.join('; ')}.`];
  });

  return [
    `${className} — this week`,
    '',
    ...(blocks.length ? blocks : ['No new family updates this week.']),
  ].join('\n');
}

export async function openFamilyEmail(subject: string, text: string) {
  const href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.href = href;
    return 'email';
  }
  await Share.share({ message: text, title: subject });
  return 'shared';
}

export async function shareFamilyDigest(text: string) {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return 'copied';
  }
  await Share.share({ message: text, title: 'Family update' });
  return 'shared';
}
