/**
 * Session ground for Ask assignment context (A-Filing).
 * Page screens stash a soft candidate; /ask alone never hard-assumes.
 */

export type AskAssignmentGround = {
  assignmentId: string;
  title: string;
  /** student soft-assume vs parent explicit pick */
  source: 'page' | 'picker' | 'explicit';
};

let pageCandidate: AskAssignmentGround | null = null;
let sessionGround: AskAssignmentGround | null = null;
let chattingOnly = false;
let parentChildId: string | null = null;
let staleNoticeShown = false;
let trayHintShown = false;

/** Lesson / assignment / practice screens call this on mount. */
export function setAskPageGround(next: { assignmentId: string; title: string } | null): void {
  pageCandidate = next
    ? { assignmentId: next.assignmentId, title: next.title, source: 'page' }
    : null;
}

export function peekAskPageGround(): AskAssignmentGround | null {
  return pageCandidate;
}

export function getAskSessionGround(): AskAssignmentGround | null {
  if (chattingOnly) return null;
  return sessionGround;
}

export function setAskSessionGround(next: AskAssignmentGround | null): void {
  sessionGround = next;
  if (next) chattingOnly = false;
}

export function clearAskAssignmentGround(): void {
  sessionGround = null;
  chattingOnly = false;
}

/**
 * Active class change while Ask may be open (IQG-CL-01..05 / MULT-01).
 * Clears session ground and page soft-candidate so prior-class ids cannot inject or soft-chip.
 * Does not set chattingOnly — parent card / Choose assignment can re-prompt.
 */
export function clearAskGroundOnActiveClassChange(): void {
  clearAskAssignmentGround();
  pageCandidate = null;
}

export function setAskJustChatting(): void {
  sessionGround = null;
  chattingOnly = true;
}

export function isAskJustChatting(): boolean {
  return chattingOnly;
}

/** Parent twins: bound child for ground. Null = fail closed for pack. */
export function getAskParentChildId(): string | null {
  return parentChildId;
}

export function setAskParentChildId(studentId: string | null): void {
  if (parentChildId && studentId && parentChildId !== studentId) {
    // Child switch clears assignment ground and re-prompts (US-P / US-D2).
    sessionGround = null;
    chattingOnly = false;
  }
  parentChildId = studentId;
}

/**
 * Effective assignment ground for Ask live context.
 * Parent never soft-assumes page. Tray alone never hard-assumes.
 */
export function effectiveAskAssignmentGround(role: string): AskAssignmentGround | null {
  if (chattingOnly) return null;
  if (sessionGround) return sessionGround;
  if (role === 'student' && pageCandidate) return pageCandidate;
  // Parent / teacher / tray: no soft page assume for pack inject.
  return null;
}

/** Soft chip candidate for student only (page or session). */
export function studentSoftGroundChip(): AskAssignmentGround | null {
  if (chattingOnly) return null;
  if (sessionGround) return sessionGround;
  return pageCandidate;
}

export function consumeStaleNoticeOnce(): boolean {
  if (staleNoticeShown) return false;
  staleNoticeShown = true;
  return true;
}

export function consumeTrayHintOnce(): boolean {
  if (trayHintShown) return false;
  trayHintShown = true;
  return true;
}

export function resetAskGroundSessionForTests(): void {
  pageCandidate = null;
  sessionGround = null;
  chattingOnly = false;
  parentChildId = null;
  staleNoticeShown = false;
  trayHintShown = false;
}
