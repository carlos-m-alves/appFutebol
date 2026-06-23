import { useState, useEffect } from 'react'
import { useGroup } from '../../contexts/GroupContext'
import { matchService, type MatchStats } from '../../services/api'
import { BarChart3, Goal, UserPlus, Star, Trophy, Medal, Swords } from 'lucide-react'
import { DisplayRating } from '../../components/ui/StarRating'

interface SortOption {
  key: 'goals' | 'assists' | 'avg_rating'
  label: string
  icon: React.ReactNode
  statLabel: string
}

const SORT_OPTIONS: SortOption[] = [
  { key: 'goals', label: 'Gols', icon: <Goal size={16} />, statLabel: 'gols' },
  { key: 'assists', label: 'Assistências', icon: <UserPlus size={16} />, statLabel: 'assist.' },
  { key: 'avg_rating', label: 'Média', icon: <Star size={16} />, statLabel: 'média' },
]

export function RankingsPage() {
  const { currentGroup } = useGroup()
  const [stats, setStats] = useState<MatchStats[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<SortOption['key']>('goals')

  async function loadStats() {
    if (!currentGroup) return
    setLoading(true)
    const data = await matchService.getGroupStats(currentGroup.id)
    setStats(data)
    setLoading(false)
  }

  useEffect(() => {
    if (currentGroup) loadStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGroup])

  if (!currentGroup) return <div className="text-center py-8 text-gray-400">Selecione um grupo primeiro.</div>

  const sorted = [...stats].sort((a, b) => {
    if (sortBy === 'goals') return b.goals - a.goals
    if (sortBy === 'assists') return b.assists - a.assists
    return (b.avg_rating ?? 0) - (a.avg_rating ?? 0)
  })

  const currentOption = SORT_OPTIONS.find(o => o.key === sortBy)!

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Swords size={24} className="text-yellow-500" /> Rankings
        </h1>
      </div>

      {/* Filter buttons */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 mb-6 shadow-lg">
        <div className="flex gap-2">
          {SORT_OPTIONS.map(item => (
            <button key={item.key} onClick={() => setSortBy(item.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                sortBy === item.key
                  ? 'bg-yellow-500 text-slate-900 shadow-lg shadow-yellow-500/25'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}>
              {item.icon} {item.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Carregando...</div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-12 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-white/10">
          <BarChart3 className="mx-auto w-12 h-12 text-gray-600 mb-4" />
          <p className="text-gray-400">Nenhuma estatística disponível.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((player, i) => (
            <PlayerCard
              key={player.player_id}
              player={player}
              rank={i + 1}
              sortBy={sortBy}
              currentOption={currentOption}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PlayerCard({ player, rank, sortBy, currentOption }: {
  player: MatchStats; rank: number; sortBy: string; currentOption: SortOption
}) {
  const isTop3 = rank <= 3
  const initials = player.player_name
    .split(' ')
    .map(n => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const getMedal = () => {
    if (rank === 1) return <Trophy size={20} className="text-yellow-400" />
    if (rank === 2) return <Medal size={20} className="text-gray-300" />
    if (rank === 3) return <Medal size={20} className="text-amber-600" />
    return null
  }

  const getRankBg = () => {
    if (rank === 1) return 'ring-yellow-400/50 bg-yellow-400/10'
    if (rank === 2) return 'ring-gray-300/40 bg-gray-300/10'
    if (rank === 3) return 'ring-amber-600/40 bg-amber-600/10'
    return 'ring-white/10 bg-white/5'
  }

  const getAvatarBg = () => {
    if (rank === 1) return 'bg-yellow-400/20 text-yellow-400 ring-yellow-400/30'
    if (rank === 2) return 'bg-gray-300/20 text-gray-300 ring-gray-300/30'
    if (rank === 3) return 'bg-amber-600/20 text-amber-600 ring-amber-600/30'
    return 'bg-white/10 text-gray-300 ring-white/20'
  }

  return (
    <div className={`bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl overflow-hidden transition-all duration-200 hover:from-slate-700 hover:to-slate-800 shadow-lg hover:shadow-xl group`}>
      <div className="flex items-center gap-4 p-4">
        {/* Rank */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ring-2 ${getRankBg()}`}>
          {isTop3 ? (
            getMedal()
          ) : (
            <span className="text-gray-400 font-bold text-sm">#{rank}</span>
          )}
        </div>

        {/* Avatar */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm ring-2 shrink-0 ${getAvatarBg()}`}>
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">
            {player.player_name}
          </p>
          <p className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
            <span>{player.matches_played} jogos</span>
            <span className="w-1 h-1 rounded-full bg-gray-600" />
            <span>⚽ {player.goals} gols</span>
            {player.own_goals > 0 && (
              <>
                <span className="w-1 h-1 rounded-full bg-gray-600" />
                <span className="text-red-400/60">{player.own_goals} g.c.</span>
              </>
            )}
          </p>
        </div>

        {/* Stat value */}
        <div className="text-right shrink-0">
          {sortBy === 'goals' && (
            <div className="flex items-center gap-1.5">
              <span className="text-white text-2xl font-black tabular-nums">{player.goals}</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider hidden sm:inline">
                {currentOption.statLabel}
              </span>
            </div>
          )}
          {sortBy === 'assists' && (
            <div className="flex items-center gap-1.5">
              <span className="text-white text-2xl font-black tabular-nums">{player.assists}</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider hidden sm:inline">
                {currentOption.statLabel}
              </span>
            </div>
          )}
          {sortBy === 'avg_rating' && (
            <div className="flex flex-col items-end">
              <DisplayRating value={player.avg_rating ?? 0} size="sm" />
              <span className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">
                {currentOption.statLabel}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-white/5 px-4 py-2">
        <div className="flex items-center gap-4 text-[11px] text-gray-500">
          <span className="flex items-center gap-1">
            <Goal size={11} className="text-emerald-400" /> {player.goals} gols
          </span>
          <span className="flex items-center gap-1">
            <UserPlus size={11} className="text-blue-400" /> {player.assists} assist.
          </span>
          {player.own_goals > 0 && (
            <span className="text-red-400/60">{player.own_goals} g.c.</span>
          )}
          {player.avg_rating !== null && (
            <span className="flex items-center gap-1">
              <Star size={11} className="text-yellow-400" /> {player.avg_rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
