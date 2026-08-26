-- Class tabs in PersonTabs use the class teacher’s face, not the feed glyph.

drop function if exists public.student_classes();

create function public.student_classes()
returns table (
  class_id uuid,
  class_name text,
  feed_icon text,
  teacher_id uuid,
  teacher_name text,
  teacher_photo_path text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.name,
    c.feed_icon,
    t.id,
    coalesce(nullif(t.display_name, ''), nullif(tp.display_name, ''), 'Teacher'),
    t_asset.storage_path
  from public.enrollments e
  join public.classes c on c.id = e.class_id
  left join lateral (
    select ct.teacher_id
    from public.class_teachers ct
    where ct.class_id = c.id
    order by ct.created_at
    limit 1
  ) first_teacher on true
  left join public.teachers t on t.id = coalesce(c.teacher_id, first_teacher.teacher_id)
  left join public.profiles tp on tp.id = t.id
  left join public.assets t_asset on t_asset.id = t.photo_asset_id
  where e.student_id = public.my_student_id()
  order by c.name;
$$;

comment on function public.student_classes() is
  'Enrolled classes plus the class teacher’s name and photo path for tab avatars.';

revoke all on function public.student_classes() from public, anon;
grant execute on function public.student_classes() to authenticated;
