alter table public.groups add column if not exists image_url text;

-- Allow group members (including admin) to update image_url
drop policy if exists "group_members_can_update_image" on public.groups;
create policy "group_members_can_update_image" on public.groups
  for update using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = groups.id
      and group_members.profile_id = auth.uid()
      and group_members.role = 'ADMIN'
    )
  );
