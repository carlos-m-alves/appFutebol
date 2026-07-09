-- ============================================
-- MIGRATION 20260708: Betting system tables
-- ============================================

-- 1. MATCH MARKETS (available bets for each match)
create table if not exists public.match_markets (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references public.matches(id) on delete cascade,
  market_type text not null check (market_type in (
    'WINNER', 'TOP_SCORER', 'TOP_ASSISTER', 'BEST_PLAYER',
    'PLAYER_SCORES', 'PLAYER_ASSIST', 'PLAYER_NUTMEG', 'PLAYER_NO_SHOW'
  )),
  player_id uuid references public.profiles(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  odds numeric(6,2) not null check (odds >= 1.01),
  label text not null,
  status text not null default 'OPEN' check (status in ('OPEN', 'CLOSED', 'SETTLED')),
  result boolean,
  created_at timestamptz not null default now()
);

alter table public.match_markets enable row level security;

-- 2. BETS
create table if not exists public.bets (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  total_odds numeric(10,2) not null check (total_odds >= 1.01),
  potential_payout numeric(10,2) not null,
  bet_type text not null default 'SINGLE' check (bet_type in ('SINGLE', 'MULTIPLE')),
  status text not null default 'PENDING' check (status in ('PENDING', 'WON', 'LOST', 'CANCELLED')),
  settled_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.bets enable row level security;

-- 3. BET SELECTIONS (one per market in a bet)
create table if not exists public.bet_selections (
  id uuid primary key default uuid_generate_v4(),
  bet_id uuid not null references public.bets(id) on delete cascade,
  market_id uuid not null references public.match_markets(id) on delete cascade,
  unique(bet_id, market_id)
);

alter table public.bet_selections enable row level security;

-- 4. Add betting_balance to profiles
alter table public.profiles
add column if not exists betting_balance numeric(10,2) not null default 5000;

-- Indexes
create index if not exists idx_match_markets_match_id on public.match_markets(match_id);
create index if not exists idx_match_markets_status on public.match_markets(status);
create index if not exists idx_bets_profile_id on public.bets(profile_id);
create index if not exists idx_bets_match_id on public.bets(match_id);
create index if not exists idx_bets_status on public.bets(status);
create index if not exists idx_bet_selections_bet_id on public.bet_selections(bet_id);
create index if not exists idx_bet_selections_market_id on public.bet_selections(market_id);

-- RLS Policies: match_markets
create policy "Group members can view match markets"
  on public.match_markets for select
  to authenticated
  using (
    exists (
      select 1 from public.matches
      join public.group_members on group_members.group_id = matches.group_id
      where matches.id = match_markets.match_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
    )
  );

create policy "Admins can insert match markets"
  on public.match_markets for insert
  to authenticated
  with check (
    exists (
      select 1 from public.matches
      join public.group_members on group_members.group_id = matches.group_id
      where matches.id = match_markets.match_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
      and group_members.role = 'ADMIN'
    )
  );

create policy "Admins can update match markets"
  on public.match_markets for update
  to authenticated
  using (
    exists (
      select 1 from public.matches
      join public.group_members on group_members.group_id = matches.group_id
      where matches.id = match_markets.match_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
      and group_members.role = 'ADMIN'
    )
  );

create policy "System can update match markets (settle)"
  on public.match_markets for update
  to authenticated
  using (
    exists (
      select 1 from public.matches
      where matches.id = match_markets.match_id
    )
  );

-- RLS Policies: bets
create policy "Users can view own bets"
  on public.bets for select
  to authenticated
  using (profile_id = (select id from public.profiles where auth_user_id = auth.uid()));

create policy "Group members can view match bets"
  on public.bets for select
  to authenticated
  using (
    exists (
      select 1 from public.matches
      join public.group_members on group_members.group_id = matches.group_id
      where matches.id = bets.match_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
    )
  );

create policy "Users can insert own bets"
  on public.bets for insert
  to authenticated
  with check (profile_id = (select id from public.profiles where auth_user_id = auth.uid()));

create policy "System can update bets (settle)"
  on public.bets for update
  to authenticated
  using (
    profile_id = (select id from public.profiles where auth_user_id = auth.uid())
    or exists (
      select 1 from public.matches
      join public.group_members on group_members.group_id = matches.group_id
      where matches.id = bets.match_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
      and group_members.role = 'ADMIN'
    )
  );

-- RLS Policies: bet_selections
create policy "Users can view own bet selections"
  on public.bet_selections for select
  to authenticated
  using (
    exists (
      select 1 from public.bets
      where bets.id = bet_selections.bet_id
      and bets.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
    )
  );

create policy "Users can insert own bet selections"
  on public.bet_selections for insert
  to authenticated
  with check (
    exists (
      select 1 from public.bets
      where bets.id = bet_selections.bet_id
      and bets.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
    )
  );

-- ============================================
-- FUNCTION: Generate markets for a match
-- Called when match status changes to IN_PROGRESS
-- ============================================
create or replace function public.generate_match_markets(p_match_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_group_id uuid;
  v_team record;
  v_player record;
  v_player_goals numeric;
  v_player_matches numeric;
  v_total_goals numeric;
  v_total_matches numeric;
  v_prob numeric;
  v_odds numeric;
  v_vig constant numeric := 0.95;
begin
  -- Check if markets already exist for this match
  if exists (select 1 from public.match_markets where match_id = p_match_id) then
    return;
  end if;

  -- Get match group
  select group_id into v_group_id from public.matches where id = p_match_id;
  if v_group_id is null then return; end if;

  -- WINNER: one market per team
  for v_team in
    select * from public.teams where match_id = p_match_id
  loop
    insert into public.match_markets (match_id, market_type, team_id, odds, label, status)
    values (p_match_id, 'WINNER', v_team.id, 2.00, v_team.name || ' vence', 'OPEN');
  end loop;

  -- PLAYER markets for each player in the match
  for v_player in
    select mp.profile_id, p.name
    from public.match_players mp
    join public.profiles p on p.id = mp.profile_id
    where mp.match_id = p_match_id and mp.no_show = false and mp.profile_id is not null
  loop
    -- Calculate player historical stats in this group
    select
      coalesce(sum(mp2.goals), 0),
      count(distinct mp2.match_id)
    into v_player_goals, v_player_matches
    from public.match_players mp2
    join public.matches m on m.id = mp2.match_id
    where mp2.profile_id = v_player.profile_id
      and m.group_id = v_group_id
      and m.status = 'FINISHED';

    -- Also get group-wide totals for relative markets
    select
      coalesce(sum(mp3.goals), 0),
      count(distinct mp3.match_id)
    into v_total_goals, v_total_matches
    from public.match_players mp3
    join public.matches m2 on m2.id = mp3.match_id
    where m2.group_id = v_group_id and m2.status = 'FINISHED';

    -- PLAYER_SCORES: will this player score?
    v_prob := case when v_player_matches > 0 then least(v_player_goals / v_player_matches, 0.95) else 0.15 end;
    v_odds := greatest(1.01, round((1.0 / (v_prob * v_vig))::numeric, 2));
    if v_odds > 100 then v_odds := 100; end if;
    insert into public.match_markets (match_id, market_type, player_id, odds, label, status)
    values (p_match_id, 'PLAYER_SCORES', v_player.profile_id, v_odds, v_player.name || ' faz gol', 'OPEN');

    -- PLAYER_ASSIST: will this player assist?
    declare
      v_player_assists numeric;
    begin
      select coalesce(sum(mp4.assists), 0)
      into v_player_assists
      from public.match_players mp4
      join public.matches m3 on m3.id = mp4.match_id
      where mp4.profile_id = v_player.profile_id
        and m3.group_id = v_group_id
        and m3.status = 'FINISHED';

      v_prob := case when v_player_matches > 0 then least(v_player_assists / v_player_matches, 0.95) else 0.10 end;
      v_odds := greatest(1.01, round((1.0 / (v_prob * v_vig))::numeric, 2));
      if v_odds > 100 then v_odds := 100; end if;
      insert into public.match_markets (match_id, market_type, player_id, odds, label, status)
      values (p_match_id, 'PLAYER_ASSIST', v_player.profile_id, v_odds, v_player.name || ' dá assistência', 'OPEN');
    end;

    -- PLAYER_NUTMEG: will this player get a nutmeg?
    declare
      v_player_nutmegs numeric;
    begin
      select coalesce(sum(mp5.nutmeg_done), 0)
      into v_player_nutmegs
      from public.match_players mp5
      join public.matches m4 on m4.id = mp5.match_id
      where mp5.profile_id = v_player.profile_id
        and m4.group_id = v_group_id
        and m4.status = 'FINISHED';

      v_prob := case when v_player_matches > 0 then least(v_player_nutmegs / v_player_matches, 0.95) else 0.10 end;
      v_odds := greatest(1.01, round((1.0 / (v_prob * v_vig))::numeric, 2));
      if v_odds > 100 then v_odds := 100; end if;
      insert into public.match_markets (match_id, market_type, player_id, odds, label, status)
      values (p_match_id, 'PLAYER_NUTMEG', v_player.profile_id, v_odds, v_player.name || ' aplica caneta', 'OPEN');
    end;

    -- PLAYER_NO_SHOW: will this player be a no-show?
    declare
      v_player_noshow numeric;
    begin
      select count(*)::numeric into v_player_noshow
      from public.match_players mp6
      join public.matches m5 on m5.id = mp6.match_id
      where mp6.profile_id = v_player.profile_id
        and m5.group_id = v_group_id
        and m5.status = 'FINISHED'
        and mp6.no_show = true;

      v_prob := case when v_player_matches > 0 then least(v_player_noshow / v_player_matches, 0.95) else 0.05 end;
      v_odds := greatest(1.01, round((1.0 / (v_prob * v_vig))::numeric, 2));
      if v_odds > 100 then v_odds := 100; end if;
      insert into public.match_markets (match_id, market_type, player_id, odds, label, status)
      values (p_match_id, 'PLAYER_NO_SHOW', v_player.profile_id, v_odds, v_player.name || ' é furão', 'OPEN');
    end;
  end loop;

  -- TOP_SCORER: one market per player (multi-option)
  for v_player in
    select mp.profile_id, p.name
    from public.match_players mp
    join public.profiles p on p.id = mp.profile_id
    where mp.match_id = p_match_id and mp.no_show = false and mp.profile_id is not null
  loop
    declare
      v_player_avg_goals numeric;
      v_total_avg_goals numeric;
    begin
      select coalesce(avg(mp7.goals), 0)
      into v_player_avg_goals
      from public.match_players mp7
      join public.matches m6 on m6.id = mp7.match_id
      where mp7.profile_id = v_player.profile_id
        and m6.group_id = v_group_id
        and m6.status = 'FINISHED';

      select coalesce(avg(mp8.goals), 0)
      into v_total_avg_goals
      from public.match_players mp8
      join public.matches m7 on m7.id = mp8.match_id
      where m7.group_id = v_group_id and m7.status = 'FINISHED';

      if v_total_avg_goals > 0 then
        v_prob := greatest(v_player_avg_goals / nullif(v_total_avg_goals, 0), 0.01);
      else
        v_prob := 1.0 / (select count(*) from public.match_players where match_id = p_match_id and no_show = false and profile_id is not null)::numeric;
      end if;

      v_odds := greatest(1.01, round((1.0 / (v_prob * v_vig))::numeric, 2));
      if v_odds > 100 then v_odds := 100; end if;
      insert into public.match_markets (match_id, market_type, player_id, odds, label, status)
      values (p_match_id, 'TOP_SCORER', v_player.profile_id, v_odds, v_player.name || ' artilheiro', 'OPEN');
    end;
  end loop;

  -- TOP_ASSISTER: one market per player (multi-option)
  for v_player in
    select mp.profile_id, p.name
    from public.match_players mp
    join public.profiles p on p.id = mp.profile_id
    where mp.match_id = p_match_id and mp.no_show = false and mp.profile_id is not null
  loop
    declare
      v_player_avg_assists numeric;
      v_total_avg_assists numeric;
    begin
      select coalesce(avg(mp9.assists), 0)
      into v_player_avg_assists
      from public.match_players mp9
      join public.matches m8 on m8.id = mp9.match_id
      where mp9.profile_id = v_player.profile_id
        and m8.group_id = v_group_id
        and m8.status = 'FINISHED';

      select coalesce(avg(mp10.assists), 0)
      into v_total_avg_assists
      from public.match_players mp10
      join public.matches m9 on m9.id = mp10.match_id
      where m9.group_id = v_group_id and m9.status = 'FINISHED';

      if v_total_avg_assists > 0 then
        v_prob := greatest(v_player_avg_assists / nullif(v_total_avg_assists, 0), 0.01);
      else
        v_prob := 1.0 / (select count(*) from public.match_players where match_id = p_match_id and no_show = false and profile_id is not null)::numeric;
      end if;

      v_odds := greatest(1.01, round((1.0 / (v_prob * v_vig))::numeric, 2));
      if v_odds > 100 then v_odds := 100; end if;
      insert into public.match_markets (match_id, market_type, player_id, odds, label, status)
      values (p_match_id, 'TOP_ASSISTER', v_player.profile_id, v_odds, v_player.name || ' mais assistências', 'OPEN');
    end;
  end loop;

  -- BEST_PLAYER: one market per player (multi-option)
  for v_player in
    select mp.profile_id, p.name
    from public.match_players mp
    join public.profiles p on p.id = mp.profile_id
    where mp.match_id = p_match_id and mp.no_show = false and mp.profile_id is not null
  loop
    -- Equal odds for all players (too complex to predict MVP)
    insert into public.match_markets (match_id, market_type, player_id, odds, label, status)
    values (
      p_match_id, 'BEST_PLAYER', v_player.profile_id,
      1.0 / ((1.0 / (select count(*) from public.match_players where match_id = p_match_id and no_show = false and profile_id is not null)::numeric) * v_vig),
      v_player.name || ' melhor jogador',
      'OPEN'
    );
  end loop;
end;
$$;

-- ============================================
-- FUNCTION: Settle all markets for a match
-- Called when match evaluation is closed
-- ============================================
create or replace function public.settle_match_markets(p_match_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_market record;
  v_winner_team_id uuid;
  v_top_scorer_id uuid;
  v_top_assister_id uuid;
  v_best_player_id uuid;
  v_bet record;
  v_bet_selection record;
  v_all_won boolean;
  v_market_count int;
  v_won_count int;
begin
  -- Get match awards
  select best_player_profile_id, top_scorer_profile_id, top_assist_profile_id
  into v_best_player_id, v_top_scorer_id, v_top_assister_id
  from public.match_awards
  where match_id = p_match_id;

  -- Get winner team (highest score, tie = no winner)
  select team_id into v_winner_team_id
  from public.match_results
  where match_id = p_match_id
  order by score desc
  limit 1;

  -- Only settle if there's a clear winner (not a tie)
  if (select count(*) from public.match_results where match_id = p_match_id and score = (select max(score) from public.match_results where match_id = p_match_id)) > 1 then
    v_winner_team_id := null;
  end if;

  -- Settle each market
  for v_market in
    select * from public.match_markets
    where match_id = p_match_id and status = 'OPEN'
  loop
    case v_market.market_type
      when 'WINNER' then
        if v_winner_team_id is not null then
          update public.match_markets
          set result = (v_market.team_id = v_winner_team_id),
              status = 'SETTLED'
          where id = v_market.id;
        else
          -- Draw / no clear winner - cancel these markets
          update public.match_markets
          set status = 'SETTLED', result = false
          where id = v_market.id;
        end if;

      when 'TOP_SCORER' then
        if v_top_scorer_id is not null then
          update public.match_markets
          set result = (v_market.player_id = v_top_scorer_id),
              status = 'SETTLED'
          where id = v_market.id;
        else
          update public.match_markets
          set status = 'SETTLED', result = false
          where id = v_market.id;
        end if;

      when 'TOP_ASSISTER' then
        if v_top_assister_id is not null then
          update public.match_markets
          set result = (v_market.player_id = v_top_assister_id),
              status = 'SETTLED'
          where id = v_market.id;
        else
          update public.match_markets
          set status = 'SETTLED', result = false
          where id = v_market.id;
        end if;

      when 'BEST_PLAYER' then
        if v_best_player_id is not null then
          update public.match_markets
          set result = (v_market.player_id = v_best_player_id),
              status = 'SETTLED'
          where id = v_market.id;
        else
          update public.match_markets
          set status = 'SETTLED', result = false
          where id = v_market.id;
        end if;

      when 'PLAYER_SCORES' then
        update public.match_markets m
        set result = (
          select coalesce(mp.goals, 0) > 0
          from public.match_players mp
          where mp.match_id = p_match_id and mp.profile_id = m.player_id
        ),
        status = 'SETTLED'
        where id = v_market.id;

      when 'PLAYER_ASSIST' then
        update public.match_markets m
        set result = (
          select coalesce(mp.assists, 0) > 0
          from public.match_players mp
          where mp.match_id = p_match_id and mp.profile_id = m.player_id
        ),
        status = 'SETTLED'
        where id = v_market.id;

      when 'PLAYER_NUTMEG' then
        update public.match_markets m
        set result = (
          select coalesce(mp.nutmeg_done, 0) > 0
          from public.match_players mp
          where mp.match_id = p_match_id and mp.profile_id = m.player_id
        ),
        status = 'SETTLED'
        where id = v_market.id;

      when 'PLAYER_NO_SHOW' then
        update public.match_markets m
        set result = (
          select mp.no_show
          from public.match_players mp
          where mp.match_id = p_match_id and mp.profile_id = m.player_id
        ),
        status = 'SETTLED'
        where id = v_market.id;
    end case;
  end loop;

  -- Settle all bets for this match
  for v_bet in
    select * from public.bets
    where match_id = p_match_id and status = 'PENDING'
  loop
    -- Check all selections
    v_all_won := true;

    for v_bet_selection in
      select ms.*
      from public.bet_selections bs
      join public.match_markets ms on ms.id = bs.market_id
      where bs.bet_id = v_bet.id
    loop
      if v_bet_selection.result is null or v_bet_selection.result = false then
        v_all_won := false;
        exit;
      end if;
    end loop;

    if v_all_won then
      -- Won: payout = bet amount * total odds
      update public.bets
      set status = 'WON', settled_at = now()
      where id = v_bet.id;

      -- Add winnings to player's balance
      update public.profiles
      set betting_balance = betting_balance + v_bet.potential_payout
      where id = v_bet.profile_id;
    else
      update public.bets
      set status = 'LOST', settled_at = now()
      where id = v_bet.id;
    end if;
  end loop;
end;
$$;
