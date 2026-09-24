-- t_45710b0c: Unassigned-class calendar provision must not bind to oldest school.
-- Fail closed via my_school_id() (creating office) or null (skip provision).
-- Re-provision on add_teacher_to_class so a skipped insert can bind after a teacher is assigned.

create or replace function public.calendar_school_id_for_class(p_class_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.school_id
      from public.class_teachers ct
      join public.profiles p on p.id = ct.teacher_id
      where ct.class_id = p_class_id
        and p.school_id is not null
      limit 1
    ),
    (
      select p.school_id
      from public.classes c
      join public.profiles p on p.id = c.teacher_id
      where c.id = p_class_id
        and c.teacher_id is not null
        and p.school_id is not null
      limit 1
    ),
    public.my_school_id()
  );
$$;

revoke all on function public.calendar_school_id_for_class(uuid) from public, anon, authenticated;

comment on function public.calendar_school_id_for_class(uuid) is
  'School for class/class_work calendar provision. Never falls back to oldest school; uses teacher profile school or my_school_id(); null skips provision.';

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
  -- Re-bind class calendars now that a same-school teacher exists (P2 t_45710b0c).
  perform public.provision_class_calendars(p_class_id);
end;
$$;

grant execute on function public.add_teacher_to_class(uuid, uuid) to authenticated;
