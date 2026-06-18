import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useGroup } from '../../contexts/GroupContext'
import { supabase } from '../../lib/supabase'
import { matchService, groupService } from '../../services/api'
import type { Match, Team, MatchPlayer, MatchResult, MatchConfirmation, MatchAward, GroupMember } from '../../types'
import { MATCH_STATUS } from '../../lib/constants'
import { StarRating, DisplayRating } from '../../components/ui/StarRating'
import { Calendar, MapPin, Users, Trophy, Star, Swords, ChevronDown, ChevronUp, X, Award, ThumbsDown, Goal, UserPlus, Check, Plus, Trash2 } from 'lucide-react'

export function MatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const { currentGroupRole, currentGroup, setCurrentGroup, groups } = useGroup()
  const navigate = useNavigate()

  const [match, setMatch] = useState<Match | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [players, setPlayers] = useState<MatchPlayer[]>([])
  const [results, setResults] = useState<MatchResult[]>([])
  const [confirmations, setConfirmations] = useState<MatchConfirmation[]>([])
  const [awards, setAwards] = useState<MatchAward | null>(null)
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([])
  const [userAllVoted, setUserAllVoted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { if (id) loadMatch() }, [id, profile?.id])

  async function loadMatch() {
    if (!id) return
    setLoading(true)
    try {
      const [m, t, p, r, c, a, ratings] = await Promise.all([
        matchService.get(id),
        matchService.getTeams(id),
        matchService.getPlayers(id),
        matchService.getResults(id),
        matchService.getConfirmations(id),
        matchService.getAwards(id),
        matchService.getRatings(id)
      ])
      setMatch(m)
      setTeams(t)
      setPlayers(p)
      setResults(r)
      setConfirmations(c)
      setAwards(a)
      if (m && profile) {
        const myRatings = ratings.filter(r => r.rater_profile_id === profile.id)
        const eligiblePlayers = p.filter(pl => pl.profile_id !== profile.id && !pl.no_show)
        setUserAllVoted(eligiblePlayers.length > 0 && eligiblePlayers.every(pl => myRatings.some(r => r.rated_profile_id === pl.profile_id)))
      }
      if (m) {
        const gm = await groupService.getMembers(m.group_id)
        setGroupMembers(gm)
        if (!currentGroup) {
          const group = groups.find(g => g.id === m.group_id)
          if (group) {
            setCurrentGroup(group)
          } else {
            const { data: groupData } = await supabase.from('groups').select('*').eq('id', m.group_id).maybeSingle()
            if (groupData) setCurrentGroup(groupData)
          }
        }
      }
    } catch (e) {
      setError('Erro ao carregar partida')
    }
    setLoading(false)
  }

  async function handleStartMatch() {
    if (!id || !match) return
    await matchService.update(id, { status: 'IN_PROGRESS' })
    loadMatch()
  }

  async function handleFinishMatch() {
    if (!id || !match) return
    await matchService.update(id, { status: 'FINISHED' })
    loadMatch()
  }

  async function handleOpenEvaluation() {
    if (!id) return
    await matchService.update(id, { evaluation_open: true, evaluation_closed: false })
    loadMatch()
  }

  async function handleCloseEvaluation() {
    if (!id) return
    await matchService.calculateAwards(id)
    await matchService.update(id, { evaluation_open: false, evaluation_closed: true })
    loadMatch()
  }

  async function handleCancelMatch() {
    if (!id || !confirm('Cancelar esta partida?')) return
    await matchService.update(id, { status: 'CANCELLED' })
    loadMatch()
  }

  async function handleConfirmAttendance() {
    if (!id || !profile) return
    await matchService.confirmAttendance(id, profile.id, 'CONFIRMED')
    await matchService.addPlayer(id, profile.id)
    loadMatch()
  }

  if (loading) return <div className="text-center py-8">Carregando...</div>
  if (error || !match) return <div className="text-center py-8 text-red-600">{error || 'Partida não encontrada'}</div>

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
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calendar size={24} className="text-green-600" />
              {new Date(match.match_date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </h1>
            {match.location && (
              <p className="text-gray-500 flex items-center gap-1 mt-1"><MapPin size={16} /> {match.location}</p>
            )}
          </div>

          <div className="flex gap-2">
            {profile && !isParticipant && (
              <button onClick={handleConfirmAttendance} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm flex items-center gap-1">
                <Check size={16} /> Confirmar Presença
              </button>
            )}
            {profile && isParticipant && (
              <span className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm flex items-center gap-1">
                <Check size={16} /> Presença Confirmada
              </span>
            )}
            {isAdmin && match.status === 'SCHEDULED' && (
              <>
                <button onClick={handleStartMatch} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm">
                  Iniciar Partida
                </button>
                <button onClick={handleCancelMatch} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition text-sm">
                  Cancelar
                </button>
              </>
            )}
          </div>
          {isAdmin && match.status === 'IN_PROGRESS' && (
            <button onClick={handleFinishMatch} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm">
              Finalizar Partida
            </button>
          )}
        </div>
      </div>

      {match.status === 'FINISHED' && !match.evaluation_open && !match.evaluation_closed && isAdmin && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
          <p className="text-purple-800 font-medium mb-2">Partida finalizada!</p>
          <button onClick={handleOpenEvaluation} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm">
            Liberar Votação
          </button>
        </div>
      )}

      {match.evaluation_open && !match.evaluation_closed && isAdmin && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <p className="text-yellow-800 font-medium mb-2">Votação em andamento</p>
          <button onClick={handleCloseEvaluation} className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition text-sm">
            Encerrar Votação e Calcular Prêmios
          </button>
        </div>
      )}

      {(match.status === 'SCHEDULED' || match.status === 'IN_PROGRESS') && (
        <ManagePlayersPanel
          match={match} players={players} teams={teams}
          groupMembers={groupMembers} isAdmin={isAdmin}
          onUpdate={loadMatch}
        />
      )}

      {isAdmin && !results.length && (match.status === 'SCHEDULED' || match.status === 'IN_PROGRESS') && (
        <MatchAdminPanel
          match={match} teams={teams} players={players} results={results}
          confirmations={confirmations} groupMembers={groupMembers} onUpdate={loadMatch}
        />
      )}

      {isAdmin && match.status === 'FINISHED' && (
        <MatchStatsPanel
          match={match} players={players} teams={teams}
          groupMembers={groupMembers} onUpdate={loadMatch}
        />
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
    </div>
  )
}

