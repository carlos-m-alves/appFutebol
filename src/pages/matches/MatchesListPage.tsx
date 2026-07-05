import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useGroup } from '../../contexts/GroupContext'
import { useMatchesWithResults } from '../../hooks/useMatches'
import { Calendar, Plus, MapPin, Filter, Goal, Users, Award, UserPlus, ThumbsDown, Star } from 'lucide-react'
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const matchTeams = match.teams || []

  const teamA = hasResults ? match.results[0] : (matchTeams.length > 0 ? { team: matchTeams[0], score: 0 } : null)
  const teamB = hasResults && match.results.length > 1 ? match.results[1] : (matchTeams.length > 1 ? { team: matchTeams[1], score: 0 } : null)

  const teamAPlayers = hasResults ? match.players?.filter((p: any) => p.team_id === match.results[0]?.team_id && !p.no_show) : []
  const teamBPlayers = hasResults && match.results.length > 1 ? match.players?.filter((p: any) => p.team_id === match.results[1]?.team_id && !p.no_show) : []

  const teamAScorers = teamAPlayers.filter((p: any) => p.goals > 0)
  const teamBScorers = teamBPlayers.filter((p: any) => p.goals > 0)
  const teamAOwnGoals = teamBPlayers.filter((p: any) => p.own_goals > 0)
  const teamBOwnGoals = teamAPlayers.filter((p: any) => p.own_goals > 0)

  const statusLabel = MATCH_STATUS[match.status as keyof typeof MATCH_STATUS]
  const fmtDate = (d: Date) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  const dateStr = fmtDate(new Date(match.match_date))

  if (isFinished) {
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
          <span className="text-[11px] text-gray-500 font-bold">{dateStr}</span>
        </div>

        {/* Scoreboard */}
        {teamA && (
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
        )}

        {/* Goal scorers */}
        {teamA && (teamAScorers.length > 0 || teamBScorers.length > 0 || teamAOwnGoals.length > 0 || teamBOwnGoals.length > 0) && (
          <div className="bg-white/5 px-5 py-3">
            <div className="flex justify-center gap-8">
              {(teamAScorers.length > 0 || teamAOwnGoals.length > 0) && (
                <div className="flex flex-col items-start gap-1">
                  {teamAScorers.map((p: any) => (
                    <span key={p.profile_id} className="text-[11px] text-gray-300 flex items-center gap-0.5">
                      <Goal size={10} className="text-yellow-400 shrink-0" />
                      <span className="truncate">{p.profile?.name?.split(' ')[0]}</span>
                      {p.goals > 1 && <span className="text-yellow-400 font-medium">({p.goals})</span>}
                    </span>
                  ))}
                  {teamAOwnGoals.map((p: any) => (
                    <span key={`og-${p.profile_id}`} className="text-[11px] text-gray-300 flex items-center gap-0.5">
                      <Goal size={10} className="text-red-400 shrink-0" />
                      <span className="truncate">{p.profile?.name?.split(' ')[0]}</span>
                      <span className="text-red-400 text-[9px] font-medium">(g.c.)</span>
                      {p.own_goals > 1 && <span className="text-red-400 font-medium">×{p.own_goals}</span>}
                    </span>
                  ))}
                </div>
              )}
              {(teamBScorers.length > 0 || teamBOwnGoals.length > 0) && (
                <div className="flex flex-col items-start gap-1">
                  {teamBScorers.map((p: any) => (
                    <span key={p.profile_id} className="text-[11px] text-gray-300 flex items-center gap-0.5">
                      <Goal size={10} className="text-yellow-400 shrink-0" />
                      <span className="truncate">{p.profile?.name?.split(' ')[0]}</span>
                      {p.goals > 1 && <span className="text-yellow-400 font-medium">({p.goals})</span>}
                    </span>
                  ))}
                  {teamBOwnGoals.map((p: any) => (
                    <span key={`og-${p.profile_id}`} className="text-[11px] text-gray-300 flex items-center gap-0.5">
                      <Goal size={10} className="text-red-400 shrink-0" />
                      <span className="truncate">{p.profile?.name?.split(' ')[0]}</span>
                      <span className="text-red-400 text-[9px] font-medium">(g.c.)</span>
                      {p.own_goals > 1 && <span className="text-red-400 font-medium">×{p.own_goals}</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Awards */}
        {match.awards && (
          <div className="px-5 pb-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                {
                  label: 'Craque da Partida',
                  icon: <Award size={16} />,
                  color: 'text-yellow-400',
                  bg: 'bg-yellow-400/10',
                  ring: 'ring-yellow-400/30',
                  player: match.awards.best_player,
                  rating: match.awards.best_player_rating,
                },
                {
                  label: 'Artilheiro',
                  icon: <Goal size={16} />,
                  color: 'text-emerald-400',
                  bg: 'bg-emerald-400/10',
                  ring: 'ring-emerald-400/30',
                  player: match.awards.top_scorer,
                },
                {
                  label: 'Rei das Assistências',
                  icon: <UserPlus size={16} />,
                  color: 'text-blue-400',
                  bg: 'bg-blue-400/10',
                  ring: 'ring-blue-400/30',
                  player: match.awards.top_assist,
                },
                {
                  label: 'Bagre da Partida',
                  icon: <ThumbsDown size={16} />,
                  color: 'text-red-400',
                  bg: 'bg-red-400/10',
                  ring: 'ring-red-400/30',
                  player: match.awards.worst_player,
                },
              ].map((a, i) => (
                <div key={i} className={`${a.bg} rounded-lg p-2 text-center ring-1 ${a.ring}`}>
                  <div className={`${a.color} flex justify-center mb-0.5`}>{a.icon}</div>
                  <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-0.5">{a.label}</p>
                  {a.player ? (
                    <p className="text-white font-bold text-xs truncate">{a.player.name}</p>
                  ) : (
                    <p className="text-gray-600 text-xs">—</p>
                  )}
                  {a.rating && (
                    <div className="flex items-center justify-center gap-0.5 mt-0.5">
                      <Star size={8} className="text-yellow-400 fill-yellow-400" />
                      <span className="text-[9px] text-yellow-400 font-medium">{a.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Player count */}
        <div className="px-5 py-2 border-t border-white/5">
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            <Users size={10} /> {match.players?.length || 0} jogadores
          </span>
        </div>
      </Link>
    )
  }

  if (isCancelled) {
    return (
      <Link to={`/matches/${match.id}`}
        className="block bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition">
        <div className="mb-2">
          <p className="text-xs font-bold text-gray-500 line-through">{dateStr}</p>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
              <Calendar className="text-red-400" size={24} />
            </div>
            <div>
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
        <div className="mb-2">
          <p className="text-xs font-bold text-gray-700">{dateStr}</p>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isInProgress ? 'bg-yellow-100' : 'bg-green-100'}`}>
              <Calendar className={isInProgress ? 'text-yellow-600' : 'text-green-600'} size={24} />
            </div>
            <div>
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
          <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
            <Users size={12} /> {match.players.length}
          </div>
        )}
      </div>
    </Link>
  )
}
