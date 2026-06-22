import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useGroup } from '../../contexts/GroupContext'
import { matchService } from '../../services/api'
import { History, Filter, Goal, UserPlus, ThumbsDown, Award, Star, MapPin, Trophy } from 'lucide-react'

export function HallPage() {
  const { currentGroup, groups } = useGroup()
  const [hallData, setHallData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGroupId, setSelectedGroupId] = useState(currentGroup?.id || '')
  const [selectedYear, setSelectedYear] = useState<string>('')

  useEffect(() => {
    if (selectedGroupId) loadHall()
  }, [selectedGroupId, selectedYear])

  async function loadHall() {
    if (!selectedGroupId) return
    setLoading(true)
    const data = await matchService.getHallOfFame(selectedGroupId, {
      year: selectedYear ? parseInt(selectedYear) : undefined
    })
    setHallData(data)
    setLoading(false)
  }

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <History size={24} className="text-yellow-500" /> Hall da Pelada
        </h1>
      </div>

      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 mb-6 shadow-lg">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Filter size={18} className="text-gray-400 shrink-0" />
            <select value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)}
              className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white focus:ring-2 focus:ring-yellow-500 outline-none appearance-none">
              <option value="" className="text-gray-900">Selecione um grupo</option>
              {groups.map(g => (
                <option key={g.id} value={g.id} className="text-gray-900">{g.name}</option>
              ))}
            </select>
          </div>
          <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white focus:ring-2 focus:ring-yellow-500 outline-none appearance-none">
            <option value="" className="text-gray-900">Todos os anos</option>
            {years.map(y => (
              <option key={y} value={y} className="text-gray-900">{y}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Carregando...</div>
      ) : hallData.length === 0 ? (
        <div className="text-center py-12 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-white/10">
          <History className="mx-auto w-12 h-12 text-gray-600 mb-4" />
          <p className="text-gray-400">Nenhum registro encontrado.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {hallData.map((entry: any) => (
            <HallCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  )
}

function HallCard({ entry }: { entry: any }) {
  const matchResults = entry.match_results || []
  const teamA = matchResults.length > 0 ? matchResults[0] : null
  const teamB = matchResults.length > 1 ? matchResults[1] : null

  const dateStr = entry.match?.match_date
    ? new Date(entry.match.match_date).toLocaleDateString('pt-BR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      })
    : ''

  const awards = [
    {
      label: 'Craque da Partida',
      icon: <Award size={20} />,
      color: 'text-yellow-400',
      bg: 'bg-yellow-400/10',
      ring: 'ring-yellow-400/30',
      player: entry.best_player,
      rating: entry.best_player_rating,
    },
    {
      label: 'Artilheiro',
      icon: <Goal size={20} />,
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
      ring: 'ring-emerald-400/30',
      player: entry.top_scorer,
    },
    {
      label: 'Rei das Assistências',
      icon: <UserPlus size={20} />,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
      ring: 'ring-blue-400/30',
      player: entry.top_assist,
    },
    {
      label: 'Bagre da Partida',
      icon: <ThumbsDown size={20} />,
      color: 'text-red-400',
      bg: 'bg-red-400/10',
      ring: 'ring-red-400/30',
      player: entry.worst_player,
    },
  ]

  return (
    <Link to={`/matches/${entry.match_id}`}
      className="block bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl overflow-hidden hover:from-slate-700 hover:to-slate-800 transition-all duration-300 shadow-lg hover:shadow-xl group">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-yellow-400/20 flex items-center justify-center shrink-0">
            <Trophy size={16} className="text-yellow-400" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-medium text-sm truncate">{dateStr}</p>
            {entry.match?.location && (
              <p className="text-[11px] text-gray-500 flex items-center gap-1">
                <MapPin size={10} /> {entry.match.location}
              </p>
            )}
          </div>
        </div>
        <Star size={16} className="text-yellow-400/60 shrink-0" />
      </div>

      {/* Scoreboard */}
      {teamA && (
        <div className="px-5 pb-3">
          <div className="bg-white/5 rounded-lg px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-white font-semibold text-sm truncate min-w-0 text-right flex-1">
                {teamA.team?.name}
              </span>
              <div className="flex items-center gap-2 mx-4 shrink-0">
                <span className="text-white text-2xl font-black tabular-nums">{teamA.score}</span>
                <span className="text-gray-500 text-xs font-bold tracking-widest">FINAL</span>
                <span className="text-white text-2xl font-black tabular-nums">{teamB?.score ?? 0}</span>
              </div>
              <span className="text-white font-semibold text-sm truncate min-w-0 flex-1">
                {teamB?.team?.name}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Awards grid */}
      <div className="px-5 pb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {awards.map((a, i) => (
            <div key={i} className={`${a.bg} rounded-lg p-3 text-center ring-1 ${a.ring}`}>
              <div className={`${a.color} flex justify-center mb-1`}>{a.icon}</div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">{a.label}</p>
              {a.player ? (
                <p className="text-white font-bold text-sm truncate">{a.player.name}</p>
              ) : (
                <p className="text-gray-600 text-sm">—</p>
              )}
              {a.rating && (
                <div className="flex items-center justify-center gap-0.5 mt-0.5">
                  <Star size={10} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-[10px] text-yellow-400 font-medium">{a.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Link>
  )
}
