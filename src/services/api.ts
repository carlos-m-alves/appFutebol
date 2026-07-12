import { supabase } from '../lib/supabase'
import { sanitizeText, sanitizeOptional } from '../lib/sanitize'
import type {
  Group, GroupMember, Match, MatchModality, MatchConfirmation, Team,
  MatchPlayer, MatchResult, PlayerRating, MatchAward, RecurringSchedule, Profile, GroupJoinRequest, VoterPenalty,
  GroupFinanceConfig, PlayerFeeSettings, Payment, GroupExpense, FinanceSummary, MatchStats,
  MatchMarket, Bet, BetSelection,
  Championship, ChampionshipTeam, ChampionshipTeamPlayer, ChampionshipRound, ChampionshipStanding, PlayerPosition
} from '../types'

export const groupService = {
  async create(name: string, description: string): Promise<Group | null> {
    const cleanName = sanitizeText(name, 100)
    const cleanDescription = sanitizeText(description, 500)
    if (!cleanName) throw new Error('Nome do grupo inválido')

    const { data: user } = await supabase.auth.getUser()
    if (!user?.user?.id) throw new Error('Usuário não autenticado')

    const { data: code } = await supabase.rpc('generate_access_code')
    if (!code) throw new Error('Erro ao gerar código de acesso')

    const { data: group, error } = await supabase.rpc('create_group', {
      p_name: cleanName,
      p_description: cleanDescription,
      p_access_code: code,
    })

    if (error) throw error
    return group as unknown as Group
  },

  async join(accessCode: string, profileId: string): Promise<Group> {
    const { data: group, error: findError } = await supabase
      .from('groups')
      .select('*')
      .eq('access_code', accessCode.toUpperCase())
      .is('deleted_at', null)
      .single()
    if (findError || !group) throw new Error('Código de acesso inválido')

    const { error: joinError } = await supabase
      .from('group_members')
      .insert({ group_id: group.id, profile_id: profileId, role: 'MEMBER' })
    if (joinError) throw new Error('Você já é membro deste grupo')

    return group
  },

  async getMembers(groupId: string): Promise<GroupMember[]> {
    const { data } = await supabase
      .from('group_members')
      .select('*, profile:profiles(*)')
      .eq('group_id', groupId)
    return data ?? []
  },

  async leave(groupId: string, profileId: string) {
    const { error: deleteMemberError } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('profile_id', profileId)
    if (deleteMemberError) throw deleteMemberError

    const { error: deleteRequestError } = await supabase
      .from('group_join_requests')
      .delete()
      .eq('group_id', groupId)
      .eq('profile_id', profileId)
      .eq('status', 'APPROVED')
    if (deleteRequestError) throw deleteRequestError
  },

  async removeMember(groupId: string, profileId: string) {
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('profile_id', profileId)
    if (error) throw error
  },

  async promoteToAdmin(groupId: string, profileId: string) {
    const { error } = await supabase
      .from('group_members')
      .update({ role: 'ADMIN' })
      .eq('group_id', groupId)
      .eq('profile_id', profileId)
    if (error) throw error
  },

  async demoteFromAdmin(groupId: string, profileId: string) {
    const { error } = await supabase
      .from('group_members')
      .update({ role: 'MEMBER' })
      .eq('group_id', groupId)
      .eq('profile_id', profileId)
    if (error) throw error
  },

  async update(groupId: string, updates: Partial<Group>) {
    const { error } = await supabase
      .from('groups')
      .update(updates)
      .eq('id', groupId)
    if (error) throw error
  },

  async softDelete(groupId: string) {
    const { error } = await supabase
      .from('groups')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', groupId)
    if (error) throw error
  }
}

