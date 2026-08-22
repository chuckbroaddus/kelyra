-- Students may read posts for classes they are enrolled in, and school-wide posts.
-- They still cannot create posts or replies (create_post / reply_to_post).

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
    return exists (
      select 1 from public.classes c
      where c.id = p_post.class_id
        and (c.teacher_id = auth.uid() or public.is_school_admin())
    );
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
