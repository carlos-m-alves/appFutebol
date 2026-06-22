import { useQuery } from '@tanstack/react-query'
import { matchService, getProfile } from '../services/api'
import type { Match, Profile, MatchAward, MatchResult, Team } from '../types'

interface MatchWithDetails extends Match {
  awards?: MatchAward | null
  results?: MatchResult[]
  teams?: Team[]
}

interface DashboardData {
  totalMatches: number
  recentMatches: MatchWithDetails[]
  topPlayers: { profile: Profile; avgRating: number }[]
}

async function fetchDashboardData(groupId: string): Promise<DashboardData> {
  const matches = await matchService.list(groupId)

  const finished = matches.filter(m => m.status === 'FINISHED').slice(0, 5)
  const withDetails = await Promise.all(
    finished.map(async (m) => {
      const [awards, results, teams] = await Promise.all([
        matchService.getAwards(m.id),
        matchService.getResults(m.id),
        matchService.getTeams(m.id),
      ])
      return { ...m, awards, results, teams }
    })
  )

  const playerRatings: Map<string, { total: number; count: number }> = new Map()
  for (const m of finished) {
    const ratings = await matchService.getRatings(m.id)
    for (const r of ratings) {
      if (!playerRatings.has(r.rated_profile_id)) {
        playerRatings.set(r.rated_profile_id, { total: 0, count: 0 })
      }
      const s = playerRatings.get(r.rated_profile_id)!
      s.total += r.rating
      s.count++
    }
  }

  const top: { profile: Profile; avgRating: number }[] = []
  for (const [id, s] of playerRatings) {
    if (s.count >= 2) {
      const prof = await getProfile(id)
      if (prof) top.push({ profile: prof, avgRating: Math.round((s.total / s.count) * 2) / 2 })
    }
  }

  return {
    totalMatches: matches.length,
    recentMatches: withDetails,
    topPlayers: top.sort((a, b) => b.avgRating - a.avgRating).slice(0, 5),
  }
}

export function useDashboardData(groupId: string | undefined) {
  return useQuery({
    queryKey: ['dashboard', groupId],
    queryFn: () => fetchDashboardData(groupId!),
    enabled: !!groupId,
    staleTime: 2 * 60 * 1000,
  })
}
