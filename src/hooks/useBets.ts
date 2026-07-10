import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bettingService } from '../services/api'

export const betQueryKeys = {
  markets: (matchId: string) => ['bets', 'markets', matchId],
  bets: (matchId: string) => ['bets', 'list', matchId],
  myBets: (matchId: string, profileId: string) => ['bets', 'my', matchId, profileId],
  balance: (profileId: string) => ['bets', 'balance', profileId],
  allMyBets: (profileId: string) => ['bets', 'all', profileId],
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

export function useAllMyBets(profileId: string | undefined) {
  return useQuery({
    queryKey: betQueryKeys.allMyBets(profileId!),
    queryFn: () => bettingService.getAllMyBets(profileId!),
    staleTime: 30 * 1000,
    enabled: !!profileId,
  })
}

export function useBetSummary(profileId: string | undefined) {
  const { data: allBets } = useAllMyBets(profileId)
  const { data: balance } = useMyBalance(profileId)

  if (!allBets || allBets.length === 0) {
    return {
      balance: balance ?? 0,
      totalInvested: 0,
      totalReturned: 0,
      netProfit: 0,
      totalBets: 0,
      wonBets: 0,
      lostBets: 0,
      pendingBets: 0,
      winRate: 0,
    }
  }

  const totalInvested = allBets.reduce((s: number, b: any) => s + b.amount, 0)
  const wonBets = allBets.filter((b: any) => b.status === 'WON')
  const lostBets = allBets.filter((b: any) => b.status === 'LOST')
  const pendingBets = allBets.filter((b: any) => b.status === 'PENDING')
  const totalReturned = wonBets.reduce((s: number, b: any) => s + b.potential_payout, 0)
  const settledCount = wonBets.length + lostBets.length

  return {
    balance: balance ?? 0,
    totalInvested,
    totalReturned,
    netProfit: totalReturned - totalInvested,
    totalBets: allBets.length,
    wonBets: wonBets.length,
    lostBets: lostBets.length,
    pendingBets: pendingBets.length,
    winRate: settledCount > 0 ? Math.round((wonBets.length / settledCount) * 100) : 0,
  }
}