export const matchService = {
  async getMembers(groupId: string): Promise<GroupMember[]> {
    const { data } = await supabase
      .from('group_members')
      .select('*, profile:profiles(*)')
      .eq('group_id', groupId)
    return data ?? []
  },

  async create(data: {
    group_id: string, match_date: string, location: string,
    modality?: MatchModality,
    schedule_id?: string, is_recurring?: boolean,
    frequency?: string, day_of_week?: number, day_of_month?: number, hour?: string
  }): Promise<Match | null> {
    const cleanLocation = sanitizeText(data.location, 300)
    if (!cleanLocation) throw new Error('Local inválido')

    const { data: user } = await supabase.auth.getUser()
    if (!user?.user?.id) throw new Error('Usuário não autenticado')

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.user.id)
      .single()
    if (!profile) throw new Error('Perfil não encontrado')

    let scheduleId = data.schedule_id

    if (data.is_recurring && data.frequency) {
      const { data: schedule, error: schedError } = await supabase
        .from('recurring_schedules')
        .insert({
          group_id: data.group_id,
          frequency: data.frequency,
          day_of_week: data.day_of_week,
          day_of_month: data.day_of_month,
          hour: data.hour || '09:00'
        })
        .select()
        .single()
      if (schedError) throw schedError
      scheduleId = schedule?.id
    }

    const { data: match, error } = await supabase
      .from('matches')
      .insert({
        group_id: data.group_id,
        match_date: data.match_date,
        location: cleanLocation,
        modality: data.modality || 'SUICO',
        schedule_id: scheduleId,
        status: 'SCHEDULED',
        created_by: profile.id
      })
      .select()
      .single()

    if (error) throw error
    return match
  },

  async list(groupId: string): Promise<Match[]> {
    const { data } = await supabase
      .from('matches')
      .select('*')
      .eq('group_id', groupId)
      .order('match_date', { ascending: false })
    return data ?? []
  },

  async listWithResults(groupId: string): Promise<(Match & { results: (MatchResult & { team: Team })[]; players: MatchPlayer[]; teams: Team[]; awards: MatchAward | null })[]> {
    const { data: matches } = await supabase
      .from('matches')
      .select('*')
      .eq('group_id', groupId)
      .order('match_date', { ascending: false })

    if (!matches?.length) return []

    const matchIds = matches.map(m => m.id)

    const [results, players, teams, awards] = await Promise.all([
      supabase.from('match_results').select('*, team:teams(*)').in('match_id', matchIds),
      supabase.from('match_players').select('*, profile:profiles(*)').in('match_id', matchIds),
      supabase.from('teams').select('*').in('match_id', matchIds),
      supabase.from('match_awards').select('*, best_player:profiles!best_player_profile_id(*), top_scorer:profiles!top_scorer_profile_id(*), top_assist:profiles!top_assist_profile_id(*), worst_player:profiles!worst_player_profile_id(*)').in('match_id', matchIds),
    ])

    return matches.map(m => ({
      ...m,
      results: (results.data ?? []).filter(r => r.match_id === m.id),
      players: (players.data ?? []).filter(p => p.match_id === m.id),
      teams: (teams.data ?? []).filter(t => t.match_id === m.id),
      awards: (awards.data ?? []).find(a => a.match_id === m.id) || null,
    }))
  },

  async get(matchId: string): Promise<Match | null> {
    const { data } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single()
    return data
  },

  async update(matchId: string, updates: Partial<Match>) {
    const { error } = await supabase
      .from('matches')
      .update(updates)
      .eq('id', matchId)
    if (error) throw error
  },

  async getConfirmations(matchId: string): Promise<MatchConfirmation[]> {
    const { data } = await supabase
      .from('match_confirmations')
      .select('*, profile:profiles(*)')
      .eq('match_id', matchId)
    return data ?? []
  },

  async confirmAttendance(matchId: string, profileId: string, status: 'CONFIRMED' | 'DECLINED') {
    const { data: existing } = await supabase
      .from('match_confirmations')
      .select('id')
      .eq('match_id', matchId)
      .eq('profile_id', profileId)
      .single()

    if (existing) {
      await supabase
        .from('match_confirmations')
        .update({ status, confirmed_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('match_confirmations')
        .insert({ match_id: matchId, profile_id: profileId, status })
    }
  },

  async removeAttendance(matchId: string, profileId: string) {
    await supabase
      .from('match_confirmations')
      .delete()
      .eq('match_id', matchId)
      .eq('profile_id', profileId)
    await supabase
      .from('match_players')
      .delete()
      .eq('match_id', matchId)
      .eq('profile_id', profileId)
  },

  async getTeams(matchId: string): Promise<Team[]> {
    const { data } = await supabase
      .from('teams')
      .select('*')
      .eq('match_id', matchId)
    return data ?? []
  },

  async deleteTeam(teamId: string) {
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId)
    if (error) throw error
  },

  async saveTeams(matchId: string, teams: { name: string }[]) {
    await supabase.from('teams').delete().eq('match_id', matchId)
    if (teams.length > 0) {
      const { data } = await supabase
        .from('teams')
        .insert(teams.map(t => ({ match_id: matchId, name: t.name })))
        .select()
      return data
    }
  },

  async getPlayers(matchId: string): Promise<MatchPlayer[]> {
    const { data } = await supabase
      .from('match_players')
      .select('*, profile:profiles(*), team:teams(*)')
      .eq('match_id', matchId)
    return data ?? []
  },

  async addPlayer(matchId: string, profileId: string) {
    const { error } = await supabase
      .from('match_players')
      .insert({ match_id: matchId, profile_id: profileId, goals: 0, assists: 0, own_goals: 0, nutmeg_given: 0, nutmeg_done: 0, no_show: false })
    if (error) throw error
  },

  async updatePlayerTeam(matchId: string, profileId: string, teamId: string | null) {
    const { error } = await supabase
      .from('match_players')
      .update({ team_id: teamId })
      .eq('match_id', matchId)
      .eq('profile_id', profileId)
    if (error) throw error
  },

  async removePlayer(matchId: string, profileId: string) {
    const { error } = await supabase
      .from('match_players')
      .delete()
      .eq('match_id', matchId)
      .eq('profile_id', profileId)
    if (error) throw error
  },

  async addGuestPlayer(matchId: string, guestName: string, teamId?: string) {
    const cleanName = sanitizeText(guestName, 100)
    if (!cleanName) throw new Error('Nome do convidado inválido')
    const { error } = await supabase
      .from('match_players')
      .insert({ match_id: matchId, guest_name: cleanName, team_id: teamId || null, goals: 0, assists: 0, own_goals: 0, nutmeg_given: 0, nutmeg_done: 0, no_show: false })
    if (error) throw error
  },

  async removeMatchPlayer(playerId: string) {
    const { error } = await supabase
      .from('match_players')
      .delete()
      .eq('id', playerId)
    if (error) throw error
  },

  async updateMatchPlayerTeam(playerId: string, teamId: string | null) {
    const { error } = await supabase
      .from('match_players')
      .update({ team_id: teamId })
      .eq('id', playerId)
    if (error) throw error
  },

  async savePlayers(matchId: string, players: {
    profile_id: string, team_id?: string, goals?: number, assists?: number,
    own_goals?: number, nutmeg_given?: number, nutmeg_done?: number, no_show?: boolean
  }[]) {
    if (players.length > 0) {
      const { error } = await supabase
        .from('match_players')
        .upsert(
          players.map(p => ({
            match_id: matchId,
            profile_id: p.profile_id,
            team_id: p.team_id,
            goals: p.goals ?? 0,
            assists: p.assists ?? 0,
            own_goals: p.own_goals ?? 0,
            nutmeg_given: p.nutmeg_given ?? 0,
            nutmeg_done: p.nutmeg_done ?? 0,
            no_show: p.no_show ?? false
          })),
          { onConflict: 'match_id,profile_id', ignoreDuplicates: false }
        )
      if (error) throw error
    }
  },

  async updateGuestPlayerStats(players: {
    id: string; match_id?: string; team_id?: string; goals: number; assists: number; own_goals: number;
    nutmeg_given: number; nutmeg_done: number; no_show: boolean
  }[]) {
    if (players.length === 0) return
    const { error } = await supabase
      .from('match_players')
      .upsert(
        players.map(p => ({
          id: p.id,
          match_id: p.match_id,
          team_id: p.team_id,
          goals: p.goals ?? 0,
          assists: p.assists ?? 0,
          own_goals: p.own_goals ?? 0,
          nutmeg_given: p.nutmeg_given ?? 0,
          nutmeg_done: p.nutmeg_done ?? 0,
          no_show: p.no_show ?? false
        })),
        { onConflict: 'id', ignoreDuplicates: false }
      )
    if (error) throw error
  },

  async saveResults(matchId: string, results: { team_id: string; score: number }[]) {
    if (results.length === 0) return
    const { error } = await supabase
      .from('match_results')
      .upsert(
        results.map(r => ({ match_id: matchId, team_id: r.team_id, score: r.score })),
        { onConflict: 'match_id,team_id', ignoreDuplicates: false }
      )
    if (error) throw error
  },

  async getResults(matchId: string): Promise<MatchResult[]> {
    const { data } = await supabase
      .from('match_results')
      .select('*, team:teams(*)')
      .eq('match_id', matchId)
    return data ?? []
  },

  async getRatings(matchId: string): Promise<PlayerRating[]> {
    const { data } = await supabase
      .from('player_ratings')
      .select('*')
      .eq('match_id', matchId)
    return data ?? []
  },

  async getPublicRatings(matchId: string): Promise<(PlayerRating & { rated_profile: Profile })[]> {
    const { data } = await supabase
      .from('player_ratings')
      .select('*, rated_profile:profiles!rated_profile_id(*)')
      .eq('match_id', matchId)
    if (!data) return []
    const profileIds = new Set(data.map(r => r.rated_profile_id))

    const ratingMap = new Map<string, { count: number; total: number }>()
    for (const r of data) {
      if (!ratingMap.has(r.rated_profile_id)) {
        ratingMap.set(r.rated_profile_id, { count: 0, total: 0 })
      }
      const entry = ratingMap.get(r.rated_profile_id)!
      entry.count++
      entry.total += r.rating
    }

    return Array.from(profileIds).map(id => ({
      rated_profile_id: id,
      rated_profile: data.find(r => r.rated_profile_id === id)!.rated_profile,
      rating: Math.round((ratingMap.get(id)!.total / ratingMap.get(id)!.count) * 2) / 2,
      id: '',
      match_id: matchId,
      rater_profile_id: '',
      comment: null,
      created_at: ''
    }))
  },

  async submitRating(matchId: string, raterProfileId: string, ratedProfileId: string, rating: number, comment?: string) {
    const cleanComment = sanitizeOptional(comment, 500)
    const { error } = await supabase
      .from('player_ratings')
      .insert({
        match_id: matchId,
        rater_profile_id: raterProfileId,
        rated_profile_id: ratedProfileId,
        rating,
        comment: cleanComment
      })
    if (error) throw error
  },

  async getAwards(matchId: string): Promise<MatchAward | null> {
    const { data } = await supabase
      .from('match_awards')
      .select('*, best_player:profiles!best_player_profile_id(*), top_scorer:profiles!top_scorer_profile_id(*), top_assist:profiles!top_assist_profile_id(*), worst_player:profiles!worst_player_profile_id(*)')
      .eq('match_id', matchId)
      .maybeSingle()
    return data
  },

  async calculateAwards(matchId: string) {
    const { error } = await supabase.rpc('calculate_match_awards', { p_match_id: matchId })
    if (error) throw error
  },

  async getVoterPenalties(matchId: string): Promise<VoterPenalty[]> {
    const { data } = await supabase
      .from('voter_penalties')
      .select('*')
      .eq('match_id', matchId)
    return data ?? []
  },

  async clearVoterPenalty(matchId: string, profileId: string) {
    const { error } = await supabase
      .from('voter_penalties')
      .update({ warned: true })
      .eq('match_id', matchId)
      .eq('profile_id', profileId)
    if (error) throw error
  },

  async getSchedules(groupId: string): Promise<RecurringSchedule[]> {
    const { data } = await supabase
      .from('recurring_schedules')
      .select('*')
      .eq('group_id', groupId)
      .eq('active', true)
    return data ?? []
  },

  async getPlayerStats(profileId: string, groupId?: string): Promise<{
    goals: number; assists: number; own_goals: number; nutmeg_given: number; nutmeg_done: number
    matchesPlayed: number; avgRating: number | null; matchesWon: number
  }> {
    let query = supabase
      .from('match_players')
      .select('*, matches!inner(*)')
      .eq('profile_id', profileId)

    if (groupId) {
      query = query.eq('matches.group_id', groupId)
    }

    const { data: playerData } = await query

    const goals = playerData?.reduce((sum, p) => sum + (p.goals || 0), 0) ?? 0
    const assists = playerData?.reduce((sum, p) => sum + (p.assists || 0), 0) ?? 0
    const own_goals = playerData?.reduce((sum, p) => sum + (p.own_goals || 0), 0) ?? 0
    const nutmeg_given = playerData?.reduce((sum, p) => sum + (p.nutmeg_given || 0), 0) ?? 0
    const nutmeg_done = playerData?.reduce((sum, p) => sum + (p.nutmeg_done || 0), 0) ?? 0
    const matchesWon = playerData?.filter(p => p.won_match).length ?? 0
    const matchesPlayed = playerData?.length ?? 0

    let ratingQuery = supabase
      .from('player_ratings')
      .select('rating')
      .eq('rated_profile_id', profileId)

    if (groupId) {
      const { data: gMatchIds } = await supabase
        .from('matches')
        .select('id')
        .eq('group_id', groupId)

      if (gMatchIds && gMatchIds.length > 0) {
        ratingQuery = ratingQuery.in('match_id', gMatchIds.map(m => m.id))
      }
    }

    const { data: ratingData } = await ratingQuery

    let avgRating = ratingData && ratingData.length > 0
      ? Math.round((ratingData.reduce((sum, r) => sum + r.rating, 0) / ratingData.length) * 2) / 2
      : null

    // Apply voter penalty deduction
    if (avgRating !== null) {
      const { data: penalties } = await supabase
        .from('voter_penalties')
        .select('penalty_count')
        .eq('profile_id', profileId)

      const totalPenalty = penalties?.reduce((sum, p) => sum + p.penalty_count, 0) ?? 0
      if (totalPenalty > 0) {
        avgRating = Math.max(1.0, Math.round((avgRating - totalPenalty * 0.5) * 2) / 2)
      }
    }

    return { goals, assists, own_goals, nutmeg_given, nutmeg_done, matchesPlayed, avgRating, matchesWon }
  },

  async getGroupStats(groupId: string): Promise<MatchStats[]> {
    const { data: matchIds } = await supabase
      .from('matches')
      .select('id')
      .eq('group_id', groupId)

    if (!matchIds || matchIds.length === 0) return []

    const ids = matchIds.map(m => m.id)
    const { data: players } = await supabase
      .from('match_players')
      .select('*, profile:profiles(*)')
      .in('match_id', ids)

    if (!players) return []

    const statsMap = new Map<string, {
      profile: Profile; goals: number; assists: number; own_goals: number
      nutmeg_given: number; nutmeg_done: number; matchesPlayed: number
    }>()

    for (const p of players) {
      if (!statsMap.has(p.profile_id)) {
        statsMap.set(p.profile_id, {
          profile: p.profile!,
          goals: 0,
          assists: 0,
          own_goals: 0,
          nutmeg_given: 0,
          nutmeg_done: 0,
          matchesPlayed: 0
        })
      }
      const stat = statsMap.get(p.profile_id)!
      stat.goals += p.goals || 0
      stat.assists += p.assists || 0
      stat.own_goals += p.own_goals || 0
      stat.nutmeg_given += p.nutmeg_given || 0
      stat.nutmeg_done += p.nutmeg_done || 0
      stat.matchesPlayed++
    }

    const profileIds = Array.from(statsMap.keys()).filter(k => k)
    const ratingsByProfile: Record<string, number[]> = {}

    if (profileIds.length > 0) {
      const { data: allRatings } = await supabase
        .from('player_ratings')
        .select('rated_profile_id, rating')
        .in('rated_profile_id', profileIds)
        .in('match_id', ids)

      for (const r of allRatings ?? []) {
        if (!ratingsByProfile[r.rated_profile_id]) ratingsByProfile[r.rated_profile_id] = []
        ratingsByProfile[r.rated_profile_id].push(r.rating)
      }
    }

    // Fetch voter penalties to apply deduction
    const penaltiesByProfile: Record<string, number> = {}
    if (profileIds.length > 0) {
      const { data: allPenalties } = await supabase
        .from('voter_penalties')
        .select('profile_id, penalty_count')
        .in('profile_id', profileIds)

      for (const p of allPenalties ?? []) {
        penaltiesByProfile[p.profile_id] = (penaltiesByProfile[p.profile_id] || 0) + p.penalty_count
      }
    }

    const result: MatchStats[] = []

    for (const [profileId, stat] of statsMap) {
      const profileRatings = ratingsByProfile[profileId] ?? []
      let avgRating = profileRatings.length > 0
        ? Math.round((profileRatings.reduce((sum, r) => sum + r, 0) / profileRatings.length) * 2) / 2
        : null

      // Apply voter penalty deduction
      if (avgRating !== null && penaltiesByProfile[profileId]) {
        avgRating = Math.max(1.0, Math.round((avgRating - penaltiesByProfile[profileId] * 0.5) * 2) / 2)
      }

      result.push({
        player_id: profileId,
        player_name: stat.profile.name,
        player_avatar: stat.profile.avatar_url,
        goals: stat.goals,
        assists: stat.assists,
        own_goals: stat.own_goals,
        nutmeg_given: stat.nutmeg_given,
        nutmeg_done: stat.nutmeg_done,
        matches_played: stat.matchesPlayed,
        avg_rating: avgRating
      })
    }

    return result.sort((a, b) => b.goals - a.goals)
  },

  async getHallOfFame(groupId: string, filters?: { year?: number; playerId?: string }) {
    let matchQuery = supabase.from('matches').select('id').eq('group_id', groupId)

    if (filters?.year) {
      const yearStart = new Date(`${filters.year}-01-01`).toISOString()
      const yearEnd = new Date(`${filters.year}-12-31`).toISOString()
      matchQuery = matchQuery.gte('match_date', yearStart).lte('match_date', yearEnd)
    }

    const { data: matchIds } = await matchQuery
    if (!matchIds || matchIds.length === 0) return []

    const ids = matchIds.map(m => m.id)
    const { data } = await supabase
      .from('match_awards')
      .select('*, match:matches(*), best_player:profiles!best_player_profile_id(*), top_scorer:profiles!top_scorer_profile_id(*), top_assist:profiles!top_assist_profile_id(*), worst_player:profiles!worst_player_profile_id(*)')
      .in('match_id', ids)
      .order('created_at', { ascending: false })

    if (data && data.length > 0) {
      const { data: results } = await supabase
        .from('match_results')
        .select('*, team:teams(*)')
        .in('match_id', ids)
      if (results) {
        (data as any[]).forEach((entry: any) => {
          entry.match_results = results.filter((r: any) => r.match_id === entry.match_id)
        })
      }
    }

    return data ?? []
  }
}

