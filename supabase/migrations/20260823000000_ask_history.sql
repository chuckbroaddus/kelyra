-- Kelyra Ask history: one open thread per signed-in profile. Not Messages.
-- Owner-only RLS. Keep 90 days. Paste in the SQL editor.

create table if not exists public.ask_threads (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  created_at timestamptz not null default now(),
  cleared_at timestamptz
);

create unique index if not exists ask_threads_one_open
  on public.ask_threads (profile_id)
  where cleared_at is null;

create table if not exists public.ask_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.ask_threads (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  body text not null default '',
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ask_messages_thread_created_idx
  on public.ask_messages (thread_id, created_at);

alter table public.ask_threads enable row level security;
alter table public.ask_messages enable row level security;

drop policy if exists ask_threads_own on public.ask_threads;
create policy ask_threads_own on public.ask_threads
  for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists ask_messages_own on public.ask_messages;
create policy ask_messages_own on public.ask_messages
  for all
  using (
    exists (
      select 1 from public.ask_threads t
      where t.id = thread_id and t.profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.ask_threads t
      where t.id = thread_id and t.profile_id = auth.uid()
    )
  );

create or replace function public.ask_purge_old()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.ask_messages m
  using public.ask_threads t
  where m.thread_id = t.id
    and t.profile_id = auth.uid()
    and m.created_at < now() - interval '90 days';

  delete from public.ask_threads
  where profile_id = auth.uid()
    and cleared_at is not null
    and cleared_at < now() - interval '90 days';
$$;

create or replace function public.ask_open_thread()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  school uuid;
  thread uuid;
begin
  if me is null then
    raise exception 'Sign in';
  end if;
  perform public.ask_purge_old();
  select school_id into school from public.profiles where id = me;
  if school is null then
    raise exception 'No school';
  end if;
  select id into thread
  from public.ask_threads
  where profile_id = me and cleared_at is null
  limit 1;
  if thread is not null then
    return thread;
  end if;
  insert into public.ask_threads (profile_id, school_id)
  values (me, school)
  returning id into thread;
  return thread;
end;
$$;

create or replace function public.ask_list_messages(p_limit int default 100)
returns table (
  id uuid,
  role text,
  body text,
  payload jsonb,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  thread uuid;
  cap int := greatest(1, least(coalesce(p_limit, 100), 100));
begin
  if auth.uid() is null then
    raise exception 'Sign in';
  end if;
  select t.id into thread
  from public.ask_threads t
  where t.profile_id = auth.uid() and t.cleared_at is null
  limit 1;
  if thread is null then
    return;
  end if;
  return query
  select q.id, q.role, q.body, q.payload, q.created_at
  from (
    select m.id, m.role, m.body, m.payload, m.created_at
    from public.ask_messages m
    where m.thread_id = thread
    order by m.created_at desc
    limit cap
  ) q
  order by q.created_at;
end;
$$;

create or replace function public.ask_append_message(
  p_role text,
  p_body text,
  p_payload jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  thread uuid;
  msg uuid;
begin
  if p_role not in ('user', 'assistant') then
    raise exception 'Bad role';
  end if;
  thread := public.ask_open_thread();
  insert into public.ask_messages (thread_id, role, body, payload)
  values (thread, p_role, coalesce(p_body, ''), p_payload)
  returning id into msg;

  delete from public.ask_messages m
  where m.thread_id = thread
    and m.id not in (
      select x.id from public.ask_messages x
      where x.thread_id = thread
      order by x.created_at desc
      limit 200
    );
  return msg;
end;
$$;

create or replace function public.ask_new_thread()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  school uuid;
  thread uuid;
begin
  if me is null then
    raise exception 'Sign in';
  end if;
  perform public.ask_purge_old();
  select school_id into school from public.profiles where id = me;
  if school is null then
    raise exception 'No school';
  end if;
  update public.ask_threads
  set cleared_at = now()
  where profile_id = me and cleared_at is null;
  insert into public.ask_threads (profile_id, school_id)
  values (me, school)
  returning id into thread;
  return thread;
end;
$$;

grant execute on function public.ask_open_thread() to authenticated;
grant execute on function public.ask_list_messages(int) to authenticated;
grant execute on function public.ask_append_message(text, text, jsonb) to authenticated;
grant execute on function public.ask_new_thread() to authenticated;
grant execute on function public.ask_purge_old() to authenticated;
