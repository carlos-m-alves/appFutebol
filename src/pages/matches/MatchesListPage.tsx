import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useGroup } from '../../contexts/GroupContext'
import { useMatchesWithResults } from '../../hooks/useMatches'
import { Calendar, Plus, MapPin, Filter, Goal, Users } from 'lucide-react'
import { MATCH_STATUS } from '../../lib/constants'

export function MatchesListPage() {
  const { currentGroup, currentGroupRole, groups, setCurrentGroup } = useGroup()
  const [selectedGroupId, setSelectedGroupId] = useState(currentGroup?.id || (groups.length === 1 ? groups[0].id : ''))
  const { data: matches = [], isLoading } = useMatchesWithResults(selectedGroupId || undefined)

  useEffect(() => {
    if (selectedGroupId && !currentGroup) {
      const group = groups.find(g => g.id === selectedGroupId)
      if (group) setCurrentGroup(group)
    }
  }, [selectedGroupId])

  function handleGroupChange(groupId: string) {
    setSelectedGroupId(groupId)
    const group = groups.find(g => g.id === groupId)
    if (group) setCurrentGroup(group)
  }

  if (!selectedGroupId) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Partidas</h1>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={18} className="text-gray-400" />
            <select value={selectedGroupId} onChange={e => handleGroupChange(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none">
              <option value="">Selecione um grupo</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Partidas</h1>
        {currentGroupRole === 'ADMIN' && (
          <Link to="/matches/new" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2">
            <Plus size={18} /> Nova Partida
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : matches.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <Calendar className="mx-auto w-12 h-12 text-gray-300 mb-4" />
          <p className="text-gray-500 mb-4">Nenhuma partida ainda.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map(match => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </div>
  )
}

function MatchCard({ match }: { match: any }) {
  const isFinished = match.status === 'FINISHED'
  const isCancelled = match.status === 'CANCELLED'
  const isInProgress = match.status === 'IN_PROGRESS'
  const hasResults = match.results?.length > 0

  const teamA = hasResults ? match.results[0] : null
  const teamB = hasResults && match.results.length > 1 ? match.results[1] : null

  const teamAPlayers = teamA ? match.players?.filter((p: any) => p.team_id === teamA.team_id && !p.no_show) : []
  const teamBPlayers = teamB ? match.players?.filter((p: any) => p.team_id === teamB.team_id && !p.no_show) : []

  const teamAScorers = teamAPlayers.filter((p: any) => p.goals > 0)
  const teamBScorers = teamBPlayers.filter((p: any) => p.goals > 0)

  const statusLabel = MATCH_STATUS[match.status as keyof typeof MATCH_STATUS]
  const dateStr = new Date(match.match_date).toLocaleDateString('pt-BR', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
  const fullDateStr = new Date(match.match_date).toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  if (isFinished && hasResults) {
    return (
      <Link to={`/matches/${match.id}`}
        className="block bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl overflow-hidden hover:from-slate-700 hover:to-slate-800 transition-all duration-300 shadow-lg hover:shadow-xl group">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-green-400 bg-green-400/15 px-2 py-0.5 rounded-full tracking-wider uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              {statusLabel}
            </span>
            {match.location && (
              <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                <MapPin size={10} /> {match.location}
              </span>
            )}
          </div>
          <span className="text-[11px] text-gray-500">{dateStr}</span>
        </div>

        {/* Scoreboard */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between">
            {/* Team A */}
            <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center ring-2 ring-white/20 group-hover:ring-white/30 transition-all">
                <span className="text-white font-bold text-xl">{teamA.team?.name?.charAt(0) || '?'}</span>
              </div>
              <span className="text-white font-semibold text-sm text-center leading-tight truncate max-w-full">
                {teamA.team?.name}
              </span>
            </div>

            {/* Score */}
            <div className="flex items-center gap-3 mx-6">
              <span className="text-white text-5xl font-black tabular-nums">{teamA.score}</span>
              <div className="flex flex-col items-center gap-1">
                <span className="text-gray-400 text-xs font-semibold tracking-widest">FT</span>
                <div className="w-8 h-px bg-white/20" />
              </div>
              <span className="text-white text-5xl font-black tabular-nums">{teamB?.score ?? 0}</span>
            </div>

            {/* Team B */}
            {teamB ? (
              <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center ring-2 ring-white/20 group-hover:ring-white/30 transition-all">
                  <span className="text-white font-bold text-xl">{teamB.team?.name?.charAt(0) || '?'}</span>
                </div>
                <span className="text-white font-semibold text-sm text-center leading-tight truncate max-w-full">
                  {teamB.team?.name}
                </span>
              </div>
            ) : (
              <div className="flex-1" />
            )}
          </div>
        </div>

        {/* Goal scorers */}
        {(teamAScorers.length > 0 || teamBScorers.length > 0) && (
          <div className="bg-white/5 px-5 py-3">
            <div className="flex justify-between gap-4">
              <div className="flex-1 min-w-0">
                {teamAScorers.length > 0 ? (
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                    {teamAScorers.map((p: any) => (
                      <span key={p.profile_id} className="text-[11px] text-gray-300 flex items-center gap-0.5">
                        <Goal size={10} className="text-yellow-400 shrink-0" />
                        <span className="truncate">{p.profile?.name?.split(' ')[0]}</span>
                        {p.goals > 1 && <span className="text-yellow-400 font-medium">({p.goals})</span>}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[11px] text-gray-600">—</span>
                )}
              </div>
              <div className="flex-1 min-w-0 text-right">
                {teamBScorers.length > 0 ? (
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 justify-end">
                    {teamBScorers.map((p: any) => (
                      <span key={p.profile_id} className="text-[11px] text-gray-300 flex items-center gap-0.5">
                        <Goal size={10} className="text-yellow-400 shrink-0" />
                        <span className="truncate">{p.profile?.name?.split(' ')[0]}</span>
                        {p.goals > 1 && <span className="text-yellow-400 font-medium">({p.goals})</span>}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[11px] text-gray-600">—</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Player count */}
        <div className="px-5 py-2 border-t border-white/5">
          <div className="flex items-center justify-between text-[10px] text-gray-500">
            <span className="flex items-center gap-1">
              <Users size={10} /> {match.players?.length || 0} jogadores
            </span>
            <span>{fullDateStr}</span>
          </div>
        </div>
      </Link>
    )
  }

  if (isCancelled) {
    return (
      <Link to={`/matches/${match.id}`}
        className="block bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
              <Calendar className="text-red-400" size={24} />
            </div>
            <div>
              <p className="font-medium text-gray-400 line-through">{fullDateStr}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-800">
                  {statusLabel}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link to={`/matches/${match.id}`}
      className="block bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isInProgress ? 'bg-yellow-100' : 'bg-green-100'}`}>
            <Calendar className={isInProgress ? 'text-yellow-600' : 'text-green-600'} size={24} />
          </div>
          <div>
            <p className="font-medium">{fullDateStr}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                isInProgress ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {statusLabel}
              </span>
              {match.location && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <MapPin size={12} /> {match.location}
                </span>
              )}
              {match.evaluation_open && !match.evaluation_closed && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" /> Votação aberta
                </span>
              )}
            </div>
          </div>
        </div>
        {match.players?.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Users size={12} /> {match.players.length}
          </div>
        )}
      </div>
    </Link>
  )
}