export interface PlayerRankingStats {
  player_id: string
  player_name: string
  player_avatar: string | null
  goals: number
  assists: number
  own_goals: number
  nutmeg_given: number
  nutmeg_done: number
  wins: number
  draws: number
  losses: number
  last3: ('win' | 'draw' | 'loss')[]
}

export const rankingService = {
  async getStats(groupId: string, filters?: { year?: number; playerId?: string }): Promise<PlayerRankingStats[]> {
    let matchQuery = supabase.from('matches').select('id, match_date').eq('group_id', groupId)

    if (filters?.year) {
      const yearStart = new Date(`${filters.year}-01-01`).toISOString()
      const yearEnd = new Date(`${filters.year}-12-31`).toISOString()
      matchQuery = matchQuery.gte('match_date', yearStart).lte('match_date', yearEnd)
    }

    const { data: matchData } = await matchQuery
    if (!matchData || matchData.length === 0) return []

    const ids = matchData.map(m => m.id)
    const matchDateMap = new Map(matchData.map(m => [m.id, m.match_date]))

    let playersQuery = supabase
      .from('match_players')
      .select('*, profile:profiles(*)')
      .in('match_id', ids)

    if (filters?.playerId) {
      playersQuery = playersQuery.eq('profile_id', filters.playerId)
    }

    const { data: players } = await playersQuery
    if (!players) return []

    const { data: results } = await supabase
      .from('match_results')
      .select('*, team:teams(*)')
      .in('match_id', ids)

    const scoresByMatch: Record<string, { team_id: string; score: number }[]> = {}
    for (const r of results ?? []) {
      if (!scoresByMatch[r.match_id]) scoresByMatch[r.match_id] = []
      scoresByMatch[r.match_id].push({ team_id: r.team_id, score: r.score })
    }

    function getMatchResult(matchId: string, teamId: string): 'win' | 'draw' | 'loss' | null {
      const matchScores = scoresByMatch[matchId]
      if (!matchScores || matchScores.length < 2) return null
      const teamScore = matchScores.find(s => s.team_id === teamId)?.score ?? -1
      const otherScore = matchScores.find(s => s.team_id !== teamId)?.score ?? -1
      if (teamScore < 0 || otherScore < 0) return null
      if (teamScore > otherScore) return 'win'
      if (teamScore < otherScore) return 'loss'
      return 'draw'
    }

    const statsMap = new Map<string, {
      profile: Profile; goals: number; assists: number; own_goals: number
      nutmeg_given: number; nutmeg_done: number; wins: number; draws: number; losses: number
      matchHistory: { result: 'win' | 'draw' | 'loss'; date: string }[]
    }>()

    for (const p of players) {
      if (!p.profile_id || !p.profile) continue
      if (!statsMap.has(p.profile_id)) {
        statsMap.set(p.profile_id, {
          profile: p.profile,
          goals: 0, assists: 0, own_goals: 0,
          nutmeg_given: 0, nutmeg_done: 0,
          wins: 0, draws: 0, losses: 0,
          matchHistory: [],
        })
      }
      const stat = statsMap.get(p.profile_id)!
      stat.goals += p.goals || 0
      stat.assists += p.assists || 0
      stat.own_goals += p.own_goals || 0
      stat.nutmeg_given += p.nutmeg_given || 0
      stat.nutmeg_done += p.nutmeg_done || 0

      if (p.team_id) {
        const result = getMatchResult(p.match_id, p.team_id)
        if (result) {
          if (result === 'win') stat.wins++
          else if (result === 'draw') stat.draws++
          else stat.losses++
          stat.matchHistory.push({ result, date: matchDateMap.get(p.match_id) || '' })
        }
      }
    }

    const result: PlayerRankingStats[] = []

    for (const [, stat] of statsMap) {
      stat.matchHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      const last3 = stat.matchHistory.slice(0, 3).map(h => h.result)

      result.push({
        player_id: stat.profile.id,
        player_name: stat.profile.name,
        player_avatar: stat.profile.avatar_url,
        goals: stat.goals,
        assists: stat.assists,
        own_goals: stat.own_goals,
        nutmeg_given: stat.nutmeg_given,
        nutmeg_done: stat.nutmeg_done,
        wins: stat.wins,
        draws: stat.draws,
        losses: stat.losses,
        last3,
      })
    }

    return result.sort((a, b) => b.goals - a.goals)
  },
}

