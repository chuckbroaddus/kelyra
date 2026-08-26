import AsyncStorage from '@react-native-async-storage/async-storage';

import { requireSupabase } from '@/lib/supabase/client';
import type { DraftAttach } from '@/lib/messages/attachments';
import type { MessagePayload, PostKind } from '@/lib/supabase/types';

const DISMISSED_KEY = 'kelyra.alerts.dismissed';
const READ_KEY = 'kelyra.alerts.read';
const dismissed = new Set<string>();
const read = new Set<string>();
let dismissedLoaded = false;
let readLoaded = false;

async function loadDismissed(): Promise<Set<string>> {
  if (dismissedLoaded) return dismissed;
  dismissedLoaded = true;
  try {
    const raw = await AsyncStorage.getItem(DISMISSED_KEY);
    const ids = raw ? (JSON.parse(raw) as string[]) : [];
    if (Array.isArray(ids)) ids.forEach((id) => dismissed.add(id));
  } catch {
    // Keep the in-memory set.
  }
  return dismissed;
}

async function rememberDismissed(postId: string): Promise<void> {
  dismissed.add(postId);
  dismissedLoaded = true;
  try {
    await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify([...dismissed]));
  } catch {
    // Badge still drops for this session.
  }
}

async function loadRead(): Promise<Set<string>> {
  if (readLoaded) return read;
  readLoaded = true;
  try {
    const raw = await AsyncStorage.getItem(READ_KEY);
    const ids = raw ? (JSON.parse(raw) as string[]) : [];
    if (Array.isArray(ids)) ids.forEach((id) => read.add(id));
  } catch {
    // Keep the in-memory set.
  }
  return read;
}

async function persistRead(): Promise<void> {
  try {
    await AsyncStorage.setItem(READ_KEY, JSON.stringify([...read]));
  } catch {
    // Badge still drops for this session.
  }
}

/** Marks an alert seen for the bell. Does not remove it from the inbox — swipe still dismisses. */
export async function markAlertRead(postId: string): Promise<boolean> {
  await loadRead();
  if (read.has(postId)) return false;
  read.add(postId);
  readLoaded = true;
  void persistRead();
  return true;
}

export type FeedPost = {
  id: string;
  classId: string | null;
  className: string | null;
  authorId: string;
  authorName: string;
  authorUsername: string;
  kind: PostKind;
  body: string;
  payload: MessagePayload | null;
  createdAt: string;
  replyCount: number;
};

function asPayload(raw: unknown): MessagePayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const type = 'type' in raw ? (raw as { type?: string }).type : null;
  if (type === 'photo' || type === 'file' || type === 'link' || type === 'work_card') {
    return raw as MessagePayload;
  }
  return null;
}

export type PostReply = {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  payload: MessagePayload | null;
  createdAt: string;
};

let feedCache: FeedPost[] | null = null;
let feedInflight: Promise<FeedPost[]> | null = null;

export function peekFeed(): FeedPost[] | null {
  return feedCache;
}

export function clearFeedCache() {
  feedCache = null;
  feedInflight = null;
}

export async function listFeed(): Promise<FeedPost[]> {
  if (feedInflight) return feedInflight;
  const work = (async () => {
    const { data, error } = await requireSupabase().rpc('list_feed');
    if (error) throw new Error(error.message || 'Could not load feed');
    const rows: FeedPost[] = (data ?? []).map((row) => ({
      id: row.id,
      classId: row.class_id,
      className: row.class_name,
      authorId: row.author_id,
      authorName: row.author_name,
      authorUsername: row.author_username,
      kind: row.kind === 'alert' ? 'alert' : 'post',
      body: row.body,
      payload: asPayload(row.payload),
      createdAt: row.created_at,
      replyCount: row.reply_count,
    }));
    feedCache = rows;
    return rows;
  })().finally(() => {
    if (feedInflight === work) feedInflight = null;
  });
  feedInflight = work;
  return work;
}

function missingRpc(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  if (error.code === 'PGRST202') return true;
  return /could not find the function/i.test(error.message ?? '');
}

export async function createPost(input: {
  classId?: string | null;
  kind?: PostKind;
  body: string;
  payload?: DraftAttach | MessagePayload | null;
}): Promise<void> {
  const supabase = requireSupabase();
  const base = {
    p_class_id: input.classId ?? null,
    p_kind: input.kind ?? 'post',
    p_body: input.body,
  };
  if (input.payload) {
    const { error } = await supabase.rpc('create_feed_post', {
      ...base,
      p_payload: input.payload,
    });
    if (error && missingRpc(error)) {
      throw new Error(
        'Paste supabase/migrations/20260819000006_feed_attachments.sql in the Supabase SQL editor, then post again.',
      );
    }
    if (error) throw new Error(error.message || error.details || 'Could not post');
    return;
  }
  const { error } = await supabase.rpc('create_post', base);
  if (error) throw new Error(error.message || error.details || 'Could not post');
}

