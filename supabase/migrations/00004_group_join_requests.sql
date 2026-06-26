create table if not exists public.group_join_requests (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references public.groups(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  created_at timestamptz not null default now(),
  unique(group_id, profile_id)
);

alter table public.group_join_requests enable row level security;

-- RLS: Group admins can view requests for their group
create policy "Group admins can view join requests"
  on public.group_join_requests for select
  to authenticated
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = group_join_requests.group_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
      and group_members.role = 'ADMIN'
    )
  );

-- RLS: Users can view their own requests
create policy "Users can view their own join requests"
  on public.group_join_requests for select
  to authenticated
  using (profile_id = (select id from public.profiles where auth_user_id = auth.uid()));

-- RLS: Users can create join requests for themselves
create policy "Users can create join requests"
  on public.group_join_requests for insert
  to authenticated
  with check (profile_id = (select id from public.profiles where auth_user_id = auth.uid()));

-- RLS: Admins can update requests (approve/reject)
create policy "Group admins can update join requests"
  on public.group_join_requests for update
  to authenticated
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = group_join_requests.group_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
      and group_members.role = 'ADMIN'
    )
  );

-- RLS: Users can delete their own pending requests
create policy "Users can delete their own join requests"
  on public.group_join_requests for delete
  to authenticated
  using (profile_id = (select id from public.profiles where auth_user_id = auth.uid()));

-- RLS: Admins can delete any request for their group
create policy "Group admins can delete join requests"
  on public.group_join_requests for delete
  to authenticated
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = group_join_requests.group_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
      and group_members.role = 'ADMIN'
    )
  );

create index if not exists idx_group_join_requests_group_id on public.group_join_requests(group_id);
create index if not exists idx_group_join_requests_profile_id on public.group_join_requests(profile_id);
create index if not exists idx_group_join_requests_status on public.group_join_requests(status);
