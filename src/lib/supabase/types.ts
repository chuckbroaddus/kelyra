export type ClassNameSource = 'voice' | 'typed';
export type StudentCreatedVia = 'voice' | 'photo_list' | 'typed';
export type ParentCreatedVia = 'typed' | 'photo_card' | 'voice';
export type RosterImportStatus = 'pending' | 'confirmed' | 'discarded';
export type AssetKind = 'photo' | 'audio';
export type StudentMetadataKey =
  | 'preferred_name'
  | 'birthday'
  | 'grade_or_age'
  | 'phone'
  | 'email'
  | 'address'
  | 'emergency_name'
  | 'emergency_phone'
  | 'allergies'
  | 'notes'
  | 'focusLog';
export type ParentMetadataKey =
  | 'relationship'
  | 'relationship_other'
  | 'phone'
  | 'email'
  | 'address'
  | 'preferred_contact'
  | 'notes';
export type ParentRelationship = 'mother' | 'father' | 'guardian' | 'other';
export type ParentPreferredContact = 'call' | 'text' | 'email';
export type ProfilePhotoKind = 'student' | 'parent' | 'teacher';
export type CaptureKind = 'homework' | 'voice_note';
export type CaptureInputSource = 'voice' | 'camera' | 'typed';
export type CaptureStatus =
  | 'unassigned'
  | 'attached'
  | 'draft'
  | 'approved'
  | 'note_only';
export type GapSource = 'model' | 'teacher';
export type GapStatus = 'draft' | 'approved' | 'dismissed';
export type PracticeSetStatus = 'preview' | 'assigned' | 'discarded';
export type AssignmentKind = 'capture' | 'practice' | 'planned';
export type SubmissionStatus = 'assigned' | 'submitted' | 'draft_scored' | 'approved';

export type PracticeItem = {
  id: string;
  prompt: string;
  answerKey?: string;
};

export type PracticeSetRow = {
  id: string;
  class_id: string;
  skill_id: string;
  source_capture_id: string | null;
  teacher_prompt: string | null;
  items: PracticeItem[];
  status: PracticeSetStatus;
  created_at: string;
};

export type AssignmentRow = {
  id: string;
  class_id: string;
  title: string;
  kind: AssignmentKind;
  capture_id: string | null;
  practice_set_id: string | null;
  due_at: string | null;
  max_score: number | null;
  created_at: string;
  category?: string;
  weight_band?: string;
  weight_percent?: number | null;
  term?: string;
  score_scheme?: string;
  include_in_average?: boolean;
  key_kind?: 'none' | 'photo' | 'items' | 'both';
  key_notes?: string | null;
  key_pass_at?: number | null;
  key_items?: Array<{
    n: number;
    stem?: string;
    answer?: string;
    points?: number;
    note?: string;
    needsTeacher?: boolean;
  }>;
  key_asset_id?: string | null;
  key_phash?: string | null;
  key_layout?: number[] | null;
  key_header?: string | null;
  key_blank_map?: unknown;
  key_ready_at?: string | null;
  unit?: string | null;
  section?: string | null;
};

export type SubmissionRow = {
  id: string;
  assignment_id: string;
  student_id: string;
  status: SubmissionStatus;
  answers: Record<string, string> | null;
  draft_score: number | null;
  approved_score: number | null;
  score_mark?: 'numeric' | 'pass' | 'fail';
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
};

type Row = Record<string, unknown>;

