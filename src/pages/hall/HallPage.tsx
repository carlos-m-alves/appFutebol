import { useState, useEffect } from 'react'
import { useGroup } from '../../contexts/GroupContext'
import { matchService } from '../../services/api'
import { History, Filter, Goal, UserPlus, ThumbsDown, Award } from 'lucide-react'

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
          <History size={24} className="text-green-600" /> Hall da Pelada
        </h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Filter size={18} className="text-gray-400" />
            <select value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none">
              <option value="">Selecione um grupo</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none">
            <option value="">Todos os anos</option>
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : hallData.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <History className="mx-auto w-12 h-12 text-gray-300 mb-4" />
          <p className="text-gray-500">Nenhum registro encontrado.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {hallData.map((entry: any) => (
            <div key={entry.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-medium">
                    {new Date(entry.match?.match_date).toLocaleDateString('pt-BR', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </p>
                  {entry.match?.location && (
                    <p className="text-sm text-gray-500">{entry.match.location}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-yellow-50 rounded-lg p-3 text-center">
                  <Award size={20} className="text-yellow-500 mx-auto mb-1" />
                  <p className="text-xs text-gray-500 mb-1">Craque</p>
                  <p className="text-sm font-bold">{entry.best_player?.name || '-'}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <Goal size={20} className="text-green-500 mx-auto mb-1" />
                  <p className="text-xs text-gray-500 mb-1">Artilheiro</p>
                  <p className="text-sm font-bold">{entry.top_scorer?.name || '-'}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <UserPlus size={20} className="text-blue-500 mx-auto mb-1" />
                  <p className="text-xs text-gray-500 mb-1">Assistências</p>
                  <p className="text-sm font-bold">{entry.top_assist?.name || '-'}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <ThumbsDown size={20} className="text-red-500 mx-auto mb-1" />
                  <p className="text-xs text-gray-500 mb-1">Bagre</p>
                  <p className="text-sm font-bold">{entry.worst_player?.name || '-'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
