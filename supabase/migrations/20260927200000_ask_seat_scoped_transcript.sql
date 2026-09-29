-- Seat-scoped Ask transcripts (AC-DUAL-ASK-4). One open thread per (profile, seat).
-- Legacy rows with seat null stay out of the parent seat. Parent never adopts legacy.

alter table public.ask_threads
  add column if not exists seat text
  check (seat is null or seat in ('teacher', 'parent', 'office', 'student'));

drop index if exists public.ask_threads_one_open;

create unique index if not exists ask_threads_one_open_per_seat
  on public.ask_threads (profile_id, seat)
  where cleared_at is null and seat is not null;

create unique index if not exists ask_threads_one_open_legacy
  on public.ask_threads (profile_id)
  where cleared_at is null and seat is null;

-- Replace zero-arg / prior signatures so named p_seat calls resolve.
drop function if exists public.ask_open_thread();
drop function if exists public.ask_open_thread(text);
drop function if exists public.ask_list_messages(int);
drop function if exists public.ask_list_messages(int, text);
drop function if exists public.ask_append_message(text, text, jsonb);
drop function if exists public.ask_append_message(text, text, jsonb, text);
drop function if exists public.ask_new_thread();
drop function if exists public.ask_new_thread(text);

create or replace function public.ask_open_thread(p_seat text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  school uuid;
  thread uuid;
  seat_val text := nullif(trim(both from coalesce(p_seat, '')), '');
begin
  if me is null then
    raise exception 'Sign in';
  end if;
  if seat_val is not null and seat_val not in ('teacher', 'parent', 'office', 'student') then
    raise exception 'Unknown ask seat';
  end if;
  perform public.ask_purge_old();
  select school_id into school from public.profiles where id = me;
  if school is null then
    raise exception 'No school';
  end if;

  if seat_val is not null then
    select id into thread
    from public.ask_threads
    where profile_id = me and cleared_at is null and seat = seat_val
    limit 1;
    if thread is not null then
      return thread;
    end if;

    -- Non-parent seats may adopt a single legacy (null-seat) open thread once.
    if seat_val is distinct from 'parent' then
      select id into thread
      from public.ask_threads
      where profile_id = me and cleared_at is null and seat is null
      limit 1;
      if thread is not null then
        update public.ask_threads set seat = seat_val where id = thread;
        return thread;
      end if;
    end if;

    insert into public.ask_threads (profile_id, school_id, seat)
    values (me, school, seat_val)
    returning id into thread;
    return thread;
  end if;

  -- Legacy no-seat open (compat for callers that omit p_seat).
  select id into thread
  from public.ask_threads
  where profile_id = me and cleared_at is null and seat is null
  limit 1;
  if thread is not null then
    return thread;
  end if;
  insert into public.ask_threads (profile_id, school_id, seat)
  values (me, school, null)
  returning id into thread;
  return thread;
end;
$$;

create or replace function public.ask_list_messages(p_limit int default 100, p_seat text default null)
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
  seat_val text := nullif(trim(both from coalesce(p_seat, '')), '');
begin
  if auth.uid() is null then
    raise exception 'Sign in';
  end if;
  if seat_val is not null and seat_val not in ('teacher', 'parent', 'office', 'student') then
    raise exception 'Unknown ask seat';
  end if;

  if seat_val is null then
    select t.id into thread
    from public.ask_threads t
    where t.profile_id = auth.uid() and t.cleared_at is null and t.seat is null
    limit 1;
  elsif seat_val = 'parent' then
    -- Parent never sees legacy (null-seat) threads.
    select t.id into thread
    from public.ask_threads t
    where t.profile_id = auth.uid() and t.cleared_at is null and t.seat = 'parent'
    limit 1;
  else
    select t.id into thread
    from public.ask_threads t
    where t.profile_id = auth.uid()
      and t.cleared_at is null
      and t.seat = seat_val
    limit 1;
    -- Adopt legacy into this seat's list view without rewriting until open/append.
    if thread is null then
      select t.id into thread
      from public.ask_threads t
      where t.profile_id = auth.uid() and t.cleared_at is null and t.seat is null
      limit 1;
    end if;
  end if;

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
  p_payload jsonb default null,
  p_seat text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  thread uuid;
  msg uuid;
  seat_val text := nullif(trim(both from coalesce(p_seat, '')), '');
begin
  if p_role not in ('user', 'assistant') then
    raise exception 'Bad role';
  end if;
  if seat_val is not null and seat_val not in ('teacher', 'parent', 'office', 'student') then
    raise exception 'Unknown ask seat';
  end if;
  thread := public.ask_open_thread(seat_val);
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

create or replace function public.ask_new_thread(p_seat text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  school uuid;
  thread uuid;
  seat_val text := nullif(trim(both from coalesce(p_seat, '')), '');
begin
  if me is null then
    raise exception 'Sign in';
  end if;
  if seat_val is not null and seat_val not in ('teacher', 'parent', 'office', 'student') then
    raise exception 'Unknown ask seat';
  end if;
  perform public.ask_purge_old();
  select school_id into school from public.profiles where id = me;
  if school is null then
    raise exception 'No school';
  end if;

  if seat_val is null then
    update public.ask_threads
    set cleared_at = now()
    where profile_id = me and cleared_at is null and seat is null;
    insert into public.ask_threads (profile_id, school_id, seat)
    values (me, school, null)
    returning id into thread;
    return thread;
  end if;

  -- Clear only this seat. Parent never clears legacy; other seats clear adopted legacy too.
  update public.ask_threads
  set cleared_at = now()
  where profile_id = me
    and cleared_at is null
    and (
      seat = seat_val
      or (seat_val is distinct from 'parent' and seat is null)
    );

  insert into public.ask_threads (profile_id, school_id, seat)
  values (me, school, seat_val)
  returning id into thread;
  return thread;
end;
$$;

grant execute on function public.ask_open_thread(text) to authenticated;
grant execute on function public.ask_list_messages(int, text) to authenticated;
grant execute on function public.ask_append_message(text, text, jsonb, text) to authenticated;
grant execute on function public.ask_new_thread(text) to authenticated;
