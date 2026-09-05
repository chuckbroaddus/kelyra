-- DIARY + My Ledger v1 (t_f9b1198c)
-- Owner-only RLS (model C). New ledger_events — not audit_events projection.
-- CoS applies this migration; do not apply from the build loop.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  seat text not null check (seat in ('teacher', 'staff', 'parent')),
  entry_date date not null default (timezone('utc', now()))::date,
  title text,
  body text not null,
  tags text[] not null default '{}',
  student_id uuid references public.students (id) on delete set null,
  child_student_id uuid references public.students (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint diary_entries_body_nonempty check (length(trim(body)) > 0)
);

create index if not exists diary_entries_owner_seat_date_idx
  on public.diary_entries (owner_profile_id, seat, entry_date desc, created_at desc);
create index if not exists diary_entries_student_idx on public.diary_entries (student_id);
create index if not exists diary_entries_child_idx on public.diary_entries (child_student_id);

create table if not exists public.diary_media (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.diary_entries (id) on delete cascade,
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null default 'photo' check (kind in ('photo')),
  storage_path text not null,
  content_type text,
  byte_size int,
  created_at timestamptz not null default now()
);

create index if not exists diary_media_entry_idx on public.diary_media (entry_id);
create index if not exists diary_media_owner_idx on public.diary_media (owner_profile_id);