function MatchAdminPanel({ match, teams, players, results, confirmations, groupMembers, onUpdate }: {
  match: Match; teams: Team[]; players: MatchPlayer[]; results: MatchResult[]
  confirmations: MatchConfirmation[]; groupMembers: GroupMember[]; onUpdate: () => void
}) {
  const [teamNames, setTeamNames] = useState<string[]>(teams.map(t => t.name))
  const [scores, setScores] = useState<Record<string, number>>({})
  const [selectedPlayers, setSelectedPlayers] = useState<Record<string, { teamId: string; goals: number; assists: number }>>({})
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    if (teams.length > 0) {
      setTeamNames(teams.map(t => t.name))
      const s: Record<string, number> = {}
      results.forEach(r => { s[r.team_id] = r.score })
      setScores(s)
    }
    const sp: Record<string, { teamId: string; goals: number; assists: number }> = {}
    players.forEach(p => {
      sp[p.profile_id] = { teamId: p.team_id || '', goals: p.goals || 0, assists: p.assists || 0 }
    })
    setSelectedPlayers(sp)
  }, [teams, players, results])

  function addTeam() {
    setTeamNames([...teamNames, `Time ${teamNames.length + 1}`])
  }

  function removeTeam(index: number) {
    setTeamNames(teamNames.filter((_, i) => i !== index))
  }

  function updateTeamName(index: number, name: string) {
    const updated = [...teamNames]
    updated[index] = name
    setTeamNames(updated)
  }

  function togglePlayer(playerId: string) {
    const updated = { ...selectedPlayers }
    if (updated[playerId]) {
      delete updated[playerId]
    } else {
      updated[playerId] = { teamId: teams[0]?.id || '', goals: 0, assists: 0 }
    }
    setSelectedPlayers(updated)
  }

  function updatePlayerTeam(playerId: string, teamId: string) {
    setSelectedPlayers(prev => ({
      ...prev,
      [playerId]: { ...prev[playerId], teamId }
    }))
  }

  function updatePlayerStats(playerId: string, field: 'goals' | 'assists', value: number) {
    setSelectedPlayers(prev => ({
      ...prev,
      [playerId]: { ...prev[playerId], [field]: Math.max(0, value) }
    }))
  }

  function updatePlayerExtraStats(playerId: string, field: 'own_goals' | 'nutmeg_given' | 'nutmeg_done', value: number) {
    setSelectedPlayers(prev => ({
      ...prev,
      [playerId]: { ...prev[playerId], [field]: Math.max(0, value) }
    }))
  }

  function updatePlayerNoShow(playerId: string, noShow: boolean) {
    setSelectedPlayers(prev => ({
      ...prev,
      [playerId]: { ...prev[playerId], no_show: noShow }
    }))
  }

  async function handleSave() {
    if (!match) return
    const savedTeams = await matchService.saveTeams(match.id, teamNames.map(n => ({ name: n })))
    if (!savedTeams) return

    const teamMap = new Map<string, string>()
    teamNames.forEach((name, i) => {
      teamMap.set(name, savedTeams[i].id)
    })

    const playersList = Object.entries(selectedPlayers)
      .filter(([_, v]) => v.teamId || true)
      .map(([profileId, data]) => ({
        profile_id: profileId,
        team_id: data.teamId || undefined,
        goals: 0,
        assists: 0,
        own_goals: 0,
        nutmeg_given: 0,
        nutmeg_done: 0,
        no_show: false
      }))

    await matchService.savePlayers(match.id, playersList)

    const resultList = savedTeams.map(t => ({
      team_id: t.id,
      score: scores[t.id] || 0
    }))
    await matchService.saveResults(match.id, resultList)

    onUpdate()
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <button onClick={() => setShowForm(!showForm)}
        className="flex items-center justify-between w-full text-left">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <Swords size={20} className="text-green-600" /> Gerenciar Partida
        </h2>
        {showForm ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {showForm && (
        <div className="mt-4 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-sm">Times</h3>
              <button onClick={addTeam} className="text-sm text-green-600 hover:text-green-700">+ Adicionar Time</button>
            </div>
            <div className="space-y-2">
              {teamNames.map((name, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="text" value={name} onChange={e => updateTeamName(i, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" />
                  <input type="number" placeholder="Gols" min={0}
                    onChange={e => setScores(prev => ({ ...prev, [teams[i]?.id || `new-${i}`]: parseInt(e.target.value) || 0 }))}
                    className="w-16 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" />
                  {teamNames.length > 2 && (
                    <button onClick={() => removeTeam(i)} className="text-red-500 hover:text-red-700"><X size={18} /></button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-medium text-sm mb-2">Jogadores Confirmados</h3>
            {confirmations.filter(c => c.status === 'CONFIRMED').length === 0 ? (
              <p className="text-sm text-gray-400">Nenhum jogador confirmado ainda.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {confirmations.filter(c => c.status === 'CONFIRMED').map(c => (
                  <div key={c.profile_id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50">
                    <label className="flex items-center gap-2 flex-1 cursor-pointer">
                      <input type="checkbox" checked={!!selectedPlayers[c.profile_id]}
                        onChange={() => togglePlayer(c.profile_id)}
                        className="w-4 h-4 text-green-600 rounded focus:ring-green-500" />
                      <span className="text-sm font-medium">{c.profile?.name}</span>
                    </label>
                    {selectedPlayers[c.profile_id] && (
                      <div className="flex items-center gap-2">
                        <select value={selectedPlayers[c.profile_id].teamId}
                          onChange={e => updatePlayerTeam(c.profile_id, e.target.value)}
                          className="text-xs px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
                          {teamNames.map((name, i) => (
                            <option key={i} value={teams[i]?.id || ''}>{name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="font-medium text-sm mb-2 flex items-center gap-1">
              <Plus size={16} /> Jogadores do Grupo
            </h3>
            <p className="text-xs text-gray-400 mb-2">Adicione jogadores do grupo diretamente na partida.</p>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {groupMembers.filter(gm => !players.some(p => p.profile_id === gm.profile_id)).map(gm => (
                <div key={gm.profile_id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50">
                  <label className="flex items-center gap-2 flex-1 cursor-pointer">
                    <input type="checkbox" checked={!!selectedPlayers[gm.profile_id]}
                      onChange={() => togglePlayer(gm.profile_id)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                    <span className="text-sm font-medium">{gm.profile?.name}</span>
                  </label>
                    {selectedPlayers[gm.profile_id] && (
                      <div className="flex items-center gap-2">
                        <select value={selectedPlayers[gm.profile_id].teamId}
                          onChange={e => updatePlayerTeam(gm.profile_id, e.target.value)}
                          className="text-xs px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
                          {teamNames.map((name, i) => (
                            <option key={i} value={teams[i]?.id || ''}>{name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          <button onClick={handleSave} className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition">
            Salvar Times
          </button>
        </div>
      )}
    </div>
  )
}

function MatchStatsPanel({ match, players, teams, groupMembers, onUpdate }: {
  match: Match; players: MatchPlayer[]; teams: Team[]; groupMembers: GroupMember[]; onUpdate: () => void
}) {
  const [playerStats, setPlayerStats] = useState<Record<string, {
    teamId: string; goals: number; assists: number; own_goals: number
    nutmeg_given: number; nutmeg_done: number; no_show: boolean
  }>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const stats: Record<string, any> = {}
    players.forEach(p => {
      stats[p.profile_id] = {
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

  function updateStat(profileId: string, field: string, value: any) {
    setPlayerStats(prev => ({
      ...prev,
      [profileId]: { ...prev[profileId], [field]: value }
    }))
  }

  async function handleSaveStats() {
    if (!match) return
    setSaving(true)
    const list = Object.entries(playerStats).map(([profileId, data]) => ({
      profile_id: profileId,
      team_id: data.teamId || undefined,
      goals: data.goals,
      assists: data.assists,
      own_goals: data.own_goals,
      nutmeg_given: data.nutmeg_given,
      nutmeg_done: data.nutmeg_done,
      no_show: data.no_show
    }))
    await matchService.savePlayers(match.id, list)
    setSaving(false)
    onUpdate()
  }

  const allPlayers = players.length > 0 ? players : groupMembers.map(gm => ({
    id: '', match_id: match.id, profile_id: gm.profile_id, team_id: null,
    goals: 0, assists: 0, own_goals: 0, nutmeg_given: 0, nutmeg_done: 0,
    no_show: false, won_match: null, created_at: '',
    profile: gm.profile
  } as MatchPlayer))

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
        <Trophy size={20} className="text-yellow-500" /> Estatísticas da Partida
      </h2>
      <div className="space-y-3">
        {allPlayers.map(p => (
          <div key={p.profile_id} className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-xs">
                  {p.profile?.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <span className="text-sm font-medium">{p.profile?.name}</span>
              </div>
              <label className="flex items-center gap-1 text-xs text-red-600 cursor-pointer">
                <input type="checkbox" checked={playerStats[p.profile_id]?.no_show || false}
                  onChange={e => updateStat(p.profile_id, 'no_show', e.target.checked)}
                  className="w-3.5 h-3.5 text-red-600 rounded focus:ring-red-500" />
                Furão
              </label>
            </div>
            {!playerStats[p.profile_id]?.no_show && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div>
                  <label className="text-xs text-gray-500 block mb-0.5">Gols</label>
                  <input type="number" min={0} value={playerStats[p.profile_id]?.goals ?? 0}
                    onChange={e => updateStat(p.profile_id, 'goals', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-center outline-none focus:ring-1 focus:ring-green-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-0.5">Assist.</label>
                  <input type="number" min={0} value={playerStats[p.profile_id]?.assists ?? 0}
                    onChange={e => updateStat(p.profile_id, 'assists', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-center outline-none focus:ring-1 focus:ring-green-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-0.5">Gol Contra</label>
                  <input type="number" min={0} value={playerStats[p.profile_id]?.own_goals ?? 0}
                    onChange={e => updateStat(p.profile_id, 'own_goals', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-center outline-none focus:ring-1 focus:ring-green-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-0.5">Meteu Caneta</label>
                  <input type="number" min={0} value={playerStats[p.profile_id]?.nutmeg_done ?? 0}
                    onChange={e => updateStat(p.profile_id, 'nutmeg_done', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-center outline-none focus:ring-1 focus:ring-green-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-0.5">Levou Caneta</label>
                  <input type="number" min={0} value={playerStats[p.profile_id]?.nutmeg_given ?? 0}
                    onChange={e => updateStat(p.profile_id, 'nutmeg_given', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-center outline-none focus:ring-1 focus:ring-green-500" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <button onClick={handleSaveStats} disabled={saving}
        className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition mt-4 disabled:opacity-50">
        {saving ? 'Salvando...' : 'Salvar Estatísticas'}
      </button>
    </div>
  )
}

function ManagePlayersPanel({ match, players, teams, groupMembers, isAdmin, onUpdate }: {
  match: Match; players: MatchPlayer[]; teams: Team[]; groupMembers: GroupMember[]
  isAdmin: boolean; onUpdate: () => void
}) {
  const [saving, setSaving] = useState(false)

  async function handleChangeTeam(playerId: string, teamId: string) {
    await matchService.updatePlayerTeam(match.id, playerId, teamId || null)
    onUpdate()
  }

  async function handleRemovePlayer(playerId: string) {
    if (!confirm('Remover este jogador da partida?')) return
    await matchService.removePlayer(match.id, playerId)
    onUpdate()
  }

  async function handleAddPlayer(profileId: string) {
    await matchService.addPlayer(match.id, profileId)
    onUpdate()
  }

  const playersInMatch = players.filter(p => !p.no_show)
  const availableMembers = groupMembers.filter(gm =>
    !players.some(p => p.profile_id === gm.profile_id)
  )

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
        <Users size={20} className="text-blue-500" /> Jogadores na Partida ({playersInMatch.length})
      </h2>

      {teams.length > 0 ? (
        <div className="space-y-4 mb-4">
          {teams.map(team => {
            const teamPlayers = playersInMatch.filter(p => p.team_id === team.id)
            return (
              <div key={team.id}>
                <h3 className="font-semibold text-sm text-gray-600 mb-2">{team.name}</h3>
                <div className="space-y-1">
                  {teamPlayers.map(p => (
                    <PlayerRow key={p.profile_id} player={p} teams={teams} isAdmin={isAdmin}
                      onChangeTeam={handleChangeTeam} onRemove={handleRemovePlayer} />
                  ))}
                </div>
              </div>
            )
          })}
          {playersInMatch.filter(p => !p.team_id).length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-gray-400 mb-2">Sem time</h3>
              <div className="space-y-1">
                {playersInMatch.filter(p => !p.team_id).map(p => (
                  <PlayerRow key={p.profile_id} player={p} teams={teams} isAdmin={isAdmin}
                    onChangeTeam={handleChangeTeam} onRemove={handleRemovePlayer} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1 mb-4">
          {playersInMatch.map(p => (
            <PlayerRow key={p.profile_id} player={p} teams={teams} isAdmin={isAdmin}
              onChangeTeam={handleChangeTeam} onRemove={handleRemovePlayer} />
          ))}
        </div>
      )}

      {playersInMatch.length === 0 && (
        <p className="text-sm text-gray-400 mb-4">Nenhum jogador adicionado à partida ainda.</p>
      )}

      {isAdmin && availableMembers.length > 0 && (
        <div className="border-t border-gray-100 pt-4">
          <h3 className="font-medium text-sm mb-2 flex items-center gap-1">
            <Plus size={16} /> Adicionar Jogador
          </h3>
          <div className="flex flex-wrap gap-2">
            {availableMembers.map(gm => (
              <button key={gm.profile_id} onClick={() => handleAddPlayer(gm.profile_id)}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm hover:bg-blue-100 transition">
                <Plus size={14} /> {gm.profile?.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PlayerRow({ player, teams, isAdmin, onChangeTeam, onRemove }: {
  player: MatchPlayer; teams: Team[]; isAdmin: boolean
  onChangeTeam: (profileId: string, teamId: string) => void
  onRemove: (profileId: string) => void
}) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-xs">
          {player.profile?.name?.charAt(0).toUpperCase() || '?'}
        </div>
        <span className="text-sm font-medium">{player.profile?.name}</span>
      </div>
      <div className="flex items-center gap-2">
        {isAdmin && teams.length > 0 && (
          <select value={player.team_id || ''} onChange={e => onChangeTeam(player.profile_id, e.target.value)}
            className="text-xs px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
            <option value="">Sem time</option>
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
        {isAdmin && (
          <button onClick={() => onRemove(player.profile_id)}
            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition" title="Remover">
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

function MatchResultsPanel({ teams, results, players }: { teams: Team[]; results: MatchResult[]; players: MatchPlayer[] }) {
  const getTeamPlayers = (teamId: string) => players.filter(p => p.team_id === teamId)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
        <Trophy size={20} className="text-yellow-500" /> Resultado
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {teams.map(team => {
          const result = results.find(r => r.team_id === team.id)
          const teamPlayers = getTeamPlayers(team.id)
          return (
            <div key={team.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-lg">{team.name}</h3>
                <span className="text-2xl font-bold text-green-600">{result?.score ?? 0}</span>
              </div>
              <div className="space-y-1">
                {teamPlayers.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className={p.no_show ? 'line-through text-gray-400' : ''}>
                      {p.profile?.name}
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

function StatBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`flex flex-col items-center ${color}`}>
      <span className="text-lg font-bold">{value}</span>
      <span className="text-[10px] uppercase tracking-wider opacity-75">{label}</span>
    </div>
  )
}

function VotingPanel({ matchId, profileId, players }: {
  matchId: string; profileId: string; players: MatchPlayer[]
}) {
  const [votes, setVotes] = useState<Record<string, { rating: number; comment: string }>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmitVote(ratedProfileId: string) {
    const vote = votes[ratedProfileId]
    if (!vote?.rating) return

    setSubmitting(true)
    setError(null)
    try {
      await matchService.submitRating(matchId, profileId, ratedProfileId, vote.rating, vote.comment || undefined)
      setVotes(prev => ({ ...prev, [ratedProfileId]: { rating: 0, comment: '' } }))
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar voto')
    }
    setSubmitting(false)
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
      <h2 className="font-bold text-lg mb-6 flex items-center gap-2">
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
