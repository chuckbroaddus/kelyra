-- One school. Auth profile + role, @username, append-only audit, in-app messages.
-- Superintendent is break-glass. Seed/claim is SQL — password is NOT in the Expo bundle.
-- After this runs: sign in (or create) an auth user, then:
--   select public.school_claim_superintendent();
-- Optional bootstrap (dev only) — create login then claim:
--   select public.admin_create_login(
--     'superintendent@school.local', 'pingpong', 'superintendent',
--     'superintendent', 'Superintendent', true);

create type public.school_role as enum (
  'superintendent',
  'administrator',
  'teacher',
  'parent',
  'student'
);

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'School',
  created_at timestamptz not null default now()
);

insert into public.schools (name)
select 'School'
where not exists (select 1 from public.schools);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete restrict,
  username text not null,
  email text,
  display_name text,
  role public.school_role not null default 'teacher',
  must_change_password boolean not null default false,
  student_id uuid references public.students (id) on delete set null,
  parent_id uuid references public.parents (id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  unique (school_id, username)
);

create unique index profiles_username_lower_idx on public.profiles (lower(username));
create index profiles_role_idx on public.profiles (role);
create index profiles_student_id_idx on public.profiles (student_id);
create index profiles_parent_id_idx on public.profiles (parent_id);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_username text,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id text,
  student_id uuid,
  class_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index audit_events_created_idx on public.audit_events (created_at desc);
create index audit_events_actor_idx on public.audit_events (actor_id, created_at desc);
create index audit_events_student_idx on public.audit_events (student_id, created_at desc);
create index audit_events_entity_idx on public.audit_events (entity_type, entity_id);

