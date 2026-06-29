import { supabase } from '../lib/supabase'
import type { PlayerPosition } from '../types'

interface PlayerForBalance {
  profile_id: string
  name: string
  position: PlayerPosition | null
  goals: number
  assists: number
  wins: number
}

interface TeamAssignment {
  teamIndex: number
  playerIds: string[]
}

const POSITION_ORDER: (PlayerPosition | null)[] = [
  'GOLEIRO', 'ZAGUEIRO', 'LATERAL', null, 'MEIO_CAMPO', 'ATACANTE',
]

async function getPlayerStats(groupId: string, playerIds: string[]): Promise<Map<string, { goals: number; assists: number; wins: number }>> {
  const { data: matchIds } = await supabase
    .from('matches')
    .select('id')
    .eq('group_id', groupId)

  if (!matchIds || matchIds.length === 0) return new Map()

  const ids = matchIds.map(m => m.id)

  const [{ data: players }, { data: results }] = await Promise.all([
    supabase
      .from('match_players')
      .select('profile_id, goals, assists, match_id, team_id')
      .in('match_id', ids)
      .in('profile_id', playerIds),
    supabase
      .from('match_results')
      .select('match_id, team_id, score')
      .in('match_id', ids),
  ])

  const scoresByMatch = new Map<string, Map<string, number>>()
  for (const r of results ?? []) {
    if (!scoresByMatch.has(r.match_id)) scoresByMatch.set(r.match_id, new Map())
    scoresByMatch.get(r.match_id)!.set(r.team_id, r.score)
  }

  const statsMap = new Map<string, { goals: number; assists: number; wins: number }>()
  for (const p of players ?? []) {
    if (!statsMap.has(p.profile_id)) {
      statsMap.set(p.profile_id, { goals: 0, assists: 0, wins: 0 })
    }
    const s = statsMap.get(p.profile_id)!
    s.goals += p.goals || 0
    s.assists += p.assists || 0

    if (p.team_id && scoresByMatch.has(p.match_id)) {
      const matchScores = scoresByMatch.get(p.match_id)!
      const myScore = matchScores.get(p.team_id)
      if (myScore !== undefined) {
        const isWin = [...matchScores.entries()].every(([tid, score]) =>
          tid === p.team_id || score < myScore
        )
        if (isWin) s.wins++
      }
    }
  }

  return statsMap
}

function sinNormalize(value: number, max: number): number {
  if (max <= 0 || value <= 0) return 0
  return Math.sin((Math.min(value, max) / max) * Math.PI / 2)
}

function calcNormStrength(norm: number[]): number {
  return norm[0] * 2 + norm[1] * 1 + norm[2] * 3
}

