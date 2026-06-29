-- ============================================
-- MIGRATION 00001: Create all tables, indexes,
-- foreign keys, constraints, RLS and policies
-- ============================================

-- 0. EXTENSIONS
create extension if not exists "uuid-ossp";

-- ============================================
-- 1. PROFILES
-- ============================================
create table if not exists public.profiles (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid unique not null references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- ============================================
-- 2. GROUPS
-- ============================================
create table if not exists public.groups (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  access_code text not null unique,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.groups enable row level security;

-- ============================================
-- 3. GROUP MEMBERS
-- ============================================
create table if not exists public.group_members (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references public.groups(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'MEMBER' check (role in ('ADMIN', 'MEMBER')),
  joined_at timestamptz not null default now(),
  unique(group_id, profile_id)
);

alter table public.group_members enable row level security;

-- ============================================
-- 4. RECURRING SCHEDULES
-- ============================================
create table if not exists public.recurring_schedules (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references public.groups(id) on delete cascade,
  frequency text not null check (frequency in ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM')),
  day_of_week int check (day_of_week between 0 and 6),
  day_of_month int check (day_of_month between 1 and 31),
  hour time not null,
  active boolean not null default true
);

alter table public.recurring_schedules enable row level security;

-- ============================================
-- 5. MATCHES
-- ============================================
create table if not exists public.matches (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references public.groups(id) on delete cascade,
  schedule_id uuid references public.recurring_schedules(id) on delete set null,
  match_date timestamptz not null,
  location text,
  status text not null default 'SCHEDULED' check (status in ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'FINISHED', 'CANCELLED')),
  evaluation_open boolean not null default false,
  evaluation_closed boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.matches enable row level security;

-- ============================================
-- 6. MATCH CONFIRMATIONS
-- ============================================
create table if not exists public.match_confirmations (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references public.matches(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'PENDING' check (status in ('PENDING', 'CONFIRMED', 'DECLINED')),
  confirmed_at timestamptz default now(),
  unique(match_id, profile_id)
);

alter table public.match_confirmations enable row level security;

-- ============================================
-- 7. TEAMS
-- ============================================
create table if not exists public.teams (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references public.matches(id) on delete cascade,
  name text not null
);

alter table public.teams enable row level security;

-- ============================================
-- 8. MATCH PLAYERS (goals & assists stored here)
-- ============================================
create table if not exists public.match_players (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references public.matches(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  goals int not null default 0 check (goals >= 0),
  assists int not null default 0 check (assists >= 0),
  won_match boolean default false,
  created_at timestamptz not null default now(),
  unique(match_id, profile_id)
);

alter table public.match_players enable row level security;

-- ============================================
-- 9. MATCH RESULTS
-- ============================================
create table if not exists public.match_results (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  score int not null default 0 check (score >= 0),
  unique(match_id, team_id)
);

alter table public.match_results enable row level security;

-- ============================================
-- 10. PLAYER RATINGS
-- ============================================
create table if not exists public.player_ratings (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references public.matches(id) on delete cascade,
  rater_profile_id uuid not null references public.profiles(id) on delete cascade,
  rated_profile_id uuid not null references public.profiles(id) on delete cascade,
  rating numeric(2,1) not null check (rating >= 1.0 and rating <= 5.0 and rating % 0.5 = 0.0),
  comment text,
  created_at timestamptz not null default now(),
  unique(match_id, rater_profile_id, rated_profile_id),
  check (rater_profile_id != rated_profile_id)
);

alter table public.player_ratings enable row level security;

-- ============================================
-- 11. MATCH AWARDS
-- ============================================
create table if not exists public.match_awards (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references public.matches(id) on delete cascade unique,
  best_player_profile_id uuid references public.profiles(id) on delete set null,
  top_scorer_profile_id uuid references public.profiles(id) on delete set null,
  top_assist_profile_id uuid references public.profiles(id) on delete set null,
  worst_player_profile_id uuid references public.profiles(id) on delete set null,
  best_player_rating numeric(2,1),
  created_at timestamptz not null default now()
);

alter table public.match_awards enable row level security;

-- ============================================
-- INDEXES
-- ============================================
create index if not exists idx_profiles_auth_user_id on public.profiles(auth_user_id);
create index if not exists idx_group_members_group_id on public.group_members(group_id);
create index if not exists idx_group_members_profile_id on public.group_members(profile_id);
create index if not exists idx_matches_group_id on public.matches(group_id);
create index if not exists idx_matches_match_date on public.matches(match_date);
create index if not exists idx_match_confirmations_match_id on public.match_confirmations(match_id);
create index if not exists idx_match_confirmations_profile_id on public.match_confirmations(profile_id);
create index if not exists idx_match_players_match_id on public.match_players(match_id);
create index if not exists idx_match_players_profile_id on public.match_players(profile_id);
create index if not exists idx_player_ratings_match_id on public.player_ratings(match_id);
create index if not exists idx_player_ratings_rated_profile_id on public.player_ratings(rated_profile_id);
create index if not exists idx_player_ratings_rater_profile_id on public.player_ratings(rater_profile_id);
create index if not exists idx_match_results_match_id on public.match_results(match_id);
create index if not exists idx_recurring_schedules_group_id on public.recurring_schedules(group_id);
create index if not exists idx_groups_access_code on public.groups(access_code);
create index if not exists idx_match_awards_match_id on public.match_awards(match_id);
create index if not exists idx_matches_status on public.matches(status);

-- ============================================
-- RLS POLICIES
-- ============================================

-- PROFILES
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = auth_user_id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);

-- GROUPS
create policy "Group members can view their groups"
  on public.groups for select
  to authenticated
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = groups.id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
    )
    or created_by = (select id from public.profiles where auth_user_id = auth.uid())
  );

create policy "Authenticated users can create groups"
  on public.groups for insert
  to authenticated
  with check (created_by = (select id from public.profiles where auth_user_id = auth.uid()));

create policy "Group admins can update groups"
  on public.groups for update
  to authenticated
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = groups.id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
      and group_members.role = 'ADMIN'
    )
  );

-- GROUP MEMBERS
create policy "Members can view group members"
  on public.group_members for select
  to authenticated
  using (
    exists (
      select 1 from public.group_members as gm
      where gm.group_id = group_members.group_id
      and gm.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
    )
  );

create policy "Users can join groups"
  on public.group_members for insert
  to authenticated
  with check (profile_id = (select id from public.profiles where auth_user_id = auth.uid()));

create policy "Admins can manage members"
  on public.group_members for update
  to authenticated
  using (
    exists (
      select 1 from public.group_members as gm
      where gm.group_id = group_members.group_id
      and gm.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
      and gm.role = 'ADMIN'
    )
  );

create policy "Members can remove themselves"
  on public.group_members for delete
  to authenticated
  using (profile_id = (select id from public.profiles where auth_user_id = auth.uid()));

create policy "Admins can remove members"
  on public.group_members for delete
  to authenticated
  using (
    exists (
      select 1 from public.group_members as gm
      where gm.group_id = group_members.group_id
      and gm.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
      and gm.role = 'ADMIN'
    )
  );

-- RECURRING SCHEDULES
create policy "Members can view schedules"
  on public.recurring_schedules for select
  to authenticated
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = recurring_schedules.group_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
    )
  );

