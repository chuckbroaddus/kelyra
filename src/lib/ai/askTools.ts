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
import { isAskToolAllowed } from '@/lib/ai/askToolPolicy';
import {
  attachExplainAsNote,
  discardExplainDraft,
  requestExplainCapture,
} from '@/lib/explain/api';
import {
  discardSyllabusAskDraft,
  getClassSyllabus,
  loadParentClassAverageExplain,
  loadPublishedClassSyllabus,
  loadStudentClassAverageExplain,
  upsertSyllabusAskDraft,
} from '@/lib/syllabus/api';
import { signedUrlForAsset, uploadTeacherAsset } from '@/lib/media/upload';


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
      description:
        'Create a parent record and optionally set phone/email. Office may also link a child as family. Teachers never mint family links here — use add_parent_to_class for class attach of already-linked children.',
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
      // Family identity is office-owned. Teachers must not reach linkChild via createParent.
      let studentId: string | undefined;
      let note: string | undefined;
      if (isOfficeRole(ctx.profile)) {
        studentId = str(args, 'student_id') || undefined;
        if (!studentId && str(args, 'student_name')) {
          const student = await resolveStudent(ctx, args);
          if ('error' in student) note = student.error;
          else studentId = student.id;
        }
      } else if (str(args, 'student_id') || str(args, 'student_name')) {
        note = 'Only the office can link a parent to a child. Use add_parent_to_class for class attach.';
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
  scan_class_syllabus: {
    capability: 'syllabus.manage',
    need: 'own',
    def: {
      type: 'function',
      name: 'scan_class_syllabus',
      description:
        'Read an attached syllabus photo into a draft for one taught class. Does not publish. Teacher must confirm in class setup.',
      parameters: {
        type: 'object',
        properties: { class_id: { type: 'string' }, class_name: { type: 'string' } },
        additionalProperties: false,
      },
    },
    run: async (args, ctx) => {
      if (!ctx.teacherId) return { error: 'Teacher sign-in is required.' };
      if (!ctx.photo?.imageUrl) return { error: 'Attach a syllabus photo first.' };
      const classId = await resolveClassId(ctx, args);
      if (typeof classId !== 'string') return classId;
      const asset = await uploadTeacherAsset({
        teacherId: ctx.teacherId,
        kind: 'photo',
        uri: ctx.photo.imageUrl,
        mimeType: ctx.photo.mimeType || 'image/jpeg',
      });
      const imageUrl = await signedUrlForAsset('photo', asset.storage_path);
      if (!imageUrl) return { error: 'Could not open the photo.' };
      const draft = await invokeAi<Record<string, unknown>>('parse-class-syllabus', {
        classId,
        imageUrl,
        mimeType: ctx.photo.mimeType || 'image/jpeg',
      });
      if (draft.error) return { error: String(draft.error) };
      await upsertSyllabusAskDraft(classId, { ...draft, schema_version: 1, class_id: classId }, asset.id);
      return {
        ok: true,
        parked: true,
        document_kind: draft.document_kind ?? 'unknown',
        href: `/class/${classId}/syllabus`,
        note: 'Draft saved. Review and publish on the class syllabus screen. Nothing is live yet.',
      };
    },
  },
  get_class_syllabus_draft: {
    capability: 'syllabus.manage',
    need: 'own',
    def: {
      type: 'function',
      name: 'get_class_syllabus_draft',
      description: 'Return the parked Ask syllabus draft for a taught class (teacher only).',
      parameters: {
        type: 'object',
        properties: { class_id: { type: 'string' }, class_name: { type: 'string' } },
        additionalProperties: false,
      },
    },
    run: async (args, ctx) => {
      const classId = await resolveClassId(ctx, args);
      if (typeof classId !== 'string') return classId;
      const bundle = await getClassSyllabus(classId);
      return {
        class_id: classId,
        status: bundle.syllabus?.status ?? null,
        ask_draft: bundle.syllabus?.ask_draft ?? null,
        href: `/class/${classId}/syllabus`,
      };
    },
  },
  discard_class_syllabus_draft: {
    capability: 'syllabus.manage',
    need: 'own',
    def: {
      type: 'function',
      name: 'discard_class_syllabus_draft',
      description: 'Clear the Ask syllabus draft for a taught class. Leaves a published syllabus intact.',
      parameters: {
        type: 'object',
        properties: { class_id: { type: 'string' }, class_name: { type: 'string' } },
        additionalProperties: false,
      },
    },
    run: async (args, ctx) => {
      const classId = await resolveClassId(ctx, args);
      if (typeof classId !== 'string') return classId;
      await discardSyllabusAskDraft(classId);
      return { ok: true, cleared: true, href: `/class/${classId}/syllabus` };
    },
  },
  get_published_class_syllabus: {
    capability: null,
    def: {
      type: 'function',
      name: 'get_published_class_syllabus',
      description:
        'Read published category weights for a class the student is in or a linked child is in. No drafts.',
      parameters: {
        type: 'object',
        properties: { class_id: { type: 'string' }, class_name: { type: 'string' } },
        additionalProperties: false,
      },
    },
    run: async (args, ctx) => {
      const classId = await resolveClassId(ctx, args);
      if (typeof classId !== 'string') return classId;
      const syllabus = await loadPublishedClassSyllabus(classId);
      return syllabus;
    },
  },
  explain_my_class_average: {
    capability: null,
    def: {
      type: 'function',
      name: 'explain_my_class_average',
      description:
        'Explain the current weighted average for the signed-in student or one linked child. Post-Approve scores only.',
      parameters: {
        type: 'object',
        properties: {
          class_id: { type: 'string' },
          class_name: { type: 'string' },
          student_id: { type: 'string', description: 'Required for parent — one linked child.' },
        },
        additionalProperties: false,
      },
    },
    run: async (args, ctx) => {
      const classId = await resolveClassId(ctx, args);
      if (typeof classId !== 'string') return classId;
      const studentId = str(args, 'student_id');
      if (ctx.profile?.role === 'parent' || ctx.profile?.parent_id) {
        if (!studentId) return { error: 'Pick one linked child (student_id).' };
        const explained = await loadParentClassAverageExplain(classId, studentId);
        return {
          published: explained.syllabus.published,
          overall: explained.average.overall,
          disclosures: explained.average.disclosures,
          adjusted: explained.average.adjustedNotes,
          rules: explained.ruleLines,
        };
      }
      const explained = await loadStudentClassAverageExplain(classId);
      return {
        published: explained.syllabus.published,
        overall: explained.average.overall,
        disclosures: explained.average.disclosures,
        adjusted: explained.average.adjustedNotes,
        rules: explained.ruleLines,
      };
    },
  },

  explain_capture: {
    capability: 'explain.manage',
    need: 'own',
    def: {
      type: 'function',
      name: 'explain_capture',
      description:
        'Park a teacher Explain draft on a taught-class capture. On-demand only. Never a grade. Prefer key+extract when present.',
      parameters: {
        type: 'object',
        properties: {
          capture_id: { type: 'string' },
          class_id: { type: 'string' },
          class_name: { type: 'string' },
        },
        required: ['capture_id'],
        additionalProperties: false,
      },
    },
    run: async (args, ctx) => {
      const seat = ctx.profile?.role;
      if (seat !== 'teacher' && seat !== 'parent') return { error: 'Teacher or parent sign-in is required.' };
      if (seat === 'teacher' && !ctx.teacherId) return { error: 'Teacher sign-in is required.' };
      const captureId = str(args, 'capture_id');
      if (!captureId) return { error: 'Need capture_id.' };
      const classId = await resolveClassId(ctx, args);
      if (typeof classId !== 'string') return classId;
      const draft = await requestExplainCapture({
        captureId,
        classId,
        imageUrl: ctx.photo?.imageUrl ?? null,
      });
      const parked = seat === 'teacher';
      return {
        ok: true,
        parked,
        ephemeral: !parked,
        explain_status: parked ? 'draft' : 'ephemeral',
        steps: draft.steps,
        reteach: draft.reteach,
        href: parked ? `/class/${classId}/student/${'review'}` : undefined,
        note: parked
          ? 'Explain draft parked. Keep private by default. Attach as teacher note only after Confirm.'
          : 'Parent co-teacher Explain for a linked child. Ephemeral — not parked on the teacher draft.',
      };
    },
  },

  discard_explain_draft: {
    capability: 'explain.manage',
    need: 'own',
    def: {
      type: 'function',
      name: 'discard_explain_draft',
      description: 'Clear a parked Explain draft on a taught-class capture. Leaves grades unchanged.',
      parameters: {
        type: 'object',
        properties: { capture_id: { type: 'string' }, class_id: { type: 'string' } },
        required: ['capture_id'],
        additionalProperties: false,
      },
    },
    run: async (args, ctx) => {
      if (!ctx.teacherId) return { error: 'Teacher sign-in is required.' };
      const captureId = str(args, 'capture_id');
      if (!captureId) return { error: 'Need capture_id.' };
      await discardExplainDraft(captureId);
      return { ok: true, cleared: true, explain_status: 'none' };
    },
  },
  attach_explain_as_note: {
    capability: 'explain.manage',
    need: 'own',
    def: {
      type: 'function',
      name: 'attach_explain_as_note',
      description:
        'Copy the parked Explain draft into the teacher note. Confirm in UI first. Default is Keep private. Not a grade.',
      parameters: {
        type: 'object',
        properties: { capture_id: { type: 'string' }, confirmed: { type: 'boolean' } },
        required: ['capture_id', 'confirmed'],
        additionalProperties: false,
      },
    },
    run: async (args, ctx) => {
      if (!ctx.teacherId) return { error: 'Teacher sign-in is required.' };
      const captureId = str(args, 'capture_id');
      if (!captureId) return { error: 'Need capture_id.' };
      if (args.confirmed !== true) {
        return {
          error: 'Confirm required. Default is Keep private — do not attach unless the teacher confirms.',
        };
      }
      await attachExplainAsNote(captureId);
      return { ok: true, attached: true, explain_status: 'noted', note: 'Copied parked draft to teacher note. Still not a grade.' };
    },
  },

  list_grade_cells: {
    capability: 'assignments.manage',
    def: {
      type: "function",
      name: "list_grade_cells",
      description: "List grade-book cells for a class the seat can already open. Teacher/office only. Student/parent refused.",
      parameters: {
        type: "object",
        properties: { class_id: { type: "string" }, class_name: { type: "string" } },
        additionalProperties: false,
      },
    },
    run: async (args, ctx) => {
      if (ctx.profile?.role === "student" || ctx.profile?.role === "parent") {
        return { error: "Grade cells are not available on this seat." };
      }
      const classId = str(args, "class_id") || ctx.classId;
      if (!classId) return { error: "Need class_id." };
      const { loadGradebook } = await import("@/lib/gradebook/api");
      const book = await loadGradebook(classId);
      const cells = Object.entries(book.cells).map(([key, cell]) => {
        const [assignmentId, studentId] = key.split(":");
        const assignment = book.assignments.find((row) => row.id === assignmentId);
        const student = book.students.find((row) => row.id === studentId);
        return {
          assignment_id: assignmentId,
          assignment_title: assignment?.title ?? null,
          student_id: studentId,
          student_name: student?.display_name ?? null,
          status: cell.status,
          score: cell.score,
          score_mark: cell.scoreMark,
        };
      });
      return { class_id: classId, cells, note: "JWT/RLS gated. Not for parent/student seats." };
    },
  },

  assignment_completion: {
    capability: 'assignments.manage',
    def: {
      type: "function",
      name: "assignment_completion",
      description: "Counts of submission statuses for a class grade book. Does not average Pass/Fail as numbers. Teacher/office only.",
      parameters: {
        type: "object",
        properties: { class_id: { type: "string" } },
        additionalProperties: false,
      },
    },
    run: async (args, ctx) => {
      if (ctx.profile?.role === "student" || ctx.profile?.role === "parent") {
        return { error: "Completion counts are not available on this seat." };
      }
      const classId = str(args, "class_id") || ctx.classId;
      if (!classId) return { error: "Need class_id." };
      const { loadGradebook } = await import("@/lib/gradebook/api");
      const book = await loadGradebook(classId);
      const byStatus: Record<string, number> = {};
      for (const cell of Object.values(book.cells)) {
        const status = cell.status ?? "empty";
        byStatus[status] = (byStatus[status] ?? 0) + 1;
      }
      return { class_id: classId, by_status: byStatus, assignment_count: book.assignments.length, student_count: book.students.length };
    },
  },
  summarize_class_desk: {
    capability: 'classes.teach',
    def: {
      type: "function",
      name: "summarize_class_desk",
      description: "Unassigned and draft capture counts, focus list, top approved gaps for a taught class.",
      parameters: {
        type: "object",
        properties: { class_id: { type: "string" } },
        additionalProperties: false,
      },
    },
    run: async (args, ctx) => {
      const classId = str(args, "class_id") || ctx.classId;
      if (!classId) return { error: "Need class_id." };
      const { loadClassOverview } = await import("@/lib/classes/overview");
      const overview = await loadClassOverview(classId);
      return {
        class_id: classId,
        unassigned: overview.unassignedCount,
        drafts: overview.draftCount,
        focus: overview.focusStudents.map((row) => ({ id: row.id, name: row.displayName, focus: row.focusLabel })),
        top_gaps: overview.commonGaps.slice(0, 8).map((gap) => ({ label: gap.label, count: gap.count })),
      };
    },
  },
  list_inbox: {
    capability: 'capture.use',
    def: {
      type: "function",
      name: "list_inbox",
      description: "Teacher-only inbox capture statuses for a class. Office-only seats refuse.",
      parameters: {
        type: "object",
        properties: { class_id: { type: "string" } },
        additionalProperties: false,
      },
    },
    run: async (args, ctx) => {
      if (!ctx.teacherId) return { error: "Teacher seat required." };
      const classId = str(args, "class_id") || ctx.classId;
      if (!classId) return { error: "Need class_id." };
      const { listInbox } = await import("@/lib/captures/api");
      const items = await listInbox(classId);
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
    },
  },

  list_my_practice: {
    capability: null,
    def: {
      type: "function",
      name: "list_my_practice",
      description: "Student seat only. Assigned practice titles/status/items. No scores.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
    run: async (_args, ctx) => {
      if (ctx.profile?.role !== "student") return { error: "Student seat only." };
      const { listStudentTodo } = await import("@/lib/student-session/api");
      const rows = await listStudentTodo();
      return {
        items: rows.map((row) => ({
          submission_id: row.submissionId,
          title: row.title,
          status: row.status,
          class_name: row.className,
          items: row.items,
          focus: row.focusLabel,
        })),
      };
    },
  },
  my_children_progress: {
    capability: 'children.view',
    def: {
      type: "function",
      name: "my_children_progress",
      description: "Parent seat: focus, practice words, parent sentence for linked children. No scores or work photos.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
    run: async (_args, ctx) => {
      if (ctx.profile?.role !== "parent" && !ctx.profile?.parent_id) {
        return { error: "Parent seat only." };
      }
      const { loadParentProgressMine } = await import("@/lib/parents/api");
      const progress = await loadParentProgressMine();
      if (!progress) return { error: "No linked children progress." };
      // Strip scores if present on the payload.
      const safe = JSON.parse(JSON.stringify(progress)) as Record<string, unknown>;
      const strip = (obj: unknown) => {
        if (!obj || typeof obj !== "object") return;
        const rec = obj as Record<string, unknown>;
        for (const key of Object.keys(rec)) {
          if (/score|photo|draft|approved_score/i.test(key)) delete rec[key];
          else strip(rec[key]);
        }
      };
      strip(safe);
      return { progress: safe };
    },
  },
  my_unread_messages: {
    capability: 'messages.use',
    def: {
      type: "function",
      name: "my_unread_messages",
      description: "Unread message count for the signed-in profile (membership only).",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
    run: async () => {
      const { unreadCount } = await import("@/lib/messages/api");
      return { unread: await unreadCount() };
    },
  },
  list_feed: {
    capability: null,
    def: {
      type: "function",
      name: "list_feed",
      description: "School/class feed posts the JWT can already see.",
      parameters: {
        type: "object",
        properties: { scope: { type: "string" } },
        additionalProperties: false,
      },
    },
    run: async () => {
      const { listFeed } = await import("@/lib/posts/api");
      const posts = await listFeed();
      return {
        posts: posts.slice(0, 30).map((row) => ({
          id: row.id,
          body: row.body,
          class_id: row.classId,
          created_at: row.createdAt,
          author: row.authorName,
        })),
      };
    },
  },
  search_audit: {
    capability: 'audit.view',
    need: 'school',
    def: {
      type: "function",
      name: "search_audit",
      description: "Office activity log search by handle, actor role, or action. Teachers none.",
      parameters: {
        type: "object",
        properties: {
          handle: { type: "string" },
          actor_role: { type: "string" },
          action: { type: "string" },
        },
        additionalProperties: false,
      },
    },
    run: async (args) => {
      const { listAuditEvents } = await import("@/lib/school/api");
      const rows = await listAuditEvents();
      const handle = str(args, "handle").toLowerCase();
      const actorRole = str(args, "actor_role").toLowerCase();
      const action = str(args, "action").toLowerCase();
      const filtered = rows.filter((row) => {
        const blob = JSON.stringify(row).toLowerCase();
        if (handle && !blob.includes(handle.replace(/^@/, ""))) return false;
        if (actorRole && String((row as { actor_role?: string }).actor_role ?? "").toLowerCase() !== actorRole) return false;
        if (action && String(row.action ?? "").toLowerCase() !== action && !String(row.action ?? "").toLowerCase().includes(action)) return false;
        return true;
      });
      return { events: filtered.slice(0, 40) };
    },
  },

  list_threads: {
    capability: 'messages.use',
    def: {
      type: "function",
      name: "list_threads",
      description: "List message threads for the signed-in member only. Does not add members.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
    run: async (_args, ctx) => {
      if (!ctx.profile?.id) return { error: "Sign in required." };
      const { listThreads } = await import("@/lib/messages/api");
      const threads = await listThreads(ctx.profile.id);
      return {
        threads: threads.slice(0, 40).map((row) => ({
          id: row.id,
          title: row.title,
          kind: row.kind,
          last_message_at: row.lastMessageAt,
          unread: row.unread,
        })),
        note: "Membership only. No add_thread_member until thread_members_insert stays fail-closed (see 20260817000005 / 20260826000002).",
      };
    },
  },
  list_thread_messages: {
    capability: 'messages.use',
    def: {
      type: "function",
      name: "list_thread_messages",
      description: "List messages in a thread the user already belongs to.",
      parameters: {
        type: "object",
        properties: { thread_id: { type: "string" } },
        required: ["thread_id"],
        additionalProperties: false,
      },
    },
    run: async (args, ctx) => {
      if (!ctx.profile?.id) return { error: "Sign in required." };
      const threadId = str(args, "thread_id");
      if (!threadId) return { error: "Need thread_id." };
      const { listThreads, listMessages } = await import("@/lib/messages/api");
      const mine = await listThreads(ctx.profile.id);
      if (!mine.some((row) => row.id === threadId)) return { error: "Not a member of that thread." };
      const messages = await listMessages(threadId);
      return {
        thread_id: threadId,
        messages: messages.slice(-50).map((row) => ({
          id: row.id,
          body: row.body,
          sender_id: row.sender_id,
          created_at: row.created_at,
        })),
      };
    },
  },
  send_message: {
    capability: 'messages.use',
    def: {
      type: "function",
      name: "send_message",
      description: "Send a text message in a thread the user already belongs to. Does not add members.",
      parameters: {
        type: "object",
        properties: { thread_id: { type: "string" }, body: { type: "string" } },
        required: ["thread_id", "body"],
        additionalProperties: false,
      },
    },
    run: async (args, ctx) => {
      if (!ctx.profile?.id) return { error: "Sign in required." };
      const threadId = str(args, "thread_id");
      const body = str(args, "body");
      if (!threadId || !body) return { error: "Need thread_id and body." };
      const { listThreads, sendMessage } = await import("@/lib/messages/api");
      const mine = await listThreads(ctx.profile.id);
      if (!mine.some((row) => row.id === threadId)) return { error: "Not a member of that thread." };
      const row = await sendMessage(threadId, ctx.profile.id, body, null);
      return { ok: true, message_id: row.id, thread_id: threadId };
    },
  },

};

function allowed(spec: AskToolSpec, ctx: AskToolContext): boolean {
  // Control plane in askToolPolicy — office walls + matrix; unknown names denied.
  return isAskToolAllowed(spec.def.name, ctx.profile, ctx.grants);
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
