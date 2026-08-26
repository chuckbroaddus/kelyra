import AsyncStorage from '@react-native-async-storage/async-storage';

import { signedMessageUrl } from '@/lib/messages/attachments';
import { attachProfilePhotos } from '@/lib/people/photos';
import { requireSupabase } from '@/lib/supabase/client';
import type { MessagePayload, MessageRow, MessageThreadKind, ProfileRow } from '@/lib/supabase/types';

export type ThreadPerson = ProfileRow & { photoUrl: string | null };

export type ThreadFace = {
  id: string;
  name: string;
  photoUrl: string | null;
};

export type ThreadPreview = {
  id: string;
  kind: MessageThreadKind;
  title: string | null;
  lastMessageAt: string;
  lastBody: string | null;
  lastFromMe: boolean;
  other: Pick<ProfileRow, 'id' | 'username' | 'display_name' | 'role'> | null;
  faces: ThreadFace[];
  photoUrl: string | null;
  memberCount: number;
  muted: boolean;
  unread: boolean;
  pinned: boolean;
};

const PINS_KEY = 'kelyra.messages.pins';

export async function unreadCount(): Promise<number> {
  const supabase = requireSupabase();
  const { data: auth } = await supabase.auth.getUser();
  const myId = auth.user?.id;
  if (!myId) return 0;
  const { data: memberships, error } = await supabase
    .from('message_thread_members')
    .select('thread_id, last_read_at, muted_at')
    .eq('profile_id', myId);
  if (error || !memberships?.length) return 0;
  const live = memberships.filter((row) => !row.muted_at);
  if (!live.length) return 0;
  const { data: threads } = await supabase
    .from('message_threads')
    .select('id, last_message_at')
    .in(
      'id',
      live.map((row) => row.thread_id),
    );
  const lastAt = new Map((threads ?? []).map((row) => [row.id, row.last_message_at]));
  let n = 0;
  for (const row of live) {
    const at = lastAt.get(row.thread_id);
    if (at && (!row.last_read_at || at > row.last_read_at)) n += 1;
  }
  return n;
}

export async function listMessageableIds(): Promise<Set<string>> {
  const { data, error } = await requireSupabase().rpc('message_directory');
  if (error) return new Set();
  return new Set((data ?? []).map((row) => row.id));
}

export async function listMessageDirectory(): Promise<ProfileRow[]> {
  const { data, error } = await requireSupabase().rpc('message_directory');
  if (error) throw new Error(error.message || 'Could not load people');
  const rows = [...(data ?? [])];
  try {
    const { isAdminRole } = await import('@/lib/school/roles');
    const { loadMyProfile, listProfiles } = await import('@/lib/school/api');
    const mine = await loadMyProfile();
    if (!isAdminRole(mine)) return rows;
    const everyone = await listProfiles();
    const have = new Set(rows.map((row) => row.id));
    for (const person of everyone) {
      if (person.id === mine?.id || have.has(person.id)) continue;
      rows.push(person);
      have.add(person.id);
    }
  } catch {
    // Directory RPC is enough when People list is not readable.
  }
  return rows;
}

