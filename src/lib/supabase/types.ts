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
export type SchoolRole = 'superintendent' | 'administrator' | 'teacher' | 'parent' | 'student';

export type SchoolRow = {
  id: string;
  name: string;
  created_at: string;
  feed_icon?: string | null;
  logo_asset_id?: string | null;
  ai_monthly_cap_usd?: number | null;
};

export type ProfileRow = {
  id: string;
  school_id: string;
  username: string;
  email: string | null;
  display_name: string | null;
  role: SchoolRole;
  must_change_password: boolean;
  student_id: string | null;
  parent_id: string | null;
  also_administrator: boolean;
  also_teacher: boolean;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
};

export type AuditEventRow = {
  id: string;
  actor_id: string | null;
  actor_username: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  student_id: string | null;
  class_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  created_at: string;
};

export type MessageThreadKind = 'direct' | 'group';

export type MessageThreadRow = {
  id: string;
  school_id: string;
  created_at: string;
  last_message_at: string;
  kind: MessageThreadKind;
  title: string | null;
  student_id: string | null;
  created_by: string | null;
  photo_path: string | null;
};

export type MessageWorkCard = {
  type: 'work_card';
  student_id: string;
  assignment_id?: string | null;
  practice_set_id?: string | null;
  notify_parents?: boolean;
};

export type MessagePhoto = {
  type: 'photo';
  storage_path: string;
  mime_type?: string | null;
};

export type MessageFile = {
  type: 'file';
  storage_path: string;
  name: string;
  mime_type?: string | null;
};

export type MessageLink = {
  type: 'link';
  url: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
};

export type MessagePayload = MessageWorkCard | MessagePhoto | MessageFile | MessageLink;

export type AskMessageRow = {
  id: string;
  role: 'user' | 'assistant';
  body: string;
  payload: MessagePayload | null;
  created_at: string;
};

export type MessageRow = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  payload?: MessagePayload | null;
};

export type PostKind = 'post' | 'alert';

export type PostRow = {
  id: string;
  school_id: string;
  class_id: string | null;
  author_id: string;
  kind: PostKind;
  body: string;
  payload?: MessagePayload | null;
  created_at: string;
};
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
export type AssignmentKind = 'capture' | 'practice' | 'planned' | 'lesson';
export type SubmissionStatus = 'assigned' | 'started' | 'completed' | 'graded';

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
  is_makeup?: boolean;
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
  deck_id?: string | null;
  lesson_version?: string | null;
  storage_deck_id?: string | null;
  beat_start?: string | null;
  beat_end?: string | null;
  help_mode?: 'off' | 'hints' | 'steps_after_try' | 'check_work';
};

export type LessonPackRow = {
  id: string;
  deck_id: string;
  version: string;
  title: string;
  published: boolean;
  created_at: string;
  storage_deck_id: string;
  beat_start: string;
  beat_end: string;
};

export type SubmissionRow = {
  id: string;
  assignment_id: string;
  student_id: string;
  status: SubmissionStatus;
  answers: Record<string, unknown> | null;
  draft_score: number | null;
  approved_score: number | null;
  score_mark?: 'numeric' | 'pass' | 'fail';
  model_draft?: Record<string, unknown> | null;
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
  teacher_id: string | null;
  name: string;
  name_source: ClassNameSource;
  created_at: string;
  feed_icon?: string | null;
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
  lesson_status: string | null;
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
  thumb_storage_path?: string | null;
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
  ai_status?: string | null;
  explain_draft?: Record<string, unknown> | null;
  explain_status?: 'none' | 'draft' | 'noted';
};

export type SkillRow = {
  id: string;
  class_id: string;
  label: string;
  normalized_label: string;
};

