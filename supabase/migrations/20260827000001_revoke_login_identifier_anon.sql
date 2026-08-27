-- Q10: login_identifier must not be an anon (or authenticated) username→email oracle.
-- Handle sign-in resolves email only inside Edge function sign-in-handle (service_role),
-- then Auth password grant; the client never receives the looked-up email.
--
-- Cos (project aohibokgilxhqwmupdfv):
--   1) Apply this migration.
--   2) Deploy supabase/functions/sign-in-handle (verify_jwt=false in config.toml).
-- Do not leave login_identifier executable by anon after this applies.

revoke all on function public.login_identifier(text) from public, anon, authenticated;
grant execute on function public.login_identifier(text) to service_role;