create policy "Admins can manage schedules"
  on public.recurring_schedules for insert
  to authenticated
  with check (
    exists (
      select 1 from public.group_members
      where group_members.group_id = recurring_schedules.group_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
      and group_members.role = 'ADMIN'
    )
  );

create policy "Admins can update schedules"
  on public.recurring_schedules for update
  to authenticated
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = recurring_schedules.group_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
      and group_members.role = 'ADMIN'
    )
  );

create policy "Admins can delete schedules"
  on public.recurring_schedules for delete
  to authenticated
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = recurring_schedules.group_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
      and group_members.role = 'ADMIN'
    )
  );

-- MATCHES
create policy "Members can view matches"
  on public.matches for select
  to authenticated
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = matches.group_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
    )
  );

create policy "Admins can create matches"
  on public.matches for insert
  to authenticated
  with check (
    exists (
      select 1 from public.group_members
      where group_members.group_id = matches.group_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
      and group_members.role = 'ADMIN'
    )
  );

create policy "Admins can update matches"
  on public.matches for update
  to authenticated
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = matches.group_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
      and group_members.role = 'ADMIN'
    )
  );

create policy "Admins can delete matches"
  on public.matches for delete
  to authenticated
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = matches.group_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
      and group_members.role = 'ADMIN'
    )
  );

