import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useGroup } from '../../contexts/GroupContext'
import { supabase } from '../../lib/supabase'
import { useMatch, useMatchTeams, useMatchPlayers, useMatchResults, useMatchConfirmations, useMatchAwards, useMatchRatings, useMatchGroupMembers, useUpdateMatchStatus, useMatchConfirmAttendance, useMatchRemoveAttendance, useRemoveMatchPlayer, useAddMatchPlayer, useUpdatePlayerTeam, useSaveMatchPlayers, useSaveMatchResults, useCalculateAwards, useCreateTeam, useDeleteTeam, useAddGuestPlayer, useRemoveMatchPlayerById, useUpdateMatchPlayerTeamById, useUpdateGuestPlayerStats, useVoterPenalties, useClearVoterPenalty } from '../../hooks/useMatches'
import { usePlayerGroupStats } from '../../hooks/useGroups'
import type { Team, MatchPlayer, MatchAward, PlayerRating } from '../../types'
import { POSITION_LABELS, DOMINANT_FOOT_LABELS } from '../../types'
import { balanceTeams } from '../../services/teamBalancer'
import { MATCH_STATUS } from '../../lib/constants'
import { DisplayRating } from '../../components/ui/StarRating'
import { useToast } from '../../components/ui/Toast'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { FifaErrorScreen } from '../../components/ui/FifaErrorScreen'
import { Calendar, MapPin, Users, Trophy, Star, Swords, Award, ThumbsDown, Goal, UserPlus, Check, Plus, Trash2, Shuffle, X } from 'lucide-react'

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
  const { mutateAsync: removeAttendance } = useMatchRemoveAttendance()
  const { mutateAsync: calculateAwards } = useCalculateAwards()
  const { data: voterPenalties = [] } = useVoterPenalties(awards ? id : undefined)
  const { mutateAsync: clearPenalty } = useClearVoterPenalty()
  const [startError, setStartError] = useState<string | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<MatchPlayer | null>(null)

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

  const myProfileId = profile?.id || null
  const isAdmin = currentGroupRole === 'ADMIN'

  const userAllVoted = useMemo(() => {
    if (!profile || !players.length || !ratings.length) return false
    const myRatings = ratings.filter(r => r.rater_profile_id === profile.id)
    const eligiblePlayers = players.filter(p => p.profile_id !== profile.id && p.profile_id && !p.no_show)
    return eligiblePlayers.length > 0 && eligiblePlayers.every(pl => myRatings.some(r => r.rated_profile_id === pl.profile_id))
  }, [profile, players, ratings])

  const allEligibleVoted = useMemo(() => {
    if (!players.length || !ratings.length) return false
    const voters = players.filter(p => p.profile_id && !p.no_show)
    const ratees = players.filter(p => p.profile_id && !p.no_show)
    if (voters.length === 0 || ratees.length === 0) return false
    return voters.every(voter => {
      const myRatings = ratings.filter(r => r.rater_profile_id === voter.profile_id)
      const expected = ratees.filter(r => r.profile_id !== voter.profile_id)
      return expected.length > 0 && expected.every(r => myRatings.some(rt => rt.rated_profile_id === r.profile_id))
    })
  }, [players, ratings])

  const votersCount = useMemo(() => players.filter(p => p.profile_id && !p.no_show).length, [players])
  const uniqueVoterCount = useMemo(() => new Set(ratings.map(r => r.rater_profile_id)).size, [ratings])

  useEffect(() => {
    if (!isAdmin || !id || !match) return
    if (match.evaluation_open && !match.evaluation_closed && allEligibleVoted) {
      calculateAwards(id).then(() => {
        updateStatus({ matchId: id, evaluation_open: false, evaluation_closed: true })
      })
    }
  }, [allEligibleVoted, match?.evaluation_open, match?.evaluation_closed, isAdmin, id])

  if (loadingMatch) return <div className="text-center py-8">Carregando...</div>
  if (!match) return <div className="text-center py-8 text-red-600">Partida não encontrada</div>

  const isParticipant = players.some(p => p.profile_id === myProfileId && !p.no_show) || confirmations.some(c => c.profile_id === myProfileId && c.status === 'CONFIRMED')
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
    <>
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
            {profile && match.status !== 'FINISHED' && match.status !== 'CANCELLED' && (
              isParticipant ? (
                <button onClick={() => id && profile && removeAttendance({ matchId: id, profileId: profile.id })}
                  className="bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition text-sm flex items-center gap-1">
                  <X size={16} /> Remover Presença
                </button>
              ) : (
                <button onClick={() => id && profile && confirmAttendance({ matchId: id, profileId: profile.id })}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm flex items-center gap-1">
                  <Check size={16} /> Confirmar Presença
                </button>
              )
            )}
              {isAdmin && match.status === 'SCHEDULED' && (
                <>
                  <button onClick={async () => {
                    if (!id) return
                    if (teams.length < 2) { setStartError('É necessário ter pelo menos 2 times para iniciar a partida.'); return }
                    const emptyTeams = teams.filter(t => !players.some(p => p.team_id === t.id))
                    if (emptyTeams.length > 0) {
                      const names = emptyTeams.map(t => t.name).join(', ')
                      setStartError(`O(s) time(s) ${names} não possui(em) nenhum jogador. Adicione jogadores a todos os times antes de iniciar.`)
                      return
                    }
                    updateStatus({ matchId: id, status: 'IN_PROGRESS' })
                  }} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm">
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

      {awards && (
        <AwardsPanel awards={awards} players={players} />
      )}

      {awards && profile && (() => {
        const myPenalty = voterPenalties.find(p => p.profile_id === profile.id && !p.warned)
        if (!myPenalty) return null

        setTimeout(() => {
          const el = document.getElementById('penalty-warning')
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)

        return (
          <div id="penalty-warning" className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <div className="text-red-500 text-2xl shrink-0">!</div>
              <div className="flex-1">
                <h3 className="font-bold text-red-800 mb-1">Atenção!</h3>
                <p className="text-sm text-red-700">
                  O jogo é para ser divertido e fazer amigos. Se você continuar votando de maneira injusta,
                  a sua nota é que será diminuída.
                </p>
              </div>
              <button
                onClick={async () => {
                  await clearPenalty({ matchId: id!, profileId: profile.id })
                }}
                className="text-red-400 hover:text-red-600 transition shrink-0 p-1"
                title="Fechar"
              >
                ✕
              </button>
            </div>
          </div>
        )
      })()}

      {match.status === 'FINISHED' && !match.evaluation_open && !match.evaluation_closed && isAdmin && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
          <p className="text-purple-800 font-medium mb-2">Partida finalizada!</p>
          <button onClick={() => id && updateStatus({ matchId: id, evaluation_open: true, evaluation_closed: false })} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm">
            Liberar Votação
          </button>
        </div>
      )}

      {match.evaluation_open && !match.evaluation_closed && isAdmin && !allEligibleVoted && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <p className="text-yellow-800 font-medium mb-2">Votação em andamento</p>
          <p className="text-sm text-yellow-700 mb-3">
            {ratings.length > 0
              ? `${uniqueVoterCount} de ${votersCount} jogadores já votaram`
              : 'Aguardando votos...'}
          </p>
          <button onClick={async () => { if (!id) return; await calculateAwards(id); await updateStatus({ matchId: id, evaluation_open: false, evaluation_closed: true }) }}
            className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition text-sm">
            Encerrar Votação e Calcular Prêmios
          </button>
        </div>
      )}

      {match.evaluation_open && !match.evaluation_closed && !isAdmin && allEligibleVoted && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6 text-center">
          <h2 className="font-bold text-lg mb-2 text-gray-900">Votação encerrada!</h2>
          <p className="text-sm text-gray-600">Todos os jogadores já votaram. Aguarde o cálculo dos prêmios.</p>
        </div>
      )}



      {canVote && !awards && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 mb-6 text-center">
          <h2 className="font-bold text-lg mb-2 flex items-center justify-center gap-2 text-gray-900">
            <Star size={20} className="text-purple-500" /> Votação aberta!
          </h2>
          <p className="text-sm text-gray-600 mb-4">Avalie os jogadores que participaram desta partida.</p>
          <button onClick={() => navigate(`/matches/${match.id}/vote`)}
            className="bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 transition font-medium inline-flex items-center gap-2">
            <Star size={20} /> Votar
          </button>
        </div>
      )}

      {(match.status === 'SCHEDULED' || match.status === 'IN_PROGRESS') && (
        <ManagePlayersPanel matchId={match.id} groupId={match.group_id} players={players} teams={teams} isAdmin={isAdmin} onPlayerClick={p => setSelectedPlayer(p)} />
      )}

      {isAdmin && !results.length && (match.status === 'SCHEDULED' || match.status === 'IN_PROGRESS') && (
        <MatchAdminPanel matchId={match.id} teams={teams} players={players} groupMembers={groupMembers} />
      )}

      {match.status === 'FINISHED' && (
        <MatchStatsPanel match={match} players={players} teams={teams} groupMembers={groupMembers} ratings={ratings} isAdmin={isAdmin} onPlayerClick={p => setSelectedPlayer(p)} />
      )}

      {awaitingEvaluation && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6 text-center">
          <h2 className="font-bold text-lg mb-2 flex items-center justify-center gap-2 text-gray-900">
            <Star size={20} className="text-yellow-500" /> Você já votou!
          </h2>
          <p className="text-sm text-gray-600">Você já avaliou todos os jogadores. Aguardando os outros participantes finalizarem a votação.</p>
        </div>
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

    <PlayerSummaryModal
      player={selectedPlayer}
      groupId={match.group_id}
      onClose={() => setSelectedPlayer(null)}
    />
    <FifaErrorScreen
      open={!!startError}
      title="Erro ao Iniciar Partida"
      message={startError || ''}
      onDismiss={() => setStartError(null)}
      actionLabel="OK"
      onAction={() => setStartError(null)}
    />
    </>
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
          <UserPlus size={14} /> Adicionar
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

function MatchStatsPanel({ match, players, teams, groupMembers, ratings, isAdmin, onPlayerClick }: {
  match: any; players: MatchPlayer[]; teams: Team[]; groupMembers: any[]; ratings: PlayerRating[]; isAdmin: boolean; onPlayerClick?: (p: MatchPlayer) => void
}) {
  const [playerStats, setPlayerStats] = useState<Record<string, {
    teamId: string; goals: number; assists: number; own_goals: number
    nutmeg_given: number; nutmeg_done: number; no_show: boolean
  }>>({})
  const [scores, setScores] = useState<Record<string, number>>({})
  const [statsError, setStatsError] = useState<string | null>(null)
  const { showToast } = useToast()
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

  function calcScore(teamId: string): number {
    const ownGoalsFromOthers = Object.entries(playerStats)
      .filter(([, s]) => s.teamId !== teamId && s.teamId !== '' && !s.no_show)
      .reduce((sum, [, s]) => sum + s.own_goals, 0)
    const teamGoals = Object.entries(playerStats)
      .filter(([, s]) => s.teamId === teamId && !s.no_show)
      .reduce((sum, [, s]) => sum + s.goals, 0)
    return teamGoals + ownGoalsFromOthers
  }

  useEffect(() => {
    const calculated: Record<string, number> = {}
    teams.forEach(t => { calculated[t.id] = calcScore(t.id) })
    setScores(calculated)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerStats, teams])

  function updateStat(profileId: string, field: string, value: any) {
    setPlayerStats(prev => ({
      ...prev,
      [profileId]: { ...prev[profileId], [field]: value }
    }))
  }

  async function handleSaveStats() {
    if (!match) return
    setStatsError(null)

    if (teams.length >= 2) {
      for (const team of teams) {
        const teamEntries = Object.entries(playerStats).filter(([, s]) => s.teamId === team.id && !s.no_show)
        const totalGoals = teamEntries.reduce((sum, [, s]) => sum + s.goals, 0)
        const totalAssists = teamEntries.reduce((sum, [, s]) => sum + s.assists, 0)
        if (totalAssists > totalGoals) {
          setStatsError(`O time ${team.name} tem ${totalAssists} assistência(s), mas fez apenas ${totalGoals} gol(ns). As assistências não podem exceder o número de gols.`)
          return
        }
      }
    }

    try {
      const allStats = Object.entries(playerStats)
      const registered = allStats
        .filter(([id]) => players.find(p => p.id === id)?.profile_id)
        .map(([id, data]) => ({
          profile_id: players.find(p => p.id === id)!.profile_id!,
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
          match_id: match!.id,
          team_id: data.teamId || undefined,
          goals: data.goals,
          assists: data.assists,
          own_goals: data.own_goals,
          nutmeg_given: data.nutmeg_given,
          nutmeg_done: data.nutmeg_done,
          no_show: data.no_show
        }))
      const results = Object.entries(scores).map(([team_id, score]) => ({ team_id, score }))

      const errors: string[] = []
      if (registered.length > 0) {
        try { await savePlayers({ matchId: match.id, players: registered }) }
        catch (e: any) { errors.push(`Jogadores: ${e.message}`) }
      }
      if (guests.length > 0) {
        try { await updateGuestStats(guests) }
        catch (e: any) { errors.push(`Convidados: ${e.message}`) }
      }
      if (results.length > 0) {
        try { await saveResults({ matchId: match.id, results }) }
        catch (e: any) { errors.push(`Resultados: ${e.message}`) }
      }

      if (errors.length === 0) {
        showToast('Estatísticas salvas com sucesso!')
      } else {
        showToast('Estatísticas salvas, mas com erros: ' + errors.join('; '), 'error')
      }
    } catch (err: any) {
      showToast(err?.message || 'Erro ao salvar estatísticas', 'error')
    }
  }

  const allPlayers = players.length > 0 ? players : groupMembers.map((gm: any) => ({
    id: '', match_id: match.id, profile_id: gm.profile_id, team_id: null,
    goals: 0, assists: 0, own_goals: 0, nutmeg_given: 0, nutmeg_done: 0,
    no_show: false, won_match: null, created_at: '',
    profile: gm.profile
  } as MatchPlayer))

  function playerHasVoted(profileId: string | null) {
    if (!profileId) return false
    const eligiblePlayers = players.filter(p => p.profile_id !== profileId && p.profile_id && !p.no_show)
    if (eligiblePlayers.length === 0) return false
    const playerRatings = ratings.filter(r => r.rater_profile_id === profileId)
    return eligiblePlayers.every(ep => playerRatings.some(r => r.rated_profile_id === ep.profile_id))
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-white/[0.06] shadow-[0_0_40px_rgba(0,0,0,0.4)] mb-6">
      <div className="absolute -top-16 -right-16 w-40 h-40 bg-gradient-to-br from-yellow-500/10 to-transparent rounded-full blur-3xl" />
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent" />

      <div className="relative px-6 pt-5 pb-5">
        <h2 className="font-black text-sm uppercase tracking-[0.15em] text-yellow-400/80 mb-6 flex items-center gap-2">
          <Trophy size={16} /> Estatísticas da Partida
        </h2>

        {/* Placar - Auto-calculado */}
        {teams.length > 1 && (
          <div className="bg-white/[0.04] rounded-xl p-5 mb-6 border border-white/[0.06]">
            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-4">Placar</h3>
            <div className="flex items-center justify-center gap-6 flex-wrap">
              {teams.map((team, idx) => (
                <div key={team.id} className="flex items-center gap-3">
                  {idx > 0 && <span className="text-2xl font-black text-gray-600">×</span>}
                  <div className="flex items-center gap-3 bg-white/[0.06] rounded-xl px-5 py-3 border border-white/[0.08]">
                    <span className="text-sm font-black text-white uppercase tracking-wider">{team.name}</span>
                    <span className="text-2xl font-black text-yellow-400 tabular-nums">{scores[team.id] ?? 0}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Goleadores */}
            {(() => {
              const scorersByTeam = new Map<string, { name: string; goals: number; own: boolean }[]>()
              const allEntries = Object.entries(playerStats)
              teams.forEach(t => scorersByTeam.set(t.id, []))

              for (const [playerId, stats] of allEntries) {
                const player = allPlayers.find(p => p.id === playerId || p.profile_id === playerId)
                const name = player?.profile?.name || player?.guest_name || 'Jogador'
                if (stats.goals > 0 && stats.teamId) {
                  scorersByTeam.get(stats.teamId)?.push({ name, goals: stats.goals, own: false })
                }
                if (stats.own_goals > 0 && stats.teamId) {
                  const otherTeam = teams.find(t => t.id !== stats.teamId)
                  if (otherTeam) {
                    scorersByTeam.get(otherTeam.id)?.push({ name, goals: stats.own_goals, own: true })
                  }
                }
              }

              const hasAny = [...scorersByTeam.values()].some(s => s.length > 0)
              if (!hasAny) return null

              return (
                <div className="mt-4 pt-4 border-t border-white/[0.06]">
                  <div className="flex items-stretch justify-center gap-0">
                    {teams.map((team, idx) => {
                      const scorers = scorersByTeam.get(team.id) || []
                      if (scorers.length === 0) return null
                      return (
                        <div key={team.id} className="flex items-stretch">
                          {idx > 0 && (
                            <div className="w-px bg-white/[0.10] mx-6 shrink-0" />
                          )}
                          <div className={`flex-1 text-center ${idx === 0 ? 'pl-2' : ''}`}>
                            <div className="space-y-0.5">
                              {scorers.map((s, i) => (
                                <p key={i} className="text-xs font-bold text-white flex items-center gap-1 justify-center">
                                  {s.own && <span className="text-[9px] text-red-400 font-black uppercase tracking-wider">(g.c.)</span>}
                                  {s.name}
                                  {s.goals > 1 && <span className="text-yellow-400 font-black tabular-nums">×{s.goals}</span>}
                                </p>
                              ))}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        <div className="space-y-6">
                  {teams.map(team => {
            const teamPlayers = allPlayers.filter(p => p.team_id === team.id)
            if (teamPlayers.length === 0) return null
            return (
              <div key={team.id}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-yellow-500 to-amber-600" />
                  <h3 className="font-black text-sm uppercase tracking-[0.1em] text-white">{team.name}</h3>
                  <span className="text-[10px] text-gray-600 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06] ml-auto">
                    {teamPlayers.length} jogadores
                  </span>
                </div>
                <div className="space-y-2">
                  {teamPlayers.map(p => (
                    <div key={p.profile_id || p.id}
                      onClick={() => p.profile_id && onPlayerClick?.(p)}
                      className={`bg-white/[0.04] rounded-xl border border-white/[0.06] hover:bg-white/[0.08] transition-all duration-200 overflow-hidden ${p.profile_id ? 'cursor-pointer' : ''}`}>
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 ring-2 ring-white/[0.08]">
                              {p.profile?.avatar_url ? (
                                <img src={p.profile.avatar_url} alt={p.profile.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-[#0a0e17] font-black text-xs">
                                  {p.profile?.name?.charAt(0).toUpperCase() || p.guest_name?.charAt(0).toUpperCase() || '?'}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-white truncate">{p.profile?.name || p.guest_name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {p.guest_name ? (
                                  <span className="text-[9px] font-black uppercase tracking-wider text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">Convidado</span>
                                ) : playerHasVoted(p.profile_id) ? (
                                  <span className="text-[9px] font-black uppercase tracking-wider text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">Votou</span>
                                ) : (
                                  <span className="text-[9px] font-black uppercase tracking-wider text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">Não votou</span>
                                )}
                              </div>
                            </div>
                          </div>
                          {isAdmin ? (
                            <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-red-400 cursor-pointer bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20 hover:bg-red-500/20 transition shrink-0">
                              <input type="checkbox" checked={playerStats[p.id]?.no_show || false}
                                onChange={e => updateStat(p.id, 'no_show', e.target.checked)}
                                className="w-3 h-3 text-red-500 rounded focus:ring-red-500/50 bg-white/[0.08] border-white/[0.15]" />
                              Furão
                            </label>
                          ) : playerStats[p.id]?.no_show ? (
                            <span className="text-[10px] font-black uppercase tracking-wider text-red-400 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20 shrink-0">Furão</span>
                          ) : null}
                        </div>
                        {!playerStats[p.id]?.no_show && (
                          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1 sm:gap-2">
                            {[
                              { key: 'goals', label: 'Gols', color: 'text-yellow-400' },
                              { key: 'assists', label: 'Assist.', color: 'text-blue-400' },
                              { key: 'own_goals', label: 'Gol Contra', color: 'text-red-400' },
                              { key: 'nutmeg_done', label: 'Caneta', color: 'text-purple-400' },
                              { key: 'nutmeg_given', label: 'Levou', color: 'text-orange-400' },
                            ].map(stat => (
                              <div key={stat.key}>
                                <label className={`text-[8px] sm:text-[9px] font-black uppercase tracking-wider block mb-1 ${stat.color}`}>{stat.label}</label>
                                {isAdmin ? (
                                  <StatStepper value={(playerStats[p.id] as any)?.[stat.key] ?? 0}
                                    onChange={v => updateStat(p.id, stat.key, v)} />
                                ) : (
                                  <div className="text-center text-white font-bold text-xs sm:text-sm py-1 sm:py-1.5 bg-white/[0.04] rounded-lg border border-white/[0.06]">
                                    {(playerStats[p.id] as any)?.[stat.key] ?? 0}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
          {allPlayers.filter(p => !p.team_id).length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-gray-500 to-gray-600" />
                <h3 className="font-black text-sm uppercase tracking-[0.1em] text-gray-400">Sem time</h3>
                <span className="text-[10px] text-gray-600 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06] ml-auto">
                  {allPlayers.filter(p => !p.team_id).length} jogadores
                </span>
              </div>
              <div className="space-y-2">
                {allPlayers.filter(p => !p.team_id).map(p => (
                  <div key={p.profile_id || p.id}
                    onClick={() => p.profile_id && onPlayerClick?.(p)}
                    className={`bg-white/[0.04] rounded-xl border border-white/[0.06] hover:bg-white/[0.08] transition-all duration-200 overflow-hidden ${p.profile_id ? 'cursor-pointer' : ''}`}>
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 ring-2 ring-white/[0.08]">
                            {p.profile?.avatar_url ? (
                              <img src={p.profile.avatar_url} alt={p.profile.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-[#0a0e17] font-black text-xs">
                                {p.profile?.name?.charAt(0).toUpperCase() || p.guest_name?.charAt(0).toUpperCase() || '?'}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">{p.profile?.name || p.guest_name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {p.guest_name ? (
                                <span className="text-[9px] font-black uppercase tracking-wider text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">Convidado</span>
                              ) : playerHasVoted(p.profile_id) ? (
                                <span className="text-[9px] font-black uppercase tracking-wider text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">Votou</span>
                              ) : (
                                <span className="text-[9px] font-black uppercase tracking-wider text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">Não votou</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {isAdmin ? (
                          <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-red-400 cursor-pointer bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20 hover:bg-red-500/20 transition shrink-0">
                            <input type="checkbox" checked={playerStats[p.id]?.no_show || false}
                              onChange={e => updateStat(p.id, 'no_show', e.target.checked)}
                              className="w-3 h-3 text-red-500 rounded focus:ring-red-500/50 bg-white/[0.08] border-white/[0.15]" />
                            Furão
                          </label>
                        ) : playerStats[p.id]?.no_show ? (
                          <span className="text-[10px] font-black uppercase tracking-wider text-red-400 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20 shrink-0">Furão</span>
                        ) : null}
                      </div>
                      {!playerStats[p.id]?.no_show && (
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1 sm:gap-2">
                          {[
                            { key: 'goals', label: 'Gols', color: 'text-yellow-400' },
                            { key: 'assists', label: 'Assist.', color: 'text-blue-400' },
                            { key: 'own_goals', label: 'Gol Contra', color: 'text-red-400' },
                            { key: 'nutmeg_done', label: 'Caneta', color: 'text-purple-400' },
                            { key: 'nutmeg_given', label: 'Levou', color: 'text-orange-400' },
                          ].map(stat => (
                            <div key={stat.key}>
                              <label className={`text-[9px] font-black uppercase tracking-wider block mb-1 ${stat.color}`}>{stat.label}</label>
                              {isAdmin ? (
                                <input type="number" min={0} value={(playerStats[p.id] as any)?.[stat.key] ?? 0}
                                  onChange={e => updateStat(p.id, stat.key, parseInt(e.target.value) || 0)}
                                  className="w-full px-1.5 py-1.5 bg-white/[0.06] border border-white/[0.10] rounded-lg text-xs font-bold text-white text-center outline-none focus:ring-1 focus:ring-yellow-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                              ) : (
                                <div className="text-center text-white font-bold text-sm py-1.5 bg-white/[0.04] rounded-lg border border-white/[0.06]">
                                  {(playerStats[p.id] as any)?.[stat.key] ?? 0}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {statsError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mt-4 text-sm font-medium">
            {statsError}
          </div>
        )}

        {isAdmin && (
          <button onClick={handleSaveStats} disabled={saving}
            className="w-full mt-6 py-3.5 bg-gradient-to-r from-yellow-500 to-amber-600 text-[#0a0e17] rounded-xl font-black text-sm uppercase tracking-wider hover:from-yellow-400 hover:to-amber-500 transition-all duration-200 shadow-lg shadow-yellow-500/25 disabled:opacity-50">
            {saving ? 'Salvando...' : 'Salvar Estatísticas e Placar'}
          </button>
        )}
      </div>
    </div>
  )
}

function ManagePlayersPanel({ matchId, groupId, players, teams, isAdmin, onPlayerClick }: {
  matchId: string; groupId: string; players: MatchPlayer[]; teams: Team[]; isAdmin: boolean; onPlayerClick?: (p: MatchPlayer) => void
}) {
  const { mutateAsync: updatePlayerTeam } = useUpdatePlayerTeam()
  const { mutateAsync: createTeam } = useCreateTeam()
  const { mutateAsync: deleteTeamMutation } = useDeleteTeam()
  const { mutateAsync: removePlayer } = useRemoveMatchPlayer()
  const { mutateAsync: removeMatchPlayer } = useRemoveMatchPlayerById()
  const { mutateAsync: updateMatchPlayerTeam } = useUpdateMatchPlayerTeamById()
  const [deletingTeam, setDeletingTeam] = useState<string | null>(null)
  const [balancing, setBalancing] = useState(false)

  const playersInMatch = players.filter(p => !p.no_show)

  function getPlayerName(p: MatchPlayer) {
    return p.guest_name || p.profile?.name || 'Desconhecido'
  }

  function getPlayerInitial(p: MatchPlayer) {
    return p.guest_name?.charAt(0).toUpperCase() || p.profile?.name?.charAt(0).toUpperCase() || '?'
  }

  function getPlayerPosition(p: MatchPlayer): string | null {
    return p.profile?.position || null
  }

  const positionLabels: Record<string, string> = {
    GOLEIRO: 'Goleiro', ZAGUEIRO: 'Zagueiro', LATERAL: 'Lateral',
    MEIO_CAMPO: 'Meio-Campo', ATACANTE: 'Atacante',
  }

  async function handleBalanceTeams() {
    if (playersInMatch.length < 2) return
    setBalancing(true)
    try {
      const currentTeams = [...teams]
      while (currentTeams.length < 2) {
        const nextLetter = String.fromCharCode(65 + currentTeams.length)
        const created = await createTeam({ matchId, name: `Time ${nextLetter}` })
        currentTeams.push(created)
      }

      const balancerPlayers = playersInMatch
        .filter(p => p.profile_id)
        .map(p => ({
          profile_id: p.profile_id!,
          name: getPlayerName(p),
          position: getPlayerPosition(p) as any,
        }))

      if (balancerPlayers.length < 2) { setBalancing(false); return }

      const assignments = await balanceTeams(groupId, balancerPlayers, 2)

      for (const assignment of assignments) {
        const team = currentTeams[assignment.teamIndex]
        if (!team) continue
        for (const playerId of assignment.playerIds) {
          const matchPlayer = playersInMatch.find(p => p.profile_id === playerId)
          if (matchPlayer) {
            if (matchPlayer.profile_id) {
              await updatePlayerTeam({ matchId, profileId: matchPlayer.profile_id, teamId: team.id })
            } else {
              await updateMatchPlayerTeam({ matchId, playerId: matchPlayer.id, teamId: team.id })
            }
          }
        }
      }
    } catch (err) {
      console.error('Erro ao balancear times:', err)
    }
    setBalancing(false)
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
      <div key={player.id}
        onClick={() => player.profile_id && onPlayerClick?.(player)}
        className={`flex items-center justify-between p-2 rounded-lg ${player.profile_id ? 'cursor-pointer hover:bg-gray-100' : ''} bg-gray-50`}>
        <div className="flex items-center gap-2 min-w-0">
          {player.guest_name ? (
            <div className="w-7 h-7 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-xs shrink-0">
              <UserPlus size={12} />
            </div>
          ) : player.profile?.avatar_url ? (
            <img src={player.profile.avatar_url} alt=""
              className="w-7 h-7 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-xs shrink-0">
              {getPlayerInitial(player)}
            </div>
          )}
          <span className="text-sm text-gray-900 truncate">{getPlayerName(player)}</span>
          {player.guest_name ? (
            <span className="text-[10px] text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded font-medium shrink-0">Convidado</span>
          ) : getPlayerPosition(player) ? (
            <span className="text-[10px] text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded font-medium shrink-0">
              {positionLabels[getPlayerPosition(player)!]}
            </span>
          ) : null}
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
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={addTeam} className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1">
            <Plus size={14} /> Adicionar Time
          </button>
          <button onClick={handleBalanceTeams} disabled={balancing || playersInMatch.length < 2}
            className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition flex items-center gap-1.5 disabled:opacity-50">
            <Shuffle size={14} /> {balancing ? 'Dividindo...' : 'Dividir Times'}
          </button>
        </div>
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

function AwardsPanel({ awards, players }: { awards: MatchAward; players: MatchPlayer[] }) {
  function getPlayerStats(profileId: string | null | undefined) {
    if (!profileId) return { goals: 0, assists: 0 }
    const mp = players.find(p => p.profile_id === profileId)
    return { goals: mp?.goals ?? 0, assists: mp?.assists ?? 0 }
  }

  const scorerStats = getPlayerStats(awards.top_scorer_profile_id)
  const assistStats = getPlayerStats(awards.top_assist_profile_id)

  const awards_list = [
    { label: 'Craque da Partida', icon: <Award size={24} />, color: 'text-yellow-500', bg: 'bg-yellow-50', player: awards.best_player, rating: awards.best_player_rating },
    { label: 'Artilheiro', icon: <Goal size={24} />, color: 'text-green-500', bg: 'bg-green-50', player: awards.top_scorer, stat: `${scorerStats.goals} gol${scorerStats.goals !== 1 ? 's' : ''}` },
    { label: 'Rei das Assistências', icon: <UserPlus size={24} />, color: 'text-blue-500', bg: 'bg-blue-50', player: awards.top_assist, stat: `${assistStats.assists} assistência${assistStats.assists !== 1 ? 's' : ''}` },
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
                <div className="flex justify-center mb-2">
                  {a.player.avatar_url ? (
                    <img src={a.player.avatar_url} alt={a.player.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-white" />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: a.color === 'text-yellow-500' ? '#fef3c7' : a.color === 'text-green-500' ? '#dcfce7' : a.color === 'text-blue-500' ? '#dbeafe' : '#fee2e2' }}>
                      {a.player.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <p className="font-bold text-gray-900">{a.player.name}</p>
                {a.rating && i === 0 ? (
                  <p className="text-sm font-bold text-yellow-600 mt-1">{a.rating.toFixed(1)}</p>
                ) : a.rating ? (
                  <DisplayRating value={a.rating} size="sm" />
                ) : null}
                {(i === 1 || i === 2) && a.stat && (
                  <p className={`text-xs font-bold mt-1 ${i === 1 ? 'text-green-600' : 'text-blue-600'}`}>{a.stat}</p>
                )}
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

function PlayerSummaryModal({ player, groupId, onClose }: { player: MatchPlayer | null; groupId: string; onClose: () => void }) {
  const { data: stats, isLoading } = usePlayerGroupStats(player?.profile_id || undefined, groupId)

  if (!player || !player.profile) return null

  const p = player.profile
  const birthDate = p.birth_date ? new Date(p.birth_date) : null
  const age = birthDate ? Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div onClick={e => e.stopPropagation()}
        className="relative w-full sm:max-w-lg max-h-[85vh] overflow-y-auto bg-gradient-to-b from-[#1a2332] to-[#0a0f18] rounded-t-2xl sm:rounded-2xl border border-white/[0.06] shadow-[0_0_60px_rgba(0,0,0,0.6)]">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent" />

        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-white transition z-10 p-1">
          <X size={20} />
        </button>

        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 ring-2 ring-yellow-500/30">
              {p.avatar_url ? (
                <img src={p.avatar_url} alt={p.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-[#0a0e17] font-black text-xl">
                  {p.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{p.name}</h2>
              {p.position && (
                <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">{POSITION_LABELS[p.position]}</span>
              )}
            </div>
          </div>

          {/* Profile Info */}
          <div className="bg-white/[0.04] rounded-xl p-4 border border-white/[0.06] mb-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500 mb-3">Perfil</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {age !== null && (
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 block mb-0.5">Idade</span>
                  <span className="text-white font-bold">{age} anos</span>
                </div>
              )}
              {p.weight && (
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 block mb-0.5">Peso</span>
                  <span className="text-white font-bold">{p.weight} kg</span>
                </div>
              )}
              {p.dominant_foot && (
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 block mb-0.5">Pé Dominante</span>
                  <span className="text-white font-bold">{DOMINANT_FOOT_LABELS[p.dominant_foot]}</span>
                </div>
              )}
            </div>
          </div>

          {/* Group KPIs */}
          <div className="bg-white/[0.04] rounded-xl p-4 border border-white/[0.06]">
            <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500 mb-3">Estatísticas no Grupo</h3>
            {isLoading ? (
              <p className="text-gray-500 text-sm">Carregando...</p>
            ) : stats ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="bg-yellow-500/10 rounded-lg p-3 text-center border border-yellow-500/20">
                    <span className="text-xl font-black text-yellow-400 tabular-nums">{stats.goals}</span>
                    <p className="text-[9px] font-black uppercase tracking-wider text-yellow-400/70 mt-0.5">Gols</p>
                  </div>
                  <div className="bg-blue-500/10 rounded-lg p-3 text-center border border-blue-500/20">
                    <span className="text-xl font-black text-blue-400 tabular-nums">{stats.assists}</span>
                    <p className="text-[9px] font-black uppercase tracking-wider text-blue-400/70 mt-0.5">Assists.</p>
                  </div>
                  <div className="bg-purple-500/10 rounded-lg p-3 text-center border border-purple-500/20">
                    <span className="text-xl font-black text-purple-400 tabular-nums">{stats.matchesPlayed}</span>
                    <p className="text-[9px] font-black uppercase tracking-wider text-purple-400/70 mt-0.5">Partidas</p>
                  </div>
                  <div className="bg-emerald-500/10 rounded-lg p-3 text-center border border-emerald-500/20">
                    <span className="text-xl font-black text-emerald-400 tabular-nums">{stats.avgRating ? stats.avgRating.toFixed(1) : '-'}</span>
                    <p className="text-[9px] font-black uppercase tracking-wider text-emerald-400/70 mt-0.5">Média</p>
                  </div>
                </div>

                {/* Last 3 results */}
                {stats.last3.length > 0 && (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wider text-gray-500 mb-2">Últimos Resultados</p>
                    <div className="flex gap-2">
                      {stats.last3.map((result, i) => {
                        const colors = { win: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', draw: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', loss: 'bg-red-500/20 text-red-400 border-red-500/30' }
                        const labels = { win: 'V', draw: 'E', loss: 'D' }
                        return (
                          <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black border ${colors[result]}`}>
                            {labels[result]}
                          </div>
                        )
                      })}
                      {stats.last3.length < 3 && Array.from({ length: 3 - stats.last3.length }).map((_, i) => (
                        <div key={`empty-${i}`} className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black bg-white/[0.04] border border-white/[0.06] text-gray-600">
                          -
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional KPIs */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/[0.06]">
                  <div className="text-center">
                    <span className="text-sm font-black text-orange-400 tabular-nums">{stats.nutmeg_done}</span>
                    <p className="text-[8px] font-black uppercase tracking-wider text-orange-400/70 mt-0.5">Canetas</p>
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-black text-red-400 tabular-nums">{stats.nutmeg_given}</span>
                    <p className="text-[8px] font-black uppercase tracking-wider text-red-400/70 mt-0.5">Levou Caneta</p>
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-black text-gray-400 tabular-nums">{stats.matchesWon}</span>
                    <p className="text-[8px] font-black uppercase tracking-wider text-gray-400/70 mt-0.5">Vitórias</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-gray-500 text-sm">Sem estatísticas disponíveis.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center bg-white/[0.06] rounded-lg border border-white/[0.10] overflow-hidden">
      <button type="button" onClick={() => onChange(Math.max(0, value - 1))}
        className="px-2 sm:px-2.5 py-2 sm:py-1.5 text-gray-400 hover:text-white hover:bg-white/[0.10] transition font-black text-sm leading-none active:bg-white/[0.15]">
        −
      </button>
      <span className="w-7 sm:w-8 py-2 sm:py-1.5 text-xs font-black text-yellow-400 text-center leading-none tabular-nums select-none">
        {value}
      </span>
      <button type="button" onClick={() => onChange(value + 1)}
        className="px-2 sm:px-2.5 py-2 sm:py-1.5 text-gray-400 hover:text-white hover:bg-white/[0.10] transition font-black text-sm leading-none active:bg-white/[0.15]">
        +
      </button>
    </div>
  )
}

