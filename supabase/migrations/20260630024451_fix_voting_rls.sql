-- Fix voting RLS: no-show players cannot rate, and only non-no-show players
-- can be rated (votes for no-show players are rejected because rating
-- requires a valid rated_profile_id).

drop policy if exists "Players who participated can rate" on public.player_ratings;

create policy "Players who participated can rate"
  on public.player_ratings for insert
  to authenticated
  with check (
    rater_profile_id = (select id from public.profiles where auth_user_id = auth.uid())
    and rater_profile_id != rated_profile_id
    and rated_profile_id is not null
    and (
      exists (
        select 1 from public.match_players
        where match_players.match_id = player_ratings.match_id
        and match_players.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
        and match_players.no_show = false
      )
      or exists (
        select 1 from public.match_confirmations
        where match_confirmations.match_id = player_ratings.match_id
        and match_confirmations.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
        and match_confirmations.status = 'CONFIRMED'
      )
    )
  );