-- MATCH CONFIRMATIONS
create policy "Members can view confirmations"
  on public.match_confirmations for select
  to authenticated
  using (
    exists (
      select 1 from public.matches
      join public.group_members on group_members.group_id = matches.group_id
      where matches.id = match_confirmations.match_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
    )
  );

create policy "Members can confirm attendance"
  on public.match_confirmations for insert
  to authenticated
  with check (profile_id = (select id from public.profiles where auth_user_id = auth.uid()));

create policy "Members can update own confirmation"
  on public.match_confirmations for update
  to authenticated
  using (profile_id = (select id from public.profiles where auth_user_id = auth.uid()));

-- TEAMS
create policy "Members can view teams"
  on public.teams for select
  to authenticated
  using (
    exists (
      select 1 from public.matches
      join public.group_members on group_members.group_id = matches.group_id
      where matches.id = teams.match_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
    )
  );

create policy "Admins can manage teams"
  on public.teams for insert
  to authenticated
  with check (
    exists (
      select 1 from public.matches
      join public.group_members on group_members.group_id = matches.group_id
      where matches.id = teams.match_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
      and group_members.role = 'ADMIN'
    )
  );

create policy "Admins can update teams"
  on public.teams for update
  to authenticated
  using (
    exists (
      select 1 from public.matches
      join public.group_members on group_members.group_id = matches.group_id
      where matches.id = teams.match_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
      and group_members.role = 'ADMIN'
    )
  );

create policy "Admins can delete teams"
  on public.teams for delete
  to authenticated
  using (
    exists (
      select 1 from public.matches
      join public.group_members on group_members.group_id = matches.group_id
      where matches.id = teams.match_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
      and group_members.role = 'ADMIN'
    )
  );

-- MATCH PLAYERS
create policy "Members can view match players"
  on public.match_players for select
  to authenticated
  using (
    exists (
      select 1 from public.matches
      join public.group_members on group_members.group_id = matches.group_id
      where matches.id = match_players.match_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
    )
  );

create policy "Admins can manage match players"
  on public.match_players for insert
  to authenticated
  with check (
    exists (
      select 1 from public.matches
      join public.group_members on group_members.group_id = matches.group_id
      where matches.id = match_players.match_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
      and group_members.role = 'ADMIN'
    )
  );

create policy "Players can add themselves"
  on public.match_players for insert
  to authenticated
  with check (
    profile_id = (select id from public.profiles where auth_user_id = auth.uid())
    and exists (
      select 1 from public.matches
      join public.group_members on group_members.group_id = matches.group_id
      where matches.id = match_players.match_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
    )
  );

create policy "Admins can update match players"
  on public.match_players for update
  to authenticated
  using (
    exists (
      select 1 from public.matches
      join public.group_members on group_members.group_id = matches.group_id
      where matches.id = match_players.match_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
      and group_members.role = 'ADMIN'
    )
  );

-- MATCH RESULTS
create policy "Members can view match results"
  on public.match_results for select
  to authenticated
  using (
    exists (
      select 1 from public.matches
      join public.group_members on group_members.group_id = matches.group_id
      where matches.id = match_results.match_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
    )
  );

create policy "Admins can manage match results"
  on public.match_results for insert
  to authenticated
  with check (
    exists (
      select 1 from public.matches
      join public.group_members on group_members.group_id = matches.group_id
      where matches.id = match_results.match_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
      and group_members.role = 'ADMIN'
    )
  );

create policy "Admins can update match results"
  on public.match_results for update
  to authenticated
  using (
    exists (
      select 1 from public.matches
      join public.group_members on group_members.group_id = matches.group_id
      where matches.id = match_results.match_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
      and group_members.role = 'ADMIN'
    )
  );

-- PLAYER RATINGS
create policy "Members can view ratings (anonymous)"
  on public.player_ratings for select
  to authenticated
  using (
    exists (
      select 1 from public.matches
      join public.group_members on group_members.group_id = matches.group_id
      where matches.id = player_ratings.match_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
    )
  );