export async function listPostReplies(postId: string): Promise<PostReply[]> {
  const { data, error } = await requireSupabase().rpc('list_post_replies', { p_post_id: postId });
  if (error) throw new Error(error.message || 'Could not load replies');
  return (data ?? []).map((row) => ({
    id: row.id,
    authorId: row.author_id,
    authorName: row.author_name,
    body: row.body,
    payload: asPayload(row.payload),
    createdAt: row.created_at,
  }));
}

export async function replyToPost(
  postId: string,
  body: string,
  payload?: DraftAttach | MessagePayload | null,
): Promise<void> {
  const supabase = requireSupabase();
  if (payload) {
    const { error } = await supabase.rpc('reply_to_feed_post', {
      p_post_id: postId,
      p_body: body,
      p_payload: payload,
    });
    if (error && missingRpc(error)) {
      throw new Error(
        'Paste supabase/migrations/20260819000007_feed_reply_attachments.sql in the Supabase SQL editor, then reply again.',
      );
    }
    if (error) throw new Error(error.message || error.details || 'Could not reply');
    return;
  }
  const { error } = await supabase.rpc('reply_to_post', {
    p_post_id: postId,
    p_body: body,
  });
  if (error) throw new Error(error.message || error.details || 'Could not reply');
}

export async function isFeedMuted(classId: string | null): Promise<boolean> {
  const supabase = requireSupabase();
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return false;
  let query = supabase.from('post_audience_mutes').select('profile_id').eq('profile_id', uid).limit(1);
  query = classId ? query.eq('class_id', classId) : query.is('class_id', null);
  const { data } = await query.maybeSingle();
  return Boolean(data);
}

export async function setFeedMuted(classId: string | null, muted: boolean): Promise<void> {
  const { error } = await requireSupabase().rpc('set_feed_muted', {
    p_class_id: classId,
    p_muted: muted,
  });
  if (error) throw new Error(error.message || 'Could not mute');
}

export type AlertNotice = {
  id: string;
  title: string;
  status: string;
  body: string;
  createdAt: string;
  classId: string | null;
  className: string | null;
};

export async function listAlertsForMe(): Promise<AlertNotice[]> {
  const hidden = await loadDismissed();
  const { data, error } = await requireSupabase().rpc('list_alerts_for_me');
  if (error) return [];
  return (data ?? [])
    .map((row) => {
      const body = 'body' in row && typeof row.body === 'string' ? row.body : row.status;
      const title = (row.title && row.title !== 'Alert' ? row.title : body).trim() || 'Alert';
      return {
        id: row.id,
        title,
        status: row.status,
        body,
        createdAt: row.created_at,
        classId: row.class_id,
        className: 'class_name' in row && typeof row.class_name === 'string' ? row.class_name : null,
      };
    })
    .filter((row) => !hidden.has(row.id));
}

export async function countAlertsForMe(): Promise<number> {
  const alerts = await listAlertsForMe();
  await loadRead();
  return alerts.filter((row) => !read.has(row.id)).length;
}

/** Live bell. Realtime if the table is published; callers should also poll. */
export function subscribeAlertBell(onChange: () => void): () => void {
  try {
    const supabase = requireSupabase();
    const channel = supabase
      .channel(`alert-bell:${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_dismissals' }, onChange)
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  } catch {
    return () => undefined;
  }
}

export async function dismissAlert(postId: string): Promise<void> {
  await rememberDismissed(postId);
  const supabase = requireSupabase();
  const { error } = await supabase.rpc('dismiss_alert', { p_post_id: postId });
  if (!error) return;
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return;
  await supabase.from('post_dismissals').insert({ profile_id: uid, post_id: postId });
}

async function loadPostPayload(postId: string): Promise<MessagePayload | null> {
  const { data } = await requireSupabase().from('posts').select('payload').eq('id', postId).maybeSingle();
  return asPayload(data?.payload);
}

export async function getAlert(postId: string): Promise<{
  id: string;
  body: string;
  createdAt: string;
  classId: string | null;
  className: string | null;
  authorName: string;
  payload: MessagePayload | null;
} | null> {
  const [{ data, error }, payload] = await Promise.all([
    requireSupabase().rpc('get_alert', { p_post_id: postId }),
    loadPostPayload(postId),
  ]);
  if (!error) {
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;
    return {
      id: row.id,
      body: row.body,
      createdAt: row.created_at,
      classId: row.class_id,
      className: row.class_name,
      authorName: row.author_name,
      payload,
    };
  }
  const listed = (await listAlertsForMe()).find((item) => item.id === postId);
  if (listed) {
    return {
      id: listed.id,
      body: listed.body,
      createdAt: listed.createdAt,
      classId: listed.classId,
      className: listed.className,
      authorName: 'Alert',
      payload,
    };
  }
  throw new Error(error.message || 'Could not load that alert');
}
