-- Q9: profiles_read must not let any authenticated JWT SELECT every profile.
-- Self always. Office (is_school_admin) reads same-school only.
-- Others: shared message-thread members (hydrate) or can_message peers.
-- Do not ride is_staff. Students/parents/teachers cannot full-table dump.
-- message_directory / open_thread RPCs stay security definer; this is table RLS only.

create or replace function public.shares_message_thread(p_other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.message_thread_members mine
    join public.message_thread_members theirs
      on theirs.thread_id = mine.thread_id
     and theirs.profile_id = p_other
    where mine.profile_id = auth.uid()
      and p_other is not null
      and p_other is distinct from auth.uid()
  );
$$;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select using (
    id = auth.uid()
    or (
      public.is_school_admin()
      and public.my_school_id() is not null
      and school_id is not distinct from public.my_school_id()
    )
    or public.shares_message_thread(id)
    or public.can_message(auth.uid(), id)
  );

revoke all on function public.shares_message_thread(uuid) from public, anon;
grant execute on function public.shares_message_thread(uuid) to authenticated;
