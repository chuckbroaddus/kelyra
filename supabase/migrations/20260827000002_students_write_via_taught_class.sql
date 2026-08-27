-- Q11: Co-teachers on a shared class must UPDATE roster students (and related
-- parent cards), not only SELECT them. Drop owner-only students_own.
--
-- Co-teacher rename/edit: teaches_class / enrollment (student_on_taught_class).
-- students_admin_all stays for the office. students_insert_office_only stays:
-- minting a new students row is still office-gated.
--
-- Person hard-delete stays admin+owner only (item 5): teacher_delete_student /
-- teacher_delete_parent and students_delete_own / parents_delete_own. Taught-class
-- co-teachers must NOT school-wipe a person after enroll_school_student; roster
-- removal is teacher_remove_enrollment / teaches_class only.
--
-- Ownership freeze: non-admin UPDATEs cannot change students.teacher_id or
-- parents.teacher_id (blocks steal-then-owner-delete after taught-class UPDATE).
-- Only is_school_admin may reassign the card owner.
--
-- Do not ride is_staff. Do not reopen parent↔student minting (Q8 /
-- can_link_parent_student stays office-only). Cos: apply to aohibokgilxhqwmupdfv.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.student_on_taught_class(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.enrollments e
    where e.student_id = p_student_id
      and public.teaches_class(e.class_id)
  );
$$;

revoke all on function public.student_on_taught_class(uuid) from public, anon;
grant execute on function public.student_on_taught_class(uuid) to authenticated;

-- On insert, default teacher_id to the acting teacher when omitted.
-- Does not overwrite an explicit teacher_id (office mint onto a class owner).
create or replace function public.students_default_teacher_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.teacher_id is null
     and auth.uid() is not null
     and exists (select 1 from public.teachers t where t.id = auth.uid())
  then
    new.teacher_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists students_default_teacher_id on public.students;
create trigger students_default_teacher_id
  before insert on public.students
  for each row
  execute function public.students_default_teacher_id();

-- teacher_id is NOT NULL; allow DEFAULT auth.uid() so inserts may omit it when
-- the actor has a teachers row (FK still enforces a real teacher).
alter table public.students
  alter column teacher_id set default auth.uid();

-- Freeze person ownership: taught-class UPDATE may rename/edit details only.
-- Without this, a co-teacher could set teacher_id = auth.uid() then hard-delete
-- via students_delete_own / teacher_delete_student (same for parents).
create or replace function public.freeze_person_teacher_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.teacher_id is distinct from old.teacher_id
     and not public.is_school_admin()
  then
    raise exception 'not allowed';
  end if;
  return new;
end;
$$;

drop trigger if exists students_freeze_teacher_id on public.students;
create trigger students_freeze_teacher_id
  before update on public.students
  for each row
  execute function public.freeze_person_teacher_id();

drop trigger if exists parents_freeze_teacher_id on public.parents;
create trigger parents_freeze_teacher_id
  before update on public.parents
  for each row
  execute function public.freeze_person_teacher_id();

-- teachers must not mutate teacher_id via the parent-guard early return either.
create or replace function public.students_parent_guard()
returns trigger
language plpgsql
as $$
begin
  if public.is_school_admin() then
    return new;
  end if;
  if new.teacher_id is distinct from old.teacher_id then
    raise exception 'not allowed';
  end if;
  if exists (select 1 from public.teachers t where t.id = auth.uid())
     and public.my_role() in ('teacher', 'superintendent', 'administrator') then
    return new;
  end if;
  if new.display_name is distinct from old.display_name
    or new.current_focus_skill_id is distinct from old.current_focus_skill_id
    or new.parent_sentence is distinct from old.parent_sentence
    or new.sort_name is distinct from old.sort_name
  then
    raise exception 'parents may only edit child details';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- students RLS: drop owner-only ALL; taught-class writes
-- ---------------------------------------------------------------------------

drop policy if exists students_own on public.students;
drop policy if exists students_update_taught on public.students;
drop policy if exists students_write_via_taught_class on public.students;
drop policy if exists students_select_own on public.students;
drop policy if exists students_insert_own on public.students;
drop policy if exists students_delete_own on public.students;

-- Owner SELECT restored after dropping students_own (FOR ALL). Needed for
-- insert…returning, getStudent, rename preload, and unenrolled owned cards.
-- Does not restore owner-only UPDATE — that stays on students_write_via_taught_class.
create policy students_select_own on public.students
  for select
  using (teacher_id = auth.uid());

