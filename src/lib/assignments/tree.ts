import type { AssignmentRow } from '@/lib/supabase/types';

export type BookNodeKind = 'class' | 'unit' | 'section' | 'assignment';

export type BookNode = {
  kind: BookNodeKind;
  id: string;
  title: string;
  indent: number;
  expandable: boolean;
  assignment?: AssignmentRow;
};

const OTHER = 'Other';

function label(value: string | null | undefined) {
  return (value ?? '').trim();
}

export function groupingLabels(assignments: AssignmentRow[]): { units: string[]; sections: string[] } {
  const units: string[] = [];
  const sections: string[] = [];
  for (const row of assignments) {
    const unit = label(row.unit);
    const section = label(row.section);
    if (unit && !units.includes(unit)) units.push(unit);
    if (section && !sections.includes(section)) sections.push(section);
  }
  return { units, sections };
}

export function buildAssignmentTree(className: string, assignments: AssignmentRow[]): BookNode[] {
  const hasUnit = assignments.some((row) => label(row.unit));
  const hasSection = assignments.some((row) => label(row.section));
  const classId = 'class';
  const nodes: BookNode[] = [
    { kind: 'class', id: classId, title: className.trim() || 'Class', indent: 0, expandable: true },
  ];

  if (!hasUnit && !hasSection) {
    for (const row of assignments) {
      nodes.push({
        kind: 'assignment',
        id: row.id,
        title: row.title,
        indent: 1,
        expandable: false,
        assignment: row,
      });
    }
    return nodes;
  }

  if (hasUnit && !hasSection) {
    for (const unit of unitOrder(assignments)) {
      const unitId = `unit:${unit}`;
      nodes.push({ kind: 'unit', id: unitId, title: unit, indent: 1, expandable: true });
      for (const row of assignments.filter((item) => (label(item.unit) || OTHER) === unit)) {
        nodes.push({
          kind: 'assignment',
          id: row.id,
          title: row.title,
          indent: 2,
          expandable: false,
          assignment: row,
        });
      }
    }
    return nodes;
  }

  if (!hasUnit && hasSection) {
    for (const section of sectionOrder(assignments, '')) {
      const sectionId = `section::${section}`;
      nodes.push({ kind: 'section', id: sectionId, title: section, indent: 1, expandable: true });
      for (const row of assignments.filter((item) => (label(item.section) || OTHER) === section)) {
        nodes.push({
          kind: 'assignment',
          id: row.id,
          title: row.title,
          indent: 2,
          expandable: false,
          assignment: row,
        });
      }
    }
    return nodes;
  }

  for (const unit of unitOrder(assignments)) {
    const unitId = `unit:${unit}`;
    nodes.push({ kind: 'unit', id: unitId, title: unit, indent: 1, expandable: true });
    for (const section of sectionOrder(assignments, unit)) {
      const sectionId = `section:${unit}:${section}`;
      nodes.push({ kind: 'section', id: sectionId, title: section, indent: 2, expandable: true });
      for (const row of assignments.filter(
        (item) => (label(item.unit) || OTHER) === unit && (label(item.section) || OTHER) === section,
      )) {
        nodes.push({
          kind: 'assignment',
          id: row.id,
          title: row.title,
          indent: 3,
          expandable: false,
          assignment: row,
        });
      }
    }
  }
  return nodes;
}

export function flattenBookTree(nodes: BookNode[], expanded: Set<string>): BookNode[] {
  const visible: BookNode[] = [];
  const ancestors: BookNode[] = [];
  for (const node of nodes) {
    while (ancestors.length && ancestors[ancestors.length - 1]!.indent >= node.indent) {
      ancestors.pop();
    }
    const open = ancestors.every((item) => !item.expandable || expanded.has(item.id));
    if (open) visible.push(node);
    if (node.expandable) ancestors.push(node);
  }
  return visible;
}

export function defaultExpandedIds(nodes: BookNode[]): string[] {
  return nodes.filter((node) => node.expandable).map((node) => node.id);
}

function unitOrder(assignments: AssignmentRow[]) {
  const names: string[] = [];
  for (const row of assignments) {
    const unit = label(row.unit) || OTHER;
    if (!names.includes(unit)) names.push(unit);
  }
  return names;
}

function sectionOrder(assignments: AssignmentRow[], unit: string) {
  const names: string[] = [];
  const rows = unit
    ? assignments.filter((row) => (label(row.unit) || OTHER) === unit)
    : assignments;
  for (const row of rows) {
    const section = label(row.section) || OTHER;
    if (!names.includes(section)) names.push(section);
  }
  return names;
}