export type SkillGapRow = {
  id: string;
  capture_id: string | null;
  submission_id?: string | null;
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
      schools: Table<
        SchoolRow,
        { name?: string; feed_icon?: string | null; logo_asset_id?: string | null },
        Partial<Pick<SchoolRow, 'name' | 'feed_icon' | 'logo_asset_id'>>
      >;
      profiles: Table<
        ProfileRow,
        {
          id: string;
          school_id: string;
          username: string;
          email?: string | null;
          display_name?: string | null;
          role?: SchoolRole;
          must_change_password?: boolean;
          student_id?: string | null;
          parent_id?: string | null;
          created_by?: string | null;
        },
        Partial<Omit<ProfileRow, 'id' | 'created_at'>>
      >;
      capability_grants: Table<
        { capability_id: string; role: SchoolRole; access: string; updated_at: string; updated_by: string | null },
        { capability_id: string; role: SchoolRole; access: string; updated_by?: string | null },
        Partial<{ access: string; updated_by: string | null }>
      >;
      audit_events: Table<
        AuditEventRow,
        {
          action: string;
          entity_type: string;
          actor_id?: string | null;
          actor_username?: string | null;
          actor_role?: string | null;
          entity_id?: string | null;
          student_id?: string | null;
          class_id?: string | null;
          before?: Record<string, unknown> | null;
          after?: Record<string, unknown> | null;
        },
        never
      >;
      message_threads: Table<
        MessageThreadRow,
        {
          school_id: string;
          last_message_at?: string;
          kind?: MessageThreadKind;
          title?: string | null;
          student_id?: string | null;
          created_by?: string | null;
          photo_path?: string | null;
        },
        Partial<Pick<MessageThreadRow, 'last_message_at' | 'title' | 'kind' | 'photo_path'>>
      >;
      message_thread_members: Table<
        {
          thread_id: string;
          profile_id: string;
          last_read_at: string | null;
          muted_at: string | null;
          pinned_at: string | null;
        },
        {
          thread_id: string;
          profile_id: string;
          last_read_at?: string | null;
          muted_at?: string | null;
          pinned_at?: string | null;
        },
        Partial<{ last_read_at: string | null; muted_at: string | null; pinned_at: string | null }>
      >;
      messages: Table<
        MessageRow,
        { thread_id: string; sender_id: string; body: string; payload?: MessagePayload | null },
        Partial<{ body: string; payload: MessagePayload | null }>
      >;
      posts: Table<
        PostRow,
        { school_id: string; author_id: string; kind: PostKind; body: string; class_id?: string | null },
        Partial<Pick<PostRow, 'body' | 'kind'>>
      >;
      post_replies: Table<
        { id: string; post_id: string; author_id: string; body: string; payload?: MessagePayload | null; created_at: string },
        { post_id: string; author_id: string; body: string; payload?: MessagePayload | null },
        never
      >;
      post_audience_mutes: Table<
        { profile_id: string; class_id: string | null; muted_at: string },
        { profile_id: string; class_id?: string | null },
        never
      >;
      post_dismissals: Table<
        { profile_id: string; post_id: string; dismissed_at: string },
        { profile_id: string; post_id: string },
        never
      >;
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
      class_teachers: Table<
        { class_id: string; teacher_id: string; created_at: string },
        { class_id: string; teacher_id: string },
        never
      >;
      classes: Table<
        ClassRow,
        { teacher_id?: string | null; name: string; name_source?: ClassNameSource; feed_icon?: string | null },
        Partial<Pick<ClassRow, 'name' | 'name_source' | 'teacher_id' | 'feed_icon'>>
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
        {
          teacher_id: string;
          kind: AssetKind;
          storage_path: string;
          thumb_storage_path?: string | null;
          mime_type?: string | null;
          byte_size?: number | null;
        },
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
          capture_id?: string | null;
          submission_id?: string | null;
          student_id: string;
          label: string;
          source: GapSource;
          status?: GapStatus;
          sort_order?: number;
          skill_id?: string | null;
        },
        Partial<Omit<SkillGapRow, 'id' | 'created_at'>>
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
          is_makeup?: boolean;
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
          deck_id?: string | null;
          lesson_version?: string | null;
          storage_deck_id?: string | null;
          beat_start?: string | null;
          beat_end?: string | null;
          help_mode?: 'off' | 'hints' | 'steps_after_try' | 'check_work';
        },
        Partial<Omit<AssignmentRow, 'id' | 'created_at'>>
      >;
      lesson_packs: Table<
        LessonPackRow,
        {
          deck_id: string;
          version: string;
          title: string;
          published?: boolean;
          storage_deck_id: string;
          beat_start: string;
          beat_end: string;
        },
        Partial<Pick<LessonPackRow, 'title' | 'published' | 'storage_deck_id' | 'beat_start' | 'beat_end'>>
      >;
      submissions: Table<
        SubmissionRow,
        {
          assignment_id: string;
          student_id: string;
          status?: SubmissionStatus;
          answers?: Record<string, unknown> | null;
          draft_score?: number | null;
          approved_score?: number | null;
          approved_at?: string | null;
          score_mark?: 'numeric' | 'pass' | 'fail';
          model_draft?: Record<string, unknown> | null;
        },
        Partial<Omit<SubmissionRow, 'id' | 'assignment_id' | 'student_id' | 'created_at'>>
      >;
      parent_accesses: Table<
        ParentAccessRow,
        { parent_id: string; token: string; student_id?: string | null; email?: string | null },
        Partial<{ student_id: string | null; email: string | null; accepted_at: string | null }>
      >;
      ask_threads: Table<
        { id: string; profile_id: string; school_id: string; created_at: string; cleared_at: string | null },
        { profile_id: string; school_id: string; cleared_at?: string | null },
        Partial<{ cleared_at: string | null }>
      >;
      ask_messages: Table<
        {
          id: string;
          thread_id: string;
          role: 'user' | 'assistant';
          body: string;
          payload: MessagePayload | null;
          created_at: string;
        },
        { thread_id: string; role: 'user' | 'assistant'; body?: string; payload?: MessagePayload | null },
        Partial<{ body: string; payload: MessagePayload | null }>
      >;
    };
    Views: Record<string, never>;
    Functions: {
      student_me: {
        Args: Record<string, never>;
        Returns: {
          class_id: string | null;
          class_name: string | null;
          student_id: string;
          display_name: string;
          photo_path: string | null;
        }[];
      };
      student_classmates: {
        Args: Record<string, never>;
        Returns: {
          student_id: string;
          display_name: string;
          photo_path: string | null;
        }[];
      };
      student_gradebook: {
        Args: Record<string, never>;
        Returns: {
          class_id: string;
          class_name: string;
          assignment_id: string;
          assignment_title: string;
          kind: string;
          unit: string | null;
          section: string | null;
          term: string | null;
          created_at: string;
          submission_id: string;
          status: SubmissionStatus;
          approved_score: number | null;
          score_mark: string | null;
          answers: Record<string, unknown> | null;
        }[];
      };
      student_list_todo: {
        Args: Record<string, never>;
        Returns: {
          submission_id: string;
          assignment_id: string;
          assignment_title: string;
          kind: string;
          status: SubmissionStatus;
          due_at: string | null;
          submitted_at: string | null;
          class_id: string | null;
          class_name: string | null;
          class_icon: string | null;
          approved_score: number | null;
          score_mark: string | null;
          deck_id: string | null;
          lesson_version: string | null;
          items: PracticeItem[] | null;
          answers: Record<string, unknown> | null;
          focus_label: string | null;
          help_mode: string | null;
        }[];
      };
      student_classes: {
        Args: Record<string, never>;
        Returns: {
          class_id: string;
          class_name: string;
          feed_icon: string | null;
          teacher_id: string | null;
          teacher_name: string | null;
          teacher_photo_path: string | null;
        }[];
      };
      school_logo_paths: {
        Args: Record<string, never>;
        Returns: {
          asset_id: string;
          storage_path: string;
          thumb_storage_path: string | null;
        }[];
      };
      student_people: {
        Args: Record<string, never>;
        Returns: {
          kind: string;
          id: string;
          profile_id: string | null;
          display_name: string;
          photo_path: string | null;
          class_id: string | null;
          class_name: string | null;
        }[];
      };
      student_submit: {
        Args: {
          p_submission_id: string;
          p_answers: Record<string, unknown>;
        };
        Returns: undefined;
      };
      student_mark_started: {
        Args: { p_submission_id: string };
        Returns: undefined;
      };
      student_open_lesson: {
        Args: { p_assignment_id: string };
        Returns: {
          assignment_id: string;
          submission_id: string;
          title: string;
          deck_id: string;
          lesson_version: string;
          storage_deck_id: string;
          beat_start: string;
          beat_end: string;
          class_id: string;
          class_name: string;
          school_name: string;
          teacher_name: string;
          student_id: string;
          student_name: string;
        }[];
      };
      student_report_lesson: {
        Args: { p_assignment_id: string; p_payload: Record<string, unknown> };
        Returns: undefined;
      };
      admin_set_student_link: {
        Args: { p_profile_id: string; p_student_id: string | null };
        Returns: undefined;
      };
      admin_provision_student_login: {
        Args: { p_student_id: string };
        Returns: {
          profile_id: string;
          student_id: string;
          display_name: string;
          username: string;
          email: string;
          temp_password: string | null;
          created: boolean;
        }[];
      };
      admin_backfill_student_logins: {
        Args: Record<string, never>;
        Returns: {
          profile_id: string;
          student_id: string;
          display_name: string;
          username: string;
          email: string;
          temp_password: string | null;
          created: boolean;
        }[];
      };
      admin_provision_parent_login: {
        Args: { p_parent_id: string };
        Returns: {
          profile_id: string;
          parent_id: string;
          display_name: string;
          username: string;
          email: string;
          temp_password: string | null;
          created: boolean;
        }[];
      };
      admin_backfill_parent_logins: {
        Args: Record<string, never>;
        Returns: {
          profile_id: string;
          parent_id: string;
          display_name: string;
          username: string;
          email: string;
          temp_password: string | null;
          created: boolean;
        }[];
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
      login_identifier: { Args: { p_handle: string }; Returns: string | null };
      my_role: { Args: Record<string, never>; Returns: SchoolRole | null };
      is_school_admin: { Args: Record<string, never>; Returns: boolean };
      school_claim_superintendent: { Args: Record<string, never>; Returns: ProfileRow };
      admin_create_login: {
        Args: {
          p_email: string;
          p_password: string;
          p_username: string;
          p_role: SchoolRole;
          p_display_name: string;
          p_must_change?: boolean;
          p_also_parent?: boolean;
          p_also_administrator?: boolean;
          p_also_teacher?: boolean;
        };
        Returns: string;
      };
      admin_reset_login_password: {
        Args: { p_profile_id: string; p_password: string };
        Returns: undefined;
      };
      set_capability_grant: {
        Args: { p_capability: string; p_role: SchoolRole; p_access: string };
        Returns: undefined;
      };
      can_edit_profile: { Args: { p_target: string }; Returns: boolean };
      update_profile_details: {
        Args: {
          p_profile_id: string;
          p_display_name: string;
          p_username: string;
          p_email: string;
          p_phone: string;
          p_address: string;
          p_notes: string;
        };
        Returns: ProfileRow;
      };
      admin_set_also_hat: {
        Args: { p_profile_id: string; p_hat: string; p_also: boolean };
        Returns: undefined;
      };
      admin_set_also_parent: {
        Args: { p_profile_id: string; p_also: boolean };
        Returns: string | null;
      };
      parent_open_mine: { Args: Record<string, never>; Returns: ParentOpenRow[] };
      admin_set_parent_link: {
        Args: { p_parent_id: string; p_student_id: string; p_link: boolean };
        Returns: undefined;
      };
      can_link_parent_student: { Args: Record<string, never>; Returns: boolean };
      create_school_class: { Args: { p_name: string }; Returns: ClassRow };
      add_teacher_to_class: { Args: { p_class_id: string; p_teacher_id: string }; Returns: undefined };
      remove_teacher_from_class: { Args: { p_class_id: string; p_teacher_id: string }; Returns: undefined };
      teaches_class: { Args: { p_class_id: string }; Returns: boolean };
      school_students_for_link: { Args: Record<string, never>; Returns: StudentRow[] };
      school_parents_for_link: { Args: Record<string, never>; Returns: ParentRow[] };
      admin_set_parent_card_link: {
        Args: { p_profile_id: string; p_parent_id: string | null };
        Returns: undefined;
      };
      student_parents: { Args: { p_student_id: string }; Returns: ParentRow[] };
      parent_children: { Args: { p_parent_id: string }; Returns: StudentRow[] };
      dismiss_alert: { Args: { p_post_id: string }; Returns: undefined };
      count_alerts_for_me: { Args: Record<string, never>; Returns: number };
      get_alert: {
        Args: { p_post_id: string };
        Returns: {
          id: string;
          body: string;
          created_at: string;
          class_id: string | null;
          class_name: string | null;
          author_name: string;
        }[];
      };
      unread_message_count: { Args: Record<string, never>; Returns: number };
      profile_photo_assets: {
        Args: { p_ids: string[] };
        Returns: Array<{ profile_id: string; photo_asset_id: string | null; storage_path: string | null }>;
      };
      is_school_profile_photo: { Args: { p_path: string }; Returns: boolean };
      message_directory: { Args: Record<string, never>; Returns: ProfileRow[] };
      open_direct_thread: { Args: { p_other: string }; Returns: string };
      open_group_thread: {
        Args: { p_title: string; p_member_ids: string[]; p_student_id?: string | null };
        Returns: string;
      };
      set_thread_muted: { Args: { p_thread_id: string; p_muted: boolean }; Returns: undefined };
      set_thread_title: { Args: { p_thread_id: string; p_title: string }; Returns: undefined };
      set_thread_photo: { Args: { p_thread_id: string; p_path: string | null }; Returns: undefined };
      set_thread_pinned: { Args: { p_thread_id: string; p_pinned: boolean }; Returns: undefined };
      add_group_member: { Args: { p_thread_id: string; p_profile_id: string }; Returns: undefined };
      remove_group_member: { Args: { p_thread_id: string; p_profile_id: string }; Returns: undefined };
      send_message: {
        Args: { p_thread_id: string; p_body: string; p_payload?: MessagePayload | null };
        Returns: MessageRow;
      };
      unfurl_link: {
        Args: { p_url: string };
        Returns: { url: string; title: string; description: string | null; image_url: string | null };
      };
      school_students_not_in_class: { Args: { p_class_id: string }; Returns: StudentRow[] };
      school_parents_not_in_class: { Args: { p_class_id: string }; Returns: ParentRow[] };
      enroll_school_student: { Args: { p_class_id: string; p_student_id: string }; Returns: undefined };
      class_parent_directory: {
        Args: { p_class_id: string };
        Returns: Array<
          ParentRow & {
            pool: string;
            children: Array<{ id: string; display_name: string; photoUrl: string | null }>;
          }
        >;
      };
      add_parent_to_class: { Args: { p_class_id: string; p_parent_id: string }; Returns: number };
      remove_parent_from_class: { Args: { p_class_id: string; p_parent_id: string }; Returns: undefined };
      get_parent_card: { Args: { p_parent_id: string }; Returns: ParentRow };
      share_work_card: {
        Args: {
          p_student_id: string;
          p_assignment_id?: string | null;
          p_practice_set_id?: string | null;
          p_notify_parents: boolean;
          p_thread_id?: string | null;
        };
        Returns: string;
      };
      create_post: {
        Args: { p_class_id?: string | null; p_kind: string; p_body: string };
        Returns: PostRow;
      };
      create_feed_post: {
        Args: {
          p_class_id?: string | null;
          p_kind: string;
          p_body: string;
          p_payload: MessagePayload | null;
        };
        Returns: PostRow;
      };
      reply_to_post: { Args: { p_post_id: string; p_body: string }; Returns: { id: string } };
      reply_to_feed_post: {
        Args: { p_post_id: string; p_body: string; p_payload: MessagePayload | null };
        Returns: { id: string };
      };
      list_my_feeds: {
        Args: Record<string, never>;
        Returns: { kind: string; id: string; name: string; icon: string; can_edit: boolean }[];
      };
      set_school_feed_icon: { Args: { p_icon: string }; Returns: string };
      set_school_name: { Args: { p_name: string }; Returns: string };
      set_school_logo: { Args: { p_asset_id: string | null }; Returns: string | null };
      set_school_ai_cap: { Args: { p_usd: number }; Returns: number };
      ai_spend_this_month: { Args: Record<string, never>; Returns: Array<{ usd: number; cap_usd: number | null }> };
      ask_open_thread: { Args: Record<string, never>; Returns: string };
      ask_list_messages: { Args: { p_limit?: number }; Returns: AskMessageRow[] };
      ask_append_message: {
        Args: { p_role: 'user' | 'assistant'; p_body: string; p_payload?: MessagePayload | null };
        Returns: string;
      };
      ask_new_thread: { Args: Record<string, never>; Returns: string };
      ask_purge_old: { Args: Record<string, never>; Returns: undefined };
      set_class_feed_icon: { Args: { p_class_id: string; p_icon: string }; Returns: string };
      list_feed: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          class_id: string | null;
          class_name: string | null;
          author_id: string;
          author_name: string;
          author_username: string;
          kind: string;
          body: string;
          payload?: MessagePayload | null;
          created_at: string;
          reply_count: number;
        }[];
      };
      list_post_replies: {
        Args: { p_post_id: string };
        Returns: {
          id: string;
          author_id: string;
          author_name: string;
          body: string;
          payload?: MessagePayload | null;
          created_at: string;
        }[];
      };
      set_feed_muted: { Args: { p_class_id?: string | null; p_muted: boolean }; Returns: undefined };
      list_alerts_for_me: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          title: string;
          status: string;
          body: string;
          created_at: string;
          class_id: string | null;
          class_name: string | null;
        }[];
      };
      write_audit: {
        Args: {
          p_action: string;
          p_entity_type: string;
          p_entity_id?: string | null;
          p_student_id?: string | null;
          p_class_id?: string | null;
          p_before?: Record<string, unknown> | null;
          p_after?: Record<string, unknown> | null;
        };
        Returns: string;
      };
      class_teacher_of: { Args: { p_class_id: string }; Returns: boolean };
      parent_of: { Args: { p_student_id: string }; Returns: boolean };
      gauth_load_explain_capture: { Args: { p_capture_id: string }; Returns: Record<string, unknown> };
      park_explain_draft: {
        Args: { p_capture_id: string; p_draft: Record<string, unknown> };
        Returns: CaptureRow;
      };
      discard_explain_draft: { Args: { p_capture_id: string }; Returns: CaptureRow };
      attach_explain_as_note: { Args: { p_capture_id: string }; Returns: CaptureRow };
      get_class_syllabus: { Args: { p_class_id: string }; Returns: Record<string, unknown> };
      save_class_syllabus_draft: {
        Args: { p_class_id: string; p_payload: Record<string, unknown> };
        Returns: Record<string, unknown>;
      };
      publish_class_syllabus: {
        Args: { p_class_id: string; p_payload: Record<string, unknown>; p_row_version: number };
        Returns: Record<string, unknown>;
      };
      unpublish_class_syllabus: {
        Args: { p_class_id: string; p_row_version: number };
        Returns: Record<string, unknown>;
      };
      upsert_syllabus_ask_draft: {
        Args: { p_class_id: string; p_draft: Record<string, unknown>; p_source_asset_id?: string | null };
        Returns: Record<string, unknown>;
      };
      discard_syllabus_ask_draft: {
        Args: { p_class_id: string };
        Returns: Record<string, unknown>;
      };
      published_class_syllabus: { Args: { p_class_id: string }; Returns: Record<string, unknown> };
      student_class_average_explain: { Args: { p_class_id: string }; Returns: Record<string, unknown> };
      parent_class_average_explain: {
        Args: { p_class_id: string; p_student_id: string };
        Returns: Record<string, unknown>;
      };
      parent_child_classes: { Args: { p_student_id: string }; Returns: Record<string, unknown>[] };
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
      school_role: SchoolRole;
    };
  };
};
