import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { matchService } from '../services/api'
import { queryKeys } from './queryKeys'
import type { Match } from '../types'

const STALE_TIMES = {
  detail: 5 * 60 * 1000,
  list: 2 * 60 * 1000,
  players: 5 * 60 * 1000,
  confirmations: 30 * 1000,
  awards: 10 * 60 * 1000,
  ratings: 5 * 60 * 1000,
  members: 5 * 60 * 1000,
}

export function useMatch(matchId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.matches.detail(matchId!),
    queryFn: () => matchService.get(matchId!),
    staleTime: STALE_TIMES.detail,
    enabled: !!matchId,
  })
}

export function useMatchTeams(matchId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.matches.teams(matchId!),
    queryFn: () => matchService.getTeams(matchId!),
    staleTime: STALE_TIMES.detail,
    enabled: !!matchId,
  })
}

export function useMatchPlayers(matchId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.matches.players(matchId!),
    queryFn: () => matchService.getPlayers(matchId!),
    staleTime: STALE_TIMES.players,
    enabled: !!matchId,
  })
}

export function useMatchResults(matchId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.matches.results(matchId!),
    queryFn: () => matchService.getResults(matchId!),
    staleTime: STALE_TIMES.detail,
    enabled: !!matchId,
  })
}

export function useMatchConfirmations(matchId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.matches.confirmations(matchId!),
    queryFn: () => matchService.getConfirmations(matchId!),
    staleTime: STALE_TIMES.confirmations,
    enabled: !!matchId,
  })
}

export function useMatchAwards(matchId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.matches.awards(matchId!),
    queryFn: () => matchService.getAwards(matchId!),
    staleTime: STALE_TIMES.awards,
    enabled: !!matchId,
  })
}

export function useMatchRatings(matchId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.matches.ratings(matchId!),
    queryFn: () => matchService.getRatings(matchId!),
    staleTime: STALE_TIMES.ratings,
    enabled: !!matchId,
  })
}

export function useMatchesList(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.matches.list(groupId!),
    queryFn: () => matchService.list(groupId!),
    staleTime: STALE_TIMES.list,
    enabled: !!groupId,
  })
}

export function useMatchesWithResults(groupId: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.matches.list(groupId!), 'withResults'],
    queryFn: () => matchService.listWithResults(groupId!),
    staleTime: STALE_TIMES.list,
    enabled: !!groupId,
  })
}

export function useMatchGroupMembers(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.groups.members(groupId!),
    queryFn: () => matchService.getMembers(groupId!),
    staleTime: STALE_TIMES.members,
    enabled: !!groupId,
  })
}

export function useUpdateMatchStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ matchId, ...updates }: { matchId: string } & Partial<Match>) =>
      matchService.update(matchId, updates),
    onSuccess: (_, { matchId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.detail(matchId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.list(undefined) })
    },
  })
}

export function useMatchConfirmAttendance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ matchId, profileId }: { matchId: string; profileId: string }) => {
      await matchService.confirmAttendance(matchId, profileId, 'CONFIRMED')
      await matchService.addPlayer(matchId, profileId)
    },
    onSuccess: (_, { matchId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.confirmations(matchId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.players(matchId) })
    },
  })
}

export function useAddMatchPlayer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ matchId, profileId }: { matchId: string; profileId: string }) =>
      matchService.addPlayer(matchId, profileId),
    onSuccess: (_, { matchId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.players(matchId) })
    },
  })
}

export function useRemoveMatchPlayer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ matchId, profileId }: { matchId: string; profileId: string }) =>
      matchService.removePlayer(matchId, profileId),
    onSuccess: (_, { matchId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.players(matchId) })
    },
  })
}

export function useAddGuestPlayer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ matchId, guestName, teamId }: { matchId: string; guestName: string; teamId?: string }) =>
      matchService.addGuestPlayer(matchId, guestName, teamId),
    onSuccess: (_, { matchId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.players(matchId) })
    },
  })
}

export function useRemoveMatchPlayerById() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ matchId, playerId }: { matchId: string; playerId: string }) =>
      matchService.removeMatchPlayer(playerId).then(() => ({ matchId })),
    onSuccess: (_, { matchId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.players(matchId) })
    },
  })
}

export function useUpdatePlayerTeam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ matchId, profileId, teamId }: { matchId: string; profileId: string; teamId: string | null }) =>
      matchService.updatePlayerTeam(matchId, profileId, teamId),
    onSuccess: (_, { matchId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.players(matchId) })
    },
  })
}

export function useUpdateMatchPlayerTeamById() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ matchId, playerId, teamId }: { matchId: string; playerId: string; teamId: string | null }) =>
      matchService.updateMatchPlayerTeam(playerId, teamId).then(() => ({ matchId })),
    onSuccess: (_, { matchId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.players(matchId) })
    },
  })
}

export function useSaveMatchPlayers() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ matchId, players }: { matchId: string; players: Parameters<typeof matchService.savePlayers>[1] }) =>
      matchService.savePlayers(matchId, players),
    onSuccess: (_, { matchId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.players(matchId) })
    },
  })
}

export function useSaveMatchResults() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ matchId, results }: { matchId: string; results: { team_id: string; score: number }[] }) =>
      matchService.saveResults(matchId, results),
    onSuccess: (_, { matchId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.results(matchId) })
    },
  })
}

export function useUpdateGuestPlayerStats() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (players: Parameters<typeof matchService.updateGuestPlayerStats>[0]) =>
      matchService.updateGuestPlayerStats(players),
  })
}

export function useSubmitRating() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      matchId, raterProfileId, ratedProfileId, rating, comment
    }: {
      matchId: string; raterProfileId: string; ratedProfileId: string
      rating: number; comment?: string
    }) => matchService.submitRating(matchId, raterProfileId, ratedProfileId, rating, comment),
    onSuccess: (_, { matchId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.ratings(matchId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.awards(matchId) })
    },
  })
}

export function useCalculateAwards() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (matchId: string) => matchService.calculateAwards(matchId),
    onSuccess: (_, matchId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.awards(matchId) })
    },
  })
}

export function useCreateTeam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ matchId, name }: { matchId: string; name: string }) => {
      const { data, error } = await supabase.from('teams').insert({ match_id: matchId, name }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (_, { matchId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.teams(matchId) })
    },
  })
}

export function useDeleteTeam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ matchId, teamId }: { matchId: string; teamId: string }) =>
      matchService.deleteTeam(teamId),
    onSuccess: (_, { matchId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.teams(matchId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.players(matchId) })
    },
  })
}
