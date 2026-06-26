-- RLS: Group admins can add members to their group (used when approving join requests)
create policy "Group admins can add members"
  on public.group_members for insert
  to authenticated
  with check (
    exists (
      select 1 from public.group_members as gm
      where gm.group_id = group_members.group_id
      and gm.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
      and gm.role = 'ADMIN'
    )
  );
