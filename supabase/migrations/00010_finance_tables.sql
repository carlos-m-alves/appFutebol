-- ============================================
-- MIGRATION 00010: Finance tables for group
-- financial management
-- ============================================

-- 1. GROUP FINANCE CONFIG
create table if not exists public.group_finance_config (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null unique references public.groups(id) on delete cascade,
  default_monthly_fee decimal(10,2) not null default 0,
  default_match_fee decimal(10,2) not null default 0,
  pix_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.group_finance_config enable row level security;

create policy "Group members can view finance config"
  on public.group_finance_config for select
  to authenticated
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = group_finance_config.group_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
    )
  );

create policy "Group admins can insert finance config"
  on public.group_finance_config for insert
  to authenticated
  with check (
    exists (
      select 1 from public.group_members
      where group_members.group_id = group_finance_config.group_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
      and group_members.role = 'ADMIN'
    )
  );

create policy "Group admins can update finance config"
  on public.group_finance_config for update
  to authenticated
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = group_finance_config.group_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
      and group_members.role = 'ADMIN'
    )
  );

-- 2. PLAYER FEE SETTINGS
create table if not exists public.player_fee_settings (
  id uuid primary key default uuid_generate_v4(),
  group_member_id uuid not null references public.group_members(id) on delete cascade,
  is_monthly_player boolean not null default false,
  monthly_fee decimal(10,2),
  match_fee decimal(10,2),
  updated_at timestamptz not null default now(),
  unique(group_member_id)
);

alter table public.player_fee_settings enable row level security;

create policy "Group members can view player fee settings"
  on public.player_fee_settings for select
  to authenticated
  using (
    exists (
      select 1 from public.group_members gm
      where gm.id = player_fee_settings.group_member_id
      and gm.group_id in (
        select group_id from public.group_members
        where profile_id = (select id from public.profiles where auth_user_id = auth.uid())
      )
    )
  );

create policy "Group admins can manage player fee settings"
  on public.player_fee_settings for insert
  to authenticated
  with check (
    exists (
      select 1 from public.group_members gm
      where gm.id = player_fee_settings.group_member_id
      and gm.group_id in (
        select gm2.group_id from public.group_members gm2
        where gm2.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
        and gm2.role = 'ADMIN'
      )
    )
  );

create policy "Group admins can update player fee settings"
  on public.player_fee_settings for update
  to authenticated
  using (
    exists (
      select 1 from public.group_members gm
      where gm.id = player_fee_settings.group_member_id
      and gm.group_id in (
        select gm2.group_id from public.group_members gm2
        where gm2.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
        and gm2.role = 'ADMIN'
      )
    )
  );

-- 3. PAYMENTS
create table if not exists public.payments (
  id uuid primary key default uuid_generate_v4(),
  group_member_id uuid not null references public.group_members(id) on delete cascade,
  match_id uuid references public.matches(id) on delete set null,
  payment_type text not null check (payment_type in ('MONTHLY', 'MATCH')),
  amount decimal(10,2) not null,
  reference_month text,
  paid_at timestamptz not null default now(),
  paid_by uuid not null references public.profiles(id),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;

create policy "Group members can view payments"
  on public.payments for select
  to authenticated
  using (
    exists (
      select 1 from public.group_members gm
      where gm.id = payments.group_member_id
      and gm.group_id in (
        select group_id from public.group_members
        where profile_id = (select id from public.profiles where auth_user_id = auth.uid())
      )
    )
  );

create policy "Group admins can insert payments"
  on public.payments for insert
  to authenticated
  with check (
    exists (
      select 1 from public.group_members gm
      where gm.id = payments.group_member_id
      and gm.group_id in (
        select gm2.group_id from public.group_members gm2
        where gm2.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
        and gm2.role = 'ADMIN'
      )
    )
  );

create policy "Group admins can delete payments"
  on public.payments for delete
  to authenticated
  using (
    exists (
      select 1 from public.group_members gm
      where gm.id = payments.group_member_id
      and gm.group_id in (
        select gm2.group_id from public.group_members gm2
        where gm2.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
        and gm2.role = 'ADMIN'
      )
    )
  );

-- 4. GROUP EXPENSES
create table if not exists public.group_expenses (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references public.groups(id) on delete cascade,
  description text not null,
  amount decimal(10,2) not null,
  category text not null default 'OTHER' check (category in ('FIELD', 'REFEREE', 'EQUIPMENT', 'SNACKS', 'OTHER')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.group_expenses enable row level security;

create policy "Group members can view expenses"
  on public.group_expenses for select
  to authenticated
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = group_expenses.group_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
    )
  );

create policy "Group admins can insert expenses"
  on public.group_expenses for insert
  to authenticated
  with check (
    exists (
      select 1 from public.group_members
      where group_members.group_id = group_expenses.group_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
      and group_members.role = 'ADMIN'
    )
  );

create policy "Group admins can delete expenses"
  on public.group_expenses for delete
  to authenticated
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = group_expenses.group_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
      and group_members.role = 'ADMIN'
    )
  );

-- Indexes
create index if not exists idx_payments_group_member_id on public.payments(group_member_id);
create index if not exists idx_payments_match_id on public.payments(match_id);
create index if not exists idx_payments_payment_type on public.payments(payment_type);
create index if not exists idx_payments_paid_at on public.payments(paid_at);
create index if not exists idx_group_expenses_group_id on public.group_expenses(group_id);
create index if not exists idx_group_expenses_category on public.group_expenses(category);
create index if not exists idx_player_fee_settings_group_member_id on public.player_fee_settings(group_member_id);
