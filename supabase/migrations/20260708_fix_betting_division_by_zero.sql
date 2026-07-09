-- ============================================
-- FIX: Division by zero in generate_match_markets
-- When a player has 0 of a stat, v_prob = 0,
-- causing 1.0 / (0 * v_vig) = division by zero
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
  v_total_avg_goals numeric;
  v_total_avg_assists numeric;
  v_prob numeric;
  v_odds numeric;
  v_vig constant numeric := 0.95;
  v_player_count numeric;
begin
  -- Check if markets already exist for this match
  if exists (select 1 from public.match_markets where match_id = p_match_id) then
    return;
  end if;

  -- Get match group
  select group_id into v_group_id from public.matches where id = p_match_id;
  if v_group_id is null then return; end if;

  -- Count eligible players for Best Player market
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

    -- PLAYER_SCORES: will this player score?
    v_prob := case
      when v_player_matches > 0 then greatest(least(v_player_goals / v_player_matches, 0.95), 0.01)
      else 0.15
    end;
    v_odds := greatest(1.01, round((1.0 / (v_prob * v_vig))::numeric, 2));
    if v_odds > 100 then v_odds := 100; end if;
    insert into public.match_markets (match_id, market_type, player_id, odds, label, status)
    values (p_match_id, 'PLAYER_SCORES', v_player.profile_id, v_odds, v_player.name || ' faz gol', 'OPEN');

    -- PLAYER_ASSIST: will this player assist?
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
    v_odds := greatest(1.01, round((1.0 / (v_prob * v_vig))::numeric, 2));
    if v_odds > 100 then v_odds := 100; end if;
    insert into public.match_markets (match_id, market_type, player_id, odds, label, status)
    values (p_match_id, 'PLAYER_ASSIST', v_player.profile_id, v_odds, v_player.name || ' dá assistência', 'OPEN');

    -- PLAYER_NUTMEG: will this player get a nutmeg?
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
    v_odds := greatest(1.01, round((1.0 / (v_prob * v_vig))::numeric, 2));
    if v_odds > 100 then v_odds := 100; end if;
    insert into public.match_markets (match_id, market_type, player_id, odds, label, status)
    values (p_match_id, 'PLAYER_NUTMEG', v_player.profile_id, v_odds, v_player.name || ' aplica caneta', 'OPEN');

    -- PLAYER_NO_SHOW: will this player be a no-show?
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
    v_odds := greatest(1.01, round((1.0 / (v_prob * v_vig))::numeric, 2));
    if v_odds > 100 then v_odds := 100; end if;
    insert into public.match_markets (match_id, market_type, player_id, odds, label, status)
    values (p_match_id, 'PLAYER_NO_SHOW', v_player.profile_id, v_odds, v_player.name || ' é furão', 'OPEN');
  end loop;

  -- TOP_SCORER: one market per player (multi-option)
  select coalesce(avg(mp8.goals), 0)
  into v_total_avg_goals
  from public.match_players mp8
  join public.matches m7 on m7.id = mp8.match_id
  where m7.group_id = v_group_id and m7.status = 'FINISHED';

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

    v_odds := greatest(1.01, round((1.0 / (v_prob * v_vig))::numeric, 2));
    if v_odds > 100 then v_odds := 100; end if;
    insert into public.match_markets (match_id, market_type, player_id, odds, label, status)
    values (p_match_id, 'TOP_SCORER', v_player.profile_id, v_odds, v_player.name || ' artilheiro', 'OPEN');
  end loop;

  -- TOP_ASSISTER: one market per player (multi-option)
  select coalesce(avg(mp10.assists), 0)
  into v_total_avg_assists
  from public.match_players mp10
  join public.matches m9 on m9.id = mp10.match_id
  where m9.group_id = v_group_id and m9.status = 'FINISHED';

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

    v_odds := greatest(1.01, round((1.0 / (v_prob * v_vig))::numeric, 2));
    if v_odds > 100 then v_odds := 100; end if;
    insert into public.match_markets (match_id, market_type, player_id, odds, label, status)
    values (p_match_id, 'TOP_ASSISTER', v_player.profile_id, v_odds, v_player.name || ' mais assistências', 'OPEN');
  end loop;

  -- BEST_PLAYER: one market per player (multi-option)
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
