import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { championshipService } from '../services/api'
import { queryKeys } from './queryKeys'

const STALE_TIMES = {
  list: 2 * 60 * 1000,
  detail: 5 * 60 * 1000,
  rounds: 30 * 1000,
  standings: 30 * 1000,
}

export function useChampionships(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.championships.list(groupId!),
    queryFn: () => championshipService.list(groupId!),
    staleTime: STALE_TIMES.list,
    enabled: !!groupId,
  })
}

export function useChampionship(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.championships.detail(id!),
    queryFn: () => championshipService.get(id!),
    staleTime: STALE_TIMES.detail,
    enabled: !!id,
  })
}

export function useChampionshipRounds(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.championships.rounds(id!),
    queryFn: () => championshipService.getRounds(id!),
    staleTime: STALE_TIMES.rounds,
    enabled: !!id,
  })
}

export function useChampionshipStandings(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.championships.standings(id!),
    queryFn: () => championshipService.getStandings(id!),
    staleTime: STALE_TIMES.standings,
    enabled: !!id,
  })
}

export function useCreateChampionship() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: {
      group_id: string
      name: string
      team_count: number
      teams: {
        name: string
        players: { profile_id?: string; guest_name?: string; position?: string }[]
      }[]
    }) => championshipService.create(params),
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: queryKeys.championships.list(data.group_id) })
      }
    },
  })
}

export function useGenerateRounds() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: { id: string; type: 'first' | 'all' }) =>
      championshipService.generateRounds(params.id, params.type),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.championships.rounds(variables.id), refetchType: 'all' })
      queryClient.invalidateQueries({ queryKey: queryKeys.championships.detail(variables.id), refetchType: 'all' })
    },
  })
}

export function useStartChampionship() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: { id: string; roundDates: { round_number: number; match_date: string; location: string }[] }) =>
      championshipService.start(params.id, params.roundDates),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.championships.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.championships.rounds(variables.id) })
    },
  })
}

export function useStartRoundMatch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (roundId: string) => championshipService.startRoundMatch(roundId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['championships'] })
    },
  })
}

export function useFinishChampionship() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => championshipService.finish(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.championships.detail(id) })
    },
  })
}
