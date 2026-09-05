/**
 * Edge / ai-dev twin of src/lib/ai/askToolPolicy.ts.
 * Keep ASK_TOOL_POLICY identical — askToolPolicy.test.ts syncs the maps.
 */

export type Access = 'none' | 'own' | 'school' | 'all';
export type SchoolRole = 'superintendent' | 'administrator' | 'teacher' | 'parent' | 'student';

export type AskToolNeed = 'own' | 'school' | null;

export type AskToolPolicyEntry = {
  capability: string | null;
  need: AskToolNeed;
  officeOnly?: boolean;
  teacherSeatOnly?: boolean;
  /** Parent co-teacher may call explain_capture; Edge enforces parent_of. */
  parentCoTeacher?: boolean;
  familyRead?: boolean;
};

export type ProfileHats = {
  role?: SchoolRole | null;
  parent_id?: string | null;
  also_administrator?: boolean | null;
  also_teacher?: boolean | null;
  display_name?: string | null;
  username?: string | null;
};

export type GrantMap = Record<string, Record<SchoolRole, Access>>;

/** Same map as src/lib/ai/askToolPolicy.ts */
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
};

/** Product defaults for capabilities Ask tools reference (subset of matrix CAPABILITIES). */
const ASK_CAPABILITY_DEFAULTS: GrantMap = {
  'classes.view': { superintendent: 'school', administrator: 'school', teacher: 'own', parent: 'none', student: 'own' },
  'roster.view': { superintendent: 'school', administrator: 'school', teacher: 'own', parent: 'own', student: 'own' },
  'accounts.view': { superintendent: 'school', administrator: 'school', teacher: 'school', parent: 'school', student: 'school' },
  'parents.view': { superintendent: 'school', administrator: 'school', teacher: 'own', parent: 'own', student: 'none' },
  'parents.invite': { superintendent: 'school', administrator: 'school', teacher: 'own', parent: 'none', student: 'none' },
  'accounts.link_parent': { superintendent: 'school', administrator: 'school', teacher: 'none', parent: 'none', student: 'none' },
  'roster.add': { superintendent: 'school', administrator: 'school', teacher: 'own', parent: 'none', student: 'none' },
  'children.edit': { superintendent: 'school', administrator: 'school', teacher: 'own', parent: 'own', student: 'none' },
  'classes.create': { superintendent: 'own', administrator: 'own', teacher: 'none', parent: 'none', student: 'none' },
  'classes.overview': { superintendent: 'school', administrator: 'school', teacher: 'own', parent: 'none', student: 'none' },
  'assignments.manage': { superintendent: 'school', administrator: 'school', teacher: 'own', parent: 'none', student: 'own' },
  'syllabus.manage': { superintendent: 'none', administrator: 'none', teacher: 'own', parent: 'none', student: 'none' },
  'explain.manage': { superintendent: 'none', administrator: 'none', teacher: 'own', parent: 'own', student: 'none' },
  'gradebook.view': { superintendent: 'school', administrator: 'school', teacher: 'own', parent: 'none', student: 'own' },
  'children.view': { superintendent: 'own', administrator: 'own', teacher: 'own', parent: 'own', student: 'none' },
  'accounts.edit': { superintendent: 'all', administrator: 'school', teacher: 'own', parent: 'own', student: 'own' },
};

const RANK: Record<Access, number> = { none: 0, own: 1, school: 2, all: 3 };

function isAlsoParent(profile: ProfileHats | null | undefined): boolean {
  return Boolean(profile?.parent_id) || profile?.role === 'parent';
}

export function isOfficeRole(profile: ProfileHats | null | undefined): boolean {
  return profile?.role === 'superintendent' || profile?.role === 'administrator';
}

function maxAccess(levels: Access[]): Access {
  return levels.reduce((best, item) => (RANK[item] > RANK[best] ? item : best), 'none' as Access);
}

export function grantsFromAskDefaults(): GrantMap {
  const map: GrantMap = {};
  for (const [id, row] of Object.entries(ASK_CAPABILITY_DEFAULTS)) {
    map[id] = { ...row };
  }
  return map;
}

/** Merge capability_grants rows onto Ask defaults (empty table → defaults). */
export function mergeAskGrants(
  rows: Array<{ capability_id?: string | null; role?: string | null; access?: string | null }> | null | undefined,
): GrantMap {
  const map = grantsFromAskDefaults();
  if (!rows?.length) return map;
  for (const row of rows) {
    const cap = row.capability_id;
    const role = row.role as SchoolRole | undefined;
    const access = row.access as Access | undefined;
    if (!cap || !role || !access) continue;
    if (!map[cap]) {
      map[cap] = {
        superintendent: 'none',
        administrator: 'none',
        teacher: 'none',
        parent: 'none',
        student: 'none',
      };
    }
    if (!(role in map[cap]!)) continue;
    if (access !== 'none' && access !== 'own' && access !== 'school' && access !== 'all') continue;
    map[cap]![role] = access;
  }
  return map;
}

function accessForHats(
  profile: ProfileHats | null | undefined,
  capabilityId: string,
  grants?: GrantMap,
): Access {
  if (!profile?.role) return 'none';
  const row = (grants ?? grantsFromAskDefaults())[capabilityId];
  if (!row) return 'none';
  const levels: Access[] = [row[profile.role]];
  if (profile.role === 'superintendent') levels.push(row.administrator);
  if (profile.also_administrator) levels.push(row.administrator);
  if (profile.also_teacher) levels.push(row.teacher);
  if (isAlsoParent(profile)) levels.push(row.parent);
  return maxAccess(levels);
}

export function can(
  profile: ProfileHats | null | undefined,
  capabilityId: string,
  need: Access = 'own',
  grants?: GrantMap,
): boolean {
  return RANK[accessForHats(profile, capabilityId, grants)] >= RANK[need];
}

export function askActorSystemLine(profile: ProfileHats | null | undefined): string {
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