create policy "Players who participated can rate"
  on public.player_ratings for insert
  to authenticated
  with check (
    rater_profile_id = (select id from public.profiles where auth_user_id = auth.uid())
    and rater_profile_id != rated_profile_id
    and (
      exists (
        select 1 from public.match_players
        where match_players.match_id = player_ratings.match_id
        and match_players.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
      )
      or exists (
        select 1 from public.match_confirmations
        where match_confirmations.match_id = player_ratings.match_id
        and match_confirmations.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
        and match_confirmations.status = 'CONFIRMED'
      )
    )
  );

-- MATCH AWARDS
create policy "Members can view match awards"
  on public.match_awards for select
  to authenticated
  using (
    exists (
      select 1 from public.matches
      join public.group_members on group_members.group_id = matches.group_id
      where matches.id = match_awards.match_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
    )
  );

create policy "Admins can manage match awards"
  on public.match_awards for insert
  to authenticated
  with check (
    exists (
      select 1 from public.matches
      join public.group_members on group_members.group_id = matches.group_id
      where matches.id = match_awards.match_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
      and group_members.role = 'ADMIN'
    )
  );

create policy "Admins can update match awards"
  on public.match_awards for update
  to authenticated
  using (
    exists (
      select 1 from public.matches
      join public.group_members on group_members.group_id = matches.group_id
      where matches.id = match_awards.match_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
      and group_members.role = 'ADMIN'
    )
  );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to auto-create profile after signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (auth_user_id, name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Function to generate unique access code
create or replace function public.generate_access_code()
returns text
language plpgsql
as $$
declare
  code text;
  exists_flag boolean;
begin
  loop
    code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    select exists(select 1 from public.groups where access_code = code) into exists_flag;
    if not exists_flag then
      return code;
    end if;
  end loop;
end;
$$;

-- Function to calculate match awards
create or replace function public.calculate_match_awards(p_match_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_best_player uuid;
  v_best_rating numeric(2,1);
  v_top_scorer uuid;
  v_top_assist uuid;
  v_worst_player uuid;
begin
  -- Best player (highest average rating, minimum 2 ratings)
  select rated_profile_id, round(avg(rating)::numeric, 1)::numeric(2,1)
  into v_best_player, v_best_rating
  from public.player_ratings
  where match_id = p_match_id
  group by rated_profile_id
  having count(*) >= 2
  order by avg(rating) desc
  limit 1;

  -- Top scorer (exclude no_show)
  select profile_id
  into v_top_scorer
  from public.match_players
  where match_id = p_match_id
  and no_show = false
  order by goals desc
  limit 1;

  -- Top assist (exclude no_show)
  select profile_id
  into v_top_assist
  from public.match_players
  where match_id = p_match_id
  and no_show = false
  order by assists desc
  limit 1;

  -- Worst player -- first try by lowest average rating (min 2 ratings)
  select rated_profile_id
  into v_worst_player
  from public.player_ratings
  where match_id = p_match_id
  and rated_profile_id not in (
    select profile_id from public.match_players
    where match_id = p_match_id and no_show = true
  )
  group by rated_profile_id
  having count(*) >= 2
  order by avg(rating) asc
  limit 1;

  -- If no worst player found by ratings, pick first no_show player
  if v_worst_player is null then
    select profile_id into v_worst_player
    from public.match_players
    where match_id = p_match_id
    and no_show = true
    limit 1;
  end if;

  -- Upsert awards
  insert into public.match_awards (match_id, best_player_profile_id, top_scorer_profile_id, top_assist_profile_id, worst_player_profile_id, best_player_rating)
  values (p_match_id, v_best_player, v_top_scorer, v_top_assist, v_worst_player, v_best_rating)
  on conflict (match_id)
  do update set
    best_player_profile_id = excluded.best_player_profile_id,
    top_scorer_profile_id = excluded.top_scorer_profile_id,
    top_assist_profile_id = excluded.top_assist_profile_id,
    worst_player_profile_id = excluded.worst_player_profile_id,
    best_player_rating = excluded.best_player_rating;

end;
$$;
