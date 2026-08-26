-- Student home: classes, people, and assignment cells with class + score.
-- Own rows only. Scores leave the function; the app shows them only when graded.

drop function if exists public.student_list_todo();
drop function if exists public.student_classes();
drop function if exists public.student_people();

create function public.student_classes()
returns table (
  class_id uuid,
  class_name text,
  feed_icon text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.name,
    c.feed_icon
  from public.enrollments e
  join public.classes c on c.id = e.class_id
  where e.student_id = public.my_student_id()
  order by c.name;
$$;

comment on function public.student_classes() is
  'Classes the signed-in student is enrolled in. Own roster only.';

revoke all on function public.student_classes() from public, anon;
grant execute on function public.student_classes() to authenticated;

create function public.student_list_todo()
returns table (
  submission_id uuid,
  assignment_id uuid,
  assignment_title text,
  kind text,
  status public.submission_status,
  due_at timestamptz,
  submitted_at timestamptz,
  class_id uuid,
  class_name text,
  class_icon text,
  approved_score numeric,
  score_mark text,
  deck_id text,
  lesson_version text,
  items jsonb,
  answers jsonb,
  focus_label text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    sub.id,
    a.id,
    a.title,
    a.kind::text,
    sub.status,
    a.due_at,
    sub.submitted_at,
    c.id,
    c.name,
    c.feed_icon,
    sub.approved_score,
    sub.score_mark::text,
    a.deck_id,
    a.lesson_version,
    ps.items,
    sub.answers,
    sk.label
  from public.submissions sub
  join public.assignments a on a.id = sub.assignment_id
  join public.classes c on c.id = a.class_id
  left join public.practice_sets ps on ps.id = a.practice_set_id
  left join public.students st on st.id = sub.student_id
  left join public.skills sk on sk.id = st.current_focus_skill_id
  where sub.student_id = public.my_student_id()
  order by sub.created_at desc;
$$;

comment on function public.student_list_todo() is
  'Own assignment cells. No classmates. Draft scores are omitted.';

revoke all on function public.student_list_todo() from public, anon;
grant execute on function public.student_list_todo() to authenticated;

create function public.student_people()
returns table (
  kind text,
  id uuid,
  profile_id uuid,
  display_name text,
  photo_path text,
  class_id uuid,
  class_name text
)
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select public.my_student_id() as student_id
  )
  select
    'classmate'::text,
    s.id,
    sp.id,
    s.display_name,
    st_asset.storage_path,
    c.id,
    c.name
  from me
  join public.enrollments mine on mine.student_id = me.student_id
  join public.classes c on c.id = mine.class_id
  join public.enrollments peer on peer.class_id = mine.class_id
  join public.students s on s.id = peer.student_id
  left join public.profiles sp on sp.student_id = s.id
  left join public.assets st_asset on st_asset.id = s.photo_asset_id
  where s.id <> me.student_id

  union all

  select
    'teacher'::text,
    t.id,
    p.id,
    coalesce(nullif(t.display_name, ''), nullif(p.display_name, ''), 'Teacher'),
    t_asset.storage_path,
    c.id,
    c.name
  from me
  join public.enrollments mine on mine.student_id = me.student_id
  join public.classes c on c.id = mine.class_id
  join public.class_teachers ct on ct.class_id = c.id
  join public.teachers t on t.id = ct.teacher_id
  left join public.profiles p on p.id = t.id
  left join public.assets t_asset on t_asset.id = t.photo_asset_id

  union all

  select
    'parent'::text,
    par.id,
    pp.id,
    par.display_name,
    p_asset.storage_path,
    null::uuid,
    null::text
  from me
  join public.parent_students ps on ps.student_id = me.student_id
  join public.parents par on par.id = ps.parent_id
  left join public.profiles pp on pp.parent_id = par.id
  left join public.assets p_asset on p_asset.id = par.photo_asset_id;
$$;

comment on function public.student_people() is
  'Classmates in shared classes, teachers of those classes, and linked parents. Own student only.';

revoke all on function public.student_people() from public, anon;
grant execute on function public.student_people() to authenticated;
