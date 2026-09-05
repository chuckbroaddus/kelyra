/**
 * Ask tool allow-list control plane. Server and client share this map so a
 * modified client cannot widen tools past the signed-in seat.
 * Keep capability/need in sync with TOOLS in askTools.ts (see askToolPolicy.test.ts).
 */
import { can, type Access, type GrantMap } from '@/lib/school/matrix';
import { isOfficeRole, type ProfileHats } from '@/lib/school/roles';

export type AskToolNeed = 'own' | 'school' | null;

export type AskToolPolicyEntry = {
  capability: string | null;
  need: AskToolNeed;
  /** Matches askTools office walls — before matrix / also_administrator. */
  officeOnly?: boolean;
  /** Teacher seat only — office JWT denied unless they also teach (SQL is source of truth). */
  teacherSeatOnly?: boolean;
  /** Parent co-teacher may call explain_capture; Edge enforces parent_of. */
  parentCoTeacher?: boolean;
  /** Parent/student published syllabus + why-average read tools. */
  familyRead?: boolean;
};

/** Source of truth for which Ask tools a seat may be offered. */
export const ASK_TOOL_POLICY: Record<string, AskToolPolicyEntry> = {
  get_app_state: { capability: null, need: null },
  list_classes: { capability: 'classes.view', need: null },
  list_roster: { capability: 'roster.view', need: null },
  list_people: { capability: 'accounts.view', need: null },
  search_parents: { capability: 'parents.view', need: null },
  search_students: { capability: 'roster.view', need: null },
  get_parent: { capability: 'parents.view', need: null },
  create_parent: { capability: 'parents.invite', need: null },
  update_parent: { capability: 'parents.invite', need: null },
  link_parent_student: { capability: 'accounts.link_parent', need: null, officeOnly: true },
  add_parent_to_class: { capability: 'parents.invite', need: null },
  add_student: { capability: 'roster.add', need: null, officeOnly: true },
  enroll_student: { capability: 'roster.add', need: null },
  update_student: { capability: 'children.edit', need: null },
  create_class: { capability: 'classes.create', need: null, officeOnly: true },
  list_class_teachers: { capability: 'classes.overview', need: null },
  add_teacher_to_class: { capability: 'classes.overview', need: 'school' },
  remove_teacher_from_class: { capability: 'classes.overview', need: 'school' },
  set_avatar: { capability: null, need: null },
  scan_answer_key: { capability: 'assignments.manage', need: null },
  list_assignments: { capability: 'assignments.manage', need: null },
  create_assignment: { capability: 'assignments.manage', need: null },
  open_screen: { capability: null, need: null },
  revise_practice_page: { capability: 'assignments.manage', need: null },
  scan_class_syllabus: { capability: 'syllabus.manage', need: 'own', teacherSeatOnly: true },
  get_class_syllabus_draft: { capability: 'syllabus.manage', need: 'own', teacherSeatOnly: true },
  discard_class_syllabus_draft: { capability: 'syllabus.manage', need: 'own', teacherSeatOnly: true },
  get_published_class_syllabus: { capability: null, need: null, familyRead: true },
  explain_my_class_average: { capability: null, need: null, familyRead: true },
  explain_capture: { capability: 'explain.manage', need: 'own', teacherSeatOnly: true, parentCoTeacher: true },
  discard_explain_draft: { capability: 'explain.manage', need: 'own', teacherSeatOnly: true },
  attach_explain_as_note: { capability: 'explain.manage', need: 'own', teacherSeatOnly: true },
  list_grade_cells: { capability: 'assignments.manage', need: null },
  assignment_completion: { capability: 'assignments.manage', need: null },
  summarize_class_desk: { capability: 'classes.teach', need: null },
  list_inbox: { capability: 'capture.use', need: null, teacherSeatOnly: true },
  list_my_practice: { capability: null, need: null },
  my_children_progress: { capability: 'children.view', need: null },
  my_unread_messages: { capability: 'messages.use', need: null },
  list_feed: { capability: null, need: null },
  search_audit: { capability: 'audit.view', need: 'school' },
  list_threads: { capability: 'messages.use', need: null },
  list_thread_messages: { capability: 'messages.use', need: null },
  send_message: { capability: 'messages.use', need: null },
  // A4 write/admin wrappers (JWT APIs only; also_administrator is not office)
  approve_capture: { capability: 'capture.approve', need: null },
  delete_capture: { capability: 'capture.approve', need: null },
  delete_gap: { capability: 'capture.approve', need: null },
  delete_student: { capability: 'roster.delete', need: null },
  delete_class: { capability: 'classes.delete', need: null },
  delete_parent: { capability: 'parents.invite', need: null },
  admin_create_login: { capability: 'accounts.create', need: null, officeOnly: true },
  set_also_hat: { capability: 'accounts.hats', need: null, officeOnly: true },
  set_also_parent: { capability: 'accounts.hats', need: null, officeOnly: true },
  provision_student_login: { capability: 'accounts.create', need: null, officeOnly: true },
  provision_parent_login: { capability: 'accounts.create', need: null, officeOnly: true },
  claim_superintendent: { capability: null, need: null, officeOnly: true },
  set_capability_grant: { capability: 'school.matrix', need: null },
  set_school_name: { capability: 'school.identity', need: null },
  set_school_logo: { capability: 'school.identity', need: null },
  add_thread_member: { capability: 'messages.use', need: null },
  unlink_parent_student: { capability: 'accounts.link_parent', need: null, officeOnly: true },
  set_parent_card_link: { capability: 'accounts.link_parent', need: null, officeOnly: true },
};