-- INSERT: acting teacher owns the new row (office trigger still gates mint).
create policy students_insert_own on public.students
  for insert
  with check (
    exists (select 1 from public.teachers t where t.id = auth.uid())
    and teacher_id = auth.uid()
  );

-- UPDATE: co-teacher of an enrolled class, or the owning teacher.
-- SELECT also via students_via_taught_class (+ self/parent/admin + students_select_own).
-- DELETE is NOT granted here — see students_delete_own (admin+owner only).
create policy students_write_via_taught_class on public.students
  for update
  using (
    public.student_on_taught_class(id)
    or teacher_id = auth.uid()
  )
  with check (
    public.student_on_taught_class(id)
    or teacher_id = auth.uid()
  );

-- Person hard-delete: owner only. Office uses students_admin_all.
create policy students_delete_own on public.students
  for delete
  using (teacher_id = auth.uid());

-- ---------------------------------------------------------------------------
-- parents RLS: same hole — SELECT via taught class, writes were owner-only
-- ---------------------------------------------------------------------------

drop policy if exists parents_own on public.parents;
drop policy if exists parents_write_via_taught_class on public.parents;
drop policy if exists parents_select_own on public.parents;
drop policy if exists parents_insert_own on public.parents;
drop policy if exists parents_delete_own on public.parents;

-- Owner SELECT for createParent insert…returning, listParentsForTeacher,
-- fillAvailableWithOwnParents, and unlinked owned cards (get_parent_card
-- only covers taught-class). Not an owner-only UPDATE restore.
create policy parents_select_own on public.parents
  for select
  using (teacher_id = auth.uid());

create policy parents_insert_own on public.parents
  for insert
  with check (
    exists (select 1 from public.teachers t where t.id = auth.uid())
    and teacher_id = auth.uid()
  );

-- UPDATE only for co-teachers / owner; DELETE stays admin+owner (parents_delete_own).
create policy parents_write_via_taught_class on public.parents
  for update
  using (
    public.parent_on_taught_class(id)
    or teacher_id = auth.uid()
  )
  with check (
    public.parent_on_taught_class(id)
    or teacher_id = auth.uid()
  );

create policy parents_delete_own on public.parents
  for delete
  using (teacher_id = auth.uid());

-- parent_students: SELECT for co-teachers. Writes stay owner-both /
-- parent_students_admin_all / office RPC (Q8 — do not mint family links here).
drop policy if exists parent_students_via_taught_class on public.parent_students;
create policy parent_students_via_taught_class on public.parent_students
  for select using (
    public.parent_on_taught_class(parent_id)
    or public.student_on_taught_class(student_id)
  );

-- Invites: co-teacher of a linked child's class may manage tokens for that parent.
drop policy if exists parent_accesses_via_parent on public.parent_accesses;
create policy parent_accesses_via_parent on public.parent_accesses
  for all using (
    exists (
      select 1
      from public.parents p
      where p.id = parent_id
        and (
          p.teacher_id = auth.uid()
          or public.parent_on_taught_class(p.id)
          or public.is_school_admin()
        )
    )
  )
  with check (
    exists (
      select 1
      from public.parents p
      where p.id = parent_id
        and (
          p.teacher_id = auth.uid()
          or public.parent_on_taught_class(p.id)
          or public.is_school_admin()
        )
    )
  );

-- ---------------------------------------------------------------------------
-- RPCs: owner-only teacher_id checks → taught-class / is_school_admin
-- ---------------------------------------------------------------------------

