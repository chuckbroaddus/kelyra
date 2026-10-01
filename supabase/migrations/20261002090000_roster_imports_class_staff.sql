-- Roster photo imports: let the people who can enroll students park and confirm a pending import.
--
-- Before: roster_imports_via_class allowed only classes.teacher_id = auth.uid() (the primary
-- teacher). Office/admin is the only web seat with "Add students" (class setup), so its
-- createRosterImport insert failed with RLS and the screen showed "Could not read that list".
-- Co-teachers added through class_teachers were also locked out.
--
-- After (least privilege):
--   * the class's primary teacher (classes.teacher_id), as before;
--   * co-teachers of that class (public.class_teachers);
--   * office/admin staff (public.is_school_admin(): superintendent / administrator) only for
--     classes in their own school. A class's school is the school of a teacher on that class,
--     the same way public.gb_class_school_id() resolves it. Admins get nothing across schools,
--     and nothing on a class with no teacher yet (that class has no school link).
--   * students and parents never, even if they somehow appear as a class teacher id.
--
-- Do not apply from a card. Chief of Staff / Hermes applies migrations.

create or replace function public.can_manage_roster_import(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_class_id is not null
    and auth.uid() is not null
    -- Students and parents never manage roster imports.
    and not exists (
      select 1
      from public.profiles me
      where me.id = auth.uid()
        and me.role in ('student', 'parent')
        and not coalesce(me.also_teacher, false)
    )
    and (
      -- Primary teacher (legacy rule, unchanged).
      exists (
        select 1 from public.classes c
        where c.id = p_class_id and c.teacher_id = auth.uid()
      )
      -- Co-teacher of this class.
      or exists (
        select 1 from public.class_teachers ct
        where ct.class_id = p_class_id and ct.teacher_id = auth.uid()
      )
      -- Office/admin, same school only.
      or (
        public.is_school_admin()
        and public.my_school_id() is not null
        and exists (
          select 1
          from public.class_teachers ct
          join public.profiles tp on tp.id = ct.teacher_id
          where ct.class_id = p_class_id
            and tp.school_id = public.my_school_id()
        )
      )
    );
$$;

revoke all on function public.can_manage_roster_import(uuid) from public, anon;
grant execute on function public.can_manage_roster_import(uuid) to authenticated;

alter table public.roster_imports enable row level security;

drop policy if exists roster_imports_via_class on public.roster_imports;
drop policy if exists roster_imports_class_staff on public.roster_imports;
create policy roster_imports_class_staff on public.roster_imports
  for all
  to authenticated
  using (public.can_manage_roster_import(class_id))
  with check (public.can_manage_roster_import(class_id));
