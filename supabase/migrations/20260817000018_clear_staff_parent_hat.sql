-- Leftover "also a parent" hat: a parent card named after staff, often
-- with a second login. Unlink staff who have no children. Remove the
-- empty hat card's parent-only login if it only mirrors a staff name.

select set_config('kelyra.provision_profile', 'on', true);

update public.profiles p
set parent_id = null
where p.role in ('superintendent', 'administrator', 'teacher')
  and p.parent_id is not null
  and not exists (
    select 1 from public.parent_students ps where ps.parent_id = p.parent_id
  );

delete from auth.users u
using public.profiles p
where p.id = u.id
  and p.role = 'parent'
  and not exists (
    select 1 from public.parent_students ps where ps.parent_id = p.parent_id
  )
  and exists (
    select 1
    from public.profiles s
    where s.role in ('superintendent', 'administrator', 'teacher')
      and (
        lower(s.username) = lower(p.username)
        or lower(coalesce(s.display_name, '')) = lower(coalesce(p.display_name, ''))
        or lower(s.username) = lower(coalesce(p.display_name, ''))
      )
  );

delete from public.parents card
where not exists (select 1 from public.profiles p where p.parent_id = card.id)
  and not exists (select 1 from public.parent_students ps where ps.parent_id = card.id)
  and exists (
    select 1
    from public.profiles s
    where s.role in ('superintendent', 'administrator', 'teacher')
      and (
        lower(s.username) = lower(card.display_name)
        or lower(coalesce(s.display_name, '')) = lower(card.display_name)
      )
  );

select id, username, display_name, role, parent_id
from public.profiles
where role = 'parent' or parent_id is not null
order by role, display_name;
