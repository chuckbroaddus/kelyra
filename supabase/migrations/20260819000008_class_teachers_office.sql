-- Classes may have many teachers. A new class has none until the office adds them.
-- Keep classes.teacher_id as the first assigned teacher for older policies.

create table if not exists public.class_teachers (
  class_id uuid not null references public.classes (id) on delete cascade,
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (class_id, teacher_id)
);

create index if not exists class_teachers_teacher_idx on public.class_teachers (teacher_id);

alter table public.classes alter column teacher_id drop not null;

do $$
begin
  alter table public.classes drop constraint if exists classes_teacher_id_fkey;
  alter table public.classes
    add constraint classes_teacher_id_fkey
    foreign key (teacher_id) references public.teachers (id) on delete set null;
end
$$;

insert into public.class_teachers (class_id, teacher_id)
select id, teacher_id from public.classes
where teacher_id is not null
on conflict do nothing;

create or replace function public.teaches_class(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_class_id is not null
    and (
      public.is_school_admin()
      or exists (
        select 1
        from public.class_teachers ct
        where ct.class_id = p_class_id and ct.teacher_id = auth.uid()
      )
    );
$$;

create or replace function public.sync_class_primary_teacher()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid;
  primary_id uuid;
begin
  cid := coalesce(new.class_id, old.class_id);
  select ct.teacher_id into primary_id
  from public.class_teachers ct
  where ct.class_id = cid
  order by ct.created_at asc
  limit 1;
  update public.classes set teacher_id = primary_id where id = cid;
  return coalesce(new, old);
end;
$$;

drop trigger if exists class_teachers_sync_primary on public.class_teachers;
create trigger class_teachers_sync_primary
  after insert or delete on public.class_teachers
  for each row
  execute function public.sync_class_primary_teacher();

alter table public.class_teachers enable row level security;

drop policy if exists class_teachers_read on public.class_teachers;
create policy class_teachers_read on public.class_teachers
  for select using (
    teacher_id = auth.uid()
    or public.is_school_admin()
    or public.teaches_class(class_id)
  );

drop policy if exists class_teachers_admin on public.class_teachers;
create policy class_teachers_admin on public.class_teachers
  for all using (public.is_school_admin())
  with check (public.is_school_admin());

drop policy if exists classes_own on public.classes;
create policy classes_own on public.classes
  for all using (public.teaches_class(id))
  with check (public.teaches_class(id));

drop policy if exists skills_via_class on public.skills;
create policy skills_via_class on public.skills
  for all using (public.teaches_class(class_id))
  with check (public.teaches_class(class_id));

drop policy if exists enrollments_via_class on public.enrollments;
create policy enrollments_via_class on public.enrollments
  for all using (public.teaches_class(class_id))
  with check (public.teaches_class(class_id));

drop policy if exists students_via_taught_class on public.students;
create policy students_via_taught_class on public.students
  for select using (
    exists (
      select 1
      from public.enrollments e
      where e.student_id = students.id and public.teaches_class(e.class_id)
    )
  );

drop policy if exists parents_via_taught_class on public.parents;
create policy parents_via_taught_class on public.parents
  for select using (
    exists (
      select 1
      from public.parent_students ps
      join public.enrollments e on e.student_id = ps.student_id
      where ps.parent_id = parents.id and public.teaches_class(e.class_id)
    )
  );

drop policy if exists captures_via_class on public.captures;
create policy captures_via_class on public.captures
  for all using (public.teaches_class(class_id))
  with check (public.teaches_class(class_id));

drop policy if exists skill_gaps_via_capture on public.skill_gaps;
create policy skill_gaps_via_capture on public.skill_gaps
  for all using (
    exists (
      select 1
      from public.captures cap
      where cap.id = capture_id and public.teaches_class(cap.class_id)
    )
  )
  with check (
    exists (
      select 1
      from public.captures cap
      where cap.id = capture_id and public.teaches_class(cap.class_id)
    )
  );

drop policy if exists practice_sets_via_class on public.practice_sets;
create policy practice_sets_via_class on public.practice_sets
  for all using (public.teaches_class(class_id))
  with check (public.teaches_class(class_id));

drop policy if exists assignments_via_class on public.assignments;
create policy assignments_via_class on public.assignments
  for all using (public.teaches_class(class_id))
  with check (public.teaches_class(class_id));

drop policy if exists submissions_via_class on public.submissions;
create policy submissions_via_class on public.submissions
  for all using (
    exists (
      select 1 from public.assignments a
      where a.id = assignment_id and public.teaches_class(a.class_id)
    )
  )
  with check (
    exists (
      select 1 from public.assignments a
      where a.id = assignment_id and public.teaches_class(a.class_id)
    )
  );

create or replace function public.create_school_class(p_name text)
returns public.classes
language plpgsql
security definer
set search_path = public
as $$
declare
  klass public.classes;
  n text;
begin
  if auth.uid() is null or not public.is_staff_profile(auth.uid()) then
    raise exception 'not allowed';
  end if;
  n := nullif(btrim(p_name), '');
  if n is null then
    raise exception 'Class name is required';
  end if;
  insert into public.classes (teacher_id, name, name_source)
  values (null, n, 'typed')
  returning * into klass;
  return klass;
end;
$$;

create or replace function public.add_teacher_to_class(p_class_id uuid, p_teacher_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  person public.profiles;
begin
  if not public.is_school_admin() then
    raise exception 'not allowed';
  end if;
  select * into person from public.profiles where id = p_teacher_id;
  if person.id is null or person.school_id is distinct from public.my_school_id() then
    raise exception 'not allowed';
  end if;
  if person.role is distinct from 'teacher' and not person.also_teacher then
    raise exception 'That person is not a teacher.';
  end if;
  insert into public.teachers (id, email, display_name)
  values (person.id, coalesce(person.email, ''), person.display_name)
  on conflict (id) do nothing;
  insert into public.class_teachers (class_id, teacher_id)
  values (p_class_id, p_teacher_id)
  on conflict do nothing;
end;
$$;

create or replace function public.remove_teacher_from_class(p_class_id uuid, p_teacher_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_school_admin() then
    raise exception 'not allowed';
  end if;
  delete from public.class_teachers
  where class_id = p_class_id and teacher_id = p_teacher_id;
end;
$$;

create or replace function public.enroll_school_student(p_class_id uuid, p_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_staff_profile(auth.uid()) then
    raise exception 'not allowed';
  end if;
  if not public.teaches_class(p_class_id) then
    raise exception 'not allowed';
  end if;
  if not exists (
    select 1 from public.students s
    join public.profiles owner on owner.id = s.teacher_id
    where s.id = p_student_id
      and owner.school_id is not distinct from public.my_school_id()
  ) then
    raise exception 'not allowed';
  end if;
  insert into public.enrollments (class_id, student_id)
  values (p_class_id, p_student_id)
  on conflict (class_id, student_id) do nothing;
end;
$$;

create or replace function public.add_parent_to_class(p_class_id uuid, p_parent_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int := 0;
begin
  if auth.uid() is null or not public.is_staff_profile(auth.uid()) then
    raise exception 'not allowed';
  end if;
  if not public.teaches_class(p_class_id) then
    raise exception 'not allowed';
  end if;
  if not exists (
    select 1 from public.parents p
    join public.profiles owner on owner.id = p.teacher_id
    where p.id = p_parent_id
      and owner.school_id is not distinct from public.my_school_id()
  ) then
    raise exception 'not allowed';
  end if;
  insert into public.enrollments (class_id, student_id)
  select p_class_id, ps.student_id
  from public.parent_students ps
  where ps.parent_id = p_parent_id
  on conflict (class_id, student_id) do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;

create or replace function public.remove_parent_from_class(p_class_id uuid, p_parent_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  kid uuid;
begin
  if auth.uid() is null or not public.is_staff_profile(auth.uid()) then
    raise exception 'not allowed';
  end if;
  if not public.teaches_class(p_class_id) then
    raise exception 'not allowed';
  end if;
  if not exists (
    select 1 from public.parents p
    join public.profiles owner on owner.id = p.teacher_id
    where p.id = p_parent_id
      and owner.school_id is not distinct from public.my_school_id()
  ) then
    raise exception 'not allowed';
  end if;
  for kid in
    select ps.student_id
    from public.parent_students ps
    join public.enrollments e on e.student_id = ps.student_id and e.class_id = p_class_id
    where ps.parent_id = p_parent_id
  loop
    perform public._detach_from_class(p_class_id, kid);
  end loop;
end;
$$;

create or replace function public.can_see_post(p_post public.posts)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;
  if p_post.author_id = auth.uid() then
    return true;
  end if;
  if public.is_school_admin() then
    return true;
  end if;
  if p_post.class_id is null then
    return public.is_staff_profile(auth.uid())
      or public.is_parent_profile(auth.uid())
      or public.is_student_profile(auth.uid());
  end if;
  if public.is_staff_profile(auth.uid()) then
    return public.teaches_class(p_post.class_id);
  end if;
  if public.is_parent_profile(auth.uid()) then
    return exists (
      select 1
      from public.profiles me
      join public.parent_students ps on ps.parent_id = me.parent_id
      join public.enrollments e on e.student_id = ps.student_id
      where me.id = auth.uid() and e.class_id = p_post.class_id
    );
  end if;
  if public.is_student_profile(auth.uid()) then
    return exists (
      select 1
      from public.profiles me
      join public.enrollments e on e.student_id = me.student_id
      where me.id = auth.uid() and e.class_id = p_post.class_id
    );
  end if;
  return false;
end;
$$;

grant execute on function public.teaches_class(uuid) to authenticated;
grant execute on function public.create_school_class(text) to authenticated;
grant execute on function public.add_teacher_to_class(uuid, uuid) to authenticated;
grant execute on function public.remove_teacher_from_class(uuid, uuid) to authenticated;
grant execute on function public.enroll_school_student(uuid, uuid) to authenticated;
grant execute on function public.add_parent_to_class(uuid, uuid) to authenticated;
grant execute on function public.remove_parent_from_class(uuid, uuid) to authenticated;
grant execute on function public.can_see_post(public.posts) to authenticated;
