-- People, profile photos, parent records, roster drafts, and teacher delete RPCs.
-- Run by hand in the Supabase SQL editor. Do not use the Supabase CLI.

-- ---------------------------------------------------------------------------
-- Enums + columns + tables
-- ---------------------------------------------------------------------------

create type public.parent_created_via as enum ('typed', 'photo_card', 'voice');
create type public.roster_import_status as enum ('pending', 'confirmed', 'discarded');

alter table public.students
  add column if not exists photo_asset_id uuid references public.assets (id) on delete set null;

create table if not exists public.parents (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  display_name text not null,
  sort_name text,
  photo_asset_id uuid references public.assets (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_via public.parent_created_via not null default 'typed'
);

create table if not exists public.parent_students (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.parents (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (parent_id, student_id)
);

create table if not exists public.roster_imports (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  photo_asset_id uuid not null references public.assets (id),
  status public.roster_import_status not null default 'pending',
  suggestions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

alter table public.parent_accesses
  add column if not exists parent_id uuid references public.parents (id) on delete cascade;

do $$
declare
  rec record;
  new_id uuid;
begin
  for rec in
    select pa.id as access_id, pa.student_id, s.teacher_id, s.display_name
    from public.parent_accesses pa
    join public.students s on s.id = pa.student_id
    where pa.parent_id is null
  loop
    insert into public.parents (teacher_id, display_name, created_via)
    values (rec.teacher_id, 'Parent of ' || rec.display_name, 'typed')
    returning id into new_id;

    insert into public.parent_students (parent_id, student_id)
    values (new_id, rec.student_id)
    on conflict (parent_id, student_id) do nothing;

    update public.parent_accesses
    set parent_id = new_id
    where id = rec.access_id;
  end loop;
end $$;

delete from public.parent_accesses where parent_id is null;

alter table public.parent_accesses
  alter column parent_id set not null;

alter table public.parent_accesses
  alter column student_id drop not null;

alter table public.parent_accesses
  drop constraint if exists parent_accesses_student_id_fkey;

alter table public.parent_accesses
  add constraint parent_accesses_student_id_fkey
  foreign key (student_id) references public.students (id) on delete set null;

create index if not exists parents_teacher_idx on public.parents (teacher_id);
create index if not exists parents_metadata_gin on public.parents using gin (metadata);
create index if not exists parent_students_student_idx on public.parent_students (student_id);
create index if not exists parent_accesses_parent_idx on public.parent_accesses (parent_id);
create index if not exists roster_imports_class_idx on public.roster_imports (class_id, status);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.parents enable row level security;
alter table public.parent_students enable row level security;
alter table public.roster_imports enable row level security;

drop policy if exists parents_own on public.parents;
create policy parents_own on public.parents
  for all using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

drop policy if exists parent_students_own on public.parent_students;
create policy parent_students_own on public.parent_students
  for all using (
    exists (select 1 from public.parents p where p.id = parent_id and p.teacher_id = auth.uid())
    and exists (select 1 from public.students s where s.id = student_id and s.teacher_id = auth.uid())
  )
  with check (
    exists (select 1 from public.parents p where p.id = parent_id and p.teacher_id = auth.uid())
    and exists (select 1 from public.students s where s.id = student_id and s.teacher_id = auth.uid())
  );

drop policy if exists parent_accesses_via_student on public.parent_accesses;
drop policy if exists parent_accesses_via_parent on public.parent_accesses;
create policy parent_accesses_via_parent on public.parent_accesses
  for all using (
    exists (
      select 1 from public.parents p
      where p.id = parent_id and p.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.parents p
      where p.id = parent_id and p.teacher_id = auth.uid()
    )
  );

drop policy if exists roster_imports_via_class on public.roster_imports;
create policy roster_imports_via_class on public.roster_imports
  for all using (
    exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
  )
  with check (
    exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Viewer RPCs (public-safe fields only)
-- ---------------------------------------------------------------------------

drop function if exists public.parent_open(text);

create or replace function public.parent_open(p_token text)
returns table (
  parent_id uuid,
  parent_display_name text,
  parent_photo_path text,
  parent_relationship text,
  parent_relationship_other text,
  parent_phone text,
  parent_email text,
  parent_address text,
  parent_preferred_contact text,
  children jsonb
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.display_name,
    pa_asset.storage_path,
    nullif(p.metadata->>'relationship', ''),
    nullif(p.metadata->>'relationship_other', ''),
    nullif(p.metadata->>'phone', ''),
    nullif(p.metadata->>'email', ''),
    nullif(p.metadata->>'address', ''),
    nullif(p.metadata->>'preferred_contact', ''),
    coalesce(
      (
        select jsonb_agg(child.row order by child.sort_name, child.display_name)
        from (
          select
            s.sort_name,
            s.display_name,
            jsonb_build_object(
              'student_id', s.id,
              'display_name', s.display_name,
              'preferred_name', nullif(s.metadata->>'preferred_name', ''),
              'photo_path', st_asset.storage_path,
              'birthday_md',
                case
                  when (s.metadata->>'birthday') ~ '^\d{4}-\d{2}-\d{2}$'
                  then to_char((s.metadata->>'birthday')::date, 'Mon FMDD')
                  else null
                end,
              'class_name', (
                select c.name
                from public.enrollments e
                join public.classes c on c.id = e.class_id
                where e.student_id = s.id
                order by e.created_at
                limit 1
              ),
              'focus_label', sk.label,
              'practice_status', (
                select sub.status::text
                from public.submissions sub
                where sub.student_id = s.id
                order by sub.created_at desc
                limit 1
              ),
              'parent_sentence', s.parent_sentence
            ) as row
          from public.parent_students ps
          join public.students s on s.id = ps.student_id
          left join public.assets st_asset on st_asset.id = s.photo_asset_id
          left join public.skills sk on sk.id = s.current_focus_skill_id
          where ps.parent_id = p.id
        ) child
      ),
      '[]'::jsonb
    )
  from public.parent_accesses pa
  join public.parents p on p.id = pa.parent_id
  left join public.assets pa_asset on pa_asset.id = p.photo_asset_id
  where pa.token = trim(p_token)
  limit 1;
$$;

drop function if exists public.student_open_class(text);

create or replace function public.student_open_class(p_join_code text)
returns table (
  class_id uuid,
  class_name text,
  student_id uuid,
  display_name text,
  photo_path text
)
language sql
security definer
set search_path = public
as $$
  select
    c.id,
    c.name,
    s.id,
    s.display_name,
    a.storage_path
  from public.classes c
  join public.enrollments e on e.class_id = c.id
  join public.students s on s.id = e.student_id
  left join public.assets a on a.id = s.photo_asset_id
  where upper(c.join_code) = upper(trim(p_join_code));
$$;

grant execute on function public.parent_open(text) to anon, authenticated;
grant execute on function public.student_open_class(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Delete helpers + teacher RPCs
-- ---------------------------------------------------------------------------

create or replace function public._unref_delete_asset(p_asset_id uuid)
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  path text;
  bucket text;
  kind public.asset_kind;
begin
  if p_asset_id is null then
    return;
  end if;
  if exists (select 1 from public.captures where photo_asset_id = p_asset_id or audio_asset_id = p_asset_id) then
    return;
  end if;
  if exists (select 1 from public.students where photo_asset_id = p_asset_id) then
    return;
  end if;
  if exists (select 1 from public.parents where photo_asset_id = p_asset_id) then
    return;
  end if;
  if exists (select 1 from public.roster_imports where photo_asset_id = p_asset_id) then
    return;
  end if;

  select storage_path, assets.kind into path, kind
  from public.assets
  where id = p_asset_id;
  if path is null then
    return;
  end if;

  bucket := case when kind = 'photo' then 'photos' else 'audio' end;
  delete from storage.objects where bucket_id = bucket and name = path;
  delete from public.assets where id = p_asset_id;
end;
$$;

create or replace function public._retarget_student_focus(p_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_skill uuid;
  next_skill uuid;
begin
  if p_student_id is null then
    return;
  end if;
  select current_focus_skill_id into current_skill from public.students where id = p_student_id;
  if current_skill is not null and exists (
    select 1
    from public.skill_gaps g
    where g.student_id = p_student_id
      and g.skill_id = current_skill
      and g.status = 'approved'
  ) then
    return;
  end if;

  select g.skill_id
  into next_skill
  from public.skill_gaps g
  where g.student_id = p_student_id
    and g.status = 'approved'
    and g.skill_id is not null
  order by g.sort_order, g.created_at desc
  limit 1;

  update public.students
  set current_focus_skill_id = next_skill
  where id = p_student_id;
end;
$$;

create or replace function public._prune_empty_assignments(p_class_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.assignments a
  where (p_class_id is null or a.class_id = p_class_id)
    and not exists (select 1 from public.submissions s where s.assignment_id = a.id);
end;
$$;

create or replace function public._delete_capture(p_capture_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cap public.captures%rowtype;
begin
  select * into cap from public.captures where id = p_capture_id;
  if not found then
    return;
  end if;

  delete from public.assignments
  where kind = 'capture' and capture_id = p_capture_id;

  delete from public.captures where id = p_capture_id;

  perform public._unref_delete_asset(cap.photo_asset_id);
  perform public._unref_delete_asset(cap.audio_asset_id);

  if cap.student_id is not null then
    perform public._retarget_student_focus(cap.student_id);
  end if;
end;
$$;

create or replace function public._delete_roster_import(p_import_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  photo_id uuid;
begin
  select photo_asset_id into photo_id from public.roster_imports where id = p_import_id;
  if not found then
    return;
  end if;
  delete from public.roster_imports where id = p_import_id;
  perform public._unref_delete_asset(photo_id);
end;
$$;

create or replace function public._delete_student(p_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  photo_id uuid;
  cap record;
begin
  select photo_asset_id into photo_id from public.students where id = p_student_id;
  if not found then
    return;
  end if;

  for cap in select id from public.captures where student_id = p_student_id
  loop
    perform public._delete_capture(cap.id);
  end loop;

  delete from public.students where id = p_student_id;
  perform public._unref_delete_asset(photo_id);
  perform public._prune_empty_assignments();
end;
$$;

create or replace function public._detach_from_class(p_class_id uuid, p_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cap record;
begin
  for cap in
    select id from public.captures
    where class_id = p_class_id and student_id = p_student_id
  loop
    perform public._delete_capture(cap.id);
  end loop;

  delete from public.submissions sub
  using public.assignments a
  where sub.assignment_id = a.id
    and a.class_id = p_class_id
    and sub.student_id = p_student_id;

  update public.students s
  set current_focus_skill_id = null
  where s.id = p_student_id
    and exists (
      select 1 from public.skills sk
      where sk.id = s.current_focus_skill_id and sk.class_id = p_class_id
    );

  delete from public.enrollments
  where class_id = p_class_id and student_id = p_student_id;

  perform public._prune_empty_assignments(p_class_id);
end;
$$;

create or replace function public._delete_class(p_class_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  enr record;
  cap record;
  imp record;
  other_count int;
begin
  for enr in select student_id from public.enrollments where class_id = p_class_id
  loop
    select count(*) into other_count
    from public.enrollments
    where student_id = enr.student_id;

    if other_count <= 1 then
      perform public._delete_student(enr.student_id);
    else
      perform public._detach_from_class(p_class_id, enr.student_id);
    end if;
  end loop;

  for cap in select id from public.captures where class_id = p_class_id
  loop
    perform public._delete_capture(cap.id);
  end loop;

  for imp in select id from public.roster_imports where class_id = p_class_id
  loop
    perform public._delete_roster_import(imp.id);
  end loop;

  delete from public.classes where id = p_class_id;
end;
$$;

create or replace function public._delete_assignment(p_assignment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.assignments%rowtype;
  remain int;
begin
  select * into a from public.assignments where id = p_assignment_id;
  if not found then
    return;
  end if;

  delete from public.assignments where id = p_assignment_id;

  if a.practice_set_id is not null then
    select count(*) into remain
    from public.assignments
    where practice_set_id = a.practice_set_id;
    if remain = 0 then
      delete from public.practice_sets
      where id = a.practice_set_id and status in ('preview', 'discarded');
      update public.practice_sets
      set status = 'discarded'
      where id = a.practice_set_id and status = 'assigned';
    end if;
  end if;
end;
$$;

create or replace function public.teacher_delete_class(p_class_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.classes where id = p_class_id and teacher_id = auth.uid()) then
    raise exception 'Not found';
  end if;
  perform public._delete_class(p_class_id);
end;
$$;

create or replace function public.teacher_delete_student(p_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.students where id = p_student_id and teacher_id = auth.uid()) then
    raise exception 'Not found';
  end if;
  perform public._delete_student(p_student_id);
end;
$$;

create or replace function public.teacher_remove_enrollment(p_class_id uuid, p_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if not exists (select 1 from public.classes where id = p_class_id and teacher_id = auth.uid()) then
    raise exception 'Not found';
  end if;
  if not exists (select 1 from public.students where id = p_student_id and teacher_id = auth.uid()) then
    raise exception 'Not found';
  end if;
  select count(*) into n from public.enrollments where student_id = p_student_id;
  if n <= 1 then
    raise exception 'LAST_ENROLLMENT';
  end if;
  perform public._detach_from_class(p_class_id, p_student_id);
end;
$$;

create or replace function public.teacher_delete_capture(p_capture_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.captures cap
    join public.classes c on c.id = cap.class_id
    where cap.id = p_capture_id and c.teacher_id = auth.uid()
  ) then
    raise exception 'Not found';
  end if;
  perform public._delete_capture(p_capture_id);
end;
$$;

create or replace function public.teacher_delete_gap(p_gap_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.skill_gaps%rowtype;
begin
  select sg.* into g
  from public.skill_gaps sg
  join public.captures cap on cap.id = sg.capture_id
  join public.classes c on c.id = cap.class_id
  where sg.id = p_gap_id and c.teacher_id = auth.uid();
  if not found then
    raise exception 'Not found';
  end if;
  delete from public.skill_gaps where id = p_gap_id;
  perform public._retarget_student_focus(g.student_id);
end;
$$;

create or replace function public.teacher_delete_practice_set(p_practice_set_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.practice_sets ps
    join public.classes c on c.id = ps.class_id
    where ps.id = p_practice_set_id and c.teacher_id = auth.uid()
  ) then
    raise exception 'Not found';
  end if;
  delete from public.assignments where practice_set_id = p_practice_set_id;
  delete from public.practice_sets where id = p_practice_set_id;
end;
$$;

create or replace function public.teacher_delete_assignment(p_assignment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.assignments a
    join public.classes c on c.id = a.class_id
    where a.id = p_assignment_id and c.teacher_id = auth.uid()
  ) then
    raise exception 'Not found';
  end if;
  perform public._delete_assignment(p_assignment_id);
end;
$$;

create or replace function public.teacher_delete_submission(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  aid uuid;
begin
  select sub.assignment_id into aid
  from public.submissions sub
  join public.assignments a on a.id = sub.assignment_id
  join public.classes c on c.id = a.class_id
  where sub.id = p_submission_id and c.teacher_id = auth.uid();
  if not found then
    raise exception 'Not found';
  end if;
  delete from public.submissions where id = p_submission_id;
  if not exists (select 1 from public.submissions where assignment_id = aid) then
    perform public._delete_assignment(aid);
  end if;
end;
$$;

create or replace function public.teacher_delete_parent(p_parent_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  photo_id uuid;
begin
  select photo_asset_id into photo_id
  from public.parents
  where id = p_parent_id and teacher_id = auth.uid();
  if not found then
    raise exception 'Not found';
  end if;
  delete from public.parents where id = p_parent_id;
  perform public._unref_delete_asset(photo_id);
end;
$$;

create or replace function public.teacher_unlink_child(p_parent_id uuid, p_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.parents where id = p_parent_id and teacher_id = auth.uid()) then
    raise exception 'Not found';
  end if;
  delete from public.parent_students
  where parent_id = p_parent_id and student_id = p_student_id;
end;
$$;

create or replace function public.teacher_revoke_invite(p_access_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.parent_accesses pa
    join public.parents p on p.id = pa.parent_id
    where pa.id = p_access_id and p.teacher_id = auth.uid()
  ) then
    raise exception 'Not found';
  end if;
  delete from public.parent_accesses where id = p_access_id;
end;
$$;

create or replace function public.teacher_clear_profile_photo(p_kind text, p_person_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  photo_id uuid;
begin
  if p_kind = 'student' then
    select photo_asset_id into photo_id
    from public.students
    where id = p_person_id and teacher_id = auth.uid();
    if not found then
      raise exception 'Not found';
    end if;
    update public.students set photo_asset_id = null where id = p_person_id;
  elsif p_kind = 'parent' then
    select photo_asset_id into photo_id
    from public.parents
    where id = p_person_id and teacher_id = auth.uid();
    if not found then
      raise exception 'Not found';
    end if;
    update public.parents set photo_asset_id = null where id = p_person_id;
  else
    raise exception 'Invalid kind';
  end if;
  perform public._unref_delete_asset(photo_id);
end;
$$;

create or replace function public.teacher_unref_asset(p_asset_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_asset_id is null then
    return;
  end if;
  if not exists (select 1 from public.assets where id = p_asset_id and teacher_id = auth.uid()) then
    raise exception 'Not found';
  end if;
  perform public._unref_delete_asset(p_asset_id);
end;
$$;

create or replace function public.teacher_delete_roster_import(p_import_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.roster_imports ri
    join public.classes c on c.id = ri.class_id
    where ri.id = p_import_id and c.teacher_id = auth.uid()
  ) then
    raise exception 'Not found';
  end if;
  perform public._delete_roster_import(p_import_id);
end;
$$;

revoke all on function public._unref_delete_asset(uuid) from public, anon, authenticated;
revoke all on function public._retarget_student_focus(uuid) from public, anon, authenticated;
revoke all on function public._prune_empty_assignments(uuid) from public, anon, authenticated;
revoke all on function public._delete_capture(uuid) from public, anon, authenticated;
revoke all on function public._delete_roster_import(uuid) from public, anon, authenticated;
revoke all on function public._delete_student(uuid) from public, anon, authenticated;
revoke all on function public._detach_from_class(uuid, uuid) from public, anon, authenticated;
revoke all on function public._delete_class(uuid) from public, anon, authenticated;
revoke all on function public._delete_assignment(uuid) from public, anon, authenticated;

grant execute on function public.teacher_delete_class(uuid) to authenticated;
grant execute on function public.teacher_delete_student(uuid) to authenticated;
grant execute on function public.teacher_remove_enrollment(uuid, uuid) to authenticated;
grant execute on function public.teacher_delete_capture(uuid) to authenticated;
grant execute on function public.teacher_delete_gap(uuid) to authenticated;
grant execute on function public.teacher_delete_practice_set(uuid) to authenticated;
grant execute on function public.teacher_delete_assignment(uuid) to authenticated;
grant execute on function public.teacher_delete_submission(uuid) to authenticated;
grant execute on function public.teacher_delete_parent(uuid) to authenticated;
grant execute on function public.teacher_unlink_child(uuid, uuid) to authenticated;
grant execute on function public.teacher_revoke_invite(uuid) to authenticated;
grant execute on function public.teacher_clear_profile_photo(text, uuid) to authenticated;
grant execute on function public.teacher_unref_asset(uuid) to authenticated;
grant execute on function public.teacher_delete_roster_import(uuid) to authenticated;