type Table<T extends Row, Insert extends Row, Update extends Row> = {
  Row: T;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type TeacherRow = {
  id: string;
  email: string;
  display_name: string | null;
  active_class_id: string | null;
  created_at: string;
  photo_asset_id?: string | null;
};

export type ClassRow = {
  id: string;
  teacher_id: string;
  name: string;
  join_code: string;
  name_source: ClassNameSource;
  created_at: string;
};

export type StudentRow = {
  id: string;
  teacher_id: string;
  display_name: string;
  sort_name: string | null;
  name_aliases: string[];
  photo_asset_id: string | null;
  current_focus_skill_id: string | null;
  parent_sentence: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  created_via: StudentCreatedVia;
};

export type ParentRow = {
  id: string;
  teacher_id: string;
  display_name: string;
  sort_name: string | null;
  photo_asset_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  created_via: ParentCreatedVia;
};

export type ParentStudentRow = {
  id: string;
  parent_id: string;
  student_id: string;
  created_at: string;
};

export type ParentAccessRow = {
  id: string;
  parent_id: string;
  student_id: string | null;
  token: string;
  email: string | null;
  accepted_at: string | null;
  created_at: string;
};

export type RosterImportRow = {
  id: string;
  class_id: string;
  photo_asset_id: string;
  status: RosterImportStatus;
  suggestions: Array<{
    name: string;
    confidence?: number;
    selected?: boolean;
    already_enrolled?: boolean;
  }>;
  created_at: string;
  confirmed_at: string | null;
};

export type ParentOpenChild = {
  student_id: string;
  display_name: string;
  preferred_name: string | null;
  photo_path: string | null;
  birthday_md: string | null;
  class_name: string | null;
  focus_label: string | null;
  practice_status: string | null;
  parent_sentence: string | null;
};

export type ParentOpenRow = {
  parent_id: string;
  parent_display_name: string;
  parent_photo_path: string | null;
  parent_relationship: string | null;
  parent_relationship_other: string | null;
  parent_phone: string | null;
  parent_email: string | null;
  parent_address: string | null;
  parent_preferred_contact: string | null;
  children: ParentOpenChild[];
};

export type EnrollmentRow = {
  id: string;
  class_id: string;
  student_id: string;
  created_at: string;
};

export type AssetRow = {
  id: string;
  teacher_id: string;
  kind: AssetKind;
  storage_path: string;
  mime_type: string | null;
  byte_size: number | null;
  created_at: string;
};

export type CaptureRow = {
  id: string;
  class_id: string;
  student_id: string | null;
  kind: CaptureKind;
  photo_asset_id: string | null;
  audio_asset_id: string | null;
  transcript: string | null;
  input_source: CaptureInputSource;
  status: CaptureStatus;
  guessed_student_id: string | null;
  match_confidence: number | null;
  model_draft: Record<string, unknown> | null;
  draft_score: number | null;
  approved_score: number | null;
  score_mark?: 'numeric' | 'pass' | 'fail';
  grade_kind?: string;
  teacher_note: string | null;
  parent_sentence: string | null;
  created_at: string;
  attached_at: string | null;
  approved_at: string | null;
  assignment_id?: string | null;
};

export type SkillRow = {
  id: string;
  class_id: string;
  label: string;
  normalized_label: string;
};

export type SkillGapRow = {
  id: string;
  capture_id: string;
  student_id: string;
  skill_id: string | null;
  label: string;
  source: GapSource;
  status: GapStatus;
  sort_order: number;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      teachers: Table<
        TeacherRow,
        {
          id: string;
          email: string;
          display_name?: string | null;
          active_class_id?: string | null;
          photo_asset_id?: string | null;
        },
        Partial<Omit<TeacherRow, 'id' | 'created_at'>>
      >;
      classes: Table<
        ClassRow,
        { teacher_id: string; name: string; join_code?: string; name_source?: ClassNameSource },
        Partial<Pick<ClassRow, 'name' | 'name_source' | 'join_code'>>
      >;
      students: Table<
        StudentRow,
        {
          teacher_id: string;
          display_name: string;
          sort_name?: string | null;
          name_aliases?: string[];
          photo_asset_id?: string | null;
          created_via?: StudentCreatedVia;
          metadata?: Record<string, unknown>;
        },
        Partial<Omit<StudentRow, 'id' | 'teacher_id' | 'created_at'>>
      >;
      parents: Table<
        ParentRow,
        {
          teacher_id: string;
          display_name: string;
          sort_name?: string | null;
          photo_asset_id?: string | null;
          metadata?: Record<string, unknown>;
          created_via?: ParentCreatedVia;
        },
        Partial<Omit<ParentRow, 'id' | 'teacher_id' | 'created_at'>>
      >;
      parent_students: Table<
        ParentStudentRow,
        { parent_id: string; student_id: string },
        Partial<Pick<ParentStudentRow, 'parent_id' | 'student_id'>>
      >;
      roster_imports: Table<
        RosterImportRow,
        {
          class_id: string;
          photo_asset_id: string;
          status?: RosterImportStatus;
          suggestions?: RosterImportRow['suggestions'];
          confirmed_at?: string | null;
        },
        Partial<Omit<RosterImportRow, 'id' | 'class_id' | 'created_at'>>
      >;
      enrollments: Table<
        EnrollmentRow,
        { class_id: string; student_id: string },
        Partial<Pick<EnrollmentRow, 'class_id' | 'student_id'>>
      >;
      assets: Table<
        AssetRow,
        { teacher_id: string; kind: AssetKind; storage_path: string; mime_type?: string | null; byte_size?: number | null },
        Partial<Omit<AssetRow, 'id' | 'teacher_id' | 'created_at'>>
      >;
      captures: Table<
        CaptureRow,
        {
          class_id: string;
          kind: CaptureKind;
          input_source: CaptureInputSource;
          student_id?: string | null;
          status?: CaptureStatus;
          photo_asset_id?: string | null;
          audio_asset_id?: string | null;
          transcript?: string | null;
          assignment_id?: string | null;
        },
        Partial<Omit<CaptureRow, 'id' | 'class_id' | 'created_at'>>
      >;
      skills: Table<
        SkillRow,
        { class_id: string; label: string; normalized_label: string },
        Partial<Pick<SkillRow, 'label' | 'normalized_label'>>
      >;
      skill_gaps: Table<
        SkillGapRow,
        {
          capture_id: string;
          student_id: string;
          label: string;
          source: GapSource;
          status?: GapStatus;
          sort_order?: number;
          skill_id?: string | null;
        },
        Partial<Omit<SkillGapRow, 'id' | 'capture_id' | 'created_at'>>
      >;
      practice_sets: Table<
        PracticeSetRow,
        {
          class_id: string;
          skill_id: string;
          items: PracticeItem[];
          source_capture_id?: string | null;
          teacher_prompt?: string | null;
          status?: PracticeSetStatus;
        },
        Partial<Omit<PracticeSetRow, 'id' | 'created_at'>>
      >;
      assignments: Table<
        AssignmentRow,
        {
          class_id: string;
          title: string;
          kind: AssignmentKind;
          capture_id?: string | null;
          practice_set_id?: string | null;
          due_at?: string | null;
          max_score?: number | null;
          category?: string;
          weight_band?: string;
          weight_percent?: number | null;
          term?: string;
          score_scheme?: string;
          include_in_average?: boolean;
          key_kind?: AssignmentRow['key_kind'];
          key_notes?: string | null;
          key_pass_at?: number | null;
          key_items?: AssignmentRow['key_items'];
          key_asset_id?: string | null;
          key_phash?: string | null;
          key_layout?: number[] | null;
          key_header?: string | null;
          key_ready_at?: string | null;
          unit?: string | null;
          section?: string | null;
        },
        Partial<Omit<AssignmentRow, 'id' | 'created_at'>>
      >;
      submissions: Table<
        SubmissionRow,
        {
          assignment_id: string;
          student_id: string;
          status?: SubmissionStatus;
          answers?: Record<string, string> | null;
          approved_score?: number | null;
          approved_at?: string | null;
          score_mark?: 'numeric' | 'pass' | 'fail';
        },
        Partial<Omit<SubmissionRow, 'id' | 'assignment_id' | 'student_id' | 'created_at'>>
      >;
      parent_accesses: Table<
        ParentAccessRow,
        { parent_id: string; token: string; student_id?: string | null; email?: string | null },
        Partial<{ student_id: string | null; email: string | null; accepted_at: string | null }>
      >;
    };
    Views: Record<string, never>;
    Functions: {
      student_open_class: {
        Args: { p_join_code: string };
        Returns: {
          class_id: string;
          class_name: string;
          student_id: string;
          display_name: string;
          photo_path: string | null;
        }[];
      };
      student_list_todo: {
        Args: { p_join_code: string; p_student_id: string };
        Returns: {
          submission_id: string;
          assignment_title: string;
          status: SubmissionStatus;
          items: PracticeItem[] | null;
          answers: Record<string, string> | null;
          focus_label: string | null;
        }[];
      };
      student_submit: {
        Args: {
          p_join_code: string;
          p_student_id: string;
          p_submission_id: string;
          p_answers: Record<string, string>;
        };
        Returns: undefined;
      };
      parent_open: {
        Args: { p_token: string };
        Returns: ParentOpenRow[];
      };
      teacher_delete_class: { Args: { p_class_id: string }; Returns: undefined };
      teacher_delete_student: { Args: { p_student_id: string }; Returns: undefined };
      teacher_remove_enrollment: {
        Args: { p_class_id: string; p_student_id: string };
        Returns: undefined;
      };
      teacher_delete_capture: { Args: { p_capture_id: string }; Returns: undefined };
      teacher_delete_gap: { Args: { p_gap_id: string }; Returns: undefined };
      teacher_delete_practice_set: { Args: { p_practice_set_id: string }; Returns: undefined };
      teacher_delete_assignment: { Args: { p_assignment_id: string }; Returns: undefined };
      teacher_delete_submission: { Args: { p_submission_id: string }; Returns: undefined };
      teacher_delete_parent: { Args: { p_parent_id: string }; Returns: undefined };
      teacher_unlink_child: {
        Args: { p_parent_id: string; p_student_id: string };
        Returns: undefined;
      };
      teacher_revoke_invite: { Args: { p_access_id: string }; Returns: undefined };
      teacher_clear_profile_photo: {
        Args: { p_kind: string; p_person_id: string };
        Returns: undefined;
      };
      teacher_unref_asset: { Args: { p_asset_id: string }; Returns: undefined };
      teacher_delete_roster_import: { Args: { p_import_id: string }; Returns: undefined };
    };
    Enums: {
      class_name_source: ClassNameSource;
      student_created_via: StudentCreatedVia;
      parent_created_via: ParentCreatedVia;
      roster_import_status: RosterImportStatus;
      asset_kind: AssetKind;
      capture_kind: CaptureKind;
      capture_input_source: CaptureInputSource;
      capture_status: CaptureStatus;
      gap_source: GapSource;
      gap_status: GapStatus;
      practice_set_status: PracticeSetStatus;
      assignment_kind: AssignmentKind;
      submission_status: SubmissionStatus;
    };
  };
};
