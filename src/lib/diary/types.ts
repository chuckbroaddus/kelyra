import type { DiarySeat } from '@/lib/diary/seat';

export type DiaryEntryRow = {
  id: string;
  owner_profile_id: string;
  seat: DiarySeat;
  entry_date: string;
  title: string | null;
  body: string;
  tags: string[] | null;
  student_id: string | null;
  child_student_id: string | null;
  created_at: string;
  updated_at: string;
};

export type DiaryMediaRow = {
  id: string;
  entry_id: string;
  owner_profile_id: string;
  kind: 'photo';
  storage_path: string;
  content_type: string | null;
  byte_size: number | null;
  created_at: string;
};

export type LedgerActionFamily = 'assign' | 'grade' | 'syllabus' | 'capture' | 'office' | 'other';

export type LedgerEventRow = {
  id: string;
  owner_profile_id: string;
  seat: DiarySeat;
  action: string;
  action_family: LedgerActionFamily;
  entity_type: string | null;
  entity_id: string | null;
  class_id: string | null;
  student_id: string | null;
  summary: string;
  before_snippet: string | null;
  after_snippet: string | null;
  source_audit_id: string | null;
  created_at: string;
};

export type DiaryDraft = {
  title?: string | null;
  body: string;
  entry_date: string;
};
