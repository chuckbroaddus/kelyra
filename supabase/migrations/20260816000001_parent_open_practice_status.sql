-- Incremental: parent_open practice_status must ignore homework capture cells.
-- Homework Approve writes an approved capture-kind submission; that is not practice.
-- Do not re-run 20260816000000_people_photos_delete.sql.

create or replace function public.parent_open(p_token text)
returns table (
  parent_id uuid,
  parent_display_name text,
  parent_photo_path text,
  parent_relationship text,
  parent_relationship_other text,
  parent_phone text,
  parent_email text,
  parent_address text,
  parent_preferred_contact text,
  children jsonb
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.display_name,
    pa_asset.storage_path,
    nullif(p.metadata->>'relationship', ''),
    nullif(p.metadata->>'relationship_other', ''),
    nullif(p.metadata->>'phone', ''),
    nullif(p.metadata->>'email', ''),
    nullif(p.metadata->>'address', ''),
    nullif(p.metadata->>'preferred_contact', ''),
    coalesce(
      (
        select jsonb_agg(child.row order by child.sort_name, child.display_name)
        from (
          select
            s.sort_name,
            s.display_name,
            jsonb_build_object(
              'student_id', s.id,
              'display_name', s.display_name,
              'preferred_name', nullif(s.metadata->>'preferred_name', ''),
              'photo_path', st_asset.storage_path,
              'birthday_md',
                case
                  when (s.metadata->>'birthday') ~ '^\d{4}-\d{2}-\d{2}$'
                  then to_char((s.metadata->>'birthday')::date, 'Mon FMDD')
                  else null
                end,
              'class_name', (
                select c.name
                from public.enrollments e
                join public.classes c on c.id = e.class_id
                where e.student_id = s.id
                order by e.created_at
                limit 1
              ),
              'focus_label', sk.label,
              'practice_status', (
                select sub.status::text
                from public.submissions sub
                join public.assignments a on a.id = sub.assignment_id
                where sub.student_id = s.id
                  and a.kind = 'practice'
                order by sub.created_at desc
                limit 1
              ),
              'parent_sentence', s.parent_sentence
            ) as row
          from public.parent_students ps
          join public.students s on s.id = ps.student_id
          left join public.assets st_asset on st_asset.id = s.photo_asset_id
          left join public.skills sk on sk.id = s.current_focus_skill_id
          where ps.parent_id = p.id
        ) child
      ),
      '[]'::jsonb
    )
  from public.parent_accesses pa
  join public.parents p on p.id = pa.parent_id
  left join public.assets pa_asset on pa_asset.id = p.photo_asset_id
  where pa.token = trim(p_token)
  limit 1;
$$;
