-- Dev/test only. Password is in this SQL file, never in the Expo bundle.
-- Sets every student login to pingpong and requires a change on first sign-in.

update auth.users u
set
  encrypted_password = extensions.crypt('pingpong', extensions.gen_salt('bf')),
  updated_at = now()
from public.profiles p
where p.id = u.id
  and p.role = 'student';

select set_config('kelyra.provision_profile', 'on', true);

update public.profiles
set must_change_password = true
where role = 'student';

select display_name, username, email, 'pingpong' as temp_password
from public.profiles
where role = 'student'
order by display_name;
