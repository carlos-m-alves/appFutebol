import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useGroup } from '../../contexts/GroupContext'
import { supabase } from '../../lib/supabase'
import { useMatch, useMatchTeams, useMatchPlayers, useMatchResults, useMatchConfirmations, useMatchAwards, useMatchRatings, useMatchGroupMembers, useUpdateMatchStatus, useMatchConfirmAttendance, useRemoveMatchPlayer, useAddMatchPlayer, useUpdatePlayerTeam, useSaveMatchPlayers, useSaveMatchResults, useSubmitRating, useCalculateAwards, useCreateTeam, useDeleteTeam, useAddGuestPlayer, useRemoveMatchPlayerById, useUpdateMatchPlayerTeamById, useUpdateGuestPlayerStats } from '../../hooks/useMatches'
import type { Team, MatchPlayer, MatchResult, MatchAward, PlayerRating } from '../../types'
import { MATCH_STATUS } from '../../lib/constants'
import { StarRating, DisplayRating } from '../../components/ui/StarRating'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { Calendar, MapPin, Users, Trophy, Star, Swords, Award, ThumbsDown, Goal, UserPlus, Check, Plus, Trash2 } from 'lucide-react'

export function MatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const { currentGroupRole, currentGroup, setCurrentGroup, groups } = useGroup()
  const navigate = useNavigate()

  const { data: match, isLoading: loadingMatch } = useMatch(id)
  const { data: teams = [] } = useMatchTeams(id)
  const { data: players = [] } = useMatchPlayers(id)
  const { data: results = [] } = useMatchResults(id)
  const { data: confirmations = [] } = useMatchConfirmations(id)
  const { data: awards } = useMatchAwards(id)
  const { data: ratings = [] } = useMatchRatings(id)
  const { data: groupMembers = [] } = useMatchGroupMembers(match?.group_id)

  const { mutateAsync: updateStatus } = useUpdateMatchStatus()
  const { mutateAsync: confirmAttendance } = useMatchConfirmAttendance()
  const { mutateAsync: calculateAwards } = useCalculateAwards()

  useEffect(() => {
    if (match && !currentGroup) {
      const group = groups.find(g => g.id === match.group_id)
      if (group) {
        setCurrentGroup(group)
      } else {
        supabase.from('groups').select('*').eq('id', match.group_id).maybeSingle()
          .then(({ data }) => { if (data) setCurrentGroup(data) })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.group_id])

  const userAllVoted = useMemo(() => {
    if (!profile || !players.length || !ratings.length) return false
    const myRatings = ratings.filter(r => r.rater_profile_id === profile.id)
    const eligiblePlayers = players.filter(p => p.profile_id !== profile.id && !p.no_show)
    return eligiblePlayers.length > 0 && eligiblePlayers.every(pl => myRatings.some(r => r.rated_profile_id === pl.profile_id))
  }, [profile, players, ratings])

  if (loadingMatch) return <div className="text-center py-8">Carregando...</div>
  if (!match) return <div className="text-center py-8 text-red-600">Partida não encontrada</div>

  const myProfileId = profile?.id || null
  const isParticipant = players.some(p => p.profile_id === myProfileId) || confirmations.some(c => c.profile_id === myProfileId && c.status === 'CONFIRMED')
  const isAdmin = currentGroupRole === 'ADMIN'
  const canVote = match.evaluation_open && !match.evaluation_closed && isParticipant && !userAllVoted
  const awaitingEvaluation = match.evaluation_open && !match.evaluation_closed && isParticipant && userAllVoted

  const statusColors: Record<string, string> = {
    SCHEDULED: 'bg-blue-100 text-blue-800',
    CONFIRMED: 'bg-green-100 text-green-800',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
    FINISHED: 'bg-gray-100 text-gray-800',
    CANCELLED: 'bg-red-100 text-red-800'
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[match.status]}`}>
                {MATCH_STATUS[match.status as keyof typeof MATCH_STATUS]}
              </span>
            </div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
              <Calendar size={24} className="text-green-600" />
              {new Date(match.match_date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </h1>
            {match.location && (
              <p className="text-gray-500 flex items-center gap-1 mt-1"><MapPin size={16} /> {match.location}</p>
            )}
          </div>

          <div className="flex gap-2">
            {profile && !isParticipant && match.status !== 'FINISHED' && match.status !== 'CANCELLED' && (
              <button onClick={() => id && profile && confirmAttendance({ matchId: id, profileId: profile.id })}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm flex items-center gap-1">
                <Check size={16} /> Confirmar Presença
              </button>
            )}
            {profile && isParticipant && match.status !== 'FINISHED' && match.status !== 'CANCELLED' && (
              <span className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm flex items-center gap-1">
                <Check size={16} /> Presença Confirmada
              </span>
            )}
            {isAdmin && match.status === 'SCHEDULED' && (
              <>
                <button onClick={() => id && updateStatus({ matchId: id, status: 'IN_PROGRESS' })} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm">
                  Iniciar Partida
                </button>
                <button onClick={async () => { if (confirm('Cancelar esta partida?')) { if (id) updateStatus({ matchId: id, status: 'CANCELLED' }) } }}
                  className="bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition text-sm">
                  Cancelar
                </button>
              </>
            )}
          </div>
          {isAdmin && match.status === 'IN_PROGRESS' && (
            <button onClick={() => id && updateStatus({ matchId: id, status: 'FINISHED' })} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm">
              Finalizar Partida
            </button>
          )}
        </div>
      </div>

      {match.status === 'FINISHED' && !match.evaluation_open && !match.evaluation_closed && isAdmin && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
          <p className="text-purple-800 font-medium mb-2">Partida finalizada!</p>
          <button onClick={() => id && updateStatus({ matchId: id, evaluation_open: true, evaluation_closed: false })} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm">
            Liberar Votação
          </button>
        </div>
      )}

      {match.evaluation_open && !match.evaluation_closed && isAdmin && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <p className="text-yellow-800 font-medium mb-2">Votação em andamento</p>
          <button onClick={async () => { if (!id) return; await calculateAwards(id); await updateStatus({ matchId: id, evaluation_open: false, evaluation_closed: true }) }}
            className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition text-sm">
            Encerrar Votação e Calcular Prêmios
          </button>
        </div>
      )}

      {(match.status === 'SCHEDULED' || match.status === 'IN_PROGRESS') && (
        <ManagePlayersPanel matchId={match.id} players={players} teams={teams} isAdmin={isAdmin} />
      )}

      {isAdmin && !results.length && (match.status === 'SCHEDULED' || match.status === 'IN_PROGRESS') && (
        <MatchAdminPanel matchId={match.id} teams={teams} players={players} groupMembers={groupMembers} />
      )}

      {isAdmin && match.status === 'FINISHED' && (
        <MatchStatsPanel match={match} players={players} teams={teams} results={results} groupMembers={groupMembers} ratings={ratings} />
      )}

      {results.length > 0 && (
        <MatchResultsPanel teams={teams} results={results} players={players} />
      )}

      {canVote && !awards && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 mb-6 text-center">
          <h2 className="font-bold text-lg mb-2 flex items-center justify-center gap-2">
            <Star size={20} className="text-purple-500" /> Votação aberta!
          </h2>
          <p className="text-sm text-gray-600 mb-4">Avalie os jogadores que participaram desta partida.</p>
          <button onClick={() => navigate(`/matches/${match.id}/vote`)}
            className="bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 transition font-medium inline-flex items-center gap-2">
            <Star size={20} /> Votar
          </button>
        </div>
      )}

      {awaitingEvaluation && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6 text-center">
          <h2 className="font-bold text-lg mb-2 flex items-center justify-center gap-2">
            <Star size={20} className="text-yellow-500" /> Você já votou!
          </h2>
          <p className="text-sm text-gray-600">Você já avaliou todos os jogadores. Aguardando os outros participantes finalizarem a votação.</p>
        </div>
      )}

      {awards && (
        <AwardsPanel awards={awards} />
      )}

      {awards && profile && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-900">
            <Star size={20} className="text-purple-500" /> Comentários sobre você
          </h2>
          {ratings.filter(r => r.rated_profile_id === profile.id && r.comment).length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum comentário recebido.</p>
          ) : (
            <div className="space-y-3">
              {ratings.filter(r => r.rated_profile_id === profile.id && r.comment).map(r => (
                <div key={r.id} className="bg-purple-50 rounded-lg p-3">
                  <DisplayRating value={r.rating} size="sm" />
                  <p className="text-sm text-gray-700 mt-1 italic">"{r.comment}"</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MatchAdminPanel({ matchId, teams, players, groupMembers }: {
  matchId: string; teams: Team[]; players: MatchPlayer[]; groupMembers: any[]
}) {
  const { mutateAsync: addPlayer } = useAddMatchPlayer()
  const { mutateAsync: updatePlayerTeam } = useUpdatePlayerTeam()
  const { mutateAsync: addGuestPlayer } = useAddGuestPlayer()
  const [guestName, setGuestName] = useState('')

  const availableMembers = groupMembers.filter((gm: any) =>
    !players.some(p => p.profile_id === gm.profile_id)
  )

  async function addToMatch(playerId: string) {
    await addPlayer({ matchId, profileId: playerId })
    if (teams.length > 0) {
      await updatePlayerTeam({ matchId, profileId: playerId, teamId: teams[0].id })
    }
  }

  async function handleAddGuest() {
    const name = guestName.trim()
    if (!name) return
    await addGuestPlayer({ matchId, guestName: name, teamId: teams.length > 0 ? teams[0].id : undefined })
    setGuestName('')
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <h2 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-900">
        <Swords size={20} className="text-green-600" /> Jogadores do Grupo
      </h2>

      <div className="flex items-center gap-2 mb-4">
        <input type="text" value={guestName} onChange={e => setGuestName(e.target.value)}
          placeholder="Nome do convidado..."
          onKeyDown={e => { if (e.key === 'Enter') handleAddGuest() }}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none text-gray-900" />
        <button onClick={handleAddGuest} disabled={!guestName.trim()}
          className="flex items-center gap-1 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition disabled:opacity-50">
          <UserPlus size={14} /> Convidar
        </button>
      </div>

      {availableMembers.length > 0 ? (
        <div className="space-y-1">
          {availableMembers.map((gm: any) => (
            <button key={gm.profile_id} onClick={() => addToMatch(gm.profile_id)}
              className="w-full flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm hover:bg-blue-100 transition text-left">
              <Plus size={14} className="shrink-0" />
              {gm.profile?.avatar_url ? (
                <img src={gm.profile.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-700 font-bold text-[10px]">
                  {gm.profile?.name?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
              <span>{gm.profile?.name}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">Todos os membros do grupo já estão na partida.</p>
      )}
    </div>
  )
}

function MatchStatsPanel({ match, players, teams, results, groupMembers, ratings }: {
  match: any; players: MatchPlayer[]; teams: Team[]; results: MatchResult[]; groupMembers: any[]; ratings: PlayerRating[]
}) {
  const [playerStats, setPlayerStats] = useState<Record<string, {
    teamId: string; goals: number; assists: number; own_goals: number
    nutmeg_given: number; nutmeg_done: number; no_show: boolean
  }>>({})
  const [scores, setScores] = useState<Record<string, number>>({})
  const [statsError, setStatsError] = useState<string | null>(null)
  const { mutateAsync: savePlayers, isPending: saving } = useSaveMatchPlayers()
  const { mutateAsync: saveResults } = useSaveMatchResults()
  const { mutateAsync: updateGuestStats } = useUpdateGuestPlayerStats()

  useEffect(() => {
    const stats: Record<string, any> = {}
    players.forEach(p => {
      stats[p.id] = {
        teamId: p.team_id || '',
        goals: p.goals || 0,
        assists: p.assists || 0,
        own_goals: p.own_goals || 0,
        nutmeg_given: p.nutmeg_given || 0,
        nutmeg_done: p.nutmeg_done || 0,
        no_show: p.no_show || false
      }
    })
    setPlayerStats(stats)
  }, [players])

  useEffect(() => {
    const initial: Record<string, number> = {}
    if (results.length) {
      results.forEach(r => { initial[r.team_id] = r.score })
    } else {
      teams.forEach(t => { initial[t.id] = 0 })
    }
    setScores(initial)
  }, [teams, results])

  function updateStat(profileId: string, field: string, value: any) {
    setPlayerStats(prev => ({
      ...prev,
      [profileId]: { ...prev[profileId], [field]: value }
    }))
  }

  async function handleSaveStats() {
    if (!match) return
    setStatsError(null)

    if (teams.length > 0) {
      const missingScore = teams.some(t => scores[t.id] === undefined || scores[t.id] === null)
      if (missingScore) {
        setStatsError('Preencha o placar de todos os times antes de salvar.')
        return
      }
    }

    if (teams.length === 2) {
      const teamA = teams[0]
      const teamB = teams[1]

      const teamAPlayers = Object.entries(playerStats).filter(([, s]) => s.teamId === teamA.id && !s.no_show)
      const teamBPlayers = Object.entries(playerStats).filter(([, s]) => s.teamId === teamB.id && !s.no_show)

      const teamAGoals = teamAPlayers.reduce((sum, [, s]) => sum + s.goals, 0)
      const teamAOwnGoals = teamAPlayers.reduce((sum, [, s]) => sum + s.own_goals, 0)
      const teamBGoals = teamBPlayers.reduce((sum, [, s]) => sum + s.goals, 0)
      const teamBOwnGoals = teamBPlayers.reduce((sum, [, s]) => sum + s.own_goals, 0)

      const expectedA = teamAGoals + teamBOwnGoals
      const expectedB = teamBGoals + teamAOwnGoals
      const actualA = scores[teamA.id] ?? 0
      const actualB = scores[teamB.id] ?? 0

      if (actualA !== expectedA || actualB !== expectedB) {
        setStatsError(
          `Placar inconsistente! O placar deveria ser ${teamA.name} ${expectedA} x ${expectedB} ${teamB.name} ` +
          `(gols marcados + gols contra do adversário). Verifique os gols e gols contra dos jogadores.`
        )
        return
      }
    }

    const allStats = Object.entries(playerStats)
    const registered = allStats
      .filter(([id]) => players.find(p => p.id === id)?.profile_id)
      .map(([id, data]) => ({
        profile_id: players.find(p => p.id === id)!.profile_id,
        team_id: data.teamId || undefined,
        goals: data.goals,
        assists: data.assists,
        own_goals: data.own_goals,
        nutmeg_given: data.nutmeg_given,
        nutmeg_done: data.nutmeg_done,
        no_show: data.no_show
      }))
    const guests = allStats
      .filter(([id]) => !players.find(p => p.id === id)?.profile_id)
      .map(([id, data]) => ({
        id,
        team_id: data.teamId || undefined,
        goals: data.goals,
        assists: data.assists,
        own_goals: data.own_goals,
        nutmeg_given: data.nutmeg_given,
        nutmeg_done: data.nutmeg_done,
        no_show: data.no_show
      }))
    const results = Object.entries(scores).map(([team_id, score]) => ({ team_id, score }))

    const promises: Promise<any>[] = []
    if (registered.length > 0) {
      promises.push(savePlayers({ matchId: match.id, players: registered }))
    }
    if (guests.length > 0) {
      promises.push(updateGuestStats(guests))
    }
    if (results.length > 0) {
      promises.push(saveResults({ matchId: match.id, results }))
    }

    await Promise.all(promises)
  }

  const allPlayers = players.length > 0 ? players : groupMembers.map((gm: any) => ({
    id: '', match_id: match.id, profile_id: gm.profile_id, team_id: null,
    goals: 0, assists: 0, own_goals: 0, nutmeg_given: 0, nutmeg_done: 0,
    no_show: false, won_match: null, created_at: '',
    profile: gm.profile
  } as MatchPlayer))

  function playerHasVoted(profileId: string | null) {
    if (!profileId) return false
    const eligiblePlayers = players.filter(p => p.profile_id !== profileId && !p.no_show)
    if (eligiblePlayers.length === 0) return false
    const playerRatings = ratings.filter(r => r.rater_profile_id === profileId)
    return eligiblePlayers.every(ep => playerRatings.some(r => r.rated_profile_id === ep.profile_id))
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <h2 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-900">
        <Trophy size={20} className="text-yellow-500" /> Estatísticas da Partida
      </h2>

      {teams.length > 1 && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Placar</h3>
          <div className="flex items-center gap-4 flex-wrap">
            {teams.map(team => (
              <div key={team.id} className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{team.name}</span>
                  <input type="number" min={0} value={scores[team.id] ?? 0}
                    onChange={e => setScores(prev => ({ ...prev, [team.id]: parseInt(e.target.value) || 0 }))}
                    className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center outline-none focus:ring-1 focus:ring-green-500 text-gray-900" />
                </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {teams.map(team => {
          const teamPlayers = allPlayers.filter(p => p.team_id === team.id)
          if (teamPlayers.length === 0) return null
          return (
              <div key={team.id}>
              <h3 className="font-semibold text-sm text-gray-600 mb-2">{team.name}</h3>
              <div className="space-y-2">
                {teamPlayers.map(p => (
                  <div key={p.profile_id || p.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-xs">
                          {p.profile?.name?.charAt(0).toUpperCase() || p.guest_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{p.profile?.name || p.guest_name}</span>
                        {p.guest_name ? (
                          <span className="text-[10px] text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded font-medium">Convidado</span>
                        ) : playerHasVoted(p.profile_id) ? (
                          <span className="text-[10px] text-green-700 bg-green-100 px-1.5 py-0.5 rounded font-medium">Votou</span>
                        ) : (
                          <span className="text-[10px] text-red-600 bg-red-100 px-1.5 py-0.5 rounded font-medium">Não votou</span>
                        )}
                      </div>
                      <label className="flex items-center gap-1 text-xs text-red-600 cursor-pointer">
                        <input type="checkbox" checked={playerStats[p.id]?.no_show || false}
                          onChange={e => updateStat(p.id, 'no_show', e.target.checked)}
                          className="w-3.5 h-3.5 text-red-600 rounded focus:ring-red-500" />
                        Furão
                      </label>
                    </div>
                    {!playerStats[p.id]?.no_show && (
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        <div>
                          <label className="text-xs text-gray-500 block mb-0.5">Gols</label>
                          <input type="number" min={0} value={playerStats[p.id]?.goals ?? 0}
                            onChange={e => updateStat(p.id, 'goals', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-center text-gray-900 outline-none focus:ring-1 focus:ring-green-500" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-0.5">Assist.</label>
                          <input type="number" min={0} value={playerStats[p.id]?.assists ?? 0}
                            onChange={e => updateStat(p.id, 'assists', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-center text-gray-900 outline-none focus:ring-1 focus:ring-green-500" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-0.5">Gol Contra</label>
                          <input type="number" min={0} value={playerStats[p.id]?.own_goals ?? 0}
                            onChange={e => updateStat(p.id, 'own_goals', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-center text-gray-900 outline-none focus:ring-1 focus:ring-green-500" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-0.5">Meteu Caneta</label>
                          <input type="number" min={0} value={playerStats[p.id]?.nutmeg_done ?? 0}
                            onChange={e => updateStat(p.id, 'nutmeg_done', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-center text-gray-900 outline-none focus:ring-1 focus:ring-green-500" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-0.5">Levou Caneta</label>
                          <input type="number" min={0} value={playerStats[p.id]?.nutmeg_given ?? 0}
                            onChange={e => updateStat(p.id, 'nutmeg_given', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-center text-gray-900 outline-none focus:ring-1 focus:ring-green-500" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
        {allPlayers.filter(p => !p.team_id).length > 0 && (
          <div>
            <h3 className="font-semibold text-sm text-gray-400 mb-2">Sem time</h3>
            <div className="space-y-2">
              {allPlayers.filter(p => !p.team_id).map(p => (
                  <div key={p.profile_id || p.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-xs">
                          {p.profile?.name?.charAt(0).toUpperCase() || p.guest_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{p.profile?.name || p.guest_name}</span>
                        {p.guest_name ? (
                          <span className="text-[10px] text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded font-medium">Convidado</span>
                        ) : playerHasVoted(p.profile_id) ? (
                          <span className="text-[10px] text-green-700 bg-green-100 px-1.5 py-0.5 rounded font-medium">Votou</span>
                        ) : (
                          <span className="text-[10px] text-red-600 bg-red-100 px-1.5 py-0.5 rounded font-medium">Não votou</span>
                        )}
                      </div>
                      <label className="flex items-center gap-1 text-xs text-red-600 cursor-pointer">
                        <input type="checkbox" checked={playerStats[p.id]?.no_show || false}
                          onChange={e => updateStat(p.id, 'no_show', e.target.checked)}
                          className="w-3.5 h-3.5 text-red-600 rounded focus:ring-red-500" />
                        Furão
                      </label>
                    </div>
                    {!playerStats[p.id]?.no_show && (
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        <div>
                          <label className="text-xs text-gray-500 block mb-0.5">Gols</label>
                          <input type="number" min={0} value={playerStats[p.id]?.goals ?? 0}
                            onChange={e => updateStat(p.id, 'goals', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-center text-gray-900 outline-none focus:ring-1 focus:ring-green-500" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-0.5">Assist.</label>
                          <input type="number" min={0} value={playerStats[p.id]?.assists ?? 0}
                            onChange={e => updateStat(p.id, 'assists', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-center text-gray-900 outline-none focus:ring-1 focus:ring-green-500" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-0.5">Gol Contra</label>
                          <input type="number" min={0} value={playerStats[p.id]?.own_goals ?? 0}
                            onChange={e => updateStat(p.id, 'own_goals', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-center text-gray-900 outline-none focus:ring-1 focus:ring-green-500" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-0.5">Meteu Caneta</label>
                          <input type="number" min={0} value={playerStats[p.id]?.nutmeg_done ?? 0}
                            onChange={e => updateStat(p.id, 'nutmeg_done', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-center text-gray-900 outline-none focus:ring-1 focus:ring-green-500" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-0.5">Levou Caneta</label>
                          <input type="number" min={0} value={playerStats[p.id]?.nutmeg_given ?? 0}
                            onChange={e => updateStat(p.id, 'nutmeg_given', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-center text-gray-900 outline-none focus:ring-1 focus:ring-green-500" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
      {statsError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mt-4 text-sm">
          {statsError}
        </div>
      )}
      <button onClick={handleSaveStats} disabled={saving}
        className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition mt-4 disabled:opacity-50">
        {saving ? 'Salvando...' : 'Salvar Estatísticas e Placar'}
      </button>
    </div>
  )
}

function ManagePlayersPanel({ matchId, players, teams, isAdmin }: {
  matchId: string; players: MatchPlayer[]; teams: Team[]; isAdmin: boolean
}) {
  const { mutateAsync: updatePlayerTeam } = useUpdatePlayerTeam()
  const { mutateAsync: createTeam } = useCreateTeam()
  const { mutateAsync: deleteTeamMutation } = useDeleteTeam()
  const { mutateAsync: removePlayer } = useRemoveMatchPlayer()
  const { mutateAsync: removeMatchPlayer } = useRemoveMatchPlayerById()
  const { mutateAsync: updateMatchPlayerTeam } = useUpdateMatchPlayerTeamById()
  const [deletingTeam, setDeletingTeam] = useState<string | null>(null)

  const playersInMatch = players.filter(p => !p.no_show)

  function getPlayerName(p: MatchPlayer) {
    return p.guest_name || p.profile?.name || 'Desconhecido'
  }

  function getPlayerInitial(p: MatchPlayer) {
    return p.guest_name?.charAt(0).toUpperCase() || p.profile?.name?.charAt(0).toUpperCase() || '?'
  }

  async function handlePlayerTeamChange(p: MatchPlayer, teamId: string) {
    if (p.profile_id) {
      await updatePlayerTeam({ matchId, profileId: p.profile_id, teamId: teamId || null })
    } else {
      await updateMatchPlayerTeam({ matchId, playerId: p.id, teamId: teamId || null })
    }
  }

  async function handleRemovePlayer(p: MatchPlayer) {
    if (p.profile_id) {
      await removePlayer({ matchId, profileId: p.profile_id })
    } else {
      await removeMatchPlayer({ matchId, playerId: p.id })
    }
  }

  async function addTeam() {
    const nextLetter = String.fromCharCode(65 + teams.length)
    await createTeam({ matchId, name: `Time ${nextLetter}` })
  }

  function PlayerRow({ player }: { player: MatchPlayer }) {
    return (
      <div key={player.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
        <div className="flex items-center gap-2">
          {player.guest_name ? (
            <div className="w-7 h-7 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-xs">
              <UserPlus size={12} />
            </div>
          ) : player.profile?.avatar_url ? (
            <img src={player.profile.avatar_url} alt=""
              className="w-7 h-7 rounded-full object-cover" />
          ) : (
            <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-xs">
              {getPlayerInitial(player)}
            </div>
          )}
          <span className="text-sm text-gray-900">{getPlayerName(player)}</span>
          {player.guest_name && (
            <span className="text-[10px] text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded font-medium">Convidado</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <select value={player.team_id || ''}
              onChange={e => handlePlayerTeamChange(player, e.target.value)}
              className="text-xs px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-gray-900">
              <option value="">Sem time</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
          {isAdmin && (
            <button onClick={() => handleRemovePlayer(player)}
              className="text-red-400 hover:text-red-600 transition p-1" title="Remover da partida">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    )
  }

  const teamToDelete = teams.find(t => t.id === deletingTeam)

  return (
    <>
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <h2 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-900">
        <Users size={20} className="text-blue-500" /> Jogadores na Partida ({playersInMatch.length})
      </h2>

      {playersInMatch.length === 0 ? (
        <p className="text-sm text-gray-400 mb-4">Nenhum jogador adicionado à partida ainda.</p>
      ) : (
        <div className="space-y-3 mb-4">
          {teams.map(team => {
            const teamPlayers = playersInMatch.filter(p => p.team_id === team.id)
            return (
              <div key={team.id}>
                <h3 className="font-semibold text-sm text-gray-600 mb-1 flex items-center gap-2">
                  {team.name}
                  {isAdmin && (
                    <button onClick={() => setDeletingTeam(team.id)}
                      className="text-red-400 hover:text-red-600 transition">
                      <Trash2 size={14} />
                    </button>
                  )}
                </h3>
                {teamPlayers.length > 0 && (
                  <div className="space-y-1">
                    {teamPlayers.map(p => <PlayerRow key={p.id} player={p} />)}
                  </div>
                )}
              </div>
            )
          })}
          {playersInMatch.filter(p => !p.team_id).length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-gray-400 mb-1">Sem time</h3>
              <div className="space-y-1">
                {playersInMatch.filter(p => !p.team_id).map(p => <PlayerRow key={p.id} player={p} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {isAdmin && (
        <button onClick={addTeam} className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1">
          <Plus size={14} /> Adicionar Time
        </button>
      )}
    </div>

    <ConfirmModal
      open={!!deletingTeam}
      title="Excluir Time"
      message={teamToDelete ? `Tem certeza que deseja excluir o time "${teamToDelete.name}"? Os jogadores serão movidos para "Sem time".` : ''}
      confirmLabel="Excluir"
      cancelLabel="Cancelar"
      onConfirm={() => {
        if (deletingTeam) deleteTeamMutation({ matchId, teamId: deletingTeam })
        setDeletingTeam(null)
      }}
      onCancel={() => setDeletingTeam(null)}
    />
    </>
  )
}

function MatchResultsPanel({ teams, results, players }: { teams: Team[]; results: MatchResult[]; players: MatchPlayer[] }) {
  const getTeamPlayers = (teamId: string) => players.filter(p => p.team_id === teamId)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <h2 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-900">
        <Trophy size={20} className="text-yellow-500" /> Resultado
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {teams.map(team => {
          const result = results.find(r => r.team_id === team.id)
          const teamPlayers = getTeamPlayers(team.id)
          return (
            <div key={team.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-lg text-gray-900">{team.name}</h3>
                <span className="text-2xl font-bold text-green-600">{result?.score ?? 0}</span>
              </div>
              <div className="space-y-1">
                {teamPlayers.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className={p.no_show ? 'line-through text-gray-400' : 'text-gray-900'}>
                      {p.profile?.name || p.guest_name}
                      {p.no_show && <span className="text-red-500 ml-1 text-xs">(furão)</span>}
                    </span>
                    {!p.no_show && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{p.goals} gols</span>
                        <span>{p.assists} assist.</span>
                        {p.own_goals > 0 && <span className="text-red-500">{p.own_goals} g.c.</span>}
                        {p.nutmeg_done > 0 && <span className="text-blue-500">{p.nutmeg_done} caneta</span>}
                        {p.nutmeg_given > 0 && <span className="text-orange-500">{p.nutmeg_given} levou</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function VotingPanel({ matchId, profileId, players }: {
  matchId: string; profileId: string; players: MatchPlayer[]
}) {
  const [votes, setVotes] = useState<Record<string, { rating: number; comment: string }>>({})
  const { mutateAsync: submitRating, isPending: submitting } = useSubmitRating()
  const [error, setError] = useState<string | null>(null)

  async function handleSubmitVote(ratedProfileId: string) {
    const vote = votes[ratedProfileId]
    if (!vote?.rating) return

    setError(null)
    try {
      await submitRating({
        matchId, raterProfileId: profileId, ratedProfileId,
        rating: vote.rating, comment: vote.comment || undefined
      })
      setVotes(prev => ({ ...prev, [ratedProfileId]: { rating: 0, comment: '' } }))
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar voto')
    }
  }

  const otherPlayers = players.filter(p => p.profile_id !== profileId && !p.no_show)

  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-center gap-2">
        <Star size={20} className="text-purple-500" />
        <h2 className="font-bold text-lg">Avaliar Jogadores</h2>
      </div>
      <p className="text-sm text-gray-500">Avalie cada jogador que participou desta partida.</p>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {otherPlayers.map(p => (
          <div key={p.profile_id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-xl mb-2">
              {p.profile?.name?.charAt(0).toUpperCase() || '?'}
            </div>
            <h3 className="font-semibold text-base mb-3">{p.profile?.name}</h3>

            <div className="flex items-center justify-center gap-4 mb-4 bg-gray-50 rounded-lg p-3 w-full">
              <StatBadge label="Gols" value={p.goals} color="text-green-600" />
              <div className="w-px h-8 bg-gray-200" />
              <StatBadge label="Assist." value={p.assists} color="text-blue-600" />
              {p.own_goals > 0 && <><div className="w-px h-8 bg-gray-200" /><StatBadge label="G.C." value={p.own_goals} color="text-red-500" /></>}
              {p.nutmeg_done > 0 && <><div className="w-px h-8 bg-gray-200" /><StatBadge label="Caneta" value={p.nutmeg_done} color="text-purple-600" /></>}
              {p.nutmeg_given > 0 && <><div className="w-px h-8 bg-gray-200" /><StatBadge label="Levou" value={p.nutmeg_given} color="text-orange-500" /></>}
            </div>

            <div className="mb-3">
              <StarRating
                value={votes[p.profile_id]?.rating || 0}
                onChange={(rating) => setVotes(prev => ({
                  ...prev,
                  [p.profile_id]: { ...prev[p.profile_id], rating }
                }))}
              />
              {votes[p.profile_id]?.rating > 0 && (
                <span className="text-sm font-medium text-gray-500 ml-2">{votes[p.profile_id].rating.toFixed(1)}</span>
              )}
            </div>

            <input
              type="text"
              placeholder="Comentário anônimo (opcional)"
              value={votes[p.profile_id]?.comment || ''}
              onChange={e => setVotes(prev => ({
                ...prev,
                [p.profile_id]: { ...prev[p.profile_id], comment: e.target.value }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none mb-3"
            />

            <button
              onClick={() => handleSubmitVote(p.profile_id)}
              disabled={!votes[p.profile_id]?.rating || submitting}
              className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition text-sm disabled:opacity-50 font-medium"
            >
              {votes[p.profile_id]?.rating ? (submitting ? 'Enviando...' : 'Enviar Voto') : 'Dê uma nota'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function AwardsPanel({ awards }: { awards: MatchAward }) {
  const awards_list = [
    { label: 'Craque da Partida', icon: <Award size={24} />, color: 'text-yellow-500', bg: 'bg-yellow-50', player: awards.best_player, rating: awards.best_player_rating },
    { label: 'Artilheiro', icon: <Goal size={24} />, color: 'text-green-500', bg: 'bg-green-50', player: awards.top_scorer },
    { label: 'Rei das Assistências', icon: <UserPlus size={24} />, color: 'text-blue-500', bg: 'bg-blue-50', player: awards.top_assist },
    { label: 'Bagre da Partida', icon: <ThumbsDown size={24} />, color: 'text-red-500', bg: 'bg-red-50', player: awards.worst_player },
  ]

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <h2 className="font-bold text-lg mb-6 flex items-center gap-2 text-gray-900">
        <Trophy size={20} className="text-yellow-500" /> Premiações
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {awards_list.map((a, i) => (
          <div key={i} className={`${a.bg} rounded-xl p-4 text-center`}>
            <div className={`${a.color} flex justify-center mb-2`}>{a.icon}</div>
            <p className="text-sm font-medium text-gray-600 mb-1">{a.label}</p>
            {a.player ? (
              <>
                <p className="font-bold">{a.player.name}</p>
                {a.rating && <DisplayRating value={a.rating} size="sm" />}
              </>
            ) : (
              <p className="text-sm text-gray-400">-</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function StatBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`flex flex-col items-center ${color}`}>
      <span className="text-lg font-bold">{value}</span>
      <span className="text-[10px] uppercase tracking-wider opacity-75">{label}</span>
    </div>
  )
}
