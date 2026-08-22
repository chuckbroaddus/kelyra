-- Mail badge = unread threads, not individual incoming messages.
-- A thread is unread when its last activity is after last_read and the member has not muted it.

create or replace function public.unread_message_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select count(*)::int
    from public.message_thread_members mem
    join public.message_threads t on t.id = mem.thread_id
    where mem.profile_id = auth.uid()
      and mem.muted_at is null
      and (mem.last_read_at is null or t.last_message_at > mem.last_read_at)
  ), 0);
$$;
