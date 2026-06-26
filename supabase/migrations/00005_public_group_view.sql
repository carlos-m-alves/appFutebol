create policy "Authenticated users can view groups"
  on public.groups for select
  to authenticated
  using (true);
