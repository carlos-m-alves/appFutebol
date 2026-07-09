import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bettingService } from '../services/api'
import { queryKeys } from './queryKeys'

export const betQueryKeys = {
  markets: (matchId: string) => ['bets', 'markets', matchId],
  bets: (matchId: string) => ['bets', 'list', matchId],
  myBets: (matchId: string, profileId: string) => ['bets', 'my', matchId, profileId],
  balance: (profileId: string) => ['bets', 'balance', profileId],
}

export function useMatchMarkets(matchId: string | undefined) {
  return useQuery({
    queryKey: betQueryKeys.markets(matchId!),
    queryFn: () => bettingService.getMarkets(matchId!),
    staleTime: 30 * 1000,
    enabled: !!matchId,
  })
}

export function useMatchBets(matchId: string | undefined) {
  return useQuery({
    queryKey: betQueryKeys.bets(matchId!),
    queryFn: () => bettingService.getBets(matchId!),
    staleTime: 30 * 1000,
    enabled: !!matchId,
  })
}

export function useMyBets(matchId: string | undefined, profileId: string | undefined) {
  return useQuery({
    queryKey: betQueryKeys.myBets(matchId!, profileId!),
    queryFn: () => bettingService.getMyBets(matchId!, profileId!),
    staleTime: 30 * 1000,
    enabled: !!matchId && !!profileId,
  })
}

export function useMyBalance(profileId: string | undefined) {
  return useQuery({
    queryKey: betQueryKeys.balance(profileId!),
    queryFn: () => bettingService.getMyBalance(profileId!),
    staleTime: 10 * 1000,
    enabled: !!profileId,
  })
}

export function usePlaceBet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: {
      profileId: string
      matchId: string
      marketIds: string[]
      amount: number
      totalOdds: number
    }) => bettingService.placeBet(params),
    onSuccess: (_, { matchId, profileId }) => {
      queryClient.invalidateQueries({ queryKey: betQueryKeys.myBets(matchId, profileId) })
      queryClient.invalidateQueries({ queryKey: betQueryKeys.bets(matchId) })
      queryClient.invalidateQueries({ queryKey: betQueryKeys.balance(profileId) })
      queryClient.invalidateQueries({ queryKey: betQueryKeys.markets(matchId) })
    },
  })
}

export function useGenerateMarkets() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (matchId: string) => bettingService.generateMarkets(matchId),
    onSuccess: (_, matchId) => {
      queryClient.invalidateQueries({ queryKey: betQueryKeys.markets(matchId) })
    },
  })
}

export function useSettleMarkets() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (matchId: string) => bettingService.settleMarkets(matchId),
    onSuccess: (_, matchId) => {
      queryClient.invalidateQueries({ queryKey: betQueryKeys.markets(matchId) })
      queryClient.invalidateQueries({ queryKey: betQueryKeys.bets(matchId) })
    },
  })
}
