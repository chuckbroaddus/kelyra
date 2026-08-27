-- Q2: clients must not INSERT into message_thread_members.
-- Membership is written only by security-definer RPCs
-- (open_direct_thread, open_group_thread, add_group_member, and related leave/remove).
-- The old thread_members_insert policy (auth.uid() is not null) let any signed-in
-- user join any thread, then read it via is_thread_member().

drop policy if exists thread_members_insert on public.message_thread_members;

revoke insert on public.message_thread_members from public, anon, authenticated;

-- Keep select + self update for last_read_at / mute / pin UX.
grant select, update on public.message_thread_members to authenticated;
