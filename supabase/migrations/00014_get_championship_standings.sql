create or replace function public.get_championship_standings(p_championship_id uuid)
returns table (
  team_id uuid,
  team_name text,
  played bigint,
  wins bigint,
  draws bigint,
  losses bigint,
  goals_for bigint,
  goals_against bigint,
  goal_diff bigint,
  points bigint
) language sql stable as $$
  with finished_rounds as (
    select cr.*
    from championship_rounds cr
    join matches m on m.id = cr.match_id
    where cr.championship_id = p_championship_id and m.status = 'FINISHED'
  ),
  team_scores as (
    select
      ct.id as team_id,
      ct.name as team_name,
      mr.score as score,
      opp.score as opponent_score
    from championship_teams ct
    join finished_rounds fr on fr.championship_id = ct.championship_id
      and (fr.home_team_id = ct.id or fr.away_team_id = ct.id)
    join match_results mr on mr.match_id = fr.match_id
      and mr.team_id = (
        select t.id from teams t
        where t.match_id = fr.match_id and t.name = ct.name
        limit 1
      )
    join match_results opp on opp.match_id = fr.match_id
      and opp.team_id != mr.team_id
  )
  select
    ct.id as team_id,
    ct.name as team_name,
    count(ts.score)::bigint as played,
    count(case when ts.score > ts.opponent_score then 1 end)::bigint as wins,
    count(case when ts.score = ts.opponent_score then 1 end)::bigint as draws,
    count(case when ts.score < ts.opponent_score then 1 end)::bigint as losses,
    coalesce(sum(ts.score), 0)::bigint as goals_for,
    coalesce(sum(ts.opponent_score), 0)::bigint as goals_against,
    (coalesce(sum(ts.score), 0) - coalesce(sum(ts.opponent_score), 0))::bigint as goal_diff,
    (count(case when ts.score > ts.opponent_score then 1 end) * 3
     + count(case when ts.score = ts.opponent_score then 1 end))::bigint as points
  from championship_teams ct
  left join team_scores ts on ts.team_id = ct.id
  where ct.championship_id = p_championship_id
  group by ct.id, ct.name
  order by points desc, goal_diff desc, goals_for desc;
$$;