async function loadLocalPins(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(PINS_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

async function saveLocalPins(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(PINS_KEY, JSON.stringify(ids));
}

export async function listThreads(myId: string): Promise<ThreadPreview[]> {
  const supabase = requireSupabase();
  const withPins = await supabase
    .from('message_thread_members')
    .select('thread_id, last_read_at, muted_at, pinned_at')
    .eq('profile_id', myId);
  const withoutPins = withPins.error
    ? await supabase
        .from('message_thread_members')
        .select('thread_id, last_read_at, muted_at')
        .eq('profile_id', myId)
    : null;
  const memberships = (withPins.data ?? withoutPins?.data ?? []) as Array<{
    thread_id: string;
    last_read_at: string | null;
    muted_at: string | null;
    pinned_at?: string | null;
  }>;
  const error = withPins.error && withoutPins?.error ? withoutPins.error : null;
  if (error) throw new Error(error.message || error.details || 'Could not load messages');
  if (!memberships?.length) return [];
  const ids = memberships.map((row) => row.thread_id);
  const [{ data: threads }, { data: members }, { data: lastMessages }, localPins] = await Promise.all([
    supabase.from('message_threads').select('*').in('id', ids).order('last_message_at', { ascending: false }),
    supabase.from('message_thread_members').select('thread_id, profile_id').in('thread_id', ids),
    supabase
      .from('messages')
      .select('thread_id, body, created_at, sender_id')
      .in('thread_id', ids)
      .order('created_at', { ascending: false }),
    loadLocalPins(),
  ]);
  const otherIds = [...new Set((members ?? []).map((row) => row.profile_id).filter((id) => id !== myId))];
  const people = otherIds.length ? await listPeopleByIds(otherIds) : [];
  const personById = new Map(people.map((row) => [row.id, row]));
  const lastByThread = new Map<string, { body: string; created_at: string; sender_id: string }>();
  for (const row of lastMessages ?? []) {
    if (!lastByThread.has(row.thread_id)) lastByThread.set(row.thread_id, row);
  }
  const readBy = new Map(memberships.map((row) => [row.thread_id, row]));
  const customPhotos = await Promise.all(
    (threads ?? []).map(async (thread) => {
      const path = 'photo_path' in thread ? thread.photo_path : null;
      if (!path) return [thread.id, null] as const;
      return [thread.id, await signedMessageUrl('photo', path, 'thumb')] as const;
    }),
  );
  const photoByThread = new Map(customPhotos);
  return (threads ?? []).map((thread) => {
    const others = (members ?? []).filter((row) => row.thread_id === thread.id && row.profile_id !== myId);
    const otherId = others[0]?.profile_id;
    const last = lastByThread.get(thread.id);
    const mine = readBy.get(thread.id);
    const lastAt = last?.created_at ?? thread.last_message_at;
    const kind: MessageThreadKind = thread.kind === 'group' ? 'group' : 'direct';
    const faces: ThreadFace[] = others.flatMap((row) => {
      const person = personById.get(row.profile_id);
      if (!person) return [];
      return [
        {
          id: person.id,
          name: person.display_name || person.username,
          photoUrl: person.photoUrl,
        },
      ];
    });
    return {
      id: thread.id,
      kind,
      title: thread.title ?? null,
      lastMessageAt: thread.last_message_at,
      lastBody: last?.body ?? null,
      lastFromMe: last?.sender_id === myId,
      other: otherId
        ? {
            id: otherId,
            username: personById.get(otherId)?.username ?? '',
            display_name: personById.get(otherId)?.display_name ?? null,
            role: personById.get(otherId)?.role ?? 'teacher',
          }
        : null,
      faces,
      photoUrl: photoByThread.get(thread.id) ?? null,
      memberCount: others.length + 1,
      muted: Boolean(mine?.muted_at),
      unread: Boolean(lastAt && !mine?.muted_at && (!mine?.last_read_at || lastAt > mine.last_read_at)),
      pinned: Boolean(mine && 'pinned_at' in mine && mine.pinned_at) || localPins.has(thread.id),
    };
  });
}

export function subscribeThread(threadId: string, onInsert: (row: MessageRow) => void): () => void {
  const supabase = requireSupabase();
  const channel = supabase
    .channel(`thread-messages:${threadId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` },
      (payload) => {
        onInsert(payload.new as MessageRow);
      },
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

export async function listMessages(threadId: string): Promise<MessageRow[]> {
  const { data, error } = await requireSupabase()
    .from('messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function markRead(threadId: string, profileId: string): Promise<void> {
  await requireSupabase()
    .from('message_thread_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('thread_id', threadId)
    .eq('profile_id', profileId);
}

export async function sendMessage(
  threadId: string,
  senderId: string,
  body: string,
  payload?: MessagePayload | null,
): Promise<MessageRow> {
  const { data, error } = await requireSupabase().rpc('send_message', {
    p_thread_id: threadId,
    p_body: body,
    p_payload: payload ?? null,
  });
  if (error) throw error;
  return data;
}

export async function openThread(myId: string, otherId: string, _schoolId?: string): Promise<string> {
  if (myId === otherId) throw new Error('Pick someone else');
  const { data, error } = await requireSupabase().rpc('open_direct_thread', { p_other: otherId });
  if (error) throw new Error(error.message || 'Could not open thread');
  return data;
}

export async function openGroupThread(title: string, memberIds: string[], studentId?: string | null): Promise<string> {
  const { data, error } = await requireSupabase().rpc('open_group_thread', {
    p_title: title,
    p_member_ids: memberIds,
    p_student_id: studentId ?? null,
  });
  if (error) throw new Error(error.message || error.details || 'Could not open group');
  return data;
}

export async function openChildParentThread(studentId: string): Promise<string> {
  return openGroupThread('Parents', [], studentId);
}

export async function setThreadMuted(threadId: string, muted: boolean): Promise<void> {
  const { error } = await requireSupabase().rpc('set_thread_muted', {
    p_thread_id: threadId,
    p_muted: muted,
  });
  if (error) throw new Error(error.message || 'Could not mute');
}

export async function shareWorkCard(input: {
  studentId: string;
  assignmentId?: string | null;
  practiceSetId?: string | null;
  notifyParents: boolean;
  threadId?: string | null;
}): Promise<string> {
  const { data, error } = await requireSupabase().rpc('share_work_card', {
    p_student_id: input.studentId,
    p_assignment_id: input.assignmentId ?? null,
    p_practice_set_id: input.practiceSetId ?? null,
    p_notify_parents: input.notifyParents,
    p_thread_id: input.threadId ?? null,
  });
  if (error) throw new Error(error.message || error.details || 'Could not share');
  return data;
}

export async function getThread(threadId: string) {
  const { data, error } = await requireSupabase()
    .from('message_threads')
    .select('*')
    .eq('id', threadId)
    .single();
  if (error) throw error;
  return data;
}

export async function listPeopleByIds(ids: string[]): Promise<ThreadPerson[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return [];
  const { data, error } = await requireSupabase().from('profiles').select('*').in('id', unique);
  if (error) throw error;
  return attachProfilePhotos(data ?? []);
}

export async function listThreadMembers(threadId: string): Promise<ThreadPerson[]> {
  const supabase = requireSupabase();
  const { data: members, error } = await supabase
    .from('message_thread_members')
    .select('profile_id, muted_at')
    .eq('thread_id', threadId);
  if (error) throw error;
  return listPeopleByIds((members ?? []).map((row) => row.profile_id));
}

export async function addGroupMember(threadId: string, profileId: string): Promise<void> {
  const { error } = await requireSupabase().rpc('add_group_member', {
    p_thread_id: threadId,
    p_profile_id: profileId,
  });
  if (error) throw new Error(error.message || error.details || 'Could not add');
}

export async function removeGroupMember(threadId: string, profileId: string): Promise<void> {
  const { error } = await requireSupabase().rpc('remove_group_member', {
    p_thread_id: threadId,
    p_profile_id: profileId,
  });
  if (error) throw new Error(error.message || error.details || 'Could not remove');
}

export async function isThreadPinned(threadId: string, profileId: string): Promise<boolean> {
  const local = await loadLocalPins();
  if (local.has(threadId)) return true;
  const { data, error } = await requireSupabase()
    .from('message_thread_members')
    .select('pinned_at')
    .eq('thread_id', threadId)
    .eq('profile_id', profileId)
    .maybeSingle();
  if (error) return false;
  return Boolean(data && 'pinned_at' in data && data.pinned_at);
}

export async function isThreadMuted(threadId: string, profileId: string): Promise<boolean> {
  const { data } = await requireSupabase()
    .from('message_thread_members')
    .select('muted_at')
    .eq('thread_id', threadId)
    .eq('profile_id', profileId)
    .maybeSingle();
  return Boolean(data?.muted_at);
}

export async function setThreadPinned(threadId: string, pinned: boolean): Promise<void> {
  const { error } = await requireSupabase().rpc('set_thread_pinned', {
    p_thread_id: threadId,
    p_pinned: pinned,
  });
  const pins = await loadLocalPins();
  if (pinned) pins.add(threadId);
  else pins.delete(threadId);
  await saveLocalPins([...pins]);
  if (error && !/could not find|does not exist|schema cache/i.test(error.message)) {
    throw new Error(error.message || 'Could not update favorite');
  }
}

export async function setThreadTitle(threadId: string, title: string): Promise<void> {
  const { error } = await requireSupabase().rpc('set_thread_title', {
    p_thread_id: threadId,
    p_title: title,
  });
  if (error) {
    const fallback = await requireSupabase()
      .from('message_threads')
      .update({ title: title.trim() || null })
      .eq('id', threadId);
    if (fallback.error) throw new Error(error.message || fallback.error.message || 'Could not rename');
  }
}

export async function setThreadPhoto(threadId: string, path: string | null): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.rpc('set_thread_photo', {
    p_thread_id: threadId,
    p_path: path,
  });
  if (error) {
    const fallback = await supabase.from('message_threads').update({ photo_path: path }).eq('id', threadId);
    if (fallback.error) throw new Error(error.message || fallback.error.message || 'Could not set photo');
  }
  const { data } = await supabase.from('message_threads').select('photo_path').eq('id', threadId).maybeSingle();
  const saved = data && 'photo_path' in data ? data.photo_path : null;
  if ((path ?? null) !== (saved ?? null)) {
    throw new Error('Could not save that photo. Paste the latest Messages SQL in Supabase, then try again.');
  }
}

export async function uploadThreadPhoto(ownerId: string, uri: string, mimeType: string): Promise<string> {
  const { uploadMessageFile } = await import('@/lib/messages/attachments');
  const uploaded = await uploadMessageFile({
    ownerId,
    uri,
    mimeType,
    name: 'Group.jpg',
    kind: 'photo',
  });
  if (uploaded.type !== 'photo') throw new Error('Could not set photo');
  return uploaded.storage_path;
}

export async function replaceThreadPhoto(
  threadId: string,
  ownerId: string,
  uri: string,
  mimeType: string,
): Promise<string> {
  const path = await uploadThreadPhoto(ownerId, uri, mimeType);
  await setThreadPhoto(threadId, path);
  const { signedMessageUrl } = await import('@/lib/messages/attachments');
  return (await signedMessageUrl('photo', path, 'thumb')) ?? uri;
}

export function threadDisplayName(thread: Pick<ThreadPreview, 'kind' | 'title' | 'other' | 'faces' | 'memberCount'>): string {
  if (thread.kind === 'group') {
    if (thread.title?.trim()) return thread.title.trim();
    const names = thread.faces.map((face) => face.name.split(/\s+/)[0] || face.name).filter(Boolean);
    if (names.length) return names.slice(0, 3).join(', ') + (names.length > 3 ? ` +${names.length - 3}` : '');
    return 'Group';
  }
  return thread.other?.display_name || thread.other?.username || thread.faces[0]?.name || 'Message';
}
