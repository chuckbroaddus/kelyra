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

/** Cap keeps Gemini tool rounds small; full book still lives on Grades. */
export const PARENT_ASK_ASSIGNMENT_LIMIT = 40;

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

function sortParentAskAssignments(rows: ParentAskAssignmentRow[]): ParentAskAssignmentRow[] {
  return [...rows].sort((a, b) => {
    const ad = a.due ?? '';
    const bd = b.due ?? '';
    if (ad && bd && ad !== bd) return ad.localeCompare(bd);
    if (ad && !bd) return -1;
    if (!ad && bd) return 1;
    return a.title.localeCompare(b.title);
  });
}

export type ParentAskBookSlice = {
  classes: Array<{ classId: string; className: string }>;
  assignments: Array<{ title: string | null; due_at?: string | null; class_id: string }>;
};

/**
 * Core list_my_assignments body (injectable loaders for unit tests; no live model).
 * Linked-children scope only — never teacher list_assignments / sibling blend.
 */
export async function buildParentAskAssignmentToolResult(input: {
  linkedChildren: LinkedChild[];
  childName?: string | null;
  childStudentId?: string | null;
  boundStudentId?: string | null;
  loadBook: (studentId: string, meta: { displayName: string }) => Promise<ParentAskBookSlice>;
}): Promise<Record<string, unknown>> {
  const resolved = resolveParentAskChild({
    linkedChildren: input.linkedChildren,
    childName: input.childName,
    childStudentId: input.childStudentId,
    boundStudentId: input.boundStudentId,
  });
  if (!resolved.ok) {
    if (resolved.kind === 'need_which_child') {
      return {
        need_which_child: true,
        children: resolved.children.map((c) => ({ id: c.id, name: c.display_name })),
        note: 'Ask which child in this thread. Do not return a mixed sibling assignment list.',
      };
    }
    return {
      error: resolved.error,
      ...(resolved.matches
        ? { matches: resolved.matches.map((c) => ({ id: c.id, name: c.display_name })) }
        : {}),
    };
  }

  let book: ParentAskBookSlice;
  try {
    book = await input.loadBook(resolved.child.id, { displayName: resolved.child.display_name });
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Could not load that child's assignments. A failed class lookup is not a list.",
    };
  }

  const classNameById = new Map(book.classes.map((room) => [room.classId, room.className]));
  const shaped = sortParentAskAssignments(
    shapeParentAskAssignments(
      book.assignments.map((row) => ({
        title: row.title,
        due_at: row.due_at,
        class_name: classNameById.get(row.class_id) ?? null,
      })),
    ),
  );
  const truncated = shaped.length > PARENT_ASK_ASSIGNMENT_LIMIT;
  const assignments = shaped.slice(0, PARENT_ASK_ASSIGNMENT_LIMIT);
  return {
    child_id: resolved.child.id,
    child_name: resolved.child.display_name,
    assignments,
    count: assignments.length,
    ...(truncated ? { truncated: true, total_visible: shaped.length } : {}),
    note:
      assignments.length === 0
        ? "No assignments visible for this child. Do not invent titles or borrow a sibling's list."
        : "One child only. Do not mix a sibling's work into the reply. Reply with this list now — no more tools.",
  };
}

function dueLabel(due?: string): string | null {
  if (!due) return null;
  const day = /^(\d{4}-\d{2}-\d{2})/.exec(due);
  return day?.[1] ?? due;
}

/**
 * Turn a list_my_assignments tool JSON into the parent-facing Ask reply.
 * Used when the model stops mid-loop after tools (DITL stop-mid-work miss).
 */
export function formatParentAskListToolReply(raw: string | Record<string, unknown> | null | undefined): string | null {
  let data: Record<string, unknown> | null = null;
  if (raw && typeof raw === 'object') data = raw as Record<string, unknown>;
  else if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object') data = parsed as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  if (!data) return null;

  if (data.need_which_child === true) {
    const kids = Array.isArray(data.children)
      ? data.children
          .map((row) => {
            if (!row || typeof row !== 'object') return '';
            const name = (row as { name?: unknown }).name;
            return typeof name === 'string' ? name.trim() : '';
          })
          .filter(Boolean)
      : [];
    if (kids.length >= 2) return `Which child — ${kids.join(' or ')}? Say the name in this thread.`;
    return 'Which child should I list assignments for? Say the name in this thread.';
  }

  if (typeof data.error === 'string' && data.error.trim()) {
    return data.error.trim();
  }

  if (!Array.isArray(data.assignments)) return null;
  const childName =
    typeof data.child_name === 'string' && data.child_name.trim() ? data.child_name.trim() : 'This child';
  const lines: string[] = [];
  for (const row of data.assignments) {
    if (!row || typeof row !== 'object') continue;
    const rec = row as { title?: unknown; due?: unknown; class_name?: unknown };
    const title = typeof rec.title === 'string' ? rec.title.trim() : '';
    if (!title) continue;
    const bits = [title];
    const className = typeof rec.class_name === 'string' ? rec.class_name.trim() : '';
    if (className) bits.push(className);
    const due = dueLabel(typeof rec.due === 'string' ? rec.due : undefined);
    if (due) bits.push(`due ${due}`);
    lines.push(`• ${bits.join(' — ')}`);
  }

  if (!lines.length) {
    return `${childName} has no assignments visible. Nothing invented.`;
  }

  const head = `${childName} — ${lines.length} assignment${lines.length === 1 ? '' : 's'}:`;
  const more =
    data.truncated === true && typeof data.total_visible === 'number'
      ? `\n(Showing ${lines.length} of ${data.total_visible}.)`
      : '';
  return `${head}\n${lines.join('\n')}${more}`;
}