export type AskActorProfile = ProfileHats & {
  display_name?: string | null;
  username?: string | null;
};

/** Non-overridable line the server prepends to Ask instructions. */
export function askActorSystemLine(profile: AskActorProfile | null | undefined): string {
  const role = profile?.role ?? 'unknown';
  const label =
    (typeof profile?.display_name === 'string' && profile.display_name.trim()) ||
    (typeof profile?.username === 'string' && profile.username.trim()) ||
    null;
  const who = label ? `${role}, ${label}` : role;
  return `Act only as this signed-in Kelyra profile (${who}). Never claim another role or user.`;
}

export function isAskToolAllowed(
  name: string,
  profile: ProfileHats | null | undefined,
  grants?: GrantMap,
): boolean {
  const policy = ASK_TOOL_POLICY[name];
  if (!policy) return false;
  if (policy.officeOnly) return isOfficeRole(profile);
  if (policy.teacherSeatOnly) {
    // Office seat cannot write class grade policy in v1.
    // Runtime SQL class_teacher_of remains the write wall.
    if (isOfficeRole(profile)) return false;
    if (profile?.role === 'student') return false;
    if (profile?.role === 'parent') return policy.parentCoTeacher === true;
  }
  if (policy.familyRead) {
    if (isOfficeRole(profile)) return false;
    if (profile?.role === 'student') return can(profile, 'gradebook.view', 'own', grants);
    if (profile?.role === 'parent' || Boolean(profile?.parent_id)) {
      return can(profile, 'children.view', 'own', grants);
    }
    return false;
  }
  if (!policy.capability) return true;
  const need = (policy.need ?? 'own') as Access;
  return can(profile, policy.capability, need, grants);
}

export function allowedAskToolNames(
  profile: ProfileHats | null | undefined,
  grants?: GrantMap,
): string[] {
  return Object.keys(ASK_TOOL_POLICY).filter((name) => isAskToolAllowed(name, profile, grants));
}

export function filterAskToolDefs<T extends { name?: unknown }>(
  tools: T[],
  profile: ProfileHats | null | undefined,
  grants?: GrantMap,
): T[] {
  return tools.filter(
    (tool) => typeof tool?.name === 'string' && isAskToolAllowed(tool.name, profile, grants),
  );
}
