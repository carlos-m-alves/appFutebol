-- ============================================
-- Adiciona políticas RLS ausentes para
-- deleção e inserção em tabelas de partida
-- ============================================

-- MATCH RESULTS: permitir admins deletarem resultados
create policy "Admins can delete match results"
  on public.match_results for delete
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

-- MATCH PLAYERS: permitir admins deletarem jogadores
create policy "Admins can delete match players"
  on public.match_players for delete
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

-- MATCH CONFIRMATIONS: permitir admins deletarem confirmações
create policy "Admins can delete match confirmations"
  on public.match_confirmations for delete
  to authenticated
  using (
    exists (
      select 1 from public.matches
      join public.group_members on group_members.group_id = matches.group_id
      where matches.id = match_confirmations.match_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
      and group_members.role = 'ADMIN'
    )
  );

-- PLAYER RATINGS: permitir admins deletarem avaliações
create policy "Admins can delete player ratings"
  on public.player_ratings for delete
  to authenticated
  using (
    exists (
      select 1 from public.matches
      join public.group_members on group_members.group_id = matches.group_id
      where matches.id = player_ratings.match_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
      and group_members.role = 'ADMIN'
    )
  );

-- MATCH AWARDS: permitir admins deletarem premiações
create policy "Admins can delete match awards"
  on public.match_awards for delete
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

-- VOTER PENALTIES: permitir admins deletarem penalidades
create policy "Admins can delete voter penalties"
  on public.voter_penalties for delete
  to authenticated
  using (
    exists (
      select 1 from public.matches
      join public.group_members on group_members.group_id = matches.group_id
      where matches.id = voter_penalties.match_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
      and group_members.role = 'ADMIN'
    )
  );

-- VOTER PENALTIES: permitir admins inserirem penalidades (necessário para upsert)
create policy "Admins can manage voter penalties"
  on public.voter_penalties for insert
  to authenticated
  with check (
    exists (
      select 1 from public.matches
      join public.group_members on group_members.group_id = matches.group_id
      where matches.id = voter_penalties.match_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
      and group_members.role = 'ADMIN'
    )
  );

-- PLAYER RATINGS: permitir admins atualizarem avaliações
create policy "Admins can update player ratings"
  on public.player_ratings for update
  to authenticated
  using (
    exists (
      select 1 from public.matches
      join public.group_members on group_members.group_id = matches.group_id
      where matches.id = player_ratings.match_id
      and group_members.profile_id = (select id from public.profiles where auth_user_id = auth.uid())
      and group_members.role = 'ADMIN'
    )
  );

-- ============================================
-- VERIFICACAO
-- ============================================
select schemaname, tablename, policyname, permissive, roles, cmd, qual
from pg_policies
where tablename in ('match_players', 'match_results', 'match_confirmations', 'player_ratings', 'match_awards', 'voter_penalties')
order by tablename, cmd;
