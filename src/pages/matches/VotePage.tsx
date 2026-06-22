import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useMatch, useMatchPlayers, useMatchRatings, useSubmitRating } from '../../hooks/useMatches'
import { StarRating, DisplayRating } from '../../components/ui/StarRating'
import { ArrowLeft, ChevronLeft, Send, Check } from 'lucide-react'

export function VotePage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const cardRef = useRef<HTMLDivElement>(null)

  const { data: match, isLoading: loadingMatch } = useMatch(id)
  const { data: allPlayers = [], isLoading: loadingPlayers } = useMatchPlayers(id)
  const { data: allRatings = [] } = useMatchRatings(id)
  const { mutateAsync: submitRating, isPending: submitting } = useSubmitRating()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [comments, setComments] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState<Set<string>>(new Set())
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [animClass, setAnimClass] = useState('')

  const myExistingRatings = useMemo(() =>
    allRatings.filter(r => r.rater_profile_id === profile?.id),
    [allRatings, profile?.id]
  )

  const players = useMemo(() =>
    allPlayers.filter(p => p.profile_id !== profile?.id && !p.no_show),
    [allPlayers, profile?.id]
  )

  const existingVotedIds = useMemo(() =>
    new Set(myExistingRatings.map(r => r.rated_profile_id)),
    [myExistingRatings]
  )

  const existingVoteData = useMemo(() => {
    const map: Record<string, { rating: number; comment: string }> = {}
    myExistingRatings.forEach(r => {
      map[r.rated_profile_id] = { rating: r.rating, comment: r.comment || '' }
    })
    return map
  }, [myExistingRatings])

  const unvotedPlayers = useMemo(() =>
    players.filter(p => !existingVotedIds.has(p.profile_id)),
    [players, existingVotedIds]
  )

  useEffect(() => {
    if (!players.length || !myExistingRatings.length) return
    const firstUnratedIndex = players.findIndex(p => !existingVotedIds.has(p.profile_id))
    if (firstUnratedIndex >= 0) {
      setCurrentIndex(firstUnratedIndex)
    }
  }, [players.length, myExistingRatings.length])

  const currentPlayer = players[currentIndex]
  const isAlreadyVoted = currentPlayer && existingVotedIds.has(currentPlayer.profile_id)
  const isJustVoted = currentPlayer && submitted.has(currentPlayer.profile_id)
  const isVoted = isAlreadyVoted || isJustVoted
  const hasRating = !!ratings[currentPlayer?.profile_id]
  const allVoted = players.length > 0 && players.every(p =>
    existingVotedIds.has(p.profile_id) || submitted.has(p.profile_id)
  )

  async function handleSubmitVote(): Promise<boolean> {
    if (!id || !currentPlayer || !hasRating || !profile) return false
    try {
      await submitRating({
        matchId: id,
        raterProfileId: profile.id,
        ratedProfileId: currentPlayer.profile_id,
        rating: ratings[currentPlayer.profile_id],
        comment: comments[currentPlayer.profile_id] || undefined
      })
      setSubmitted(prev => new Set(prev).add(currentPlayer.profile_id))
      return true
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar voto')
      return false
    }
  }

  async function handleSubmitAndNext() {
    if (isAlreadyVoted) {
      advanceToNext()
      return
    }
    const ok = await handleSubmitVote()
    if (ok) advanceToNext()
  }

  function advanceToNext() {
    if (currentIndex < players.length - 1) {
      setAnimClass('animate-slide-left')
      setTimeout(() => {
        setCurrentIndex(i => i + 1)
        setAnimClass('')
      }, 200)
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

  function handleTouchStart(e: React.TouchEvent) {
    setTouchStart(e.touches[0].clientX)
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStart === null) return
    const diff = e.changedTouches[0].clientX - touchStart
    if (diff > 80) handleSubmitAndNext()
    setTouchStart(null)
  }

  if (loadingMatch || loadingPlayers) return <div className="text-center py-8">Carregando...</div>
  if (!match || players.length === 0) return (
    <div className="text-center py-12">
      <p className="text-gray-500 mb-4">Nenhum jogador disponível para votação.</p>
      <button onClick={() => navigate(`/matches/${id}`)} className="text-green-600 hover:text-green-700 font-medium">
        Voltar para a partida
      </button>
    </div>
  )

  if (allVoted && unvotedPlayers.length === 0) {
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

  const existingVote = currentPlayer ? existingVoteData[currentPlayer.profile_id] : null

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(`/matches/${id}`)} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition">
          <ArrowLeft size={20} /> Voltar
        </button>
        <div className="flex items-center gap-1 text-sm text-gray-400">
          {players.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full ${i === currentIndex ? 'bg-green-500' : existingVotedIds.has(players[i].profile_id) || submitted.has(players[i].profile_id) ? 'bg-green-200' : 'bg-gray-200'}`} />
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

        {isAlreadyVoted && existingVote ? (
          <div className="mb-4 p-4 bg-green-50 rounded-xl">
            <div className="flex items-center justify-center gap-1 text-green-700 text-sm font-medium mb-2">
              <Check size={16} /> Voto registrado
            </div>
            <DisplayRating value={existingVote.rating} size="md" />
            <p className="text-sm text-gray-700 mt-2">{existingVote.comment || 'Sem comentário'}</p>
          </div>
        ) : (
          <>
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
          </>
        )}

        {isAlreadyVoted ? (
          <button onClick={handleSubmitAndNext}
            className="w-full bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 transition font-medium flex items-center justify-center gap-2">
            <ChevronLeft size={18} className="rotate-180" />
            {currentIndex < players.length - 1 ? 'Próximo jogador' : 'Finalizar'}
          </button>
        ) : isJustVoted ? (
          <div className="bg-green-50 text-green-700 py-3 rounded-xl font-medium text-center">
            Voto enviado! {currentIndex < players.length - 1 ? 'Avançando...' : ''}
          </div>
        ) : (
          <button onClick={handleSubmitAndNext} disabled={!hasRating || submitting}
            className="w-full bg-purple-600 text-white py-3 rounded-xl hover:bg-purple-700 transition font-medium disabled:opacity-50 flex items-center justify-center gap-2">
            <Send size={18} /> {submitting ? 'Enviando...' : currentIndex < players.length - 1 ? 'Enviar e Próximo' : 'Enviar Voto'}
          </button>
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
        {isAlreadyVoted ? 'Você já avaliou este jogador' : !isVoted ? 'Dê uma nota e clique em enviar' : 'Avançando para o próximo...'}
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
