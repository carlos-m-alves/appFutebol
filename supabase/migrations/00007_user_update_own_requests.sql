-- RLS: Users can update their own join requests (used for upsert when re-requesting after leaving)
create policy "Users can update their own join requests"
  on public.group_join_requests for update
  to authenticated
  using (profile_id = (select id from public.profiles where auth_user_id = auth.uid()))
  with check (profile_id = (select id from public.profiles where auth_user_id = auth.uid()));
