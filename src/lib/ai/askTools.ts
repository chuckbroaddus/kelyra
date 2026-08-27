import { invokeAi } from '@/lib/ai/invoke';
import { createAssignment, getAssignment, listClassAssignments } from '@/lib/assignments/api';
import { parseKeyItems, type AnswerKeyItem } from '@/lib/assignments/keys';
import {
  addTeacherToClass,
  createClass,
  listAvailableTeachers,
  listClasses,
  listClassTeachers,
  listSchoolClasses,
  removeTeacherFromClass,
} from '@/lib/classes/api';
import { uploadTeacherAsset } from '@/lib/media/upload';
import {
  addParentToClass,
  createParent,
  getParent,
  linkChild,
  listChildrenForParent,
  listParentsForClass,
  listParentsForLinking,
  listParentsForTeacher,
  patchParentMetadata,
  renameParent,
  type ClassParent,
} from '@/lib/parents/api';
import { PARENT_DETAIL_FIELDS, STUDENT_DETAIL_FIELDS, metaString } from '@/lib/people/metadata';
import { uploadProfilePhoto } from '@/lib/people/photos';
import { getFollowUpDraft } from '@/lib/practice/followUp';
import { buildFollowUpPack, loadFollowUpItems } from '@/lib/practice/followUpApi';
import { listDirectory, writeAudit } from '@/lib/school/api';
import { can, type Access, type GrantMap } from '@/lib/school/matrix';
import { isAskPasswordToolDenied } from '@/lib/school/resetPassword';
import { isAdminRole, isOfficeRole } from '@/lib/school/roles';
import {
  addTypedStudent,
  enrollExistingStudent,
  getStudent,
  listRoster,
  listStudentsForLinking,
  patchStudentMetadata,
} from '@/lib/students/api';
import type { ParentMetadataKey, ParentRow, ProfilePhotoKind, ProfileRow, StudentRow } from '@/lib/supabase/types';

import type { AskLiveContext } from '@/lib/ai/askPrompt';

type AskKeyScan = {
  pageState: string;
  header: string | null;
  items: AnswerKeyItem[];
  maxScore: number | null;
  teacherNote: string | null;
  phash: string | null;
  layout: number[] | null;
  imageUrl: string;
  mimeType: string;
};

let lastKeyScan: AskKeyScan | null = null;

export type AskAttachedPhoto = {
  imageUrl: string;
  mimeType: string;
};

export type AskToolContext = {
  profile: ProfileRow | null;
  teacherId: string | null;
  classId: string | null;
  grants: GrantMap;
  live: AskLiveContext;
  photo: AskAttachedPhoto | null;
};

export type AskToolDef = {
  type: 'function';
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type AskToolResult = {
  json: string;
  href?: string;
  label: string;
};

type AskToolSpec = {
  capability: string | null;
  need?: Access;
  def: AskToolDef;
  run: (args: Record<string, unknown>, ctx: AskToolContext) => Promise<unknown>;
};

const PARENT_KEYS = PARENT_DETAIL_FIELDS.map((field) => field.key);
const STUDENT_KEYS = STUDENT_DETAIL_FIELDS.map((field) => field.key);

function str(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  return typeof value === 'string' ? value.trim() : '';
}

function matchesName(display: string, query: string): boolean {
  const d = display.toLowerCase().trim();
  const q = query.toLowerCase().trim();
  if (!q) return true;
  if (d.includes(q)) return true;
  const dParts = d.split(/\s+/);
  const qParts = q.split(/\s+/);
  return qParts.every((part) => dParts.some((bit) => bit.startsWith(part)));
}

function parentFields(args: Record<string, unknown>): Partial<Record<ParentMetadataKey, string>> {
  const next: Partial<Record<ParentMetadataKey, string>> = {};
  for (const key of PARENT_KEYS) {
    const value = str(args, key);
    if (value) next[key] = value;
  }
  return next;
}

function summarizeParent(row: ParentRow | ClassParent) {
  const kids = 'children' in row && Array.isArray(row.children) ? row.children.map((child) => child.display_name) : [];
  return {
    id: row.id,
    name: row.display_name,
    phone: metaString(row.metadata, 'phone'),
    email: metaString(row.metadata, 'email'),
    relationship: metaString(row.metadata, 'relationship'),
    preferred_contact: metaString(row.metadata, 'preferred_contact'),
    children: kids,
  };
}

async function loadParents(ctx: AskToolContext): Promise<ClassParent[]> {
  if (isAdminRole(ctx.profile)) return listParentsForLinking();
  if (ctx.classId) {
    const pools = await listParentsForClass(ctx.classId);
    const seen = new Set<string>();
    return [...pools.linked, ...pools.available].filter((row) => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    });
  }
  if (ctx.teacherId) {
    const rows = await listParentsForTeacher(ctx.teacherId);
    return rows.map((row) => ({ ...row, photoUrl: null, children: [], inviteCount: 0 }));
  }
  return [];
}

async function findParents(ctx: AskToolContext, query: string): Promise<ClassParent[]> {
  const all = await loadParents(ctx);
  return query ? all.filter((row) => matchesName(row.display_name, query)) : all;
}

