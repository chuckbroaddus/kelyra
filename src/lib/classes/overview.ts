import { requireSupabase } from '@/lib/supabase/client';

export type GapCount = {
  label: string;
  count: number;
};

export type FocusStudent = {
  id: string;
  displayName: string;
  focusLabel: string;
};

export type ClassOverview = {
  unassignedCount: number;
  draftCount: number;
  focusStudents: FocusStudent[];
  commonGaps: GapCount[];
};

export async function loadClassOverview(classId: string): Promise<ClassOverview> {
  const supabase = requireSupabase();

  const [{ count: unassignedCount }, { count: draftCount }, { data: enrollments }, { data: gaps }] =
    await Promise.all([
      supabase
        .from('captures')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', classId)
        .eq('status', 'unassigned'),
      supabase
        .from('captures')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', classId)
        .eq('status', 'draft'),
      supabase.from('enrollments').select('student_id').eq('class_id', classId),
      supabase.from('skill_gaps').select('label, status, student_id, capture_id'),
    ]);

  const studentIds = (enrollments ?? []).map((row) => row.student_id);
  let focusStudents: FocusStudent[] = [];
  if (studentIds.length) {
    const { data: students } = await supabase
      .from('students')
      .select('id, display_name, current_focus_skill_id')
      .in('id', studentIds)
      .not('current_focus_skill_id', 'is', null);
    const skillIds = (students ?? [])
      .map((row) => row.current_focus_skill_id)
      .filter((id): id is string => Boolean(id));
    const { data: skills } = skillIds.length
      ? await supabase.from('skills').select('id, label').in('id', skillIds)
      : { data: [] };
    const labelById = new Map((skills ?? []).map((row) => [row.id, row.label]));
    focusStudents = (students ?? []).flatMap((row) => {
      const focusLabel = row.current_focus_skill_id
        ? labelById.get(row.current_focus_skill_id)
        : undefined;
      if (!focusLabel) return [];
      return [{ id: row.id, displayName: row.display_name, focusLabel }];
    });
  }

  const { data: classCaptures } = await supabase.from('captures').select('id').eq('class_id', classId);
  const captureIds = new Set((classCaptures ?? []).map((row) => row.id));
  const counts = new Map<string, number>();
  for (const gap of gaps ?? []) {
    if (gap.status !== 'approved' || !captureIds.has(gap.capture_id)) continue;
    const label = gap.label.trim();
    if (!label) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const commonGaps = [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return {
    unassignedCount: unassignedCount ?? 0,
    draftCount: draftCount ?? 0,
    focusStudents,
    commonGaps,
  };
}
