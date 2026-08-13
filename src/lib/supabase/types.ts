export type ClassNameSource = 'voice' | 'typed';
export type StudentCreatedVia = 'voice' | 'photo_list' | 'typed';
export type AssetKind = 'photo' | 'audio';
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
export type AssignmentKind = 'capture' | 'practice';
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
};

export type SubmissionRow = {
  id: string;
  assignment_id: string;
  student_id: string;
  status: SubmissionStatus;
  answers: Record<string, string> | null;
  draft_score: number | null;
  approved_score: number | null;
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
  current_focus_skill_id: string | null;
  parent_sentence: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  created_via: StudentCreatedVia;
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
  teacher_note: string | null;
  parent_sentence: string | null;
  created_at: string;
  attached_at: string | null;
  approved_at: string | null;
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
        { id: string; email: string; display_name?: string | null; active_class_id?: string | null },
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
          created_via?: StudentCreatedVia;
        },
        Partial<Omit<StudentRow, 'id' | 'teacher_id' | 'created_at'>>
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
        },
        Partial<Omit<SubmissionRow, 'id' | 'assignment_id' | 'student_id' | 'created_at'>>
      >;
      parent_accesses: Table<
        {
          id: string;
          student_id: string;
          token: string;
          email: string | null;
          accepted_at: string | null;
          created_at: string;
        },
        { student_id: string; token: string; email?: string | null },
        Partial<{ email: string | null; accepted_at: string | null }>
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
        Returns: {
          display_name: string;
          class_name: string;
          focus_label: string | null;
          practice_status: string | null;
          parent_sentence: string | null;
        }[];
      };
    };
    Enums: {
      class_name_source: ClassNameSource;
      student_created_via: StudentCreatedVia;
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