export const groupJoinRequestService = {
  async create(groupId: string, profileId: string): Promise<void> {
    const { error } = await supabase
      .from('group_join_requests')
      .upsert(
        { group_id: groupId, profile_id: profileId, status: 'PENDING', created_at: new Date().toISOString() },
        { onConflict: 'group_id, profile_id', ignoreDuplicates: false }
      )
    if (error) throw error
  },

  async getPending(groupId: string): Promise<GroupJoinRequest[]> {
    const { data } = await supabase
      .from('group_join_requests')
      .select('*, profile:profiles(*)')
      .eq('group_id', groupId)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false })
    return data ?? []
  },

  async approve(requestId: string, groupId: string, profileId: string): Promise<void> {
    const { error: updateError } = await supabase
      .from('group_join_requests')
      .update({ status: 'APPROVED' })
      .eq('id', requestId)
    if (updateError) throw updateError

    const { error: joinError } = await supabase
      .from('group_members')
      .insert({ group_id: groupId, profile_id: profileId, role: 'MEMBER' })
    if (joinError) throw joinError
  },

  async reject(requestId: string): Promise<void> {
    const { error } = await supabase
      .from('group_join_requests')
      .update({ status: 'REJECTED' })
      .eq('id', requestId)
    if (error) throw error
  },

  async cancel(groupId: string, profileId: string): Promise<void> {
    const { error } = await supabase
      .from('group_join_requests')
      .delete()
      .eq('group_id', groupId)
      .eq('profile_id', profileId)
      .eq('status', 'PENDING')
    if (error) throw error
  }
}

export async function getProfileByAuthId(authUserId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', authUserId)
    .single()
  return data
}

export async function getProfile(id: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()
  return data
}

