-- P-M1 / t_26342103: explain cells include non-approved submission statuses
-- so Missing:N can exclude Assigned / In progress / Turned in.
-- Average math still uses approved_at / approved_score only (client cellApproved).

create or replace function public.student_class_average_explain(p_class_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  sid uuid := public.my_student_id();
  syllabus jsonb;
  assignments jsonb;
  cells jsonb;
begin
  if auth.uid() is null or sid is null then
    return jsonb_build_object('ok', false, 'reason', 'not_student');
  end if;
  if not exists (
    select 1 from public.enrollments e
    where e.class_id = p_class_id and e.student_id = sid
  ) then
    return jsonb_build_object('ok', false, 'reason', 'not_enrolled');
  end if;

  syllabus := public.published_class_syllabus(p_class_id);

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', a.id,
      'title', a.title,
      'category', a.category,
      'term', a.term,
      'include_in_average', a.include_in_average,
      'due_at', a.due_at,
      'is_makeup', a.is_makeup,
      'score_scheme', a.score_scheme,
      'max_score', a.max_score,
      'weight_percent', a.weight_percent,
      'weight_band', a.weight_band
    ) order by a.created_at, a.title
  ), '[]'::jsonb)
  into assignments
  from public.assignments a
  where a.class_id = p_class_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'assignment_id', sub.assignment_id,
      'approved_score', case when sub.approved_at is not null then sub.approved_score else null end,
      'score_mark', case when sub.approved_at is not null then sub.score_mark else null end,
      'status', sub.status,
      'approved_at', sub.approved_at
    )
  ), '[]'::jsonb)
  into cells
  from public.submissions sub
  join public.assignments a on a.id = sub.assignment_id
  where a.class_id = p_class_id
    and sub.student_id = sid;

  return jsonb_build_object(
    'ok', true,
    'student_id', sid,
    'class_id', p_class_id,
    'syllabus', syllabus,
    'assignments', assignments,
    'cells', cells
  );
end;
$$;

create or replace function public.parent_class_average_explain(
  p_class_id uuid,
  p_student_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  syllabus jsonb;
  assignments jsonb;
  cells jsonb;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  end if;
  if not public.family_may_read_class(p_class_id, p_student_id) then
    return jsonb_build_object('ok', false, 'reason', 'not_linked');
  end if;
  if public.my_student_id() is not null and public.my_student_id() is distinct from p_student_id then
    return jsonb_build_object('ok', false, 'reason', 'not_linked');
  end if;
  if public.my_student_id() is null then
    if not exists (
      select 1
      from public.profiles pr
      join public.parent_students ps on ps.parent_id = pr.parent_id
      where pr.id = auth.uid()
        and pr.parent_id is not null
        and ps.student_id = p_student_id
    ) then
      return jsonb_build_object('ok', false, 'reason', 'not_linked');
    end if;
  end if;

  if not exists (
    select 1 from public.enrollments e
    where e.class_id = p_class_id and e.student_id = p_student_id
  ) then
    return jsonb_build_object('ok', false, 'reason', 'not_enrolled');
  end if;

  select case
    when s.status = 'published' and s.publish_to_family then
      jsonb_build_object(
        'ok', true,
        'published', true,
        'title', s.title,
        'calc_mode', s.calc_mode,
        'term_structure', s.term_structure,
        'active_term', s.active_term,
        'categories', (
          select coalesce(jsonb_agg(
            jsonb_build_object(
              'key', c.key,
              'label', c.label,
              'weight_percent', c.weight_percent,
              'sort_order', c.sort_order,
              'rules', c.rules
            ) order by c.sort_order, c.label
          ), '[]'::jsonb)
          from public.syllabus_categories c
          where c.syllabus_id = s.id and c.active
        ),
        'policies_public', public.syllabus_policies_public(s.policies)
      )
    else jsonb_build_object('ok', true, 'published', false)
  end
  into syllabus
  from public.class_syllabi s
  where s.class_id = p_class_id;

  if syllabus is null then
    syllabus := jsonb_build_object('ok', true, 'published', false);
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', a.id,
      'title', a.title,
      'category', a.category,
      'term', a.term,
      'include_in_average', a.include_in_average,
      'due_at', a.due_at,
      'is_makeup', a.is_makeup,
      'score_scheme', a.score_scheme,
      'max_score', a.max_score,
      'weight_percent', a.weight_percent,
      'weight_band', a.weight_band
    ) order by a.created_at, a.title
  ), '[]'::jsonb)
  into assignments
  from public.assignments a
  where a.class_id = p_class_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'assignment_id', sub.assignment_id,
      'approved_score', case when sub.approved_at is not null then sub.approved_score else null end,
      'score_mark', case when sub.approved_at is not null then sub.score_mark else null end,
      'status', sub.status,
      'approved_at', sub.approved_at
    )
  ), '[]'::jsonb)
  into cells
  from public.submissions sub
  join public.assignments a on a.id = sub.assignment_id
  where a.class_id = p_class_id
    and sub.student_id = p_student_id;

  return jsonb_build_object(
    'ok', true,
    'student_id', p_student_id,
    'class_id', p_class_id,
    'syllabus', syllabus,
    'assignments', assignments,
    'cells', cells
  );
end;
$$;

comment on function public.student_class_average_explain(uuid) is
  'Own class average explain. Cells include all own submission statuses for P-M1; approved_score only when approved_at set.';

comment on function public.parent_class_average_explain(uuid, uuid) is
  'Parent/child class average explain. Cells include child submission statuses for P-M1; approved_score only when approved_at set.';
