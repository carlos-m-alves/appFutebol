import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useGroup } from '../../contexts/GroupContext'
import { matchService } from '../../services/api'

export function CreateMatchPage() {
  const { profile } = useAuth()
  const { currentGroup } = useGroup()
  const navigate = useNavigate()

  const [matchDate, setMatchDate] = useState('')
  const [matchTime, setMatchTime] = useState('09:00')
  const [location, setLocation] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [frequency, setFrequency] = useState<'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM'>('WEEKLY')
  const [dayOfWeek, setDayOfWeek] = useState('1')
  const [dayOfMonth, setDayOfMonth] = useState('15')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!currentGroup || !profile) return
    setLoading(true)
    setError(null)

    try {
      const match = await matchService.create({
        group_id: currentGroup.id,
        match_date: `${matchDate}T${matchTime}:00`,
        location: location || undefined,
        is_recurring: isRecurring,
        frequency: isRecurring ? frequency : undefined,
        day_of_week: isRecurring && frequency === 'WEEKLY' ? parseInt(dayOfWeek) : undefined,
        day_of_month: isRecurring && frequency === 'MONTHLY' ? parseInt(dayOfMonth) : undefined,
        hour: matchTime
      })

      if (match) {
        navigate(`/matches/${match.id}`)
      }
    } catch (err) {
      setError('Erro ao criar partida')
    }
    setLoading(false)
  }

  if (!currentGroup) return <div className="text-center py-8">Selecione um grupo primeiro.</div>

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Nova Partida</h1>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
          <input type="date" value={matchDate} onChange={e => setMatchDate(e.target.value)} required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Horário</label>
          <input type="time" value={matchTime} onChange={e => setMatchTime(e.target.value)} required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Local</label>
          <input type="text" value={location} onChange={e => setLocation(e.target.value)}
            placeholder="Ex: Campo da Vila"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" />
        </div>

        <div className="flex items-center gap-3">
          <input type="checkbox" id="recurring" checked={isRecurring}
            onChange={e => setIsRecurring(e.target.checked)}
            className="w-4 h-4 text-green-600 rounded focus:ring-green-500" />
          <label htmlFor="recurring" className="text-sm font-medium text-gray-700">Partida recorrente</label>
        </div>

        {isRecurring && (
          <div className="space-y-4 pl-6 border-l-2 border-green-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequência</label>
              <select value={frequency} onChange={e => setFrequency(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none">
                <option value="WEEKLY">Semanal</option>
                <option value="BIWEEKLY">Quinzenal</option>
                <option value="MONTHLY">Mensal</option>
                <option value="CUSTOM">Personalizada</option>
              </select>
            </div>

            {frequency === 'WEEKLY' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dia da Semana</label>
                <select value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none">
                  <option value="0">Domingo</option>
                  <option value="1">Segunda</option>
                  <option value="2">Terça</option>
                  <option value="3">Quarta</option>
                  <option value="4">Quinta</option>
                  <option value="5">Sexta</option>
                  <option value="6">Sábado</option>
                </select>
              </div>
            )}

            {frequency === 'MONTHLY' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dia do Mês</label>
                <input type="number" value={dayOfMonth} onChange={e => setDayOfMonth(e.target.value)}
                  min={1} max={31}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" />
              </div>
            )}
          </div>
        )}

        <button type="submit" disabled={loading}
          className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50">
          {loading ? 'Criando...' : 'Criar Partida'}
        </button>
      </form>
    </div>
  )
}