async function findStudents(ctx: AskToolContext, query: string): Promise<Array<StudentRow & { photoUrl?: string | null }>> {
  const all = await listStudentsForLinking(ctx.classId);
  return query ? all.filter((row) => matchesName(row.display_name, query)) : all;
}

async function resolveParent(ctx: AskToolContext, args: Record<string, unknown>): Promise<ParentRow | { error: string; matches?: unknown[] }> {
  const id = str(args, 'parent_id');
  if (id) return getParent(id);
  const name = str(args, 'parent_name') || str(args, 'name');
  if (!name) return { error: 'Need parent_id or parent_name.' };
  const hits = await findParents(ctx, name);
  if (hits.length === 1 && hits[0]) return hits[0];
  if (!hits.length) return { error: `No parent named ${name}.` };
  return { error: `Several parents match “${name}”. Pick one id.`, matches: hits.slice(0, 8).map((row) => summarizeParent(row)) };
}

async function resolveStudent(ctx: AskToolContext, args: Record<string, unknown>): Promise<StudentRow | { error: string; matches?: unknown[] }> {
  const id = str(args, 'student_id');
  if (id) return getStudent(id);
  const name = str(args, 'student_name');
  if (!name) return { error: 'Need student_id or student_name.' };
  const hits = await findStudents(ctx, name);
  if (hits.length === 1 && hits[0]) return hits[0];
  if (!hits.length) return { error: `No student named ${name}.` };
  return {
    error: `Several students match “${name}”. Pick one id.`,
    matches: hits.slice(0, 8).map((row) => ({ id: row.id, name: row.display_name })),
  };
}

async function resolveClassId(ctx: AskToolContext, args: Record<string, unknown>): Promise<string | { error: string; matches?: unknown[] }> {
  const id = str(args, 'class_id') || ctx.classId || '';
  if (id) return id;
  const name = str(args, 'class_name');
  if (!name) return { error: 'Need a class_id, class_name, or an open class.' };
  const classes = isAdminRole(ctx.profile) ? await listSchoolClasses() : await listClasses();
  const hits = classes.filter((row) => matchesName(row.name, name));
  if (hits.length === 1 && hits[0]) return hits[0].id;
  if (!hits.length) return { error: `No class named ${name}.` };
  return {
    error: `Several classes match “${name}”. Pick one id.`,
    matches: hits.slice(0, 8).map((row) => ({ id: row.id, name: row.name })),
  };
}

async function applyParentFields(parent: ParentRow, fields: Partial<Record<ParentMetadataKey, string>>): Promise<ParentRow> {
  let next = parent;
  for (const [key, value] of Object.entries(fields)) {
    if (!value) continue;
    next = await patchParentMetadata(next, key, value);
  }
  return next;
}

