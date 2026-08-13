-- Parent invite links. One token, one student. No scores or photos.

create table public.parent_accesses (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  token text not null unique,
  email text,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.parent_accesses enable row level security;

create policy parent_accesses_via_student on public.parent_accesses
  for all using (
    exists (
      select 1 from public.students s
      where s.id = student_id and s.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.students s
      where s.id = student_id and s.teacher_id = auth.uid()
    )
  );

create or replace function public.parent_open(p_token text)
returns table (
  display_name text,
  class_name text,
  focus_label text,
  practice_status text,
  parent_sentence text
)
language sql
security definer
set search_path = public
as $$
  select
    s.display_name,
    c.name,
    sk.label,
    (
      select sub.status::text
      from public.submissions sub
      where sub.student_id = s.id
      order by sub.created_at desc
      limit 1
    ),
    s.parent_sentence
  from public.parent_accesses pa
  join public.students s on s.id = pa.student_id
  join public.enrollments e on e.student_id = s.id
  join public.classes c on c.id = e.class_id
  left join public.skills sk on sk.id = s.current_focus_skill_id
  where pa.token = trim(p_token)
  limit 1;
$$;

grant execute on function public.parent_open(text) to anon, authenticated;
