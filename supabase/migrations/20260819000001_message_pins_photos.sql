-- Pins (favorites) and optional group photo for Messages.

alter table public.message_threads
  add column if not exists photo_path text;

alter table public.message_thread_members
  add column if not exists pinned_at timestamptz;

create or replace function public.is_thread_member(p_thread_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.message_thread_members
    where thread_id = p_thread_id and profile_id = auth.uid()
  );
$$;

create or replace function public.set_thread_title(p_thread_id uuid, p_title text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_thread_member(p_thread_id) then
    raise exception 'not allowed';
  end if;
  if not exists (select 1 from public.message_threads where id = p_thread_id and kind = 'group') then
    raise exception 'Only group chats can be named';
  end if;
  update public.message_threads
  set title = nullif(trim(p_title), '')
  where id = p_thread_id;
end;
$$;

create or replace function public.set_thread_photo(p_thread_id uuid, p_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_thread_member(p_thread_id) then
    raise exception 'not allowed';
  end if;
  update public.message_threads
  set photo_path = nullif(trim(p_path), '')
  where id = p_thread_id;
end;
$$;

create or replace function public.set_thread_pinned(p_thread_id uuid, p_pinned boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_thread_member(p_thread_id) then
    raise exception 'not allowed';
  end if;
  update public.message_thread_members
  set pinned_at = case when p_pinned then now() else null end
  where thread_id = p_thread_id and profile_id = auth.uid();
end;
$$;

drop policy if exists threads_member_update on public.message_threads;
create policy threads_member_update on public.message_threads
  for update using (
    public.is_school_admin()
    or exists (
      select 1 from public.message_thread_members m
      where m.thread_id = id and m.profile_id = auth.uid()
    )
  )
  with check (
    public.is_school_admin()
    or exists (
      select 1 from public.message_thread_members m
      where m.thread_id = id and m.profile_id = auth.uid()
    )
  );

grant execute on function public.set_thread_title(uuid, text) to authenticated;
grant execute on function public.set_thread_photo(uuid, text) to authenticated;
grant execute on function public.set_thread_pinned(uuid, boolean) to authenticated;
