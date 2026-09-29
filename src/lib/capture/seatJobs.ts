/**
 * Stamp 7 seat Capture jobs (AC-SC-1 / 4 / 12 / 31).
 * Photograph grant is seat-based — not matrix capture.use.
 * Do not invent a second control name or a tray tab.
 */

export type CaptureChromeRole =
  | 'superintendent'
  | 'administrator'
  | 'teacher'
  | 'parent'
  | 'student'
  | 'none';

/** Jobs the confirm strip may name for that seat. */
export type CaptureSeatJob =
  | 'homework'
  | 'syllabus'
  | 'portrait'
  | 'parent_card'
  | 'student_card'
  | 'roster'
  | 'answer_key'
  | 'vehicle'
  | 'lesson_plan'
  | 'lesson_materials'
  | 'feed_photo'
  | 'school_logo'
  | 'create_class'
  | 'person_photo_choice'
  | 'own_face'
  | 'linked_child_face'
  | 'linked_parent_face'
  | 'child_homework'
  | 'child_homework_ask'
  | 'own_bio'
  | 'own_homework';

const OFFICE_JOBS: CaptureSeatJob[] = [
  'school_logo',
  'parent_card',
  'student_card',
  'roster',
  'create_class',
  'person_photo_choice',
  'portrait',
];

const TEACHER_JOBS: CaptureSeatJob[] = [
  'homework',
  'syllabus',
  'portrait',
  'parent_card',
  'student_card',
  'answer_key',
  'vehicle',
  'lesson_plan',
  'lesson_materials',
  'feed_photo',
];

const PARENT_JOBS: CaptureSeatJob[] = [
  'own_face',
  'linked_child_face',
  'child_homework',
  'child_homework_ask',
  'own_bio',
  'portrait',
  'homework',
];

const STUDENT_JOBS: CaptureSeatJob[] = [
  'own_face',
  'linked_parent_face',
  'own_homework',
  'portrait',
  'homework',
];

export function isOfficeCaptureSeat(role: CaptureChromeRole): boolean {
  return role === 'superintendent' || role === 'administrator';
}

/** AC-SC-31: office seats share the person-photo choice; other seats do not see it. */
export function seatSeesPersonPhotoChoice(role: CaptureChromeRole): boolean {
  return isOfficeCaptureSeat(role);
}

/** Choice 2 (create a new person) is office-only. */
export function seatMayCreatePersonFromPhoto(role: CaptureChromeRole): boolean {
  return isOfficeCaptureSeat(role);
}

export function seatCaptureJobs(role: CaptureChromeRole): CaptureSeatJob[] {
  if (isOfficeCaptureSeat(role)) return OFFICE_JOBS;
  if (role === 'teacher') return TEACHER_JOBS;
  if (role === 'parent') return PARENT_JOBS;
  if (role === 'student') return STUDENT_JOBS;
  return [];
}

export function seatAllowsCaptureJob(role: CaptureChromeRole, job: CaptureSeatJob): boolean {
  return seatCaptureJobs(role).includes(job);
}

/**
 * Intents offered on the existing "This will be…" unsure strip.
 * Person-photo choice is not a strip chip — it gates portrait before attach/create.
 */
export function seatUnsureIntentOptions(
  role: CaptureChromeRole,
): Array<[string, string]> {
  if (isOfficeCaptureSeat(role)) {
    return [
      ['school_logo', 'School logo'],
      ['parent_card', 'Parent card'],
      ['student_card', 'Student card'],
      ['roster', 'Roster'],
      ['create_class', 'New class'],
      ['portrait', 'Portrait'],
    ];
  }
  if (role === 'teacher') {
    return [
      ['homework', 'Grade'],
      ['syllabus', 'Syllabus'],
      ['answer_key', 'Answer key'],
      ['vehicle', 'Vehicle / plate'],
      ['lesson_plan', 'Lesson plan'],
      ['lesson_materials', 'Lesson materials'],
      ['feed_photo', 'Feed photo'],
      ['portrait', 'Portrait'],
      ['parent_card', 'Parent card'],
      ['student_card', 'Student card'],
    ];
  }
  if (role === 'parent') {
    return [
      ['portrait', 'Portrait'],
      ['homework', 'Homework'],
      ['parent_card', 'Own bio'],
    ];
  }
  if (role === 'student') {
    return [
      ['portrait', 'Portrait'],
      ['homework', 'Homework'],
    ];
  }
  return [];
}

/**
 * AC-SC-32: Teach + office show Photo or Video and Files (library + file pickers).
 * Parent and student stay one camera still. Supersedes AC-SC-3 for those two icons only.
 */
export function seatShowsCapturePhotoFileIcons(role: CaptureChromeRole): boolean {
  return role === 'teacher' || isOfficeCaptureSeat(role);
}

/** AC-SC-3 / AC-SC-4: mic and web drop stay Teach. Papers seats do not get them. */
export function seatShowsCaptureComposerExtras(role: CaptureChromeRole): boolean {
  return role === 'teacher';
}

/** Teacher may not create a class, roster, or new person from a photo. */
export function seatRefusesCreateFromPhoto(
  role: CaptureChromeRole,
  kind: 'class' | 'roster' | 'person',
): boolean {
  if (isOfficeCaptureSeat(role)) return false;
  if (role === 'teacher' || role === 'parent' || role === 'student') return true;
  return true;
}

/** Office may not send classwork for grading or set a grade from this photo. */
export function seatRefusesClassworkGrade(role: CaptureChromeRole): boolean {
  return isOfficeCaptureSeat(role);
}

/** Directory row kind label locked in the stamp (student / parent / staff). */
export function directoryPersonKindLabel(person: {
  student_id?: string | null;
  parent_id?: string | null;
  role?: string | null;
}): 'student' | 'parent' | 'staff' {
  if (person.student_id) return 'student';
  if (person.parent_id || person.role === 'parent') return 'parent';
  return 'staff';
}