export async function updateProfile(profileId: string, updates: { name?: string; avatar_url?: string | null; position?: string | null; birth_date?: string | null; weight?: number | null; dominant_foot?: string | null }): Promise<void> {
  const clean: Record<string, unknown> = {}
  if (updates.name !== undefined) {
    const n = sanitizeText(updates.name, 100)
    if (!n) throw new Error('Nome inválido')
    clean.name = n
  }
  if (updates.avatar_url !== undefined) {
    clean.avatar_url = updates.avatar_url
  }
  if (updates.position !== undefined) {
    clean.position = updates.position || null
  }
  if (updates.birth_date !== undefined) {
    clean.birth_date = updates.birth_date || null
  }
  if (updates.weight !== undefined) {
    clean.weight = updates.weight
  }
  if (updates.dominant_foot !== undefined) {
    clean.dominant_foot = updates.dominant_foot || null
  }
  const { error } = await supabase
    .from('profiles')
    .update(clean)
    .eq('id', profileId)
  if (error) throw error
}

export const bettingService = {
  async getMarkets(matchId: string): Promise<(MatchMarket & { player?: Profile | null; team?: Team | null })[]> {
    const { data } = await supabase
      .from('match_markets')
      .select('*, player:profiles(*), team:teams(*)')
      .eq('match_id', matchId)
      .order('market_type', { ascending: true })
    return data ?? []
  },

  async getBets(matchId: string): Promise<(Bet & { selections: (BetSelection & { market?: MatchMarket | null })[]; profile?: Profile | null })[]> {
    const { data: bets } = await supabase
      .from('bets')
      .select('*, profile:profiles(*)')
      .eq('match_id', matchId)
      .order('created_at', { ascending: false })

    if (!bets?.length) return []

    const betIds = bets.map(b => b.id)
    const { data: selections } = await supabase
      .from('bet_selections')
      .select('*, market:match_markets(*)')
      .in('bet_id', betIds)

    return bets.map(b => ({
      ...b,
      selections: (selections ?? []).filter(s => s.bet_id === b.id),
    }))
  },

  async getMyBets(matchId: string, profileId: string): Promise<(Bet & { selections: (BetSelection & { market?: MatchMarket | null })[] })[]> {
    const { data: bets } = await supabase
      .from('bets')
      .select('*')
      .eq('match_id', matchId)
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })

    if (!bets?.length) return []

    const betIds = bets.map(b => b.id)
    const { data: selections } = await supabase
      .from('bet_selections')
      .select('*, market:match_markets(*)')
      .in('bet_id', betIds)

    return bets.map(b => ({
      ...b,
      selections: (selections ?? []).filter(s => s.bet_id === b.id),
    }))
  },

  async getMyBalance(profileId: string): Promise<number> {
    const { data } = await supabase
      .from('profiles')
      .select('betting_balance')
      .eq('id', profileId)
      .single()
    return data?.betting_balance ?? 0
  },

  async placeBet(params: {
    profileId: string
    matchId: string
    marketIds: string[]
    amount: number
    totalOdds: number
  }): Promise<void> {
    const potentialPayout = Math.round(params.amount * params.totalOdds * 100) / 100

    const { data: profile } = await supabase
      .from('profiles')
      .select('betting_balance')
      .eq('id', params.profileId)
      .single()

    if (!profile) throw new Error('Perfil não encontrado')
    if (profile.betting_balance < params.amount) throw new Error('Saldo insuficiente')

    const { data: newMarkets } = await supabase
      .from('match_markets')
      .select('*')
      .in('id', params.marketIds)

    if (!newMarkets?.length) throw new Error('Mercados não encontrados')

    const { data: existingBets } = await supabase
      .from('bets')
      .select('id')
      .eq('match_id', params.matchId)
      .eq('profile_id', params.profileId)
      .eq('status', 'PENDING')

    if (existingBets && existingBets.length > 0) {
      const existingBetIds = existingBets.map(b => b.id)

      const { data: existingSelections } = await supabase
        .from('bet_selections')
        .select('*, market:match_markets(*)')
        .in('bet_id', existingBetIds)

      for (const newMarket of newMarkets) {
        for (const sel of existingSelections ?? []) {
          const em = sel.market
          if (!em) continue

          if (newMarket.market_type === 'WINNER' && em.market_type === 'WINNER') {
            throw new Error('Você já tem uma aposta pendente em um time vencedor.')
          }

          if (newMarket.player_id && em.player_id && newMarket.player_id === em.player_id) {
            const noShowConflicts = ['PLAYER_SCORES', 'PLAYER_ASSIST', 'PLAYER_NUTMEG']
            if (
              (newMarket.market_type === 'PLAYER_NO_SHOW' && noShowConflicts.includes(em.market_type)) ||
              (em.market_type === 'PLAYER_NO_SHOW' && noShowConflicts.includes(newMarket.market_type))
            ) {
              throw new Error('Você já tem uma aposta pendente conflitante para este jogador.')
            }
          }
        }
      }
    }

    const betType = params.marketIds.length > 1 ? 'MULTIPLE' : 'SINGLE'

    const { data: bet, error: betError } = await supabase
      .from('bets')
      .insert({
        profile_id: params.profileId,
        match_id: params.matchId,
        amount: params.amount,
        total_odds: params.totalOdds,
        potential_payout: potentialPayout,
        bet_type: betType,
        status: 'PENDING',
      })
      .select()
      .single()

    if (betError) throw betError

    const { error: selError } = await supabase
      .from('bet_selections')
      .insert(
        params.marketIds.map(marketId => ({
          bet_id: bet.id,
          market_id: marketId,
        }))
      )

    if (selError) throw selError

    const { error: balanceError } = await supabase
      .from('profiles')
      .update({ betting_balance: (profile.betting_balance - params.amount) })
      .eq('id', params.profileId)

    if (balanceError) throw balanceError
  },

  async getAllMyBets(profileId: string): Promise<any[]> {
    const { data: bets } = await supabase
      .from('bets')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })

    if (!bets?.length) return []

    const betIds = bets.map(b => b.id)
    const matchIds = [...new Set(bets.map(b => b.match_id))]

    const [selectionsResult, matchesResult] = await Promise.all([
      supabase.from('bet_selections').select('*, market:match_markets(*)').in('bet_id', betIds),
      supabase.from('matches').select('*, group:groups(name)').in('id', matchIds),
    ])

    const selections = selectionsResult.data ?? []
    const matches = matchesResult.data ?? []

    return bets.map(b => ({
      ...b,
      match: matches.find(m => m.id === b.match_id) || null,
      selections: selections.filter(s => s.bet_id === b.id),
    }))
  },

  async generateMarkets(matchId: string): Promise<void> {
    const { error } = await supabase.rpc('generate_match_markets', { p_match_id: matchId })
    if (error) throw error
  },

  async settleMarkets(matchId: string): Promise<void> {
    const { error } = await supabase.rpc('settle_match_markets', { p_match_id: matchId })
    if (error) throw error
  },
}

