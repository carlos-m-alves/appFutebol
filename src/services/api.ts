import { supabase } from '../lib/supabase'
import { sanitizeText, sanitizeOptional } from '../lib/sanitize'
import type {
  Group, GroupMember, Match, MatchConfirmation, Team,
  MatchPlayer, MatchResult, PlayerRating, MatchAward, RecurringSchedule, Profile, GroupJoinRequest
} from '../types'

export const groupService = {
  async create(name: string, description: string): Promise<Group | null> {
    const cleanName = sanitizeText(name, 100)
    const cleanDescription = sanitizeText(description, 500)
    if (!cleanName) throw new Error('Nome do grupo inválido')

    const { data: user } = await supabase.auth.getUser()
    if (!user?.user?.id) throw new Error('Usuário não autenticado')

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.user.id)
      .single()
    if (!profile) throw new Error('Perfil não encontrado')

    const { data: code } = await supabase.rpc('generate_access_code')
    if (!code) throw new Error('Erro ao gerar código de acesso')

    const { data: group, error } = await supabase
      .from('groups')
      .insert({ name: cleanName, description: cleanDescription, access_code: code, created_by: profile.id })
      .select()
      .single()

    if (error) throw error
    if (group) {
      await supabase.from('group_members').insert({
        group_id: group.id,
        profile_id: profile.id,
        role: 'ADMIN'
      })
    }
    return group
  },

  async join(accessCode: string, profileId: string): Promise<Group> {
    const { data: group, error: findError } = await supabase
      .from('groups')
      .select('*')
      .eq('access_code', accessCode.toUpperCase())
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

  async listWithResults(groupId: string): Promise<(Match & { results: (MatchResult & { team: Team })[]; players: MatchPlayer[] })[]> {
    const { data: matches } = await supabase
      .from('matches')
      .select('*')
      .eq('group_id', groupId)
      .order('match_date', { ascending: false })

    if (!matches?.length) return []

    const matchIds = matches.map(m => m.id)

    const [results, players] = await Promise.all([
      supabase.from('match_results').select('*, team:teams(*)').in('match_id', matchIds),
      supabase.from('match_players').select('*, profile:profiles(*)').in('match_id', matchIds),
    ])

    return matches.map(m => ({
      ...m,
      results: (results.data ?? []).filter(r => r.match_id === m.id),
      players: (players.data ?? []).filter(p => p.match_id === m.id)
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
    id: string; team_id?: string; goals: number; assists: number; own_goals: number;
    nutmeg_given: number; nutmeg_done: number; no_show: boolean
  }[]) {
    if (players.length === 0) return
    const { error } = await supabase
      .from('match_players')
      .upsert(
        players.map(p => ({
          id: p.id,
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
    await supabase.from('match_results').delete().eq('match_id', matchId)
    if (results.length > 0) {
      await supabase.from('match_results').insert(
        results.map(r => ({ match_id: matchId, team_id: r.team_id, score: r.score }))
      )
    }
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

    const { data: ratingData } = await supabase
      .from('player_ratings')
      .select('rating')
      .eq('rated_profile_id', profileId)

    const avgRating = ratingData && ratingData.length > 0
      ? Math.round((ratingData.reduce((sum, r) => sum + r.rating, 0) / ratingData.length) * 2) / 2
      : null

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

    const result: MatchStats[] = []

    for (const [profileId, stat] of statsMap) {
      const { data: ratingData } = await supabase
        .from('player_ratings')
        .select('rating')
        .eq('rated_profile_id', profileId)

      const avgRating = ratingData && ratingData.length > 0
        ? Math.round((ratingData.reduce((sum, r) => sum + r.rating, 0) / ratingData.length) * 2) / 2
        : null

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

export interface MatchStats {
  player_id: string
  player_name: string
  player_avatar: string | null
  goals: number
  assists: number
  matches_played: number
  avg_rating: number | null
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

export async function updateProfile(profileId: string, updates: { name?: string; avatar_url?: string | null }): Promise<void> {
  const clean: typeof updates = {}
  if (updates.name !== undefined) {
    const n = sanitizeText(updates.name, 100)
    if (!n) throw new Error('Nome inválido')
    clean.name = n
  }
  if (updates.avatar_url !== undefined) {
    clean.avatar_url = updates.avatar_url
  }
  const { error } = await supabase
    .from('profiles')
    .update(clean)
    .eq('id', profileId)
  if (error) throw error
}
