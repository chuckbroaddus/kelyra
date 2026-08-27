-- Q2 follow-up: clients must not UPDATE membership keys on message_thread_members.
-- Table-level UPDATE + thread_members_self_update (profile_id = auth.uid() only)
-- let a member PATCH thread_id onto any thread, then is_thread_member() unlocked
-- messages/thread SELECT. Membership writes stay on security-definer RPCs.
-- Do not rewrite 20260826000002 (already applied).

revoke update on public.message_thread_members from public, anon, authenticated;

-- last_read_at is client-updated (markRead). mute RPCs are security definer
-- but column grants keep a direct path for muted_at if needed.
-- Live message_thread_members has no pinned_at; do not grant it here.
grant update (last_read_at, muted_at)
  on public.message_thread_members to authenticated;

drop policy if exists thread_members_self_update on public.message_thread_members;
create policy thread_members_self_update on public.message_thread_members
  for update
  using (profile_id = auth.uid())
  with check (
    profile_id = auth.uid()
    and public.is_thread_member(thread_id)
  );
