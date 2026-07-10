-- ============================================
-- MIGRATION 20260709: New betting markets
-- EXACT_GOALS, MOST_NUTMEGS, CLEAN_SHEET
-- ============================================

-- 1. Update CHECK constraint to include new market types
alter table public.match_markets drop constraint if exists match_markets_market_type_check;

alter table public.match_markets add constraint match_markets_market_type_check
  check (market_type in (
    'WINNER', 'TOP_SCORER', 'TOP_ASSISTER', 'BEST_PLAYER',
    'PLAYER_SCORES', 'PLAYER_ASSIST', 'PLAYER_NUTMEG', 'PLAYER_NO_SHOW',
    'EXACT_GOALS', 'MOST_NUTMEGS', 'CLEAN_SHEET'
  ));

-- ============================================
-- FUNCTION: generate_match_markets (updated)
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
  v_player_assists numeric;
  v_player_nutmegs numeric;
  v_player_noshow numeric;
  v_player_avg_goals numeric;
  v_player_avg_assists numeric;
  v_player_avg_nutmegs numeric;
  v_total_avg_goals numeric;
  v_total_avg_assists numeric;
  v_total_avg_nutmegs numeric;
  v_prob numeric;
  v_odds numeric;
  v_vig constant numeric := 0.95;
  v_player_count numeric;
  v_match_count numeric;
  v_goal_bucket record;
  v_goals_0 numeric;
  v_goals_1 numeric;
  v_goals_2 numeric;
  v_goals_3 numeric;
  v_goals_4plus numeric;
  v_total_matches numeric;
  v_clean_sheets numeric;
  v_total_team_sides numeric;