create or replace function public.admin_provision_student_login(p_student_id uuid)
returns table (
  profile_id uuid,
  student_id uuid,
  display_name text,
  username text,
  email text,
  temp_password text,
  created boolean
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  kid public.students;
  existing public.profiles;
  uid uuid := gen_random_uuid();
  school uuid;
  uname text;
  new_email text;
  pass text;
  meta_email text;
  n int := 0;
begin
  if p_student_id is null then
    raise exception 'need a student';
  end if;

  select * into kid from public.students where id = p_student_id;
  if kid.id is null then
    raise exception 'no such student';
  end if;

  if auth.uid() is not null
     and not public.is_school_admin()
     and not public.student_on_taught_class(p_student_id)
     and kid.teacher_id is distinct from auth.uid()
  then
    raise exception 'not allowed';
  end if;

  select * into existing from public.profiles where profiles.student_id = p_student_id;
  if existing.id is not null then
    return query
      select existing.id, p_student_id, kid.display_name, existing.username, existing.email,
             null::text, false;
    return;
  end if;

  perform set_config('kelyra.provision_profile', 'on', true);

  select id into school from public.schools limit 1;
  if school is null then
    raise exception 'no school row';
  end if;

  uname := public.unique_username(kid.display_name);
  meta_email := nullif(lower(trim(kid.metadata->>'email')), '');
  if meta_email is not null and position('@' in meta_email) > 0 and position('.' in meta_email) > 0 then
    new_email := meta_email;
  else
    new_email := uname || '@students.kelyra.local';
  end if;

  while exists (select 1 from auth.users u where lower(u.email) = new_email) loop
    n := n + 1;
    new_email := uname || n::text || '@students.kelyra.local';
  end loop;

  pass := 'pingpong';

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    uid,
    'authenticated',
    'authenticated',
    new_email,
    crypt(pass, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('username', uname),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  )
  values (
    gen_random_uuid(),
    uid,
    jsonb_build_object('sub', uid::text, 'email', new_email),
    'email',
    uid::text,
    now(),
    now(),
    now()
  );

  update public.profiles
  set
    username = uname,
    display_name = kid.display_name,
    role = 'student',
    email = new_email,
    student_id = p_student_id,
    must_change_password = true,
    created_by = auth.uid(),
    also_administrator = false,
    also_teacher = false
  where id = uid;

  if not found then
    insert into public.profiles (
      id, school_id, username, email, display_name, role, student_id,
      must_change_password, created_by, also_administrator, also_teacher
    )
    values (
      uid, school, uname, new_email, kid.display_name, 'student', p_student_id,
      true, auth.uid(), false, false
    );
  end if;

  delete from public.teachers where id = uid;

  perform public.write_audit(
    'create_login',
    'profile',
    uid::text,
    p_student_id,
    null,
    null,
    jsonb_build_object('username', uname, 'role', 'student', 'email', new_email, 'backfill', true)
  );

  return query
    select uid, p_student_id, kid.display_name, uname, new_email, pass, true;
end;
$$;

create or replace function public.admin_provision_parent_login(p_parent_id uuid)
returns table (
  profile_id uuid,
  parent_id uuid,
  display_name text,
  username text,
  email text,
  temp_password text,
  created boolean
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  card public.parents;
  existing public.profiles;
  uid uuid := gen_random_uuid();
  school uuid;
  uname text;
  new_email text;
  pass text := 'pingpong';
  meta_email text;
  n int := 0;
begin
  if p_parent_id is null then
    raise exception 'need a parent';
  end if;

  select * into card from public.parents where id = p_parent_id;
  if card.id is null then
    raise exception 'no such parent';
  end if;

  if auth.uid() is not null
     and not public.is_school_admin()
     and not public.parent_on_taught_class(p_parent_id)
     and card.teacher_id is distinct from auth.uid()
  then
    raise exception 'not allowed';
  end if;

  select * into existing from public.profiles where profiles.parent_id = p_parent_id;
  if existing.id is not null then
    return query
      select existing.id, p_parent_id, card.display_name, existing.username, existing.email,
             null::text, false;
    return;
  end if;

  perform set_config('kelyra.provision_profile', 'on', true);

  select id into school from public.schools limit 1;
  if school is null then
    raise exception 'no school row';
  end if;

  uname := public.unique_username(card.display_name);
  meta_email := nullif(lower(trim(card.metadata->>'email')), '');
  if meta_email is not null and position('@' in meta_email) > 0 and position('.' in meta_email) > 0 then
    new_email := meta_email;
  else
    new_email := uname || '@parents.kelyra.local';
  end if;

  while exists (select 1 from auth.users u where lower(u.email) = new_email) loop
    n := n + 1;
    new_email := uname || n::text || '@parents.kelyra.local';
  end loop;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    uid,
    'authenticated',
    'authenticated',
    new_email,
    crypt(pass, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('username', uname),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  )
  values (
    gen_random_uuid(),
    uid,
    jsonb_build_object('sub', uid::text, 'email', new_email),
    'email',
    uid::text,
    now(),
    now(),
    now()
  );

  update public.profiles
  set
    username = uname,
    display_name = card.display_name,
    role = 'parent',
    email = new_email,
    parent_id = p_parent_id,
    must_change_password = true,
    created_by = auth.uid(),
    also_administrator = false,
    also_teacher = false
  where id = uid;

  if not found then
    insert into public.profiles (
      id, school_id, username, email, display_name, role, parent_id,
      must_change_password, created_by, also_administrator, also_teacher
    )
    values (
      uid, school, uname, new_email, card.display_name, 'parent', p_parent_id,
      true, auth.uid(), false, false
    );
  end if;

  delete from public.teachers where id = uid;

  perform public.write_audit(
    'create_login',
    'profile',
    uid::text,
    null,
    null,
    null,
    jsonb_build_object('username', uname, 'role', 'parent', 'email', new_email, 'parent_id', p_parent_id)
  );

  return query
    select uid, p_parent_id, card.display_name, uname, new_email, pass, true;
end;
$$;

-- Person wipe: admin+owner only. Co-teachers remove from roster via
-- teacher_remove_enrollment, not teacher_delete_student.
create or replace function public.teacher_delete_student(p_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not found';
  end if;
  if not (
    public.is_school_admin()
    or exists (
      select 1 from public.students s
      where s.id = p_student_id and s.teacher_id = auth.uid()
    )
  ) then
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
begin
  if auth.uid() is null then
    raise exception 'Not found';
  end if;
  if not public.teaches_class(p_class_id) then
    raise exception 'Not found';
  end if;
  if not exists (
    select 1 from public.students s
    where s.id = p_student_id
      and (
        s.teacher_id = auth.uid()
        or public.is_school_admin()
        or public.student_on_taught_class(s.id)
        or exists (
          select 1 from public.enrollments e
          where e.student_id = s.id and e.class_id = p_class_id
        )
      )
  ) then
    raise exception 'Not found';
  end if;
  perform public._detach_from_class(p_class_id, p_student_id);
end;
$$;

-- Person wipe: admin+owner only (can_link_parent_student = is_school_admin).
-- Taught-class co-teachers may UPDATE the card, not hard-delete it.
create or replace function public.teacher_delete_parent(p_parent_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  photo_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not found';
  end if;
  select photo_asset_id into photo_id
  from public.parents
  where id = p_parent_id
    and (
      teacher_id = auth.uid()
      or public.can_link_parent_student()
    );
  if not found then
    raise exception 'Not found';
  end if;
  delete from public.parents where id = p_parent_id;
  perform public._unref_delete_asset(photo_id);
end;
$$;

-- Unlink: office (can_link), parent owner, or taught-class on THIS child only.
-- parent_on_taught_class alone is not enough — that would let a co-teacher of
-- one linked child detach a sibling enrolled in another teacher's class.
create or replace function public.teacher_unlink_child(p_parent_id uuid, p_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.can_link_parent_student() then
    delete from public.parent_students
    where parent_id = p_parent_id and student_id = p_student_id;
    return;
  end if;
  if not (
    exists (
      select 1 from public.parents
      where id = p_parent_id and teacher_id = auth.uid()
    )
    or public.student_on_taught_class(p_student_id)
  ) then
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
    where pa.id = p_access_id
      and (
        p.teacher_id = auth.uid()
        or public.parent_on_taught_class(p.id)
        or public.is_school_admin()
      )
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
    where id = p_person_id
      and (
        teacher_id = auth.uid()
        or public.is_school_admin()
        or public.student_on_taught_class(p_person_id)
      );
    if not found then
      raise exception 'Not found';
    end if;
    update public.students set photo_asset_id = null where id = p_person_id;
  elsif p_kind = 'parent' then
    select photo_asset_id into photo_id
    from public.parents
    where id = p_person_id
      and (
        teacher_id = auth.uid()
        or public.is_school_admin()
        or public.parent_on_taught_class(p_person_id)
      );
    if not found then
      raise exception 'Not found';
    end if;
    update public.parents set photo_asset_id = null where id = p_person_id;
  elsif p_kind = 'teacher' then
    if p_person_id <> auth.uid() then
      raise exception 'Not found';
    end if;
    select photo_asset_id into photo_id
    from public.teachers
    where id = auth.uid();
    if not found then
      raise exception 'Not found';
    end if;
    update public.teachers set photo_asset_id = null where id = auth.uid();
  else
    raise exception 'Invalid kind';
  end if;
  perform public._unref_delete_asset(photo_id);
end;
$$;

revoke all on function public.admin_provision_student_login(uuid) from public, anon;
revoke all on function public.admin_provision_parent_login(uuid) from public, anon;
grant execute on function public.admin_provision_student_login(uuid) to authenticated;
grant execute on function public.admin_provision_parent_login(uuid) to authenticated;
grant execute on function public.teacher_delete_student(uuid) to authenticated;
grant execute on function public.teacher_remove_enrollment(uuid, uuid) to authenticated;
grant execute on function public.teacher_delete_parent(uuid) to authenticated;
grant execute on function public.teacher_unlink_child(uuid, uuid) to authenticated;
grant execute on function public.teacher_revoke_invite(uuid) to authenticated;
grant execute on function public.teacher_clear_profile_photo(text, uuid) to authenticated;