create table public.message_threads (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table public.message_thread_members (
  thread_id uuid not null references public.message_threads (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz,
  primary key (thread_id, profile_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.message_threads (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index messages_thread_created_idx on public.messages (thread_id, created_at);
create index message_thread_members_profile_idx on public.message_thread_members (profile_id);

-- Helpers

create or replace function public.normalize_username(raw text)
returns text
language sql
immutable
as $$
  select left(regexp_replace(lower(trim(both from coalesce(raw, ''))), '^@+', ''), 32);
$$;

create or replace function public.unique_username(raw text)
returns text
language plpgsql
as $$
declare
  base text := public.normalize_username(raw);
  candidate text;
  n int := 0;
begin
  if base is null or length(base) < 2 then
    base := 'user';
  end if;
  base := regexp_replace(base, '[^a-z0-9_]', '', 'g');
  if length(base) < 2 then
    base := 'user';
  end if;
  candidate := base;
  while exists (select 1 from public.profiles where username = candidate) loop
    n := n + 1;
    candidate := left(base, 24) || n::text;
  end loop;
  return candidate;
end;
$$;

create or replace function public.my_role()
returns public.school_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_school_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('superintendent', 'administrator')
  );
$$;

create or replace function public.login_identifier(p_handle text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select email
  from public.profiles
  where email is not null
    and (
      username = public.normalize_username(p_handle)
      or lower(email) = lower(trim(p_handle))
    )
  limit 1;
$$;

create or replace function public.write_audit(
  p_action text,
  p_entity_type text,
  p_entity_id text default null,
  p_student_id uuid default null,
  p_class_id uuid default null,
  p_before jsonb default null,
  p_after jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.profiles;
  new_id uuid;
begin
  select * into actor from public.profiles where id = auth.uid();
  insert into public.audit_events (
    actor_id, actor_username, actor_role, action, entity_type, entity_id,
    student_id, class_id, before, after
  )
  values (
    auth.uid(),
    actor.username,
    actor.role::text,
    p_action,
    p_entity_type,
    p_entity_id,
    p_student_id,
    p_class_id,
    p_before,
    p_after
  )
  returning id into new_id;
  return new_id;
end;
$$;

-- Backfill teachers → profiles, then new users get a profile

insert into public.profiles (id, school_id, username, email, display_name, role)
select
  t.id,
  (select id from public.schools limit 1),
  public.unique_username(split_part(t.email, '@', 1)),
  t.email,
  t.display_name,
  'teacher'
from public.teachers t
on conflict (id) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  school uuid;
  uname text;
begin
  insert into public.teachers (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  select id into school from public.schools limit 1;
  uname := public.unique_username(split_part(coalesce(new.email, 'user'), '@', 1));
  insert into public.profiles (id, school_id, username, email, display_name, role)
  values (new.id, school, uname, new.email, split_part(coalesce(new.email, 'user'), '@', 1), 'teacher')
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.school_claim_superintendent()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.profiles;
begin
  if auth.uid() is null then
    raise exception 'sign in first';
  end if;
  if exists (select 1 from public.profiles where role = 'superintendent' and id <> auth.uid()) then
    raise exception 'a superintendent already exists';
  end if;
  update public.profiles
  set role = 'superintendent',
      username = case
        when username in ('superintendent', 'superintendant') then username
        else public.unique_username('superintendent')
      end
  where id = auth.uid()
  returning * into row;
  perform public.write_audit('claim_superintendent', 'profile', auth.uid()::text, null, null, null, to_jsonb(row));
  return row;
end;
$$;

create or replace function public.admin_create_login(
  p_email text,
  p_password text,
  p_username text,
  p_role public.school_role,
  p_display_name text,
  p_must_change boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  uid uuid := gen_random_uuid();
  school uuid;
  uname text;
  new_email text := lower(trim(p_email));
begin
  if auth.uid() is null then
    raise exception 'sign in first';
  end if;
  if not public.is_school_admin() then
    raise exception 'not allowed';
  end if;
  if p_role = 'superintendent' and exists (select 1 from public.profiles where role = 'superintendent') then
    raise exception 'a superintendent already exists';
  end if;
  if p_role not in ('superintendent', 'administrator', 'teacher', 'parent', 'student') then
    raise exception 'bad role';
  end if;
  if new_email is null or position('@' in new_email) = 0 or position('.' in new_email) = 0 then
    raise exception 'need a real email';
  end if;
  if p_password is null or length(p_password) < 6 then
    raise exception 'password must be at least 6 characters';
  end if;
  if exists (select 1 from auth.users u where lower(u.email) = new_email) then
    raise exception 'that email already has a login';
  end if;

  select id into school from public.schools limit 1;
  if school is null then
    raise exception 'no school row';
  end if;
  uname := public.unique_username(p_username);

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    uid,
    'authenticated',
    'authenticated',
    new_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('username', uname),
    now(),
    now(),
    null,
    '',
    '',
    null
  );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
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
    display_name = nullif(trim(p_display_name), ''),
    role = p_role,
    email = new_email,
    must_change_password = coalesce(p_must_change, true),
    created_by = auth.uid()
  where id = uid;

  if not found then
    insert into public.profiles (
      id, school_id, username, email, display_name, role, must_change_password, created_by
    )
    values (
      uid, school, uname, new_email, nullif(trim(p_display_name), ''), p_role,
      coalesce(p_must_change, true), auth.uid()
    );
  end if;

  if p_role in ('superintendent', 'administrator', 'teacher') then
    insert into public.teachers (id, email, display_name)
    values (uid, new_email, nullif(trim(p_display_name), ''))
    on conflict (id) do update
      set email = excluded.email,
          display_name = coalesce(excluded.display_name, public.teachers.display_name);
  end if;

  perform public.write_audit(
    'create_login',
    'profile',
    uid::text,
    null,
    null,
    null,
    jsonb_build_object('username', uname, 'role', p_role, 'email', new_email)
  );
  return uid;
exception
  when others then
    raise exception 'Could not create login: %', sqlerrm;
end;
$$;

create or replace function public.admin_set_parent_link(
  p_parent_id uuid,
  p_student_id uuid,
  p_link boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_school_admin() then
    raise exception 'not allowed';
  end if;
  if p_link then
    insert into public.parent_students (parent_id, student_id)
    values (p_parent_id, p_student_id)
    on conflict do nothing;
    perform public.write_audit('link_parent_student', 'parent_student', p_parent_id::text || ':' || p_student_id::text, p_student_id, null, null, jsonb_build_object('linked', true));
  else
    delete from public.parent_students
    where parent_id = p_parent_id and student_id = p_student_id;
    perform public.write_audit('unlink_parent_student', 'parent_student', p_parent_id::text || ':' || p_student_id::text, p_student_id, null, jsonb_build_object('linked', true), jsonb_build_object('linked', false));
  end if;
end;
$$;

create or replace function public.unread_message_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select count(*)::int
    from public.messages m
    join public.message_thread_members mem on mem.thread_id = m.thread_id
    where mem.profile_id = auth.uid()
      and m.sender_id <> auth.uid()
      and (mem.last_read_at is null or m.created_at > mem.last_read_at)
  ), 0);
$$;

-- RLS

alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.audit_events enable row level security;
alter table public.message_threads enable row level security;
alter table public.message_thread_members enable row level security;
alter table public.messages enable row level security;

create policy schools_read on public.schools for select using (auth.uid() is not null);
create policy schools_admin_update on public.schools for update using (public.is_school_admin());

create policy profiles_self on public.profiles
  for select using (id = auth.uid() or public.is_school_admin());
create policy profiles_admin_write on public.profiles
  for all using (public.is_school_admin())
  with check (public.is_school_admin());
create policy profiles_self_update on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());

-- Audit: staff may read. Nobody updates or deletes. Inserts via write_audit only.
create policy audit_admin_read on public.audit_events
  for select using (public.is_school_admin());

create policy threads_member on public.message_threads
  for select using (
    public.is_school_admin()
    or exists (
      select 1 from public.message_thread_members m
      where m.thread_id = id and m.profile_id = auth.uid()
    )
  );
create policy threads_insert on public.message_threads
  for insert with check (auth.uid() is not null);

create policy thread_members_visible on public.message_thread_members
  for select using (
    public.is_school_admin()
    or profile_id = auth.uid()
    or exists (
      select 1 from public.message_thread_members mine
      where mine.thread_id = thread_id and mine.profile_id = auth.uid()
    )
  );
create policy thread_members_insert on public.message_thread_members
  for insert with check (auth.uid() is not null);
create policy thread_members_self_update on public.message_thread_members
  for update using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy messages_member on public.messages
  for select using (
    public.is_school_admin()
    or exists (
      select 1 from public.message_thread_members m
      where m.thread_id = messages.thread_id and m.profile_id = auth.uid()
    )
  );
create policy messages_send on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.message_thread_members m
      where m.thread_id = messages.thread_id and m.profile_id = auth.uid()
    )
  );

-- Staff can read school-wide academic rows (existing teacher policies stay).
create policy classes_admin_all on public.classes
  for all using (public.is_school_admin())
  with check (public.is_school_admin());
create policy students_admin_all on public.students
  for all using (public.is_school_admin())
  with check (public.is_school_admin());
create policy enrollments_admin_all on public.enrollments
  for all using (public.is_school_admin())
  with check (public.is_school_admin());
create policy captures_admin_all on public.captures
  for all using (public.is_school_admin())
  with check (public.is_school_admin());
create policy skills_admin_all on public.skills
  for all using (public.is_school_admin())
  with check (public.is_school_admin());
create policy skill_gaps_admin_all on public.skill_gaps
  for all using (public.is_school_admin())
  with check (public.is_school_admin());
create policy teachers_admin_read on public.teachers
  for select using (public.is_school_admin());
create policy parents_admin_all on public.parents
  for all using (public.is_school_admin())
  with check (public.is_school_admin());
create policy parent_students_admin_all on public.parent_students
  for all using (public.is_school_admin())
  with check (public.is_school_admin());

-- Own academic record for logged-in students / parents
create policy students_self_read on public.students
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.student_id = students.id)
    or exists (
      select 1
      from public.profiles p
      join public.parent_students ps on ps.parent_id = p.parent_id
      where p.id = auth.uid() and ps.student_id = students.id
    )
  );

create or replace function public.students_parent_guard()
returns trigger
language plpgsql
as $$
begin
  if public.is_school_admin() then
    return new;
  end if;
  if exists (select 1 from public.teachers t where t.id = auth.uid())
     and public.my_role() in ('teacher', 'superintendent', 'administrator') then
    return new;
  end if;
  if new.display_name is distinct from old.display_name
    or new.teacher_id is distinct from old.teacher_id
    or new.current_focus_skill_id is distinct from old.current_focus_skill_id
    or new.parent_sentence is distinct from old.parent_sentence
    or new.sort_name is distinct from old.sort_name
  then
    raise exception 'parents may only edit child details';
  end if;
  return new;
end;
$$;

drop trigger if exists students_parent_guard on public.students;
create trigger students_parent_guard
  before update on public.students
  for each row
  execute function public.students_parent_guard();

create policy students_parent_update on public.students
  for update using (
    exists (
      select 1
      from public.profiles p
      join public.parent_students ps on ps.parent_id = p.parent_id
      where p.id = auth.uid() and ps.student_id = students.id
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      join public.parent_students ps on ps.parent_id = p.parent_id
      where p.id = auth.uid() and ps.student_id = students.id
    )
  );

grant execute on function public.login_identifier(text) to anon, authenticated;
grant execute on function public.normalize_username(text) to anon, authenticated;
grant execute on function public.my_role() to authenticated;
grant execute on function public.is_school_admin() to authenticated;
grant execute on function public.write_audit(text, text, text, uuid, uuid, jsonb, jsonb) to authenticated;
grant execute on function public.school_claim_superintendent() to authenticated;
grant execute on function public.admin_create_login(text, text, text, public.school_role, text, boolean) to authenticated;
grant execute on function public.admin_set_parent_link(uuid, uuid, boolean) to authenticated;
grant execute on function public.unread_message_count() to authenticated;
grant select on public.audit_events to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.schools to authenticated;
grant select, insert, update on public.message_threads to authenticated;
grant select, insert, update on public.message_thread_members to authenticated;
grant select, insert on public.messages to authenticated;

-- Revoke any chance of mutating the log
revoke update, delete, truncate on public.audit_events from public, anon, authenticated;