create table if not exists public.ledger_events (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  seat text not null check (seat in ('teacher', 'staff', 'parent')),
  action text not null,
  action_family text not null check (action_family in ('assign', 'grade', 'syllabus', 'capture', 'office', 'other')),
  entity_type text,
  entity_id text,
  class_id uuid,
  student_id uuid,
  summary text not null,
  before_snippet text,
  after_snippet text,
  source_audit_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists ledger_events_owner_seat_created_idx
  on public.ledger_events (owner_profile_id, seat, created_at desc);
create index if not exists ledger_events_student_idx on public.ledger_events (student_id);
create index if not exists ledger_events_class_idx on public.ledger_events (class_id);
create index if not exists ledger_events_family_idx on public.ledger_events (action_family);

-- ---------------------------------------------------------------------------
-- updated_at touch
-- ---------------------------------------------------------------------------

create or replace function public.diary_entries_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists diary_entries_touch_updated_at on public.diary_entries;
create trigger diary_entries_touch_updated_at
  before update on public.diary_entries
  for each row execute function public.diary_entries_touch_updated_at();

-- ---------------------------------------------------------------------------
-- Parent link helper (for twin fail-closed)
-- ---------------------------------------------------------------------------

create or replace function public.my_parent_student_count()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.parent_students ps
  join public.profiles p on p.parent_id = ps.parent_id
  where p.id = auth.uid();
$$;

create or replace function public.i_parent_of(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.parent_students ps
    join public.profiles p on p.parent_id = ps.parent_id
    where p.id = auth.uid()
      and ps.student_id = p_student_id
  );
$$;

revoke all on function public.my_parent_student_count() from public, anon;
revoke all on function public.i_parent_of(uuid) from public, anon;
grant execute on function public.my_parent_student_count() to authenticated;
grant execute on function public.i_parent_of(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS — owner_profile_id = auth.uid() ONLY
-- Never is_staff / is_school_admin / teaches_class / class_teacher_of
-- ---------------------------------------------------------------------------

alter table public.diary_entries enable row level security;
alter table public.diary_media enable row level security;
alter table public.ledger_events enable row level security;

drop policy if exists diary_entries_select_own on public.diary_entries;
create policy diary_entries_select_own on public.diary_entries
  for select to authenticated
  using (
    owner_profile_id = auth.uid()
    and (
      seat <> 'parent'
      or public.my_parent_student_count() < 2
      or (
        child_student_id is not null
        and public.i_parent_of(child_student_id)
      )
    )
  );

drop policy if exists diary_entries_insert_own on public.diary_entries;
create policy diary_entries_insert_own on public.diary_entries
  for insert to authenticated
  with check (
    owner_profile_id = auth.uid()
    and (
      seat <> 'parent'
      or public.my_parent_student_count() < 2
      or (
        child_student_id is not null
        and public.i_parent_of(child_student_id)
      )
    )
  );

drop policy if exists diary_entries_update_own on public.diary_entries;
create policy diary_entries_update_own on public.diary_entries
  for update to authenticated
  using (owner_profile_id = auth.uid())
  with check (
    owner_profile_id = auth.uid()
    and (
      seat <> 'parent'
      or public.my_parent_student_count() < 2
      or (
        child_student_id is not null
        and public.i_parent_of(child_student_id)
      )
    )
  );

drop policy if exists diary_entries_delete_own on public.diary_entries;
create policy diary_entries_delete_own on public.diary_entries
  for delete to authenticated
  using (owner_profile_id = auth.uid());

drop policy if exists diary_media_select_own on public.diary_media;
create policy diary_media_select_own on public.diary_media
  for select to authenticated
  using (owner_profile_id = auth.uid());

drop policy if exists diary_media_insert_own on public.diary_media;
create policy diary_media_insert_own on public.diary_media
  for insert to authenticated
  with check (
    owner_profile_id = auth.uid()
    and exists (
      select 1 from public.diary_entries e
      where e.id = entry_id and e.owner_profile_id = auth.uid()
    )
  );

drop policy if exists diary_media_update_own on public.diary_media;
create policy diary_media_update_own on public.diary_media
  for update to authenticated
  using (owner_profile_id = auth.uid())
  with check (owner_profile_id = auth.uid());

drop policy if exists diary_media_delete_own on public.diary_media;
create policy diary_media_delete_own on public.diary_media
  for delete to authenticated
  using (owner_profile_id = auth.uid());

-- Ledger: owner SELECT only. No client INSERT/UPDATE/DELETE.
drop policy if exists ledger_events_select_own on public.ledger_events;
create policy ledger_events_select_own on public.ledger_events
  for select to authenticated
  using (owner_profile_id = auth.uid());

revoke insert, update, delete, truncate on public.ledger_events from public, anon, authenticated;
grant select on public.ledger_events to authenticated;
grant select, insert, update, delete on public.diary_entries to authenticated;
grant select, insert, update, delete on public.diary_media to authenticated;

-- ---------------------------------------------------------------------------
-- list_my_diary_entries — twin fail-closed when focus missing (2+ children)
-- ---------------------------------------------------------------------------

create or replace function public.list_my_diary_entries(
  p_seat text,
  p_child_student_id uuid default null,
  p_query text default null,
  p_from date default null,
  p_to date default null,
  p_tag text default null,
  p_student_id uuid default null,
  p_limit int default 200
)
returns setof public.diary_entries
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  q text := nullif(trim(both from coalesce(p_query, '')), '');
  lim int := least(greatest(coalesce(p_limit, 200), 1), 500);
begin
  if auth.uid() is null then
    return;
  end if;
  if p_seat is null or p_seat not in ('teacher', 'staff', 'parent') then
    return;
  end if;
  if p_seat = 'parent' and public.my_parent_student_count() >= 2 then
    if p_child_student_id is null or not public.i_parent_of(p_child_student_id) then
      return; -- fail closed: empty, never mash-up
    end if;
  end if;

  return query
  select e.*
  from public.diary_entries e
  where e.owner_profile_id = auth.uid()
    and e.seat = p_seat
    and (p_child_student_id is null or e.child_student_id = p_child_student_id)
    and (p_from is null or e.entry_date >= p_from)
    and (p_to is null or e.entry_date <= p_to)
    and (p_tag is null or p_tag = any (e.tags))
    and (p_student_id is null or e.student_id = p_student_id)
    and (
      q is null
      or e.body ilike '%' || q || '%'
      or coalesce(e.title, '') ilike '%' || q || '%'
      or exists (select 1 from unnest(e.tags) t where t ilike '%' || q || '%')
    )
  order by e.entry_date desc, e.created_at desc
  limit lim;
end;
$$;

revoke all on function public.list_my_diary_entries(text, uuid, text, date, date, text, uuid, int) from public, anon;
grant execute on function public.list_my_diary_entries(text, uuid, text, date, date, text, uuid, int) to authenticated;

-- ---------------------------------------------------------------------------
-- write_ledger — SECURITY DEFINER; swallow errors; never client-callable
-- ---------------------------------------------------------------------------

create or replace function public.write_ledger(
  p_seat text,
  p_action text,
  p_action_family text,
  p_summary text,
  p_entity_type text default null,
  p_entity_id text default null,
  p_class_id uuid default null,
  p_student_id uuid default null,
  p_before_snippet text default null,
  p_after_snippet text default null,
  p_source_audit_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  seat_val text := nullif(trim(both from coalesce(p_seat, '')), '');
  action_val text := nullif(trim(both from coalesce(p_action, '')), '');
  family_val text := nullif(trim(both from coalesce(p_action_family, '')), '');
  summary_val text := nullif(trim(both from coalesce(p_summary, '')), '');
begin
  begin
    if auth.uid() is null then
      return null;
    end if;
    if seat_val is null or seat_val not in ('teacher', 'staff', 'parent') then
      return null;
    end if;
    if action_val is null or family_val is null or summary_val is null then
      return null;
    end if;
    if family_val not in ('assign', 'grade', 'syllabus', 'capture', 'office', 'other') then
      return null;
    end if;
    -- Parent My Ledger deferred in v1
    if seat_val = 'parent' then
      return null;
    end if;

    insert into public.ledger_events (
      owner_profile_id, seat, action, action_family,
      entity_type, entity_id, class_id, student_id,
      summary, before_snippet, after_snippet, source_audit_id
    )
    values (
      auth.uid(), -- never a client-picked uid
      seat_val,
      action_val,
      family_val,
      p_entity_type,
      p_entity_id,
      p_class_id,
      p_student_id,
      left(summary_val, 500),
      p_before_snippet,
      p_after_snippet,
      p_source_audit_id
    )
    returning id into new_id;
    return new_id;
  exception when others then
    return null; -- never roll back Approve / assign
  end;
end;
$$;

revoke all on function public.write_ledger(text, text, text, text, text, text, uuid, uuid, text, text, uuid)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Private storage bucket `diary`
-- Path: {owner}/{seat}/{entry_id}/{media_id} — first segment = auth.uid()
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('diary', 'diary', false)
on conflict (id) do update set public = false;

drop policy if exists diary_storage_select_own on storage.objects;
create policy diary_storage_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'diary'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists diary_storage_insert_own on storage.objects;
create policy diary_storage_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'diary'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists diary_storage_update_own on storage.objects;
create policy diary_storage_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'diary'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'diary'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists diary_storage_delete_own on storage.objects;
create policy diary_storage_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'diary'
    and split_part(name, '/', 1) = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Teacher emitters (best-effort triggers)
-- ---------------------------------------------------------------------------

create or replace function public.ledger_on_assignment_upsert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  class_name text;
  summary text;
  action_name text;
  family text;
begin
  if auth.uid() is null then
    return new;
  end if;
  -- Only the acting teacher; never student RPCs
  if not exists (
    select 1 from public.class_teachers ct
    where ct.class_id = new.class_id and ct.teacher_id = auth.uid()
  ) then
    return new;
  end if;

  select c.name into class_name from public.classes c where c.id = new.class_id;
  if new.kind = 'lesson' then
    action_name := 'assign_lesson';
    family := 'assign';
    summary := format('Assigned lesson “%s”%s',
      coalesce(nullif(trim(new.title), ''), 'Lesson'),
      case when class_name is not null then ' · ' || class_name else '' end);
  else
    action_name := 'assignment_upsert';
    family := 'assign';
    summary := format('%s assignment “%s”%s',
      case when tg_op = 'INSERT' then 'Created' else 'Updated' end,
      coalesce(nullif(trim(new.title), ''), 'Assignment'),
      case when class_name is not null then ' · ' || class_name else '' end);
  end if;

  perform public.write_ledger(
    'teacher',
    action_name,
    family,
    summary,
    'assignment',
    new.id::text,
    new.class_id,
    null,
    null,
    null,
    null
  );
  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists ledger_on_assignment_upsert on public.assignments;
create trigger ledger_on_assignment_upsert
  after insert or update on public.assignments
  for each row execute function public.ledger_on_assignment_upsert();

create or replace function public.ledger_on_submission_grade()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  class_id uuid;
  student_name text;
  title text;
  mark text;
  summary text;
  before_s text;
  after_s text;
begin
  if auth.uid() is null then
    return new;
  end if;
  -- Grade path only when moving into graded / score set
  if not (
    (tg_op = 'UPDATE' and (
      (new.status = 'graded' and (old.status is distinct from 'graded' or old.approved_score is distinct from new.approved_score))
      or (new.approved_score is not null and old.approved_score is distinct from new.approved_score)
    ))
    or (tg_op = 'INSERT' and new.status = 'graded')
  ) then
    return new;
  end if;

  select a.class_id, a.title into class_id, title
  from public.assignments a where a.id = new.assignment_id;

  if class_id is null or not exists (
    select 1 from public.class_teachers ct
    where ct.class_id = class_id and ct.teacher_id = auth.uid()
  ) then
    return new;
  end if;

  select s.display_name into student_name from public.students s where s.id = new.student_id;
  mark := case
    when new.approved_score is not null then trim(to_char(new.approved_score, 'FM999999990.######'))
    else null
  end;
  summary := format('Graded %s%s%s',
    coalesce(nullif(student_name, ''), 'student'),
    case when mark is not null then ' ' || mark else '' end,
    case when title is not null then ' · ' || title else '' end);
  before_s := case when tg_op = 'UPDATE' and old.approved_score is not null
    then trim(to_char(old.approved_score, 'FM999999990.######')) else null end;
  after_s := mark;

  perform public.write_ledger(
    'teacher',
    'approve_grade',
    'grade',
    summary,
    'submission',
    new.id::text,
    class_id,
    new.student_id,
    before_s,
    after_s,
    null
  );
  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists ledger_on_submission_grade on public.submissions;
create trigger ledger_on_submission_grade
  after insert or update on public.submissions
  for each row execute function public.ledger_on_submission_grade();

create or replace function public.ledger_on_capture_file()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  student_name text;
  summary text;
begin
  if auth.uid() is null then
    return new;
  end if;
  if not (
    (tg_op = 'UPDATE' and new.status in ('approved', 'note_only') and old.status is distinct from new.status)
    or (tg_op = 'INSERT' and new.status in ('approved', 'note_only'))
  ) then
    return new;
  end if;
  if new.class_id is null or not exists (
    select 1 from public.class_teachers ct
    where ct.class_id = new.class_id and ct.teacher_id = auth.uid()
  ) then
    return new;
  end if;

  select s.display_name into student_name from public.students s where s.id = new.student_id;
  summary := format(
    case when new.status = 'note_only' then 'Filed note for %s' else 'Filed capture for %s' end,
    coalesce(nullif(student_name, ''), 'student')
  );

  perform public.write_ledger(
    'teacher',
    'file_capture',
    'capture',
    summary,
    'capture',
    new.id::text,
    new.class_id,
    new.student_id,
    null,
    null,
    null
  );
  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists ledger_on_capture_file on public.captures;
create trigger ledger_on_capture_file
  after insert or update on public.captures
  for each row execute function public.ledger_on_capture_file();

-- Syllabus publish → ledger (when RPC fires write_audit with publish_class_syllabus)
-- Also emit on write_audit path via whitelist above if action name matches; add explicit:
-- (publish_class_syllabus is already covered if we add it)

drop trigger if exists ledger_from_office_audit on public.audit_events;

create or replace function public.ledger_from_office_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  summary text;
  seat_val text;
  family text;
begin
  if new.actor_id is null or new.actor_id is distinct from auth.uid() then
    return new;
  end if;

  if new.action = 'publish_class_syllabus' then
    if new.actor_role is distinct from 'teacher' and not exists (
      select 1 from public.class_teachers ct
      where ct.class_id = new.class_id and ct.teacher_id = auth.uid()
    ) then
      return new;
    end if;
    seat_val := 'teacher';
    family := 'syllabus';
    summary := format('Published syllabus%s',
      case when new.class_id is not null then ' for class' else '' end);
    perform public.write_ledger(
      seat_val, new.action, family, summary,
      new.entity_type, new.entity_id, new.class_id, new.student_id,
      null, null, new.id
    );
    return new;
  end if;

  if new.actor_role is distinct from 'superintendent'
     and new.actor_role is distinct from 'administrator' then
    return new;
  end if;
  if new.action not in (
    'admin_create_login',
    'link_parent_student',
    'unlink_parent_student',
    'set_also_hat',
    'clear_also_hat',
    'set_also_parent',
    'clear_also_parent',
    'admin_reset_login_password',
    'add_teacher_to_class',
    'remove_teacher_from_class',
    'claim_superintendent',
    'set_capability_grant',
    'set_school_name',
    'set_school_logo'
  ) then
    return new;
  end if;

  summary := format('%s · %s',
    replace(new.action, '_', ' '),
    coalesce(new.entity_type || coalesce(' ' || new.entity_id, ''), 'office'));

  perform public.write_ledger(
    'staff',
    new.action,
    'office',
    left(summary, 500),
    new.entity_type,
    new.entity_id,
    new.class_id,
    new.student_id,
    null,
    null,
    new.id
  );
  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists ledger_from_office_audit on public.audit_events;
create trigger ledger_from_office_audit
  after insert on public.audit_events
  for each row execute function public.ledger_from_office_audit();

-- ---------------------------------------------------------------------------
-- GC diary storage objects when media row deleted / entry cascade
-- (best-effort; storage delete via client on entry delete also OK)
-- ---------------------------------------------------------------------------

create or replace function public.diary_media_gc_storage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    delete from storage.objects
    where bucket_id = 'diary' and name = old.storage_path;
  exception when others then
    null;
  end;
  return old;
end;
$$;

drop trigger if exists diary_media_gc_storage on public.diary_media;
create trigger diary_media_gc_storage
  after delete on public.diary_media
  for each row execute function public.diary_media_gc_storage();