export const championshipService = {
  async list(groupId: string): Promise<Championship[]> {
    const { data } = await supabase
      .from('championships')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
    return data ?? []
  },

  async get(id: string): Promise<Championship & { teams: (ChampionshipTeam & { players: (ChampionshipTeamPlayer & { profile: Profile | null })[] })[] } | null> {
    const { data } = await supabase
      .from('championships')
      .select('*, teams:championship_teams(*, players:championship_team_players(*, profile:profiles(*)))')
      .eq('id', id)
      .single()
    return data
  },

  async create(params: {
    group_id: string
    name: string
    team_count: number
    teams: {
      name: string
      players: { profile_id?: string; guest_name?: string; position?: PlayerPosition }[]
    }[]
  }): Promise<Championship | null> {
    const { data: user } = await supabase.auth.getUser()
    if (!user?.user?.id) throw new Error('Usuário não autenticado')

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.user.id)
      .single()
    if (!profile) throw new Error('Perfil não encontrado')

    const { data: championship, error } = await supabase
      .from('championships')
      .insert({
        group_id: params.group_id,
        name: sanitizeText(params.name, 100),
        team_count: params.team_count,
        created_by: profile.id,
      })
      .select()
      .single()

    if (error) throw error
    if (!championship) return null

    const teams = params.teams.map(t => ({
      championship_id: championship.id,
      name: sanitizeText(t.name, 50),
    }))

    const { data: createdTeams, error: teamsError } = await supabase
      .from('championship_teams')
      .insert(teams)
      .select()

    if (teamsError) throw teamsError

    const players = createdTeams!.flatMap((ct, i) =>
      params.teams[i].players.map(p => ({
        championship_team_id: ct.id,
        profile_id: p.profile_id || null,
        guest_name: p.guest_name ? sanitizeText(p.guest_name, 100) : null,
        position: p.position || null,
      }))
    )

    if (players.length > 0) {
      const { error: playersError } = await supabase
        .from('championship_team_players')
        .insert(players)
      if (playersError) throw playersError
    }

    return championship
  },

  async start(id: string, roundDates: { round_number: number; match_date: string; location: string }[]): Promise<void> {
    const { data: championship, error: getError } = await supabase
      .from('championships')
      .select('*, rounds:championship_rounds(*), teams:championship_teams(*, players:championship_team_players(*))')
      .eq('id', id)
      .single()

    if (getError) throw getError
    if (!championship) throw new Error('Campeonato não encontrado')
    if (championship.status !== 'DRAFT') throw new Error('Campeonato já foi iniciado')

    const { data: user } = await supabase.auth.getUser()
    if (!user?.user?.id) throw new Error('Usuário não autenticado')

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.user.id)
      .single()
    if (!profile) throw new Error('Perfil não encontrado')

    const matchInserts = roundDates.map(rd => {
      const round = championship.rounds.find(r => r.round_number === rd.round_number)
      if (!round) throw new Error(`Rodada ${rd.round_number} não encontrada`)
      const matchDate = rd.match_date || new Date().toISOString()
      const location = rd.location?.trim() || 'A definir'
      return {
        group_id: championship.group_id,
        match_date: matchDate,
        location: sanitizeText(location, 300),
        modality: 'SUICO' as MatchModality,
        status: 'SCHEDULED',
        created_by: profile.id,
      }
    })

    const { data: createdMatches, error: matchesError } = await supabase
      .from('matches')
      .insert(matchInserts)
      .select()

    if (matchesError) throw matchesError

    const roundsSorted = [...championship.rounds].sort((a, b) => a.round_number - b.round_number)

    for (let i = 0; i < createdMatches!.length; i++) {
      const m = createdMatches![i]
      const rd = roundDates[i]
      const round = roundsSorted[i]

      const { error: err1 } = await supabase
        .from('championship_rounds')
        .update({ match_id: m.id })
        .eq('id', round.id)
      if (err1) throw err1

      const { error: err2 } = await supabase
        .from('matches')
        .update({ championship_id: id })
        .eq('id', m.id)
      if (err2) throw err2
    }

    for (const round of roundsSorted) {
      if (!round.match_id) continue

      const homeTeam = championship.teams.find(t => t.id === round.home_team_id)
      const awayTeam = championship.teams.find(t => t.id === round.away_team_id)

      const { data: matchTeams } = await supabase
        .from('teams')
        .insert([
          { match_id: round.match_id, name: homeTeam?.name || 'Time A' },
          { match_id: round.match_id, name: awayTeam?.name || 'Time B' },
        ])
        .select()

      if (matchTeams) {
        const homeMatchTeam = matchTeams[0]
        const awayMatchTeam = matchTeams[1]

        const homePlayers = (homeTeam?.players || []).filter(p => p.profile_id)
        const awayPlayers = (awayTeam?.players || []).filter(p => p.profile_id)

        const allMatchPlayers = [
          ...homePlayers.map(p => ({
            match_id: round.match_id!,
            profile_id: p.profile_id,
            team_id: homeMatchTeam.id,
            goals: 0, assists: 0, own_goals: 0, nutmeg_given: 0, nutmeg_done: 0, no_show: false,
          })),
          ...awayPlayers.map(p => ({
            match_id: round.match_id!,
            profile_id: p.profile_id,
            team_id: awayMatchTeam.id,
            goals: 0, assists: 0, own_goals: 0, nutmeg_given: 0, nutmeg_done: 0, no_show: false,
          })),
        ]

        if (allMatchPlayers.length > 0) {
          const { error: mpError } = await supabase
            .from('match_players')
            .insert(allMatchPlayers)
          if (mpError) throw mpError
        }
      }
    }

    const { error: updateError } = await supabase
      .from('championships')
      .update({ status: 'ACTIVE' })
      .eq('id', id)

    if (updateError) throw updateError
  },

  async generateRounds(id: string, type: 'first' | 'all'): Promise<ChampionshipRound[]> {
    const { data: championship, error: getError } = await supabase
      .from('championships')
      .select('*, teams:championship_teams(*)')
      .eq('id', id)
      .single()

    if (getError) throw getError
    if (!championship) throw new Error('Campeonato não encontrado')
    if (championship.status !== 'DRAFT') throw new Error('Campeonato já foi iniciado')

    const { error: deleteError } = await supabase
      .from('championship_rounds')
      .delete()
      .eq('championship_id', id)
    if (deleteError) throw deleteError

    const teamIds = championship.teams.map(t => t.id)
    const rawRounds = generateRoundRobin(teamIds, type)
    const rounds = rawRounds.map(r => ({ ...r, championship_id: championship.id }))

    if (rounds.length > 0) {
      const { error: roundsError } = await supabase
        .from('championship_rounds')
        .insert(rounds)
      if (roundsError) throw roundsError
    }

    const { data: createdRounds } = await supabase
      .from('championship_rounds')
      .select('*, home_team:championship_teams(*), away_team:championship_teams(*)')
      .eq('championship_id', id)
      .order('round_number', { ascending: true })

    return createdRounds ?? []
  },

  async startRoundMatch(roundId: string): Promise<string> {
    const { data: round, error: roundError } = await supabase
      .from('championship_rounds')
      .select('*')
      .eq('id', roundId)
      .single()
    if (roundError) throw roundError
    if (!round) throw new Error('Rodada não encontrada')
    if (round.match_id) return round.match_id

    const { data: championship, error: champError } = await supabase
      .from('championships')
      .select('*')
      .eq('id', round.championship_id)
      .single()
    if (champError) throw champError
    if (!championship) throw new Error('Campeonato não encontrado')

    const { data: homeTeam, error: htError } = await supabase
      .from('championship_teams')
      .select('*, players:championship_team_players(*)')
      .eq('id', round.home_team_id)
      .single()
    if (htError) throw htError

    const { data: awayTeam, error: atError } = await supabase
      .from('championship_teams')
      .select('*, players:championship_team_players(*)')
      .eq('id', round.away_team_id)
      .single()
    if (atError) throw atError

    const { data: user } = await supabase.auth.getUser()
    if (!user?.user?.id) throw new Error('Usuário não autenticado')

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.user.id)
      .single()
    if (!profile) throw new Error('Perfil não encontrado')

    const { data: match, error: matchError } = await supabase
      .from('matches')
      .insert({
        group_id: championship.group_id,
        match_date: new Date().toISOString(),
        location: 'A definir',
        modality: 'SUICO',
        status: 'SCHEDULED',
        created_by: profile.id,
      })
      .select()
      .single()
    if (matchError) throw matchError
    if (!match) throw new Error('Erro ao criar partida')

    const { error: updateRoundError } = await supabase
      .from('championship_rounds')
      .update({ match_id: match.id })
      .eq('id', roundId)
    if (updateRoundError) throw updateRoundError

    const { error: updateMatchError } = await supabase
      .from('matches')
      .update({ championship_id: round.championship_id })
      .eq('id', match.id)
    if (updateMatchError) throw updateMatchError

    const { data: matchTeams, error: mtError } = await supabase
      .from('teams')
      .insert([
        { match_id: match.id, name: homeTeam?.name || 'Time A' },
        { match_id: match.id, name: awayTeam?.name || 'Time B' },
      ])
      .select()
    if (mtError) throw mtError

    if (matchTeams) {
      const homeMatchTeam = matchTeams[0]
      const awayMatchTeam = matchTeams[1]

      const homePlayers = (homeTeam?.players || []).filter((p: any) => p.profile_id)
      const awayPlayers = (awayTeam?.players || []).filter((p: any) => p.profile_id)

      const allMatchPlayers = [
        ...homePlayers.map((p: any) => ({
          match_id: match.id,
          profile_id: p.profile_id,
          team_id: homeMatchTeam.id,
          goals: 0, assists: 0, own_goals: 0, nutmeg_given: 0, nutmeg_done: 0, no_show: false,
        })),
        ...awayPlayers.map((p: any) => ({
          match_id: match.id,
          profile_id: p.profile_id,
          team_id: awayMatchTeam.id,
          goals: 0, assists: 0, own_goals: 0, nutmeg_given: 0, nutmeg_done: 0, no_show: false,
        })),
      ]

      if (allMatchPlayers.length > 0) {
        const { error: mpError } = await supabase
          .from('match_players')
          .insert(allMatchPlayers)
        if (mpError) throw mpError
      }
    }

    return match.id
  },

  async finish(id: string): Promise<void> {
    const { error } = await supabase
      .from('championships')
      .update({ status: 'FINISHED', finished_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  },

  async getRounds(id: string): Promise<any[]> {
    const { data: rounds } = await supabase
      .from('championship_rounds')
      .select('*')
      .eq('championship_id', id)
      .order('round_number', { ascending: true })

    if (!rounds?.length) return []

    const matchIds = rounds.filter(r => r.match_id).map(r => r.match_id)
    let matches: any[] = []
    let matchResults: any[] = []
    let matchTeams: any[] = []

    if (matchIds.length > 0) {
      const [mRes, mrRes, mtRes] = await Promise.all([
        supabase.from('matches').select('*').in('id', matchIds),
        supabase.from('match_results').select('*').in('match_id', matchIds),
        supabase.from('teams').select('*').in('match_id', matchIds),
      ])
      matches = mRes.data ?? []
      matchResults = mrRes.data ?? []
      matchTeams = mtRes.data ?? []
    }

    const teamIds = new Set<string>()
    rounds.forEach(r => { teamIds.add(r.home_team_id); teamIds.add(r.away_team_id) })
    let championshipTeams: any[] = []
    if (teamIds.size > 0) {
      const { data: t } = await supabase
        .from('championship_teams')
        .select('*')
        .in('id', [...teamIds])
      championshipTeams = t ?? []
    }

    return rounds.map(r => {
      const match = matches.find(m => m.id === r.match_id) || null
      const matchTeamsForMatch = matchTeams.filter(t => t.match_id === r.match_id)
      const results = matchResults.filter(rr => rr.match_id === r.match_id)

      const homeTeamFromChamp = championshipTeams.find(t => t.id === r.home_team_id)
      const awayTeamFromChamp = championshipTeams.find(t => t.id === r.away_team_id)

      const homeMatchTeam = matchTeamsForMatch.find(t => t.name === homeTeamFromChamp?.name)
      const awayMatchTeam = matchTeamsForMatch.find(t => t.name === awayTeamFromChamp?.name)

      let homeScore: number | null = null
      let awayScore: number | null = null

      if (homeMatchTeam && awayMatchTeam) {
        homeScore = results.find(rr => rr.team_id === homeMatchTeam.id)?.score ?? null
        awayScore = results.find(rr => rr.team_id === awayMatchTeam.id)?.score ?? null
      }

      if ((homeScore === null || awayScore === null) && results.length >= 2 && matchTeamsForMatch.length >= 2) {
        const sorted = [...matchTeamsForMatch].sort((a, b) => a.name.localeCompare(b.name))
        const sortedResults = sorted.map(t => results.find(rr => rr.team_id === t.id)?.score ?? null)
        if (homeScore === null) homeScore = sortedResults[0]
        if (awayScore === null) awayScore = sortedResults[1]
      }

      return {
        ...r,
        match: match ? { ...match, home_score: homeScore, away_score: awayScore } : null,
        home_team: homeTeamFromChamp || null,
        away_team: awayTeamFromChamp || null,
      }
    })
  },

  async getStandings(id: string): Promise<ChampionshipStanding[]> {
    const { data } = await supabase.rpc('get_championship_standings', { p_championship_id: id })
    return data ?? []
  },
}

function generateRoundRobin(
  teamIds: string[],
  type: 'first' | 'all' = 'all'
): { championship_id: string; round_number: number; home_team_id: string; away_team_id: string }[] {
  const n = teamIds.length
  if (n < 2) return []

  const actualN = n % 2 === 0 ? n : n + 1
  const arr: (string | null)[] = [...teamIds]
  if (n % 2 !== 0) arr.push(null)

  const rounds: { home: string; away: string }[][] = []

  for (let r = 0; r < actualN - 1; r++) {
    const round: { home: string; away: string }[] = []

    for (let j = 0; j < actualN / 2; j++) {
      const home = arr[j]
      const away = arr[actualN - 1 - j]
      if (home !== null && away !== null) {
        round.push({ home, away })
      }
    }

    rounds.push(round)

    const last = arr.pop()!
    arr.splice(1, 0, last)
  }

  const result: { championship_id: string; round_number: number; home_team_id: string; away_team_id: string }[] = []
  let roundNum = 0

  for (const round of rounds) {
    roundNum++
    for (const pairing of round) {
      result.push({ championship_id: '', round_number: roundNum, home_team_id: pairing.home, away_team_id: pairing.away })
    }
  }

  if (type === 'all') {
    for (const round of rounds) {
      roundNum++
      for (const pairing of round) {
        result.push({ championship_id: '', round_number: roundNum, home_team_id: pairing.away, away_team_id: pairing.home })
      }
    }
  }

  return result
}

const CATEGORY_LABELS: Record<string, string> = {
  FIELD: 'Campo',
  REFEREE: 'Arbitragem',
  EQUIPMENT: 'Equipamento',
  SNACKS: 'Confraternização',
  OTHER: 'Outros',
}

export const financeService = {
  async getConfig(groupId: string): Promise<GroupFinanceConfig | null> {
    const { data } = await supabase
      .from('group_finance_config')
      .select('*')
      .eq('group_id', groupId)
      .maybeSingle()
    return data
  },

  async upsertConfig(groupId: string, data: {
    default_monthly_fee?: number
    default_match_fee?: number
    pix_key?: string | null
  }): Promise<void> {
    const { data: existing } = await supabase
      .from('group_finance_config')
      .select('id')
      .eq('group_id', groupId)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('group_finance_config')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('group_id', groupId)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('group_finance_config')
        .insert({ group_id: groupId, ...data })
      if (error) throw error
    }
  },

  async getPlayerFees(groupId: string): Promise<(PlayerFeeSettings & { group_member: GroupMember & { profile: Profile } })[]> {
    const { data } = await supabase
      .from('player_fee_settings')
      .select('*, group_member:group_members!inner(*, profile:profiles(*))')
      .eq('group_member.group_id', groupId)
    return data ?? []
  },

  async upsertPlayerFee(groupMemberId: string, data: {
    is_monthly_player?: boolean
    monthly_fee?: number | null
    match_fee?: number | null
  }): Promise<void> {
    const { data: existing } = await supabase
      .from('player_fee_settings')
      .select('id')
      .eq('group_member_id', groupMemberId)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('player_fee_settings')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('player_fee_settings')
        .insert({ group_member_id: groupMemberId, ...data })
      if (error) throw error
    }
  },

  async getPayments(groupId: string): Promise<(Payment & { group_member: GroupMember & { profile: Profile }; paid_by_profile?: Profile; match?: Match })[]> {
    const { data } = await supabase
      .from('payments')
      .select('*, group_member:group_members!inner(*, profile:profiles(*)), paid_by_profile:profiles!paid_by(*), match:matches(*)')
      .eq('group_member.group_id', groupId)
      .order('paid_at', { ascending: false })
    return data ?? []
  },

  async recordPayment(data: {
    group_member_id: string
    match_id?: string | null
    payment_type: 'MONTHLY' | 'MATCH'
    amount: number
    reference_month?: string | null
    paid_by: string
    notes?: string | null
  }): Promise<void> {
    const { error } = await supabase
      .from('payments')
      .insert({
        group_member_id: data.group_member_id,
        match_id: data.match_id ?? null,
        payment_type: data.payment_type,
        amount: data.amount,
        reference_month: data.reference_month ?? null,
        paid_by: data.paid_by,
        notes: data.notes ?? null,
      })
    if (error) throw error
  },

  async deletePayment(paymentId: string): Promise<void> {
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', paymentId)
    if (error) throw error
  },

  async getExpenses(groupId: string): Promise<(GroupExpense & { created_by_profile: Profile })[]> {
    const { data } = await supabase
      .from('group_expenses')
      .select('*, created_by_profile:profiles!created_by(*)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
    return data ?? []
  },

  async addExpense(data: {
    group_id: string
    description: string
    amount: number
    category: string
    created_by: string
  }): Promise<void> {
    const cleanDesc = sanitizeText(data.description, 300)
    if (!cleanDesc) throw new Error('Descrição inválida')
    const { error } = await supabase
      .from('group_expenses')
      .insert({
        group_id: data.group_id,
        description: cleanDesc,
        amount: data.amount,
        category: data.category,
        created_by: data.created_by,
      })
    if (error) throw error
  },

  async deleteExpense(expenseId: string): Promise<void> {
    const { error } = await supabase
      .from('group_expenses')
      .delete()
      .eq('id', expenseId)
    if (error) throw error
  },

  async getSummary(groupId: string): Promise<FinanceSummary> {
    const [config, members, payments, expenses, fees] = await Promise.all([
      this.getConfig(groupId),
      groupService.getMembers(groupId),
      this.getPayments(groupId),
      this.getExpenses(groupId),
      this.getPlayerFees(groupId),
    ])

    const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0)
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
    const monthlyPayments = payments.filter(p => p.payment_type === 'MONTHLY')
    const matchPayments = payments.filter(p => p.payment_type === 'MATCH')
    const monthlyRevenue = monthlyPayments.reduce((sum, p) => sum + Number(p.amount), 0)
    const matchRevenue = matchPayments.reduce((sum, p) => sum + Number(p.amount), 0)

    const defaultMonthlyFee = config?.default_monthly_fee ?? 0
    const defaultMatchFee = config?.default_match_fee ?? 0

    const pendingPayments = members.map(m => {
      const feeSetting = fees.find(f => f.group_member_id === m.id)
      const isMonthly = feeSetting?.is_monthly_player ?? false
      const monthlyFee = feeSetting?.monthly_fee ?? defaultMonthlyFee
      const matchFee = feeSetting?.match_fee ?? defaultMatchFee

      const memberPayments = payments.filter(p => p.group_member_id === m.id)
      const lastMonthly = memberPayments
        .filter(p => p.payment_type === 'MONTHLY')
        .sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime())[0]
      const lastMatch = memberPayments
        .filter(p => p.payment_type === 'MATCH')
        .sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime())[0]

      const now = new Date()
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const hasPaidMonthly = lastMonthly?.reference_month === currentMonth

      return {
        group_member_id: m.id,
        profile_id: m.profile_id,
        player_name: m.profile?.name ?? 'Desconhecido',
        player_avatar: m.profile?.avatar_url ?? null,
        is_monthly_player: isMonthly,
        monthly_fee: monthlyFee,
        match_fee: matchFee,
        last_monthly_payment: lastMonthly?.paid_at ?? null,
        last_match_payment: lastMatch?.paid_at ?? null,
        monthly_overdue: isMonthly && !hasPaidMonthly && monthlyFee > 0,
      }
    })

    const allDates = [
      ...payments.map(p => p.paid_at.split('T')[0]),
      ...expenses.map(e => e.created_at.split('T')[0]),
    ].filter(Boolean)
    const uniqueDates = [...new Set(allDates)].sort()

    let runningBalance = 0
    const balanceHistory = uniqueDates.map(date => {
      const dayRevenue = payments
        .filter(p => p.paid_at.startsWith(date))
        .reduce((sum, p) => sum + Number(p.amount), 0)
      const dayExpense = expenses
        .filter(e => e.created_at.startsWith(date))
        .reduce((sum, e) => sum + Number(e.amount), 0)
      runningBalance += dayRevenue - dayExpense
      return { date, balance: runningBalance, revenue: dayRevenue, expense: dayExpense }
    })

    return {
      totalRevenue,
      totalExpenses,
      balance: totalRevenue - totalExpenses,
      monthlyRevenue,
      matchRevenue,
      pendingPayments: pendingPayments as any,
      recentPayments: payments.slice(0, 20),
      recentExpenses: expenses.slice(0, 20),
      balanceHistory,
    }
  },
}

export async function getPlayerGroupStats(profileId: string, groupId: string): Promise<{
  goals: number
  assists: number
  own_goals: number
  nutmeg_given: number
  nutmeg_done: number
  matchesPlayed: number
  matchesWon: number
  avgRating: number | null
  last3: ('win' | 'draw' | 'loss')[]
}> {
  const [playerStats, rankingStats] = await Promise.all([
    matchService.getPlayerStats(profileId, groupId),
    rankingService.getStats(groupId, { playerId: profileId }),
  ])

  const playerRanking = rankingStats[0]
  const last3 = playerRanking?.last3 ?? []

  return {
    ...playerStats,
    last3,
  }
}

export { CATEGORY_LABELS }
