import {
  asFeedIcon,
  DEFAULT_CLASS_FEED_ICON,
  DEFAULT_SCHOOL_FEED_ICON,
  type FeedIconName,
} from '@/lib/feeds/icons';
import { isAdminRole, isTeacherRole } from '@/lib/school/roles';
import { listClasses, listSchoolClasses } from '@/lib/classes/api';
import { requireSupabase } from '@/lib/supabase/client';
import type { ProfileRow } from '@/lib/supabase/types';

export type FeedRef = {
  key: string;
  kind: 'school' | 'class';
  id: string;
  name: string;
  icon: FeedIconName;
  canEdit: boolean;
};

type FeedRow = {
  kind?: string;
  id?: string;
  name?: string;
  icon?: string;
  can_edit?: boolean;
};

function asFeed(row: FeedRow): FeedRef | null {
  if (!row.id) return null;
  const kind = row.kind === 'class' ? 'class' : 'school';
  return {
    key: kind === 'school' ? 'school' : `class:${row.id}`,
    kind,
    id: row.id,
    name: row.name?.trim() || (kind === 'school' ? 'School' : 'Class'),
    icon: asFeedIcon(row.icon, kind === 'school' ? DEFAULT_SCHOOL_FEED_ICON : DEFAULT_CLASS_FEED_ICON),
    canEdit: Boolean(row.can_edit),
  };
}

export async function listMyFeeds(profile: ProfileRow | null): Promise<FeedRef[]> {
  const { data, error } = await requireSupabase().rpc('list_my_feeds');
  if (!error) {
    return (data ?? []).map((row) => asFeed(row as FeedRow)).filter((row): row is FeedRef => Boolean(row));
  }
  return listMyFeedsFallback(profile);
}

async function listMyFeedsFallback(profile: ProfileRow | null): Promise<FeedRef[]> {
  const school: FeedRef = {
    key: 'school',
    kind: 'school',
    id: profile?.school_id ?? 'school',
    name: 'School',
    icon: DEFAULT_SCHOOL_FEED_ICON,
    canEdit: isAdminRole(profile),
  };
  try {
    const rows = isAdminRole(profile) && !isTeacherRole(profile) ? await listSchoolClasses() : await listClasses();
    const classes = rows.map((row) => ({
      key: `class:${row.id}`,
      kind: 'class' as const,
      id: row.id,
      name: row.name,
      icon: asFeedIcon(row.feed_icon, DEFAULT_CLASS_FEED_ICON),
      canEdit: isAdminRole(profile) || isTeacherRole(profile),
    }));
    return [school, ...classes];
  } catch {
    return [school];
  }
}

export async function setSchoolFeedIcon(icon: FeedIconName): Promise<void> {
  const { error } = await requireSupabase().rpc('set_school_feed_icon', { p_icon: icon });
  if (error) throw new Error(error.message || 'Could not save the school feed icon');
}

export async function setClassFeedIcon(classId: string, icon: FeedIconName): Promise<void> {
  const { error } = await requireSupabase().rpc('set_class_feed_icon', {
    p_class_id: classId,
    p_icon: icon,
  });
  if (error) throw new Error(error.message || 'Could not save that feed icon');
}
