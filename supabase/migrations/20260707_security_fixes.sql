-- ============================================
-- MIGRATION 20260707: Security fixes
-- Fixes multiple RLS, function, and storage
-- vulnerabilities identified in security audit
-- ============================================

-- ============================================
-- 1. FIX: Groups table exposed to all users
-- Drop the public policy added in 00005
-- ============================================
drop policy if exists "Authenticated users can view groups" on public.groups;

-- ============================================
-- 2. FIX: calculate_match_awards — SECURITY DEFINER
-- without authorization. Add admin-only check
-- and revoke public execute.
-- ============================================

-- Revoke public execute (only authenticated users can call it)
revoke execute on function public.calculate_match_awards from public, anon;
grant execute on function public.calculate_match_awards to authenticated;

-- Replace with version that checks admin authorization
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
  v_admin_id uuid;
begin
  -- AUTHORIZATION CHECK: Only group admins can calculate awards
  select p.id into v_admin_id
  from public.matches m
  join public.group_members gm on gm.group_id = m.group_id
  join public.profiles p on p.id = gm.profile_id
  where m.id = p_match_id
    and p.auth_user_id = auth.uid()
    and gm.role = 'ADMIN';

  if v_admin_id is null then
    raise exception 'Not authorized: only group admins can calculate awards';
  end if;

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

  -- 2. Detect biased votes
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

  -- 3. Best player
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

  -- 6. Worst player
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

-- ============================================
-- 3. FIX: voter_penalties — restrict UPDATE
-- Only allow players to acknowledge warning
-- (set warned = true), not clear penalties
-- or modify penalty_count.
-- ============================================
drop policy if exists "Players can update own penalties" on public.voter_penalties;

create policy "Players can acknowledge warnings"
  on public.voter_penalties for update
  to authenticated
  using (
    profile_id = (select id from public.profiles where auth_user_id = auth.uid())
  )
  with check (
    profile_id = (select id from public.profiles where auth_user_id = auth.uid())
    and warned = true
    and penalty_count = (select penalty_count from public.voter_penalties where id = voter_penalties.id)
  );

-- ============================================
-- 4. FIX: group_join_requests — restrict
-- user UPDATE to only allow PENDING status
-- (prevent self-approval/rejection)
-- ============================================
drop policy if exists "Users can update their own join requests" on public.group_join_requests;

create policy "Users can update their own pending requests"
  on public.group_join_requests for update
  to authenticated
  using (profile_id = (select id from public.profiles where auth_user_id = auth.uid()))
  with check (
    profile_id = (select id from public.profiles where auth_user_id = auth.uid())
    and status = 'PENDING'
  );

-- ============================================
-- 5. FIX: player_ratings — create a view that
-- hides rater_profile_id for true anonymous
-- ratings while keeping it in the base table
-- for admin moderation.
-- ============================================
create or replace view public.player_ratings_public as
select
  id,
  match_id,
  rated_profile_id,
  rating,
  comment,
  created_at
from public.player_ratings;

-- Grant access to the view
grant select on public.player_ratings_public to authenticated;

-- ============================================
-- 6. FIX: Storage RLS policies for bucket 'img'
-- Ensure only authenticated users can upload,
-- and files are publicly readable.
-- ============================================
-- Note: This assumes the 'img' bucket exists.
-- If not, uncomment the next line:
-- insert into storage.buckets (id, name, public) values ('img', 'img', true) on conflict (id) do nothing;

-- Drop existing policies (including legacy "liberar*" policies)
drop policy if exists "Public can view images" on storage.objects;
drop policy if exists "Authenticated users can upload images" on storage.objects;
drop policy if exists "Users can update own images" on storage.objects;
drop policy if exists "Users can delete own images" on storage.objects;
drop policy if exists "liberar 28jn_0" on storage.objects;
drop policy if exists "liberar 28jn_1" on storage.objects;
drop policy if exists "liberar 28jn_2" on storage.objects;
drop policy if exists "liberar 28jn_3" on storage.objects;

-- Public read access for images
create policy "Public can view images"
  on storage.objects for select
  using (bucket_id = 'img');

-- Authenticated users can upload to img bucket
create policy "Authenticated users can upload images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'img');

-- Allow users to update images they uploaded (by matching owner)
create policy "Users can update own images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'img' and owner = auth.uid())
  with check (bucket_id = 'img' and owner = auth.uid());

-- Allow users to delete their own images
create policy "Users can delete own images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'img' and owner = auth.uid());

-- ============================================
-- 7. FIX: Make player_ratings_public view use
-- SECURITY INVOKER (not SECURITY DEFINER)
-- ============================================
alter view public.player_ratings_public set (security_invoker = true);

-- ============================================
-- 8. FIX: generate_access_code missing search_path
-- ============================================
create or replace function public.generate_access_code()
returns text
language plpgsql
set search_path = ''
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

-- ============================================
-- 9. FIX: handle_new_user should not be callable
-- by anon (it's a trigger function only)
-- ============================================
revoke execute on function public.handle_new_user from public, anon;
grant execute on function public.handle_new_user to authenticated;

-- ============================================
-- VERIFICATION
-- ============================================
select schemaname, tablename, policyname, permissive, roles, cmd, qual
from pg_policies
where tablename in ('groups', 'voter_penalties', 'group_join_requests', 'player_ratings')
order by tablename, cmd;

select proname, prosecdef, proacl
from pg_proc
where proname = 'calculate_match_awards';