function calcSynergy(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

function shuffle<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export async function balanceTeams(
  groupId: string,
  players: { profile_id: string; name: string; position: PlayerPosition | null }[],
  teamCount: number = 2
): Promise<TeamAssignment[]> {
  if (players.length < 2) return []

  const playerIds = players.map(p => p.profile_id)
  const statsMap = await getPlayerStats(groupId, playerIds)

  const enriched: PlayerForBalance[] = players.map(p => {
    const stats = statsMap.get(p.profile_id) || { goals: 0, assists: 0, wins: 0 }
    return { ...p, goals: stats.goals, assists: stats.assists, wins: stats.wins }
  })

  const maxGoals = Math.max(...enriched.map(p => p.goals), 1)
  const maxAssists = Math.max(...enriched.map(p => p.assists), 1)
  const maxWins = Math.max(...enriched.map(p => p.wins), 1)

  const normProfiles = new Map<string, number[]>()
  for (const p of enriched) {
    normProfiles.set(p.profile_id, [
      sinNormalize(p.goals, maxGoals),
      sinNormalize(p.assists, maxAssists),
      sinNormalize(p.wins, maxWins),
    ])
  }

  enriched.sort((a, b) => {
    const na = normProfiles.get(a.profile_id)!
    const nb = normProfiles.get(b.profile_id)!
    return calcNormStrength(nb) - calcNormStrength(na)
  })

  const maxPerTeam = Math.ceil(enriched.length / teamCount)
  const minPerTeam = Math.floor(enriched.length / teamCount)

  const teams: { players: PlayerForBalance[]; positionCount: Record<string, number>; totalStrength: number }[] = []
  for (let i = 0; i < teamCount; i++) {
    teams.push({ players: [], positionCount: {}, totalStrength: 0 })
  }

  function canAddToTeam(player: PlayerForBalance, teamIndex: number): boolean {
    const team = teams[teamIndex]
    if (team.players.length >= maxPerTeam) return false
    if (!player.position) return true
    const count = team.positionCount[player.position] || 0
    if (player.position === 'ZAGUEIRO' && count >= 2) return false
    if (player.position === 'GOLEIRO' && count >= 1) return false
    return true
  }

  const playersByPosition = new Map<string, PlayerForBalance[]>()
  for (const p of enriched) {
    const key = p.position || 'UNKNOWN'
    if (!playersByPosition.has(key)) playersByPosition.set(key, [])
    playersByPosition.get(key)!.push(p)
  }

  function scoreTeam(player: PlayerForBalance, team: typeof teams[0], teamIndex: number): number {
    if (!canAddToTeam(player, teamIndex)) return -Infinity
    const playerNorm = normProfiles.get(player.profile_id)!
    const avgSynergy = team.players.length > 0
      ? team.players.reduce((sum, tp) => sum + calcSynergy(playerNorm, normProfiles.get(tp.profile_id)!), 0) / team.players.length
      : 0
    return -team.totalStrength + avgSynergy * 3
  }

  for (const position of POSITION_ORDER) {
    const key = position || 'UNKNOWN'
    const positionPlayers = shuffle(playersByPosition.get(key) || [])
    for (const player of positionPlayers) {
      const scores = teams.map((team, idx) => scoreTeam(player, team, idx))
      const bestTeam = scores.indexOf(Math.max(...scores))
      teams[bestTeam].players.push(player)
      teams[bestTeam].totalStrength += calcNormStrength(normProfiles.get(player.profile_id)!)
      if (player.position) {
        teams[bestTeam].positionCount[player.position] = (teams[bestTeam].positionCount[player.position] || 0) + 1
      }
    }
  }

  for (let iter = 0; iter < 50; iter++) {
    let improved = false
    for (let ti = 0; ti < teamCount; ti++) {
      for (let tj = ti + 1; tj < teamCount; tj++) {
        for (const pi of teams[ti].players) {
          for (const pj of teams[tj].players) {
            if (!canAddToTeam(pj, ti) || !canAddToTeam(pi, tj)) continue
            if (pi.position === pj.position && pi.position === 'GOLEIRO') continue
            if (pi.position === 'ZAGUEIRO' && pj.position === 'ZAGUEIRO') {
              const tiZag = teams[ti].positionCount['ZAGUEIRO'] || 0
              const tjZag = teams[tj].positionCount['ZAGUEIRO'] || 0
              if (tiZag <= 2 && tjZag <= 2) continue
            }

            const piStrength = calcNormStrength(normProfiles.get(pi.profile_id)!)
            const pjStrength = calcNormStrength(normProfiles.get(pj.profile_id)!)

            const tiWithoutPi = teams[ti].totalStrength - piStrength
            const tjWithoutPj = teams[tj].totalStrength - pjStrength

            const tiAfter = tiWithoutPi + pjStrength
            const tjAfter = tjWithoutPj + piStrength

            const beforeImbalance = Math.abs(teams[ti].totalStrength - teams[tj].totalStrength)
            const afterImbalance = Math.abs(tiAfter - tjAfter)

            if (afterImbalance < beforeImbalance - 0.1) {
              const piPos = pi.position
              const pjPos = pj.position

              teams[ti].players = teams[ti].players.filter(p => p.profile_id !== pi.profile_id)
              teams[tj].players = teams[tj].players.filter(p => p.profile_id !== pj.profile_id)
              teams[ti].players.push(pj)
              teams[tj].players.push(pi)

              teams[ti].totalStrength = tiAfter
              teams[tj].totalStrength = tjAfter

              if (piPos) {
                teams[ti].positionCount[piPos] = (teams[ti].positionCount[piPos] || 0) - 1
                teams[tj].positionCount[piPos] = (teams[tj].positionCount[piPos] || 0) + 1
              }
              if (pjPos) {
                teams[tj].positionCount[pjPos] = (teams[tj].positionCount[pjPos] || 0) - 1
                teams[ti].positionCount[pjPos] = (teams[ti].positionCount[pjPos] || 0) + 1
              }

              improved = true
              break
            }
          }
          if (improved) break
        }
        if (improved) break
      }
      if (improved) break
    }
    if (!improved) break
  }

  const oversized = teams.some(t => t.players.length > maxPerTeam)
  const undersized = teams.some(t => t.players.length < minPerTeam)
  if (oversized || undersized) {
    const flat = teams.flatMap((t, i) => t.players.map(p => ({ ...p, teamIdx: i })))
    flat.sort((a, b) => {
      const na = normProfiles.get(a.profile_id)!
      const nb = normProfiles.get(b.profile_id)!
      return calcNormStrength(nb) - calcNormStrength(na)
    })
    for (const t of teams) { t.players = []; t.positionCount = {}; t.totalStrength = 0 }
    for (const player of flat) {
      const scores = teams.map((team, idx) => scoreTeam(player, team, idx))
      const bestTeam = scores.indexOf(Math.max(...scores))
      teams[bestTeam].players.push(player)
      teams[bestTeam].totalStrength += calcNormStrength(normProfiles.get(player.profile_id)!)
      if (player.position) {
        teams[bestTeam].positionCount[player.position] = (teams[bestTeam].positionCount[player.position] || 0) + 1
      }
    }
  }

  const result: TeamAssignment[] = []
  for (let i = 0; i < teamCount; i++) {
    result.push({
      teamIndex: i,
      playerIds: teams[i].players.map(p => p.profile_id),
    })
  }

  return result
}
