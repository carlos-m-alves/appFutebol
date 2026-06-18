import { useState, useEffect } from 'react'
import { useGroup } from '../../contexts/GroupContext'
import { matchService, type MatchStats } from '../../services/api'
import { BarChart3, Goal, UserPlus, Star, Trophy, Medal } from 'lucide-react'
import { DisplayRating } from '../../components/ui/StarRating'

export function RankingsPage() {
  const { currentGroup } = useGroup()
  const [stats, setStats] = useState<MatchStats[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'goals' | 'assists' | 'avg_rating'>('goals')

  useEffect(() => {
    if (currentGroup) loadStats()
  }, [currentGroup])

  async function loadStats() {
    if (!currentGroup) return
    setLoading(true)
    const data = await matchService.getGroupStats(currentGroup.id)
    setStats(data)
    setLoading(false)
  }

  if (!currentGroup) return <div className="text-center py-8">Selecione um grupo primeiro.</div>

  const sorted = [...stats].sort((a, b) => {
    if (sortBy === 'goals') return b.goals - a.goals
    if (sortBy === 'assists') return b.assists - a.assists
    return (b.avg_rating ?? 0) - (a.avg_rating ?? 0)
  })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <BarChart3 size={24} className="text-green-600" /> Rankings
      </h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex gap-2">
          {([
            { key: 'goals', label: 'Gols', icon: <Goal size={16} /> },
            { key: 'assists', label: 'Assistências', icon: <UserPlus size={16} /> },
            { key: 'avg_rating', label: 'Média', icon: <Star size={16} /> }
          ] as const).map(item => (
            <button key={item.key} onClick={() => setSortBy(item.key)}
              className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
                sortBy === item.key
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {item.icon} {item.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <BarChart3 className="mx-auto w-12 h-12 text-gray-300 mb-4" />
          <p className="text-gray-500">Nenhuma estatística disponível.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {sorted.map((player, i) => (
              <div key={player.player_id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition">
                <div className="w-8 text-center">
                  {i === 0 ? <Trophy size={20} className="text-yellow-500 mx-auto" /> :
                   i === 1 ? <Medal size={20} className="text-gray-400 mx-auto" /> :
                   i === 2 ? <Medal size={20} className="text-orange-400 mx-auto" /> :
                   <span className="text-sm text-gray-400 font-medium">#{i + 1}</span>}
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold">
                  {player.player_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{player.player_name}</p>
                  <p className="text-xs text-gray-400">{player.matches_played} partidas</p>
                </div>
                <div className="text-right">
                  {sortBy === 'goals' && (
                    <div className="flex items-center gap-1">
                      <Goal size={16} className="text-green-500" />
                      <span className="font-bold text-lg">{player.goals}</span>
                    </div>
                  )}
                  {sortBy === 'assists' && (
                    <div className="flex items-center gap-1">
                      <UserPlus size={16} className="text-blue-500" />
                      <span className="font-bold text-lg">{player.assists}</span>
                    </div>
                  )}
                  {sortBy === 'avg_rating' && (
                    <DisplayRating value={player.avg_rating ?? 0} size="sm" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
