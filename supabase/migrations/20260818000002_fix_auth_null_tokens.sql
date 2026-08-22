-- Auth login fails with "Database error querying schema" when token columns
-- are NULL (from our hand-built auth.users inserts). Auth wants ''.

update auth.users
set
  confirmation_token = coalesce(confirmation_token, ''),
  recovery_token = coalesce(recovery_token, ''),
  email_change = coalesce(email_change, ''),
  email_change_token_new = coalesce(email_change_token_new, '')
where confirmation_token is null
   or recovery_token is null
   or email_change is null
   or email_change_token_new is null;

-- Who is Jacquee / Jacauee so you can sign in with the real @handle
select username, email, role, display_name
from public.profiles
where username ilike '%jacq%'
   or display_name ilike '%jacq%'
order by username;
