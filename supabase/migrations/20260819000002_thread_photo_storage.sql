-- Members can read a custom group photo (not only the uploader).

create or replace function public.is_thread_photo(p_path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_path is not null
    and exists (
      select 1
      from public.message_threads t
      join public.message_thread_members m on m.thread_id = t.id
      where m.profile_id = auth.uid()
        and t.photo_path = p_path
    );
$$;

drop policy if exists photos_select_thread on storage.objects;
create policy photos_select_thread on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos'
    and public.is_thread_photo(name)
  );

grant execute on function public.is_thread_photo(text) to authenticated;
