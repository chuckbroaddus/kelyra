import { requireSupabase } from '@/lib/supabase/client';

export type GapStudent = {
  id: string;
  displayName: string;
};

export type GapCount = {
  label: string;
  key: string;
  count: number;
  students: GapStudent[];
};

export type HeatmapCell = 'focus' | 'gap' | null;

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
  heatmapStudents: GapStudent[];
  heatmapSkills: Array<{ key: string; label: string }>;
  heatmap: Record<string, Record<string, HeatmapCell>>;
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

  const { data: rosterRows } = studentIds.length
    ? await supabase.from('students').select('id, display_name, current_focus_skill_id').in('id', studentIds)
    : { data: [] };
  const nameById = new Map((rosterRows ?? []).map((row) => [row.id, row.display_name]));

  const byKey = new Map<string, { label: string; studentIds: Set<string> }>();
  const heatmap: Record<string, Record<string, HeatmapCell>> = {};
  for (const studentId of studentIds) heatmap[studentId] = {};

  for (const gap of gaps ?? []) {
    if (gap.status !== 'approved' || !captureIds.has(gap.capture_id)) continue;
    const label = gap.label.trim();
    if (!label) continue;
    const key = normalizeGap(label);
    const bucket = byKey.get(key) ?? { label, studentIds: new Set<string>() };
    bucket.studentIds.add(gap.student_id);
    if (label.length > bucket.label.length) bucket.label = label;
    byKey.set(key, bucket);
    if (heatmap[gap.student_id]) heatmap[gap.student_id][key] = 'gap';
  }

  for (const row of focusStudents) {
    const key = normalizeGap(row.focusLabel);
    const bucket = byKey.get(key) ?? { label: row.focusLabel, studentIds: new Set<string>() };
    bucket.studentIds.add(row.id);
    byKey.set(key, bucket);
    if (heatmap[row.id]) heatmap[row.id][key] = 'focus';
  }

  const commonGaps = [...byKey.entries()]
    .map(([key, bucket]) => ({
      key,
      label: bucket.label,
      count: bucket.studentIds.size,
      students: [...bucket.studentIds]
        .map((id) => ({ id, displayName: nameById.get(id) ?? 'Student' }))
        .sort((a, b) => a.displayName.localeCompare(b.displayName)),
    }))
    .sort((a, b) => b.count - a.count);

  const heatmapSkills = commonGaps.slice(0, 8).map((gap) => ({ key: gap.key, label: gap.label }));
  const heatmapStudents = (rosterRows ?? [])
    .map((row) => ({ id: row.id, displayName: row.display_name }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  return {
    unassignedCount: unassignedCount ?? 0,
    draftCount: draftCount ?? 0,
    focusStudents,
    commonGaps: commonGaps.slice(0, 6),
    heatmapStudents,
    heatmapSkills,
    heatmap,
  };
}

function normalizeGap(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