function dueAtFromInput(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T23:59:00.000Z`;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

async function scanAttachedKey(ctx: AskToolContext): Promise<AskKeyScan | { error: string }> {
  if (!ctx.photo?.imageUrl) return { error: 'Attach a photo of the answer key first.' };
  const analysis = await invokeAi<{
    pageState?: string;
    header?: string | null;
    items?: unknown;
    maxScore?: number | null;
    teacherNote?: string | null;
    phash?: string | null;
    layout?: number[] | null;
  }>('analyze-answer-key', { imageUrl: ctx.photo.imageUrl });
  const items = parseKeyItems(analysis.items);
  const scan: AskKeyScan = {
    pageState: analysis.pageState === 'blank' || analysis.pageState === 'filled' ? analysis.pageState : 'unsure',
    header: analysis.header ?? null,
    items,
    maxScore: typeof analysis.maxScore === 'number' ? analysis.maxScore : null,
    teacherNote: analysis.teacherNote ?? null,
    phash: analysis.phash ?? null,
    layout: Array.isArray(analysis.layout) ? analysis.layout.map((n) => Number(n)) : null,
    imageUrl: ctx.photo.imageUrl,
    mimeType: ctx.photo.mimeType || 'image/jpeg',
  };
  lastKeyScan = scan;
  return scan;
}

function summarizeKeyScan(scan: AskKeyScan) {
  return {
    pageState: scan.pageState,
    header: scan.header,
    itemCount: scan.items.length,
    maxScore: scan.maxScore,
    teacherNote: scan.teacherNote,
    items: scan.items.slice(0, 40).map((item) => ({
      n: item.n,
      stem: item.stem || undefined,
      answer: item.answer || undefined,
      points: item.points,
      needsTeacher: item.needsTeacher || undefined,
    })),
    note:
      scan.pageState === 'blank'
        ? 'Blanks were empty. Proposed answers are filled in. Confirm before creating the assignment.'
        : scan.pageState === 'filled'
          ? 'Read the written answers. Confirm before creating the assignment.'
          : 'Could not tell if the key was blank. Confirm answers before creating the assignment.',
  };
}

function hrefForScreen(ctx: AskToolContext, args: Record<string, unknown>): { href?: string; error?: string } {
  const screen = str(args, 'screen').toLowerCase();
  const classId = str(args, 'class_id') || ctx.classId || '';
  const studentId = str(args, 'student_id');
  const parentId = str(args, 'parent_id');
  switch (screen) {
    case 'school':
    case 'home':
      return { href: '/' };
    case 'people':
      return { href: '/?tab=people' };
    case 'activity':
      return { href: '/activity' };
    case 'inbox':
      return { href: '/inbox' };
    case 'capture':
      return { href: '/capture' };
    case 'messages':
      return { href: '/messages' };
    case 'profile':
      return { href: '/profile' };
    case 'feed':
      return { href: classId ? `/class/${classId}/feed` : '/?tab=feed' };
    case 'class':
    case 'desk':
      return classId ? { href: `/class/${classId}` } : { error: 'Need a class.' };
    case 'office':
    case 'office_card':
      return classId ? { href: `/admin/class/${classId}` } : { error: 'Need a class.' };
    case 'students':
    case 'roster':
      return classId ? { href: `/class/${classId}/setup` } : { error: 'Need a class.' };
    case 'parents':
      return classId ? { href: `/class/${classId}/parents` } : { error: 'Need a class.' };
    case 'gradebook':
      return classId ? { href: `/class/${classId}/gradebook` } : { error: 'Need a class.' };
    case 'assignments':
      return classId ? { href: `/class/${classId}/assignments` } : { error: 'Need a class.' };
    case 'student':
      return classId && studentId
        ? { href: `/class/${classId}/student/${studentId}` }
        : { error: 'Need a class and student.' };
    case 'parent':
      return classId && parentId
        ? { href: `/class/${classId}/parent/${parentId}` }
        : { error: 'Need a class and parent.' };
    default:
      return { error: 'Unknown screen. Use school, people, class, office, student, parent, inbox, capture, messages, feed, gradebook, assignments, activity, or profile.' };
  }
}

const TOOLS: Record<string, AskToolSpec> = {
  get_app_state: {
    capability: null,
    def: {
      type: 'function',
      name: 'get_app_state',
      description: 'Read the signed-in person’s live app context (role, open class, screen).',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
    run: async (_args, ctx) => ctx.live,
  },
  list_classes: {
    capability: 'classes.view',
    def: {
      type: 'function',
      name: 'list_classes',
      description: 'List classes this person may see.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
    run: async (_args, ctx) => {
      const rows = isAdminRole(ctx.profile) ? await listSchoolClasses() : await listClasses();
      return {
        classes: rows.map((row) => ({
          id: row.id,
          name: row.name,
          teacher: 'teacherName' in row ? row.teacherName : undefined,
        })),
      };
    },
  },
  list_roster: {
    capability: 'roster.view',
    def: {
      type: 'function',
      name: 'list_roster',
      description: 'List students in a class.',
      parameters: {
        type: 'object',
        properties: { class_id: { type: 'string' }, class_name: { type: 'string' } },
        additionalProperties: false,
      },
    },
    run: async (args, ctx) => {
      const classId = await resolveClassId(ctx, args);
      if (typeof classId !== 'string') return classId;
      const roster = await listRoster(classId);
      return { class_id: classId, students: roster.map((row) => ({ id: row.id, name: row.display_name })) };
    },
  },
  list_people: {
    capability: 'accounts.view',
    def: {
      type: 'function',
      name: 'list_people',
      description: 'List school logins (staff, parents, students) by name or role.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          role: { type: 'string', enum: ['staff', 'teacher', 'parent', 'student', 'administrator', 'superintendent'] },
        },
        additionalProperties: false,
      },
    },
    run: async (args) => {
      const query = str(args, 'query');
      const role = str(args, 'role');
      let people = await listDirectory();
      if (role === 'staff') people = people.filter((row) => row.role === 'teacher' || row.role === 'administrator' || row.role === 'superintendent' || row.also_teacher || row.also_administrator);
      else if (role) people = people.filter((row) => row.role === role || (role === 'teacher' && row.also_teacher) || (role === 'parent' && row.parent_id) || (role === 'administrator' && row.also_administrator));
      if (query) {
        people = people.filter(
          (row) =>
            matchesName(row.display_name || row.username, query) ||
            row.username.toLowerCase().includes(query.toLowerCase()),
        );
      }
      return {
        people: people.slice(0, 20).map((row) => ({
          id: row.id,
          name: row.display_name || row.username,
          handle: row.username,
          role: row.role,
          parent_id: row.parent_id,
          student_id: row.student_id,
        })),
        total: people.length,
      };
    },
  },
  search_parents: {
    capability: 'parents.view',
    def: {
      type: 'function',
      name: 'search_parents',
      description: 'Find parent records by name. Use before updating an existing parent.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
        additionalProperties: false,
      },
    },
    run: async (args, ctx) => {
      const hits = await findParents(ctx, str(args, 'query'));
      return { parents: hits.slice(0, 12).map((row) => summarizeParent(row)), total: hits.length };
    },
  },
  search_students: {
    capability: 'roster.view',
    def: {
      type: 'function',
      name: 'search_students',
      description: 'Find student records by name.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
        additionalProperties: false,
      },
    },
    run: async (args, ctx) => {
      const hits = await findStudents(ctx, str(args, 'query'));
      return { students: hits.slice(0, 12).map((row) => ({ id: row.id, name: row.display_name })), total: hits.length };
    },
  },
  get_parent: {
    capability: 'parents.view',
    def: {
      type: 'function',
      name: 'get_parent',
      description: 'Read one parent record, including contact fields.',
      parameters: {
        type: 'object',
        properties: { parent_id: { type: 'string' }, parent_name: { type: 'string' } },
        additionalProperties: false,
      },
    },
    run: async (args, ctx) => {
      const parent = await resolveParent(ctx, args);
      if ('error' in parent) return parent;
      return {
        ...summarizeParent(parent),
        address: metaString(parent.metadata, 'address'),
        notes: metaString(parent.metadata, 'notes'),
      };
    },
  },
  create_parent: {
    capability: 'parents.invite',
    def: {
      type: 'function',
      name: 'create_parent',
      description: 'Create a parent record and optionally set phone/email and link a child.',
      parameters: {
        type: 'object',
        properties: {
          display_name: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string' },
          address: { type: 'string' },
          relationship: { type: 'string', enum: ['mother', 'father', 'guardian', 'other'] },
          preferred_contact: { type: 'string', enum: ['call', 'text', 'email'] },
          notes: { type: 'string' },
          student_id: { type: 'string' },
          student_name: { type: 'string' },
          class_id: { type: 'string' },
          class_name: { type: 'string' },
        },
        required: ['display_name'],
        additionalProperties: false,
      },
    },
    run: async (args, ctx) => {
      if (!ctx.teacherId) return { error: 'Staff sign-in is required to create a parent.' };
      const displayName = str(args, 'display_name');
      if (!displayName) return { error: 'Parent name is required.' };
      const fields = parentFields(args);
      let studentId = str(args, 'student_id') || undefined;
      let note: string | undefined;
      if (!studentId && str(args, 'student_name')) {
        const student = await resolveStudent(ctx, args);
        if ('error' in student) note = student.error;
        else studentId = student.id;
      }
      const created = await createParent({
        teacherId: ctx.teacherId,
        displayName,
        createdVia: 'typed',
        metadata: fields,
        studentId,
      });
      let parent = await applyParentFields(created.parent, fields);
      let classId: string | null = null;
      if (str(args, 'class_id') || str(args, 'class_name') || ctx.classId) {
        const resolved = await resolveClassId(ctx, args);
        if (typeof resolved === 'string') {
          classId = resolved;
          await addParentToClass(resolved, parent.id, studentId ? [studentId] : []);
        } else note = [note, resolved.error].filter(Boolean).join(' ');
      }
      await writeAudit({
        action: 'create_parent',
        entityType: 'parent',
        entityId: parent.id,
        studentId: studentId ?? null,
        classId,
        after: { display_name: parent.display_name, via: 'ask', ...fields },
      }).catch(() => undefined);
      const href = classId ? `/class/${classId}/parent/${parent.id}` : undefined;
      return { created: true, ...summarizeParent(parent), class_id: classId, href, note };
    },
  },
  update_parent: {
    capability: 'parents.invite',
    def: {
      type: 'function',
      name: 'update_parent',
      description: 'Update an existing parent (phone, email, address, relationship, notes, name).',
      parameters: {
        type: 'object',
        properties: {
          parent_id: { type: 'string' },
          parent_name: { type: 'string' },
          display_name: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string' },
          address: { type: 'string' },
          relationship: { type: 'string', enum: ['mother', 'father', 'guardian', 'other'] },
          preferred_contact: { type: 'string', enum: ['call', 'text', 'email'] },
          notes: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
    run: async (args, ctx) => {
      const parent = await resolveParent(ctx, args);
      if ('error' in parent) return parent;
      const rename = str(args, 'display_name');
      const current = rename && rename !== parent.display_name ? await renameParent(parent.id, rename) : parent;
      const next = await applyParentFields(current, parentFields(args));
      await writeAudit({
        action: 'update_parent',
        entityType: 'parent',
        entityId: next.id,
        after: { display_name: next.display_name, via: 'ask' },
      }).catch(() => undefined);
      return { updated: true, ...summarizeParent(next) };
    },
  },
  link_parent_student: {
    capability: 'accounts.link_parent',
    def: {
      type: 'function',
      name: 'link_parent_student',
      description: 'Office only. Link a parent to a child as family. Teachers add existing linked children to a class with add_parent_to_class.',
      parameters: {
        type: 'object',
        properties: {
          parent_id: { type: 'string' },
          parent_name: { type: 'string' },
          student_id: { type: 'string' },
          student_name: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
    run: async (args, ctx) => {
      if (!isOfficeRole(ctx.profile)) return { error: 'Only the office can link a parent to a child.' };
      const parent = await resolveParent(ctx, args);
      if ('error' in parent) return parent;
      const student = await resolveStudent(ctx, args);
      if ('error' in student) return student;
      await linkChild(parent.id, student.id);
      return { linked: true, parent: parent.display_name, student: student.display_name };
    },
  },
  add_parent_to_class: {
    capability: 'parents.invite',
    def: {
      type: 'function',
      name: 'add_parent_to_class',
      description: 'Add an existing parent’s linked children to a class.',
      parameters: {
        type: 'object',
        properties: {
          parent_id: { type: 'string' },
          parent_name: { type: 'string' },
          class_id: { type: 'string' },
          class_name: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
    run: async (args, ctx) => {
      const parent = await resolveParent(ctx, args);
      if ('error' in parent) return parent;
      const classId = await resolveClassId(ctx, args);
      if (typeof classId !== 'string') return classId;
      const kids = await listChildrenForParent(parent.id);
      const added = await addParentToClass(classId, parent.id, kids.map((child) => child.id));
      return { added, parent: parent.display_name, class_id: classId, children: kids.map((child) => child.display_name) };
    },
  },
  add_student: {
    capability: 'roster.add',
    def: {
      type: 'function',
      name: 'add_student',
      description: 'Office only. Create a new student record and put them on a class. Teachers enroll existing students with enroll_student.',
      parameters: {
        type: 'object',
        properties: {
          display_name: { type: 'string' },
          class_id: { type: 'string' },
          class_name: { type: 'string' },
        },
        required: ['display_name'],
        additionalProperties: false,
      },
    },
    run: async (args, ctx) => {
      if (!isOfficeRole(ctx.profile)) return { error: 'Only the office may add a new student.' };
      if (!ctx.teacherId) return { error: 'Staff sign-in is required to add a student.' };
      const displayName = str(args, 'display_name');
      if (!displayName) return { error: 'Student name is required.' };
      const classId = await resolveClassId(ctx, args);
      if (typeof classId !== 'string') return classId;
      const student = await addTypedStudent(classId, ctx.teacherId, displayName);
      return { created: true, id: student.id, name: student.display_name, class_id: classId };
    },
  },
  enroll_student: {
    capability: 'roster.add',
    def: {
      type: 'function',
      name: 'enroll_student',
      description: 'Add an existing student to a class roster.',
      parameters: {
        type: 'object',
        properties: {
          student_id: { type: 'string' },
          student_name: { type: 'string' },
          class_id: { type: 'string' },
          class_name: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
    run: async (args, ctx) => {
      const student = await resolveStudent(ctx, args);
      if ('error' in student) return student;
      const classId = await resolveClassId(ctx, args);
      if (typeof classId !== 'string') return classId;
      await enrollExistingStudent(classId, student.id);
      return { enrolled: true, student: student.display_name, class_id: classId };
    },
  },
  update_student: {
    capability: 'children.edit',
    def: {
      type: 'function',
      name: 'update_student',
      description: 'Update student details (preferred name, grade, phone, notes).',
      parameters: {
        type: 'object',
        properties: {
          student_id: { type: 'string' },
          student_name: { type: 'string' },
          preferred_name: { type: 'string' },
          birthday: { type: 'string' },
          grade_or_age: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string' },
          address: { type: 'string' },
          notes: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
    run: async (args, ctx) => {
      const student = await resolveStudent(ctx, args);
      if ('error' in student) return student;
      let next = student;
      const saved: Record<string, string> = {};
      for (const key of STUDENT_KEYS) {
        const value = str(args, key);
        if (!value) continue;
        next = await patchStudentMetadata(next, key, value);
        saved[key] = value;
      }
      if (!Object.keys(saved).length) return { error: 'No student fields to update.' };
      return { updated: true, id: next.id, name: next.display_name, fields: saved };
    },
  },
  create_class: {
    capability: 'classes.create',
    def: {
      type: 'function',
      name: 'create_class',
      description: 'Office only. Create a class with no teacher until the office assigns one.',
      parameters: {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
        additionalProperties: false,
      },
    },
    run: async (args, ctx) => {
      if (!isOfficeRole(ctx.profile)) return { error: 'Only the office can create a class.' };
      const name = str(args, 'name');
      if (!name) return { error: 'Class name is required.' };
      const created = await createClass(name);
      return { created: true, id: created.id, name: created.name, href: `/admin/class/${created.id}` };
    },
  },
  list_class_teachers: {
    capability: 'classes.overview',
    def: {
      type: 'function',
      name: 'list_class_teachers',
      description: 'List teachers assigned to a class.',
      parameters: {
        type: 'object',
        properties: { class_id: { type: 'string' }, class_name: { type: 'string' } },
        additionalProperties: false,
      },
    },
    run: async (args, ctx) => {
      const classId = await resolveClassId(ctx, args);
      if (typeof classId !== 'string') return classId;
      const teachers = await listClassTeachers(classId);
      return { class_id: classId, teachers: teachers.map((row) => ({ id: row.id, name: row.display_name, handle: row.username })) };
    },
  },
  add_teacher_to_class: {
    capability: 'classes.overview',
    need: 'school',
    def: {
      type: 'function',
      name: 'add_teacher_to_class',
      description: 'Assign a teacher to a class from the office card.',
      parameters: {
        type: 'object',
        properties: {
          class_id: { type: 'string' },
          class_name: { type: 'string' },
          teacher_id: { type: 'string' },
          teacher_name: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
    run: async (args, ctx) => {
      const classId = await resolveClassId(ctx, args);
      if (typeof classId !== 'string') return classId;
      let teacherId = str(args, 'teacher_id');
      if (!teacherId) {
        const name = str(args, 'teacher_name');
        if (!name) return { error: 'Need teacher_id or teacher_name.' };
        const available = await listAvailableTeachers(classId);
        const hits = available.filter((row) => matchesName(row.display_name, name) || (row.username && matchesName(row.username, name)));
        if (hits.length === 1 && hits[0]) teacherId = hits[0].id;
        else if (!hits.length) return { error: `No teacher named ${name} available for that class.` };
        else return { error: `Several teachers match “${name}”.`, matches: hits.slice(0, 8).map((row) => ({ id: row.id, name: row.display_name })) };
      }
      await addTeacherToClass(classId, teacherId);
      return { added: true, class_id: classId, teacher_id: teacherId };
    },
  },
  remove_teacher_from_class: {
    capability: 'classes.overview',
    need: 'school',
    def: {
      type: 'function',
      name: 'remove_teacher_from_class',
      description: 'Remove a teacher from a class.',
      parameters: {
        type: 'object',
        properties: {
          class_id: { type: 'string' },
          class_name: { type: 'string' },
          teacher_id: { type: 'string' },
          teacher_name: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
    run: async (args, ctx) => {
      const classId = await resolveClassId(ctx, args);
      if (typeof classId !== 'string') return classId;
      let teacherId = str(args, 'teacher_id');
      if (!teacherId) {
        const name = str(args, 'teacher_name');
        if (!name) return { error: 'Need teacher_id or teacher_name.' };
        const assigned = await listClassTeachers(classId);
        const hits = assigned.filter((row) => matchesName(row.display_name, name));
        if (hits.length === 1 && hits[0]) teacherId = hits[0].id;
        else if (!hits.length) return { error: `No assigned teacher named ${name}.` };
        else return { error: `Several teachers match “${name}”.`, matches: hits.map((row) => ({ id: row.id, name: row.display_name })) };
      }
      await removeTeacherFromClass(classId, teacherId);
      return { removed: true, class_id: classId, teacher_id: teacherId };
    },
  },
  set_avatar: {
    capability: null,
    def: {
      type: 'function',
      name: 'set_avatar',
      description:
        'Process the attached face photo as an avatar (crop and cut out) and save it on a student, parent, or staff person. Use this for portraits and headshots. Requires a photo in this Ask thread. kind=self is the signed-in staff member.',
      parameters: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['student', 'parent', 'teacher', 'self'] },
          person_id: { type: 'string' },
          person_name: { type: 'string' },
        },
        required: ['kind'],
        additionalProperties: false,
      },
    },
    run: async (args, ctx) => {
      if (!ctx.photo?.imageUrl) return { error: 'Attach a photo first.' };
      if (!ctx.teacherId) return { error: 'Staff sign-in is required to set an avatar.' };
      let kind = str(args, 'kind') as ProfilePhotoKind | 'self';
      if (kind === 'self') kind = 'teacher';
      if (kind !== 'student' && kind !== 'parent' && kind !== 'teacher') {
        return { error: 'kind must be student, parent, teacher, or self.' };
      }
      let personId = str(args, 'person_id');
      let personName = str(args, 'person_name');
      if (kind === 'teacher' && (!personId && !personName)) {
        personId = ctx.teacherId;
        personName = ctx.live.displayName || 'you';
      }
      if (kind === 'student') {
        const student = await resolveStudent(ctx, { student_id: personId, student_name: personName });
        if ('error' in student) return student;
        personId = student.id;
        personName = student.display_name;
        if (!can(ctx.profile, 'children.edit', 'own', ctx.grants) && !can(ctx.profile, 'roster.add', 'own', ctx.grants)) {
          return { error: 'You cannot set a student photo.' };
        }
      } else if (kind === 'parent') {
        const parent = await resolveParent(ctx, { parent_id: personId, parent_name: personName });
        if ('error' in parent) return parent;
        personId = parent.id;
        personName = parent.display_name;
        if (!can(ctx.profile, 'parents.invite', 'own', ctx.grants) && !can(ctx.profile, 'parents.view', 'school', ctx.grants)) {
          return { error: 'You cannot set a parent photo.' };
        }
      } else {
        const self = personId === ctx.teacherId || personId === ctx.profile?.id || (!personId && !personName);
        if (self) {
          personId = ctx.teacherId;
          personName = ctx.live.displayName || 'you';
          if (!can(ctx.profile, 'accounts.edit', 'own', ctx.grants)) return { error: 'You cannot change that photo.' };
        } else {
          const people = await listDirectory();
          const hits = people.filter(
            (row) =>
              (row.role === 'teacher' || row.also_teacher || row.role === 'superintendent' || row.role === 'administrator') &&
              (personId ? row.id === personId : matchesName(row.display_name || row.username, personName)),
          );
          if (hits.length === 1 && hits[0]) {
            personId = hits[0].id;
            personName = hits[0].display_name || hits[0].username;
          } else if (!hits.length) return { error: `No staff named ${personName || personId}.` };
          else return { error: `Several people match. Pick an id.`, matches: hits.slice(0, 8).map((row) => ({ id: row.id, name: row.display_name || row.username })) };
          if (!can(ctx.profile, 'accounts.edit', personId === ctx.profile?.id ? 'own' : 'school', ctx.grants)) {
            return { error: 'You cannot change that photo.' };
          }
        }
      }
      await uploadProfilePhoto({
        teacherId: ctx.teacherId,
        kind,
        personId,
        uri: ctx.photo.imageUrl,
        mimeType: ctx.photo.mimeType || 'image/jpeg',
        imageUrl: ctx.photo.imageUrl,
      });
      const classId = ctx.classId;
      const href =
        kind === 'student' && classId
          ? `/class/${classId}/student/${personId}`
          : kind === 'parent' && classId
            ? `/class/${classId}/parent/${personId}`
            : personId === ctx.profile?.id
              ? '/profile'
              : `/profile?person=${personId}`;
      return { set: true, kind, id: personId, name: personName, href };
    },
  },
  scan_answer_key: {
    capability: 'assignments.manage',
    def: {
      type: 'function',
      name: 'scan_answer_key',
      description:
        'Read the attached photo as an answer key. If the blanks are empty, propose answers. Does not save an assignment until create_assignment.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
    run: async (_args, ctx) => {
      const scan = await scanAttachedKey(ctx);
      if ('error' in scan) return scan;
      return summarizeKeyScan(scan);
    },
  },
  list_assignments: {
    capability: 'assignments.manage',
    def: {
      type: 'function',
      name: 'list_assignments',
      description: 'List assignments in a class.',
      parameters: {
        type: 'object',
        properties: { class_id: { type: 'string' }, class_name: { type: 'string' } },
        additionalProperties: false,
      },
    },
    run: async (args, ctx) => {
      const classId = await resolveClassId(ctx, args);
      if (typeof classId !== 'string') return classId;
      const rows = await listClassAssignments(classId);
      return {
        class_id: classId,
        assignments: rows.slice(0, 30).map((row) => ({
          id: row.id,
          title: row.title,
          due: row.due_at,
          key: row.key_kind && row.key_kind !== 'none',
        })),
      };
    },
  },
  create_assignment: {
    capability: 'assignments.manage',
    def: {
      type: 'function',
      name: 'create_assignment',
      description:
        'Create an assignment on a class. If an answer key was just scanned (or a key photo is attached), attach that key. Assigns it to every student on the class roster.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          class_id: { type: 'string' },
          class_name: { type: 'string' },
          due: { type: 'string', description: 'Due date, YYYY-MM-DD if possible' },
          category: {
            type: 'string',
            enum: ['homework', 'quiz', 'test', 'midterm', 'final', 'project', 'presentation', 'participation', 'behavior', 'other'],
          },
        },
        additionalProperties: false,
      },
    },
    run: async (args, ctx) => {
      if (!ctx.teacherId) return { error: 'Staff sign-in is required to create an assignment.' };
      const classId = await resolveClassId(ctx, args);
      if (typeof classId !== 'string') return classId;
      let scan = lastKeyScan && lastKeyScan.imageUrl === ctx.photo?.imageUrl ? lastKeyScan : null;
      if (!scan && ctx.photo?.imageUrl) {
        const next = await scanAttachedKey(ctx);
        if ('error' in next) return next;
        scan = next;
      }
      const title = str(args, 'title') || scan?.header || '';
      if (!title) return { error: 'Need a title for the assignment.' };
      let keyAssetId: string | null = null;
      if (scan) {
        const asset = await uploadTeacherAsset({
          teacherId: ctx.teacherId,
          kind: 'photo',
          uri: scan.imageUrl,
          mimeType: scan.mimeType,
        });
        keyAssetId = asset.id;
      }
      const created = await createAssignment({
        classId,
        title,
        category: (str(args, 'category') || 'homework') as never,
        dueAt: dueAtFromInput(str(args, 'due')),
        keyItems: scan?.items ?? [],
        keyAssetId,
        keyPhash: scan?.phash ?? null,
        keyLayout: scan?.layout ?? null,
        keyHeader: scan?.header ?? null,
        keyNotes: scan?.teacherNote ?? null,
        maxScore: scan?.maxScore ?? null,
      });
      return {
        created: true,
        id: created.id,
        title: created.title,
        class_id: classId,
        assignedToRoster: true,
        keyItems: scan?.items.length ?? 0,
        href: `/class/${classId}/assignment/${created.id}`,
      };
    },
  },
  open_screen: {
    capability: null,
    def: {
      type: 'function',
      name: 'open_screen',
      description: 'Open a screen in the app after doing work, or when they ask to go somewhere.',
      parameters: {
        type: 'object',
        properties: {
          screen: {
            type: 'string',
            description: 'school, people, class, office, student, parent, inbox, capture, messages, feed, gradebook, activity, profile, students, parents',
          },
          class_id: { type: 'string' },
          class_name: { type: 'string' },
          student_id: { type: 'string' },
          parent_id: { type: 'string' },
        },
        required: ['screen'],
        additionalProperties: false,
      },
    },
    run: async (args, ctx) => {
      const extra = { ...args };
      if (!str(extra, 'class_id') && str(extra, 'class_name')) {
        const resolved = await resolveClassId(ctx, extra);
        if (typeof resolved === 'string') extra.class_id = resolved;
      }
      const next = hrefForScreen(ctx, extra);
      if (next.error) return next;
      return { opened: true, href: next.href };
    },
  },
  revise_practice_page: {
    capability: 'assignments.manage',
    def: {
      type: 'function',
      name: 'revise_practice_page',
      description:
        'Rebuild the follow-up practice webpage for one assignment. All questions stay one assignment. Use after the teacher says what to change.',
      parameters: {
        type: 'object',
        properties: {
          assignment_id: { type: 'string' },
          class_id: { type: 'string' },
          instruction: { type: 'string' },
        },
        required: ['assignment_id', 'instruction'],
        additionalProperties: false,
      },
    },
    run: async (args, ctx) => {
      const assignmentId = str(args, 'assignment_id');
      const instruction = str(args, 'instruction');
      if (!assignmentId) return { error: 'Need assignment_id.' };
      if (!instruction) return { error: 'Need instruction for the page.' };
      const row = await getAssignment(assignmentId);
      if (!row) return { error: 'That assignment is gone.' };
      const classId = str(args, 'class_id') || row.class_id || ctx.classId || '';
      const draft = getFollowUpDraft();
      const items = draft?.items?.length ? draft.items : await loadFollowUpItems(row.practice_set_id);
      if (!items.length) return { error: 'No questions on that assignment to rebuild.' };
      await buildFollowUpPack({
        classId,
        studentId: draft?.studentId ?? '',
        sourceAssignmentId: draft?.sourceAssignmentId ?? row.id,
        sourceSubmissionId: draft?.sourceSubmissionId ?? '',
        sourceTitle: row.title,
        skillLabel: draft?.skillLabel || row.title,
        items,
        assignmentId,
      });
      return {
        ok: true,
        rebuilt: true,
        href: `/class/${classId}/assignment/${assignmentId}${draft?.studentId ? `?student=${draft.studentId}` : ''}`,
      };
    },
  },
};

function allowed(spec: AskToolSpec, ctx: AskToolContext): boolean {
  // Office walls first — before capability-null (fail open) or matrix grants / also_administrator.
  if (spec.def.name === 'add_student') return isOfficeRole(ctx.profile);
  // Office/SIS owns class create — matches is_school_admin(), not also_administrator.
  if (spec.def.name === 'create_class') return isOfficeRole(ctx.profile);
  // Office/SIS owns family identity — not parents.invite (class attach) or also_administrator.
  if (spec.def.name === 'link_parent_student') return isOfficeRole(ctx.profile);
  if (!spec.capability) return true;
  return can(ctx.profile, spec.capability, spec.need ?? 'own', ctx.grants);
}

function labelFor(name: string): string {
  return name.replace(/_/g, ' ');
}

export function askToolsFor(ctx: AskToolContext): {
  defs: AskToolDef[];
  names: string[];
  run: (name: string, rawArgs: string) => Promise<AskToolResult>;
} {
  const specs = Object.values(TOOLS).filter((spec) => allowed(spec, ctx));
  return {
    defs: specs.map((spec) => spec.def),
    names: specs.map((spec) => spec.def.name),
    run: async (name, rawArgs) => {
      if (isAskPasswordToolDenied(name)) {
        return {
          json: JSON.stringify({ error: 'You cannot reset passwords. Office does that in People.' }),
          label: labelFor(name),
        };
      }
      const spec = TOOLS[name];
      if (!spec || !allowed(spec, ctx)) {
        return { json: JSON.stringify({ error: `You cannot use ${name}.` }), label: labelFor(name) };
      }
      let args: Record<string, unknown> = {};
      try {
        args = rawArgs ? (JSON.parse(rawArgs) as Record<string, unknown>) : {};
      } catch {
        return { json: JSON.stringify({ error: 'Could not read those arguments.' }), label: labelFor(name) };
      }
      if (!args || typeof args !== 'object') args = {};
      try {
        const result = (await spec.run(args, ctx)) as Record<string, unknown> | null;
        const href = result && typeof result.href === 'string' ? result.href : undefined;
        return { json: JSON.stringify(result ?? { ok: true }), href, label: labelFor(name) };
      } catch (err) {
        return {
          json: JSON.stringify({ error: err instanceof Error ? err.message : `Could not run ${name}` }),
          label: labelFor(name),
        };
      }
    },
  };
}