begin
  -- Check if markets already exist for this match
  if exists (select 1 from public.match_markets where match_id = p_match_id) then
    return;
  end if;

  -- Get match group
  select group_id into v_group_id from public.matches where id = p_match_id;
  if v_group_id is null then return; end if;

  -- Count eligible players
  select count(*)::numeric into v_player_count
  from public.match_players
  where match_id = p_match_id and no_show = false and profile_id is not null;

  -- WINNER: one market per team
  for v_team in
    select * from public.teams where match_id = p_match_id
  loop
    insert into public.match_markets (match_id, market_type, team_id, odds, label, status)
    values (p_match_id, 'WINNER', v_team.id, 2.00, v_team.name || ' vence', 'OPEN');
  end loop;

  -- CLEAN_SHEET: one market per team
  -- Calculate historical clean sheet rate for this group
  select
    count(*)::numeric,
    count(*) filter (where mr.score = 0)::numeric
  into v_total_team_sides, v_clean_sheets
  from public.match_results mr
  join public.matches m on m.id = mr.match_id
  where m.group_id = v_group_id and m.status = 'FINISHED';

  for v_team in
    select * from public.teams where match_id = p_match_id
  loop
    if v_total_team_sides > 0 then
      v_prob := greatest(v_clean_sheets / v_total_team_sides, 0.05);
    else
      v_prob := 0.30;
    end if;
    v_odds := greatest(1.01, least(round((1.0 / (v_prob * v_vig))::numeric, 2), 100));
    insert into public.match_markets (match_id, market_type, team_id, odds, label, status)
    values (p_match_id, 'CLEAN_SHEET', v_team.id, v_odds, v_team.name || ' não sofre gols', 'OPEN');
  end loop;

  -- EXACT_GOALS: 5 buckets (0, 1, 2, 3, 4+)
  -- Calculate historical goal distribution for this group
  select count(*)::numeric into v_match_count
  from public.matches
  where group_id = v_group_id and status = 'FINISHED';

  if v_match_count > 0 then
    select
      coalesce(count(*) filter (where g.total = 0), 0)::numeric / v_match_count,
      coalesce(count(*) filter (where g.total = 1), 0)::numeric / v_match_count,
      coalesce(count(*) filter (where g.total = 2), 0)::numeric / v_match_count,
      coalesce(count(*) filter (where g.total = 3), 0)::numeric / v_match_count,
      coalesce(count(*) filter (where g.total >= 4), 0)::numeric / v_match_count
    into v_goals_0, v_goals_1, v_goals_2, v_goals_3, v_goals_4plus
    from (
      select coalesce(sum(mp.goals), 0) as total
      from public.match_players mp
      join public.matches m on m.id = mp.match_id
      where m.group_id = v_group_id and m.status = 'FINISHED'
      group by mp.match_id
    ) g;
  else
    v_goals_0 := 0.05; v_goals_1 := 0.15; v_goals_2 := 0.30; v_goals_3 := 0.25; v_goals_4plus := 0.25;
  end if;

  for v_goal_bucket in
    values ('Gols: 0', v_goals_0), ('Gols: 1', v_goals_1), ('Gols: 2', v_goals_2), ('Gols: 3', v_goals_3), ('Gols: 4+', v_goals_4plus)
  loop
    v_prob := greatest(v_goal_bucket.column2::numeric, 0.01);
    v_odds := greatest(1.01, least(round((1.0 / (v_prob * v_vig))::numeric, 2), 100));
    insert into public.match_markets (match_id, market_type, odds, label, status)
    values (p_match_id, 'EXACT_GOALS', v_odds, v_goal_bucket.column1, 'OPEN');
  end loop;

  -- PLAYER markets and MOST_NUTMEGS for each player
  select coalesce(avg(mp8.goals), 0) into v_total_avg_goals
  from public.match_players mp8
  join public.matches m7 on m7.id = mp8.match_id
  where m7.group_id = v_group_id and m7.status = 'FINISHED';

  select coalesce(avg(mp10.assists), 0) into v_total_avg_assists
  from public.match_players mp10
  join public.matches m9 on m9.id = mp10.match_id
  where m9.group_id = v_group_id and m9.status = 'FINISHED';

  select coalesce(avg(mp_n.nutmeg_done), 0) into v_total_avg_nutmegs
  from public.match_players mp_n
  join public.matches m_n on m_n.id = mp_n.match_id
  where m_n.group_id = v_group_id and m_n.status = 'FINISHED';

  for v_player in
    select mp.profile_id, p.name
    from public.match_players mp
    join public.profiles p on p.id = mp.profile_id
    where mp.match_id = p_match_id and mp.no_show = false and mp.profile_id is not null
  loop
    -- Calculate player historical stats
    select
      coalesce(sum(mp2.goals), 0),
      count(distinct mp2.match_id)
    into v_player_goals, v_player_matches
    from public.match_players mp2
    join public.matches m on m.id = mp2.match_id
    where mp2.profile_id = v_player.profile_id
      and m.group_id = v_group_id
      and m.status = 'FINISHED';

    -- PLAYER_SCORES
    v_prob := case
      when v_player_matches > 0 then greatest(least(v_player_goals / v_player_matches, 0.95), 0.01)
      else 0.15
    end;
    v_odds := greatest(1.01, least(round((1.0 / (v_prob * v_vig))::numeric, 2), 100));
    insert into public.match_markets (match_id, market_type, player_id, odds, label, status)
    values (p_match_id, 'PLAYER_SCORES', v_player.profile_id, v_odds, v_player.name || ' faz gol', 'OPEN');

    -- PLAYER_ASSIST
    select coalesce(sum(mp4.assists), 0)
    into v_player_assists
    from public.match_players mp4
    join public.matches m3 on m3.id = mp4.match_id
    where mp4.profile_id = v_player.profile_id
      and m3.group_id = v_group_id
      and m3.status = 'FINISHED';

    v_prob := case
      when v_player_matches > 0 then greatest(least(v_player_assists / v_player_matches, 0.95), 0.01)
      else 0.10
    end;
    v_odds := greatest(1.01, least(round((1.0 / (v_prob * v_vig))::numeric, 2), 100));
    insert into public.match_markets (match_id, market_type, player_id, odds, label, status)
    values (p_match_id, 'PLAYER_ASSIST', v_player.profile_id, v_odds, v_player.name || ' dá assistência', 'OPEN');

    -- PLAYER_NUTMEG
    select coalesce(sum(mp5.nutmeg_done), 0)
    into v_player_nutmegs
    from public.match_players mp5
    join public.matches m4 on m4.id = mp5.match_id
    where mp5.profile_id = v_player.profile_id
      and m4.group_id = v_group_id
      and m4.status = 'FINISHED';

    v_prob := case
      when v_player_matches > 0 then greatest(least(v_player_nutmegs / v_player_matches, 0.95), 0.01)
      else 0.10
    end;
    v_odds := greatest(1.01, least(round((1.0 / (v_prob * v_vig))::numeric, 2), 100));
    insert into public.match_markets (match_id, market_type, player_id, odds, label, status)
    values (p_match_id, 'PLAYER_NUTMEG', v_player.profile_id, v_odds, v_player.name || ' aplica caneta', 'OPEN');

    -- PLAYER_NO_SHOW
    select count(*)::numeric into v_player_noshow
    from public.match_players mp6
    join public.matches m5 on m5.id = mp6.match_id
    where mp6.profile_id = v_player.profile_id
      and m5.group_id = v_group_id
      and m5.status = 'FINISHED'
      and mp6.no_show = true;

    v_prob := case
      when v_player_matches > 0 then greatest(least(v_player_noshow / v_player_matches, 0.95), 0.01)
      else 0.05
    end;
    v_odds := greatest(1.01, least(round((1.0 / (v_prob * v_vig))::numeric, 2), 100));
    insert into public.match_markets (match_id, market_type, player_id, odds, label, status)
    values (p_match_id, 'PLAYER_NO_SHOW', v_player.profile_id, v_odds, v_player.name || ' é furão', 'OPEN');
  end loop;

  -- TOP_SCORER
  for v_player in
    select mp.profile_id, p.name
    from public.match_players mp
    join public.profiles p on p.id = mp.profile_id
    where mp.match_id = p_match_id and mp.no_show = false and mp.profile_id is not null
  loop
    select coalesce(avg(mp7.goals), 0)
    into v_player_avg_goals
    from public.match_players mp7
    join public.matches m6 on m6.id = mp7.match_id
    where mp7.profile_id = v_player.profile_id
      and m6.group_id = v_group_id
      and m6.status = 'FINISHED';

    if v_total_avg_goals > 0 then
      v_prob := greatest(v_player_avg_goals / v_total_avg_goals, 0.01);
    else
      v_prob := 1.0 / greatest(v_player_count, 1);
    end if;

    v_odds := greatest(1.01, least(round((1.0 / (v_prob * v_vig))::numeric, 2), 100));
    insert into public.match_markets (match_id, market_type, player_id, odds, label, status)
    values (p_match_id, 'TOP_SCORER', v_player.profile_id, v_odds, v_player.name || ' artilheiro', 'OPEN');
  end loop;

  -- TOP_ASSISTER
  for v_player in
    select mp.profile_id, p.name
    from public.match_players mp
    join public.profiles p on p.id = mp.profile_id
    where mp.match_id = p_match_id and mp.no_show = false and mp.profile_id is not null
  loop
    select coalesce(avg(mp9.assists), 0)
    into v_player_avg_assists
    from public.match_players mp9
    join public.matches m8 on m8.id = mp9.match_id
    where mp9.profile_id = v_player.profile_id
      and m8.group_id = v_group_id
      and m8.status = 'FINISHED';

    if v_total_avg_assists > 0 then
      v_prob := greatest(v_player_avg_assists / v_total_avg_assists, 0.01);
    else
      v_prob := 1.0 / greatest(v_player_count, 1);
    end if;

    v_odds := greatest(1.01, least(round((1.0 / (v_prob * v_vig))::numeric, 2), 100));
    insert into public.match_markets (match_id, market_type, player_id, odds, label, status)
    values (p_match_id, 'TOP_ASSISTER', v_player.profile_id, v_odds, v_player.name || ' mais assistências', 'OPEN');
  end loop;

  -- MOST_NUTMEGS: one market per player (multi-option, similar to TOP_SCORER)
  for v_player in
    select mp.profile_id, p.name
    from public.match_players mp
    join public.profiles p on p.id = mp.profile_id
    where mp.match_id = p_match_id and mp.no_show = false and mp.profile_id is not null
  loop
    select coalesce(avg(mp_nm.nutmeg_done), 0)
    into v_player_avg_nutmegs
    from public.match_players mp_nm
    join public.matches m_nm on m_nm.id = mp_nm.match_id
    where mp_nm.profile_id = v_player.profile_id
      and m_nm.group_id = v_group_id
      and m_nm.status = 'FINISHED';

    if v_total_avg_nutmegs > 0 then
      v_prob := greatest(v_player_avg_nutmegs / v_total_avg_nutmegs, 0.01);
    else
      v_prob := 1.0 / greatest(v_player_count, 1);
    end if;

    v_odds := greatest(1.01, least(round((1.0 / (v_prob * v_vig))::numeric, 2), 100));
    insert into public.match_markets (match_id, market_type, player_id, odds, label, status)
    values (p_match_id, 'MOST_NUTMEGS', v_player.profile_id, v_odds, v_player.name || ' mais canetas', 'OPEN');
  end loop;

  -- BEST_PLAYER
  if v_player_count > 0 then
    for v_player in
      select mp.profile_id, p.name
      from public.match_players mp
      join public.profiles p on p.id = mp.profile_id
      where mp.match_id = p_match_id and mp.no_show = false and mp.profile_id is not null
    loop
      insert into public.match_markets (match_id, market_type, player_id, odds, label, status)
      values (
        p_match_id, 'BEST_PLAYER', v_player.profile_id,
        greatest(1.01, round((v_player_count / v_vig)::numeric, 2)),
        v_player.name || ' melhor jogador',
        'OPEN'
      );
    end loop;
  end if;
