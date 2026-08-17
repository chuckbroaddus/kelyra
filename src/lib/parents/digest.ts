import { Platform, Share } from 'react-native';

import { familyPracticeWords } from '@/lib/parents/api';
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

  const studentIds = roster.length ? roster.map((row) => row.id) : ['00000000-0000-0000-0000-000000000000'];
  const { data: submissions } = await supabase
    .from('submissions')
    .select('student_id, status, created_at, assignment_id')
    .in('student_id', studentIds)
    .order('created_at', { ascending: false });
  const assignmentIds = [...new Set((submissions ?? []).map((row) => row.assignment_id))];
  const { data: assignments } = assignmentIds.length
    ? await supabase.from('assignments').select('id, kind').in('id', assignmentIds)
    : { data: [] };
  const practiceIds = new Set(
    (assignments ?? []).filter((row) => row.kind === 'practice').map((row) => row.id),
  );

  const latestStatus = new Map<string, string>();
  for (const row of submissions ?? []) {
    if (!practiceIds.has(row.assignment_id)) continue;
    if (!latestStatus.has(row.student_id)) latestStatus.set(row.student_id, row.status);
  }

  const lines = [className, 'Family update', ''];
  for (const student of roster) {
    const focus =
      student.current_focus_skill_id && labelById.get(student.current_focus_skill_id)
        ? `Working on ${labelById.get(student.current_focus_skill_id)}`
        : 'No focus skill yet';
    lines.push(student.display_name);
    lines.push(focus);
    lines.push(`Practice: ${familyPracticeWords(latestStatus.get(student.id) ?? null)}`);
    if (student.parent_sentence) lines.push(student.parent_sentence);
    lines.push('');
  }
  return lines.join('\n').trimEnd();
}

export async function buildWeeklyFamilyDigest(classId: string, className: string): Promise<string> {
  const supabase = requireSupabase();
  const roster = await listRoster(classId);
  if (!roster.length) {
    return `${className}\nThis week\n\nNo students on the roster yet.`;
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const studentIds = roster.map((row) => row.id);

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
    add(gap.student_id, `Working on ${gap.label}`);
  }
  for (const capture of captures ?? []) {
    if (capture.student_id && capture.parent_sentence) add(capture.student_id, capture.parent_sentence);
  }
  for (const row of submissions ?? []) {
    const when = row.submitted_at ?? row.created_at;
    if (!when || when < since) continue;
    if (row.status === 'submitted') add(row.student_id, 'Practice done');
    else if (row.status === 'assigned') add(row.student_id, 'Practice assigned');
  }
  for (const student of roster) {
    for (const item of focusLogFromMetadata(student.metadata)) {
      if (item.at < since) continue;
      add(
        student.id,
        item.result === 'proficient' ? `Proficient in ${item.label}` : `Stopped focusing on ${item.label}`,
      );
    }
  }

  const blocks = roster.flatMap((student) => {
    const items = [...new Set(linesByStudent.get(student.id) ?? [])];
    if (!items.length) return [];
    return [student.display_name, ...items.map((item) => `• ${item}`), ''];
  });

  return [
    className,
    'This week',
    '',
    ...(blocks.length ? blocks : ['No new notes to send home this week.']),
  ]
    .join('\n')
    .trimEnd();
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
