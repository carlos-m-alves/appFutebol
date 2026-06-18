import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { matchService } from '../../services/api'
import { StarRating } from '../../components/ui/StarRating'
import type { MatchPlayer, Match } from '../../types'
import { ArrowLeft, ChevronLeft, Send } from 'lucide-react'

export function VotePage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const cardRef = useRef<HTMLDivElement>(null)

  const [match, setMatch] = useState<Match | null>(null)
  const [players, setPlayers] = useState<MatchPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [comments, setComments] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState<Set<string>>(new Set())
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [animClass, setAnimClass] = useState('')

  useEffect(() => {
    if (!id) return
    loadData()
  }, [id, profile?.id])

  async function loadData() {
    if (!id) return
    const [m, p] = await Promise.all([
      matchService.get(id),
      matchService.getPlayers(id)
    ])
    setMatch(m)
    setPlayers(p.filter(p => p.profile_id !== profile?.id && !p.no_show))
    setLoading(false)
  }

  function handleTouchStart(e: React.TouchEvent) {
    setTouchStart(e.touches[0].clientX)
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStart === null) return
    const diff = e.changedTouches[0].clientX - touchStart
    if (diff > 80 && !isVoted && hasRating) handleSubmitAndNext()
    setTouchStart(null)
  }

  const currentPlayer = players[currentIndex]
  const isVoted = submitted.has(currentPlayer?.profile_id)
  const hasRating = !!ratings[currentPlayer?.profile_id]
  const allVoted = players.length > 0 && players.every(p => submitted.has(p.profile_id))

  async function handleSubmitVote(): Promise<boolean> {
    if (!id || !currentPlayer || !hasRating) return false
    setSubmitting(true)
    try {
      await matchService.submitRating(
        id,
        profile!.id,
        currentPlayer.profile_id,
        ratings[currentPlayer.profile_id],
        comments[currentPlayer.profile_id] || undefined
      )
      setSubmitted(prev => new Set(prev).add(currentPlayer.profile_id))
      setSubmitting(false)
      return true
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar voto')
      setSubmitting(false)
      return false
    }
  }

  async function handleSubmitAndNext() {
    const ok = await handleSubmitVote()
    if (ok && currentIndex < players.length - 1) {
      setTimeout(() => {
        setAnimClass('animate-slide-left')
        setTimeout(() => {
          setCurrentIndex(i => i + 1)
          setAnimClass('')
        }, 200)
      }, 300)
    }
  }

  function handlePrev() {
    if (currentIndex > 0) {
      setAnimClass('animate-slide-right')
      setTimeout(() => {
        setCurrentIndex(i => i - 1)
        setAnimClass('')
      }, 200)
    }
  }

  function handleFinish() {
    navigate(`/matches/${id}`)
  }

  if (loading) return <div className="text-center py-8">Carregando...</div>
  if (!match || players.length === 0) return (
    <div className="text-center py-12">
      <p className="text-gray-500 mb-4">Nenhum jogador disponível para votação.</p>
      <button onClick={() => navigate(`/matches/${id}`)} className="text-green-600 hover:text-green-700 font-medium">
        Voltar para a partida
      </button>
    </div>
  )

  if (allVoted) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Send size={32} className="text-green-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Votação concluída!</h2>
        <p className="text-gray-500 mb-6">Você já avaliou todos os jogadores. Aguarde o encerramento da votação.</p>
        <button onClick={handleFinish}
          className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition font-medium">
          Voltar para a partida
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(`/matches/${id}`)} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition">
          <ArrowLeft size={20} /> Voltar
        </button>
        <div className="flex items-center gap-1 text-sm text-gray-400">
          {players.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full ${i === currentIndex ? 'bg-green-500' : i < currentIndex ? 'bg-green-200' : 'bg-gray-200'}`} />
          ))}
        </div>
        <span className="text-sm text-gray-400">{currentIndex + 1} de {players.length}</span>
      </div>

      <div
        ref={cardRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center select-none ${animClass}`}
      >
        <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-4xl mx-auto mb-4 shadow-md">
          {currentPlayer.profile?.name?.charAt(0).toUpperCase() || '?'}
        </div>

        <h2 className="text-xl font-bold mb-1">{currentPlayer.profile?.name}</h2>

        <div className="flex items-center justify-center gap-3 bg-gray-50 rounded-xl p-3 mb-6">
          <div className="text-center">
            <span className="block text-lg font-bold text-green-600">{currentPlayer.goals}</span>
            <span className="text-[10px] uppercase tracking-wider text-gray-500">Gols</span>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div className="text-center">
            <span className="block text-lg font-bold text-blue-600">{currentPlayer.assists}</span>
            <span className="text-[10px] uppercase tracking-wider text-gray-500">Assist.</span>
          </div>
          {currentPlayer.own_goals > 0 && (
            <><div className="w-px h-8 bg-gray-200" />
              <div className="text-center">
                <span className="block text-lg font-bold text-red-500">{currentPlayer.own_goals}</span>
                <span className="text-[10px] uppercase tracking-wider text-gray-500">G.C.</span>
              </div>
            </>
          )}
          {currentPlayer.nutmeg_done > 0 && (
            <><div className="w-px h-8 bg-gray-200" />
              <div className="text-center">
                <span className="block text-lg font-bold text-purple-600">{currentPlayer.nutmeg_done}</span>
                <span className="text-[10px] uppercase tracking-wider text-gray-500">Caneta</span>
              </div>
            </>
          )}
          {currentPlayer.nutmeg_given > 0 && (
            <><div className="w-px h-8 bg-gray-200" />
              <div className="text-center">
                <span className="block text-lg font-bold text-orange-500">{currentPlayer.nutmeg_given}</span>
                <span className="text-[10px] uppercase tracking-wider text-gray-500">Levou</span>
              </div>
            </>
          )}
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-500 mb-3">Qual nota {currentPlayer.profile?.name?.split(' ')[0]} merece?</p>
          <div className="flex justify-center">
            <StarRating
              value={ratings[currentPlayer.profile_id] || 0}
              onChange={(val) => {
                if (!isVoted) setRatings(prev => ({ ...prev, [currentPlayer.profile_id]: val }))
              }}
              size="lg"
            />
          </div>
          {ratings[currentPlayer.profile_id] > 0 && (
            <p className="text-sm font-medium text-gray-500 mt-1">{ratings[currentPlayer.profile_id].toFixed(1)}</p>
          )}
        </div>

        <input
          type="text"
          placeholder="Comentário anônimo (opcional)"
          value={comments[currentPlayer.profile_id] || ''}
          onChange={e => setComments(prev => ({ ...prev, [currentPlayer.profile_id]: e.target.value }))}
          disabled={isVoted}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none mb-4 disabled:bg-gray-100"
        />

        {!isVoted ? (
          <button onClick={handleSubmitAndNext} disabled={!hasRating || submitting}
            className="w-full bg-purple-600 text-white py-3 rounded-xl hover:bg-purple-700 transition font-medium disabled:opacity-50 flex items-center justify-center gap-2">
            <Send size={18} /> {submitting ? 'Enviando...' : currentIndex < players.length - 1 ? 'Enviar e Próximo' : 'Enviar Voto'}
          </button>
        ) : (
          <div className="bg-green-50 text-green-700 py-3 rounded-xl font-medium text-center">
            Voto enviado! {currentIndex < players.length - 1 ? 'Avançando...' : ''}
            {submitting && !isVoted}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-6">
        {currentIndex > 0 && (
          <button onClick={handlePrev}
            className="flex items-center gap-1 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition">
            <ChevronLeft size={18} /> Anterior
          </button>
        )}
        <div className="flex-1" />
      </div>

      <p className="text-center text-xs text-gray-400 mt-4">
        {!isVoted ? 'Dê uma nota e clique em enviar' : 'Avançando para o próximo...'}
      </p>

      <style>{`
        @keyframes slideLeft {
          from { transform: translateX(50px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideRight {
          from { transform: translateX(-50px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-left { animation: slideLeft 0.2s ease-out; }
        .animate-slide-right { animation: slideRight 0.2s ease-out; }
      `}</style>
    </div>
  )
}
