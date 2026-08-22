-- School-wide responsibility matrix. Superintendent edits. App reads.
-- Access: none | own | school | all

create table if not exists public.capability_grants (
  capability_id text not null,
  role public.school_role not null,
  access text not null check (access in ('none', 'own', 'school', 'all')),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  primary key (capability_id, role)
);

alter table public.capability_grants enable row level security;

create policy capability_grants_read on public.capability_grants
  for select using (auth.uid() is not null);

create policy capability_grants_write on public.capability_grants
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superintendent')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superintendent')
  );

create or replace function public.set_capability_grant(
  p_capability text,
  p_role public.school_role,
  p_access text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superintendent') then
    raise exception 'not allowed';
  end if;
  if p_access not in ('none', 'own', 'school', 'all') then
    raise exception 'bad access';
  end if;
  insert into public.capability_grants (capability_id, role, access, updated_at, updated_by)
  values (p_capability, p_role, p_access, now(), auth.uid())
  on conflict (capability_id, role) do update
    set access = excluded.access,
        updated_at = now(),
        updated_by = auth.uid();
end;
$$;

grant select on public.capability_grants to authenticated;
grant execute on function public.set_capability_grant(text, public.school_role, text) to authenticated;
