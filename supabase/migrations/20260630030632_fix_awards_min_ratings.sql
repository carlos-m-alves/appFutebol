-- Remove minimum rating count requirement for awards.
-- Even with few votes, best/worst player should be selected.

create or replace function public.calculate_match_awards(p_match_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_best_player uuid;
  v_best_rating numeric(3,1);
  v_top_scorer uuid;
  v_top_assist uuid;
  v_worst_player uuid;
  r record;
  v_other_count int;
  v_other_sum numeric;
  v_other_avg numeric(3,1);
begin
  -- 1. Update won_match for each player based on match_results
  update public.match_players mp
  set won_match = (
    select mr.score > (
      select max(mr2.score) from public.match_results mr2
      where mr2.match_id = mp.match_id and mr2.team_id != mp.team_id
    )
    from public.match_results mr
    where mr.match_id = mp.match_id and mr.team_id = mp.team_id
  )
  where mp.match_id = p_match_id and mp.team_id is not null;

  -- 2. Detect biased votes (vote still counts, but voter gets penalized)
  for r in
    select pr.rater_profile_id, pr.rated_profile_id, pr.rating, mp.goals
    from public.player_ratings pr
    left join public.match_players mp on mp.match_id = pr.match_id and mp.profile_id = pr.rated_profile_id
    where pr.match_id = p_match_id
  loop
    select count(*), coalesce(sum(rating), 0)
    into v_other_count, v_other_sum
    from public.player_ratings
    where match_id = p_match_id
      and rated_profile_id = r.rated_profile_id
      and rater_profile_id != r.rater_profile_id;

    if v_other_count > 0 then
      v_other_avg := (v_other_sum / v_other_count)::numeric(3,1);
    else
      v_other_avg := null;
    end if;

    if (coalesce(r.goals, 0) >= 2 and r.rating <= 2.0) or
       (v_other_avg is not null and v_other_avg >= 2.5 and r.rating <= 1.5) then
      insert into public.voter_penalties (match_id, profile_id, warned, penalty_count)
      values (p_match_id, r.rater_profile_id, false, 1)
      on conflict (match_id, profile_id)
      do update set penalty_count = public.voter_penalties.penalty_count + 1;
    end if;
  end loop;

  -- 3. Best player (performance-weighted score, any number of votes)
  select
    sub.rated_profile_id,
    sub.weighted_score
  into v_best_player, v_best_rating
  from (
    select
      pr.rated_profile_id,
      round(
        avg(pr.rating)::numeric +
        coalesce(mp.goals::numeric * 0.3, 0) +
        coalesce(mp.nutmeg_done::numeric * 0.2, 0) -
        coalesce(mp.nutmeg_given::numeric * 0.2, 0) +
        case when coalesce(mp.won_match, false) then 0.5 else -0.3 end,
      1)::numeric(3,1) as weighted_score
    from public.player_ratings pr
    left join public.match_players mp on mp.match_id = pr.match_id and mp.profile_id = pr.rated_profile_id
    where pr.match_id = p_match_id
    group by pr.rated_profile_id, mp.goals, mp.nutmeg_done, mp.nutmeg_given, mp.won_match
    order by weighted_score desc
    limit 1
  ) sub;

  -- 4. Top scorer (exclude no_show)
  select profile_id
  into v_top_scorer
  from public.match_players
  where match_id = p_match_id
    and no_show = false
  order by goals desc
  limit 1;

  -- 5. Top assist (exclude no_show)
  select profile_id
  into v_top_assist
  from public.match_players
  where match_id = p_match_id
    and no_show = false
  order by assists desc
  limit 1;

  -- 6. Worst player (any number of votes, exclude no_show; fallback to no_show)
  select rated_profile_id
  into v_worst_player
  from public.player_ratings
  where match_id = p_match_id
    and rated_profile_id not in (
      select profile_id from public.match_players
      where match_id = p_match_id and no_show = true
    )
  group by rated_profile_id
  order by avg(rating) asc
  limit 1;

  if v_worst_player is null then
    select profile_id into v_worst_player
    from public.match_players
    where match_id = p_match_id
      and no_show = true
    limit 1;
  end if;

  -- 7. Upsert awards
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
