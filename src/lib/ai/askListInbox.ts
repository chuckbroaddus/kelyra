/**
 * Ask list_inbox — same Needs list as /inbox for the active Teach seat.
 * Gate is chrome live.role (not teacherId). Missing teacherId must not refuse.
 * DITL t_837efff9 / AC-ASK-INBOX-1..3.
 */

export type AskListInboxLive = { role: string };

export type AskListInboxCapture = {
  id: string;
  status: string;
  ai_status?: string | null;
  student_id?: string | null;
  matchedName?: string | null;
};

export type AskListInboxDeps = {
  listInbox: (classId: string) => Promise<AskListInboxCapture[]>;
};

/** True when Ask may offer/run list_inbox for this chrome seat (matches /inbox tray). */
export function isListInboxTeachSeat(liveRole: string | null | undefined): boolean {
  return liveRole === 'teacher';
}

function str(args: Record<string, unknown>, key: string): string | null {
  const value = args[key];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

/**
 * Run list_inbox. Teach seat only. Empty items is success (not a seat refusal).
 * Never returns "Teacher seat required."
 */
export async function runAskListInbox(
  args: Record<string, unknown>,
  ctx: { live: AskListInboxLive; classId: string | null },
  deps: AskListInboxDeps,
): Promise<Record<string, unknown>> {
  if (!isListInboxTeachSeat(ctx.live.role)) {
    return { error: 'Needs inbox is only on the Teach seat.' };
  }
  const classId = str(args, 'class_id') || ctx.classId;
  if (!classId) return { error: 'Need class_id.' };
  const items = await deps.listInbox(classId);
  return {
    class_id: classId,
    items: items.slice(0, 40).map((row) => ({
      id: row.id,
      status: row.status,
      ai_status: row.ai_status,
      student_id: row.student_id,
      matched_name: row.matchedName,
    })),
  };
}
