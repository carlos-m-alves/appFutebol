create table if not exists public.championships (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'ACTIVE', 'FINISHED')),
  team_count int not null check (team_count between 2 and 8),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists idx_championships_group_id on public.championships(group_id);

create table if not exists public.championship_teams (
  id uuid primary key default uuid_generate_v4(),
  championship_id uuid not null references public.championships(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_championship_teams_championship_id on public.championship_teams(championship_id);

create table if not exists public.championship_team_players (
  id uuid primary key default uuid_generate_v4(),
  championship_team_id uuid not null references public.championship_teams(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  guest_name text,
  position text check (position in ('GOLEIRO', 'ZAGUEIRO', 'LATERAL', 'MEIO_CAMPO', 'ATACANTE')),
  unique (championship_team_id, profile_id)
);

create index if not exists idx_championship_team_players_team_id on public.championship_team_players(championship_team_id);

create table if not exists public.championship_rounds (
  id uuid primary key default uuid_generate_v4(),
  championship_id uuid not null references public.championships(id) on delete cascade,
  round_number int not null,
  match_id uuid references public.matches(id) on delete cascade,
  home_team_id uuid not null references public.championship_teams(id),
  away_team_id uuid not null references public.championship_teams(id),
  unique (championship_id, round_number),
  unique (match_id)
);

create index if not exists idx_championship_rounds_championship_id on public.championship_rounds(championship_id);
create index if not exists idx_championship_rounds_match_id on public.championship_rounds(match_id);

alter table public.matches add column if not exists championship_id uuid references public.championships(id) on delete set null;
create index if not exists idx_matches_championship_id on public.matches(championship_id);
