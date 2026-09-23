-- FL / advisor: rls_disabled_in_public on public.ditl_seed_state
-- DITL seed scratch (k/v). Service-role only — no anon/authenticated policies.

alter table public.ditl_seed_state enable row level security;

revoke all on table public.ditl_seed_state from anon, authenticated;
