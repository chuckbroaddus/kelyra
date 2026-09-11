-- Optional DATE birthday bounds (today−22y … today−3y).
-- Enforces shape + range only when metadata.birthday changes (legacy rows stay readable).
-- NOT applied by implementer — handoff only. CoS / devops apply separately.

create or replace function public.enforce_student_birthday_bounds()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_b text;
  new_b text;
  d date;
begin
  old_b := case
    when tg_op = 'INSERT' then null
    else nullif(btrim(coalesce(old.metadata->>'birthday', '')), '')
  end;
  new_b := nullif(btrim(coalesce(new.metadata->>'birthday', '')), '');

  if old_b is not distinct from new_b then
    return new;
  end if;

  if new_b is null then
    return new;
  end if;

  if new_b !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'birthday must be ISO YYYY-MM-DD';
  end if;

  d := new_b::date;
  if d < (current_date - interval '22 years')::date
     or d > (current_date - interval '3 years')::date then
    raise exception 'birthday out of allowed range (today-22y … today-3y)';
  end if;

  return new;
end;
$$;

drop trigger if exists students_birthday_bounds on public.students;
create trigger students_birthday_bounds
  before insert or update of metadata on public.students
  for each row
  execute function public.enforce_student_birthday_bounds();
