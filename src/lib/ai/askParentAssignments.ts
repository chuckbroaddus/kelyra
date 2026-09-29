/**
 * Parent Ask: resolve one linked child and shape that child's assignment list.
 * Named child wins over Home bind. Never blend siblings.
 */

export type LinkedChild = { id: string; display_name: string };

export type ParentAskChildResolve =
  | { ok: true; child: LinkedChild; source: 'named' | 'id' | 'bound' | 'only' }
  | { ok: false; kind: 'need_which_child'; children: LinkedChild[] }
  | { ok: false; kind: 'error'; error: string; matches?: LinkedChild[] };

export type ParentAskAssignmentRow = {
  title: string;
  due?: string;
  class_name?: string;
};

export function resolveParentAskChild(input: {
  linkedChildren: LinkedChild[];
  childName?: string | null;
  childStudentId?: string | null;
  /** Home / Ask bind — used only when no name identifies a different child. */
  boundStudentId?: string | null;
}): ParentAskChildResolve {
  const linked = input.linkedChildren ?? [];
  if (!linked.length) {
    return { ok: false, kind: 'error', error: 'No linked children on this parent seat.' };
  }

  const childName = (input.childName ?? '').trim();
  if (childName) {
    const needle = childName.toLowerCase();
    const matches = linked.filter((c) => {
      const n = c.display_name.toLowerCase();
      return n === needle || n.startsWith(needle) || n.includes(needle);
    });
    if (matches.length === 1 && matches[0]) {
      return { ok: true, child: matches[0], source: 'named' };
    }
    if (matches.length > 1) {
      return {
        ok: false,
        kind: 'error',
        error: `Which child — ${matches.map((m) => m.display_name).join(' or ')}? Do not mix siblings.`,
        matches,
      };
    }
    return {
      ok: false,
      kind: 'error',
      error: `No linked child matches “${childName}”. Ask which child.`,
    };
  }

  const byId = (input.childStudentId ?? '').trim();
  if (byId) {
    const hit = linked.find((c) => c.id === byId);
    if (!hit) {
      return { ok: false, kind: 'error', error: 'That student is not a linked child on this parent seat.' };
    }
    return { ok: true, child: hit, source: 'id' };
  }

  const bound = (input.boundStudentId ?? '').trim();
  if (bound) {
    const hit = linked.find((c) => c.id === bound);
    if (!hit) {
      return { ok: false, kind: 'error', error: 'Bound child is not linked to this parent seat.' };
    }
    return { ok: true, child: hit, source: 'bound' };
  }

  if (linked.length === 1 && linked[0]) {
    return { ok: true, child: linked[0], source: 'only' };
  }

  return { ok: false, kind: 'need_which_child', children: linked };
}

/** Titles + optional due/class only. Never scores, drafts, or sibling rows. */
export function shapeParentAskAssignments(
  rows: Array<{
    title: string | null | undefined;
    due_at?: string | null;
    class_name?: string | null;
  }>,
): ParentAskAssignmentRow[] {
  const out: ParentAskAssignmentRow[] = [];
  for (const row of rows) {
    const title = typeof row.title === 'string' ? row.title.trim() : '';
    if (!title) continue;
    const item: ParentAskAssignmentRow = { title };
    if (row.due_at) item.due = row.due_at;
    const className = typeof row.class_name === 'string' ? row.class_name.trim() : '';
    if (className) item.class_name = className;
    out.push(item);
  }
  return out;
}
