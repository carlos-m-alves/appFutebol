-- ============================================
-- LIMPAR DADOS DE PARTIDAS
-- Preserva: profiles, groups, group_members, group_join_requests
-- ============================================

delete from public.voter_penalties;
delete from public.match_awards;
delete from public.player_ratings;
delete from public.match_results;
delete from public.match_players;
delete from public.teams;
delete from public.match_confirmations;
delete from public.matches;
delete from public.recurring_schedules;
delete from public.courts;

-- ============================================
-- VERIFICACAO
-- ============================================
select 'voter_penalties' as tabela, count(*) from public.voter_penalties
union all select 'match_awards', count(*) from public.match_awards
union all select 'player_ratings', count(*) from public.player_ratings
union all select 'match_results', count(*) from public.match_results
union all select 'match_players', count(*) from public.match_players
union all select 'teams', count(*) from public.teams
union all select 'match_confirmations', count(*) from public.match_confirmations
union all select 'matches', count(*) from public.matches
union all select 'recurring_schedules', count(*) from public.recurring_schedules
union all select 'courts', count(*) from public.courts
union all select '--- PRESERVADAS ---', 0
union all select 'profiles', count(*) from public.profiles
union all select 'groups', count(*) from public.groups
union all select 'group_members', count(*) from public.group_members
union all select 'group_join_requests', count(*) from public.group_join_requests
order by tabela;
