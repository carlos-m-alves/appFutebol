-- Clean all match data but keep profiles, groups, and group_members
delete from public.match_awards;
delete from public.player_ratings;
delete from public.match_confirmations;
delete from public.match_results;
delete from public.match_players;
delete from public.teams;
delete from public.matches;
delete from public.recurring_schedules;
