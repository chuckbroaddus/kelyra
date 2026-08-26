import type { AssignmentRow } from '@/lib/supabase/types';

export type BookNodeKind = 'class' | 'unit' | 'section' | 'assignment';

export type BookNode = {
  kind: BookNodeKind;
  id: string;
  title: string;
  indent: number;
  expandable: boolean;
  assignment?: AssignmentRow;
  /** Section sits on the same row as its unit; tap unit to fold the whole unit. */
  inlineUnit?: boolean;
  unitId?: string;
  unitTitle?: string;
  sectionTitle?: string;
};

const OTHER = 'Other';

function label(value: string | null | undefined) {
  return (value ?? '').trim();
}

const NUMERIC = /^-?\d+(\.\d+)?$/;

function numericValue(value: string): number | null {
  if (!NUMERIC.test(value)) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Numbers (low → high), then the rest A–Z. Used for unit/section chips. */
export function sortBookLabels(values: string[]): string[] {
  return [...values].sort((a, b) => {
    const aN = numericValue(a);
    const bN = numericValue(b);
    if (aN != null && bN != null) return aN - bN || a.localeCompare(b, 'en', { sensitivity: 'base' });
    if (aN != null) return -1;
    if (bN != null) return 1;
    return a.localeCompare(b, 'en', { sensitivity: 'base' });
  });
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
  return { units: sortBookLabels(units), sections: sortBookLabels(sections) };
}

export function buildAssignmentTree(
  className: string,
  assignments: AssignmentRow[],
  idPrefix = '',
): BookNode[] {
  const hasUnit = assignments.some((row) => label(row.unit));
  const hasSection = assignments.some((row) => label(row.section));
  const p = idPrefix ? `${idPrefix}:` : '';
  const classId = `${p}class`;
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
      const unitId = `${p}unit:${unit}`;
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
      const sectionId = `${p}section::${section}`;
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
    const unitId = `${p}unit:${unit}`;
    nodes.push({
      kind: 'unit',
      id: unitId,
      title: unit,
      indent: 1,
      expandable: true,
      inlineUnit: true,
    });
    for (const section of sectionOrder(assignments, unit)) {
      const sectionId = `${p}section:${unit}:${section}`;
      nodes.push({
        kind: 'section',
        id: sectionId,
        title: unitSectionHeading(unit, section),
        indent: 2,
        expandable: true,
        inlineUnit: true,
        unitId,
        unitTitle: unit,
        sectionTitle: section,
      });
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
          inlineUnit: true,
        });
      }
    }
  }
  return nodes;
}

/** One grade-book row: unit and section together. */
export function unitSectionHeading(unit: string, section: string): string {
  const u = unit.trim() || OTHER;
  const s = section.trim() || OTHER;
  if (u === OTHER && s === OTHER) return OTHER;
  if (u === OTHER) return s;
  if (s === OTHER) return u;
  return `${u} · ${s}`;
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

/** Hide expanded unit rows so unit · section can share one line. Collapsed units stay visible. */
export function visibleBookRows(nodes: BookNode[], expanded: Set<string>): BookNode[] {
  return flattenBookTree(nodes, expanded).filter(
    (row) => !(row.kind === 'unit' && row.inlineUnit && expanded.has(row.id)),
  );
}

export function bookRowPad(row: BookNode): number {
  // Combined unit·section rows live one indent deeper in the tree than they look.
  // Collapsed unit rows must keep that same visual inset — not slide under Class.
  // Indent 0 (class) is 0 so the name lines up with the frozen "Assignment" title
  // (StickyTable already pads the cell 8 pt, same as the header).
  const indent =
    row.inlineUnit && row.kind !== 'unit' ? Math.max(0, row.indent - 1) : row.indent;
  return indent * 12;
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
