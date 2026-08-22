-- Fix message RLS: policies that SELECT message_thread_members from a
-- message_thread_members policy recurse and fail the list.
-- Directory is wide in v1: any signed-in person can see profiles to start a thread.

create or replace function public.is_thread_member(p_thread uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.message_thread_members
    where thread_id = p_thread
      and profile_id = auth.uid()
  );
$$;

drop policy if exists threads_member on public.message_threads;
create policy threads_member on public.message_threads
  for select using (
    public.is_school_admin()
    or public.is_thread_member(id)
  );

drop policy if exists thread_members_visible on public.message_thread_members;
create policy thread_members_visible on public.message_thread_members
  for select using (
    public.is_school_admin()
    or profile_id = auth.uid()
    or public.is_thread_member(thread_id)
  );

drop policy if exists messages_member on public.messages;
create policy messages_member on public.messages
  for select using (
    public.is_school_admin()
    or public.is_thread_member(thread_id)
  );

drop policy if exists messages_send on public.messages;
create policy messages_send on public.messages
  for insert with check (
    sender_id = auth.uid()
    and public.is_thread_member(thread_id)
  );

drop policy if exists profiles_self on public.profiles;
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select using (auth.uid() is not null);

grant execute on function public.is_thread_member(uuid) to authenticated;
