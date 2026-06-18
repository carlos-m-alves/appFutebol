import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useGroup } from '../../contexts/GroupContext'
import { matchService } from '../../services/api'
import type { Match } from '../../types'
import { Calendar, Plus, MapPin, Trophy, ChevronRight, Star, Filter } from 'lucide-react'
import { MATCH_STATUS } from '../../lib/constants'

export function MatchesListPage() {
  const { currentGroup, currentGroupRole, groups, setCurrentGroup } = useGroup()
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGroupId, setSelectedGroupId] = useState(currentGroup?.id || (groups.length === 1 ? groups[0].id : ''))

  useEffect(() => {
    if (selectedGroupId && !currentGroup) {
      const group = groups.find(g => g.id === selectedGroupId)
      if (group) setCurrentGroup(group)
    }
    if (selectedGroupId) loadMatches()
    else setLoading(false)
  }, [selectedGroupId])

  async function loadMatches() {
    if (!selectedGroupId) return
    setLoading(true)
    const data = await matchService.list(selectedGroupId)
    setMatches(data)
    setLoading(false)
  }

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

  const statusColors: Record<string, string> = {
    SCHEDULED: 'bg-blue-100 text-blue-800',
    CONFIRMED: 'bg-green-100 text-green-800',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
    FINISHED: 'bg-gray-100 text-gray-800',
    CANCELLED: 'bg-red-100 text-red-800'
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

      {loading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : matches.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <Trophy className="mx-auto w-12 h-12 text-gray-300 mb-4" />
          <p className="text-gray-500 mb-4">Nenhuma partida ainda.</p>
          {currentGroupRole === 'ADMIN' && (
            <Link to="/matches/new" className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition inline-block">
              Criar Primeira Partida
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map(match => (
            <Link key={match.id} to={`/matches/${match.id}`}
              className="block bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <Calendar className="text-green-600" size={24} />
                  </div>
                  <div>
                    <p className="font-medium">
                      {new Date(match.match_date).toLocaleDateString('pt-BR', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[match.status]}`}>
                        {MATCH_STATUS[match.status as keyof typeof MATCH_STATUS]}
                      </span>
                      {match.location && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <MapPin size={12} /> {match.location}
                        </span>
                      )}
                      {match.evaluation_open && !match.evaluation_closed && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 flex items-center gap-1">
                          <Star size={12} /> Votação aberta
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-300" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