end;
$$;

-- ============================================
-- FUNCTION: settle_match_markets (updated)
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
  v_total_goals int;
  v_goal_bucket text;
  v_max_nutmegs int;
  v_tied_nutmegs int;
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

  if (select count(*) from public.match_results where match_id = p_match_id and score = (select max(score) from public.match_results where match_id = p_match_id)) > 1 then
    v_winner_team_id := null;
  end if;

  -- Calculate total goals for EXACT_GOALS
  select coalesce(sum(mp.goals), 0)::int into v_total_goals
  from public.match_players mp
  where mp.match_id = p_match_id;

  if v_total_goals >= 4 then
    v_goal_bucket := 'Gols: 4+';
  else
    v_goal_bucket := 'Gols: ' || v_total_goals;
  end if;

  -- Calculate max nutmegs for MOST_NUTMEGS
  select coalesce(max(mp.nutmeg_done), 0)::int into v_max_nutmegs
  from public.match_players mp
  where mp.match_id = p_match_id;

  select count(*)::int into v_tied_nutmegs
  from public.match_players mp
  where mp.match_id = p_match_id and mp.nutmeg_done = v_max_nutmegs;

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
          update public.match_markets
          set status = 'SETTLED', result = false
          where id = v_market.id;
        end if;

      when 'CLEAN_SHEET' then
        update public.match_markets m
        set result = (
          select coalesce(mr2.score, 0) = 0
          from public.match_results mr
          join public.match_results mr2 on mr2.match_id = mr.match_id and mr2.team_id != mr.team_id
          where mr.match_id = p_match_id and mr.team_id = m.team_id
        ),
        status = 'SETTLED'
        where id = v_market.id;

      when 'EXACT_GOALS' then
        update public.match_markets
        set result = (label = v_goal_bucket),
            status = 'SETTLED'
        where id = v_market.id;

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

      when 'MOST_NUTMEGS' then
        if v_max_nutmegs > 0 and v_tied_nutmegs = 1 then
          update public.match_markets m
          set result = (
            select mp.nutmeg_done = v_max_nutmegs
            from public.match_players mp
            where mp.match_id = p_match_id and mp.profile_id = m.player_id
          ),
          status = 'SETTLED'
          where id = v_market.id;
        else
          update public.match_markets
          set result = false, status = 'SETTLED'
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
      update public.bets
      set status = 'WON', settled_at = now()
      where id = v_bet.id;

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
