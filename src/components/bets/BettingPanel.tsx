import { useState, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useMatchMarkets, useMyBets, useMyBalance, usePlaceBet, useMatchBets } from '../../hooks/useBets'
import { useToast } from '../ui/Toast'
import { MARKET_TYPE_LABELS } from '../../types'
import { BETTING_MIN_AMOUNT, BETTING_MAX_AMOUNT } from '../../lib/constants'
import type { MatchMarket, Bet, BetSelection } from '../../types'
import { Trophy, Star, ScrollText, Coins } from 'lucide-react'

interface BettingPanelProps {
  matchId: string
  matchStatus: string
  isAdmin: boolean
  isBettingOpen: boolean
  hasMarkets: boolean
  onGenerateMarkets?: () => void
}

type Tab = 'markets' | 'mybets' | 'allbets'

export function BettingPanel({ matchId, matchStatus, isAdmin, isBettingOpen, hasMarkets, onGenerateMarkets }: BettingPanelProps) {
  const { profile } = useAuth()
  const [tab, setTab] = useState<Tab>('markets')
  const { data: markets = [] } = useMatchMarkets(matchId)
  const { data: myBets = [] } = useMyBets(matchId, profile?.id)
  const { data: allBets = [] } = useMatchBets(matchId)
  const { data: balance = 0 } = useMyBalance(profile?.id)

  const settled = markets.length > 0 && markets.every(m => m.status === 'SETTLED')

  const resultsSummary = useMemo(() => {
    if (!settled || myBets.length === 0) return null
    const totalInvested = myBets.reduce((s, b) => s + b.amount, 0)
    const wonBets = myBets.filter(b => b.status === 'WON')
    const lostBets = myBets.filter(b => b.status === 'LOST')
    const totalReturned = wonBets.reduce((s, b) => s + b.potential_payout, 0)
    const netProfit = totalReturned - totalInvested
    return { totalInvested, totalReturned, netProfit, won: wonBets.length, lost: lostBets.length, total: myBets.length }
  }, [settled, myBets])

  const tabs = [
    { key: 'markets' as Tab, label: 'Mercados', icon: <Trophy size={16} /> },
    { key: 'mybets' as Tab, label: 'Minhas Apostas', icon: <ScrollText size={16} /> },
    { key: 'allbets' as Tab, label: 'Todas', icon: <Coins size={16} /> },
  ]

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-lg flex items-center gap-2 text-gray-900">
          <Star size={20} className="text-yellow-500" /> Apostas
        </h2>
        {profile && (
          <span className="text-sm font-bold text-yellow-600 bg-yellow-50 px-3 py-1 rounded-lg flex items-center gap-1">
            <Coins size={16} />{balance.toFixed(0)} pts
          </span>
        )}
      </div>

      {settled && resultsSummary && (
        <div className={`rounded-xl p-4 mb-4 border ${
          resultsSummary.netProfit > 0
            ? 'bg-green-50 border-green-200'
            : resultsSummary.netProfit < 0
            ? 'bg-red-50 border-red-200'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{resultsSummary.netProfit > 0 ? '🎉' : resultsSummary.netProfit < 0 ? '😅' : '🤝'}</span>
            <span className="font-bold text-sm">
              {resultsSummary.won > 0
                ? `Você ganhou ${resultsSummary.won} de ${resultsSummary.total} apostas!`
                : 'Nenhuma aposta vencedora'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-gray-500">Investido</span>
              <p className="font-bold text-gray-900">{resultsSummary.totalInvested.toFixed(0)} pts</p>
            </div>
            <div>
              <span className="text-gray-500">Retorno</span>
              <p className="font-bold text-gray-900">{resultsSummary.totalReturned.toFixed(0)} pts</p>
            </div>
            <div>
              <span className="text-gray-500">Resultado</span>
              <p className={`font-bold ${resultsSummary.netProfit > 0 ? 'text-green-600' : resultsSummary.netProfit < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                {resultsSummary.netProfit > 0 ? '+' : ''}{resultsSummary.netProfit.toFixed(0)} pts
              </p>
            </div>
          </div>
        </div>
      )}

      {settled && !resultsSummary && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm text-green-800">
          Mercados liquidados!
        </div>
      )}

      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition border-b-2 -mb-px ${
              tab === t.key
                ? 'text-yellow-600 border-yellow-500'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'markets' && (
        <MarketsList
          markets={markets}
          matchId={matchId}
          profileId={profile?.id}
          isBettingOpen={isBettingOpen}
          matchStatus={matchStatus}
          hasMarkets={hasMarkets}
          isAdmin={isAdmin}
          onGenerateMarkets={onGenerateMarkets}
        />
      )}

      {tab === 'mybets' && (
        <BetsList bets={myBets} title="Minhas Apostas" />
      )}

      {tab === 'allbets' && isAdmin && (
        <BetsList bets={allBets} title="Todas as Apostas" />
      )}

      {tab === 'allbets' && !isAdmin && (
        <BetsList bets={allBets.filter(b => b.profile_id === profile?.id)} title="Todas as Apostas" />
      )}
    </div>
  )
}

function MarketsList({ markets, matchId, profileId, isBettingOpen, matchStatus, hasMarkets, isAdmin, onGenerateMarkets }: {
  markets: (MatchMarket & { player?: { id: string; name: string; avatar_url: string | null } | null; team?: { id: string; name: string } | null })[]
  matchId: string
  profileId: string | undefined
  isBettingOpen: boolean
  matchStatus: string
  hasMarkets: boolean
  isAdmin: boolean
  onGenerateMarkets?: () => void
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [amount, setAmount] = useState('100')
  const [placing, setPlacing] = useState(false)
  const { showToast } = useToast()
  const { mutateAsync: placeBet } = usePlaceBet()

  const grouped = useMemo(() => {
    const map = new Map<string, typeof markets>()
    for (const m of markets) {
      const existing = map.get(m.market_type) || []
      existing.push(m)
      map.set(m.market_type, existing)
    }
    return Array.from(map.entries())
  }, [markets])

  const CONFLICT_MAP: Record<string, string[]> = {
    PLAYER_NO_SHOW: ['PLAYER_SCORES', 'PLAYER_ASSIST', 'PLAYER_NUTMEG'],
    PLAYER_SCORES: ['PLAYER_NO_SHOW'],
    PLAYER_ASSIST: ['PLAYER_NO_SHOW'],
    PLAYER_NUTMEG: ['PLAYER_NO_SHOW'],
  }

  const CONFLICT_LABELS: Record<string, string> = {
    WINNER_WINNER: 'Você não pode selecionar dois times vencedores diferentes.',
    PLAYER_NO_SHOW_PLAYER_SCORES: 'Um jogador furão não pode fazer gol.',
    PLAYER_NO_SHOW_PLAYER_ASSIST: 'Um jogador furão não pode dar assistência.',
    PLAYER_NO_SHOW_PLAYER_NUTMEG: 'Um jogador furão não pode aplicar caneta.',
  }

  function findConflict(newMarketId: string): string | null {
    const newMarket = markets.find(m => m.id === newMarketId)
    if (!newMarket) return null

    for (const selectedId of selectedIds) {
      const selected = markets.find(m => m.id === selectedId)
      if (!selected) continue

      if (newMarket.market_type === 'WINNER' && selected.market_type === 'WINNER') {
        return 'Você não pode selecionar dois times vencedores diferentes.'
      }

      if (newMarket.player_id && selected.player_id && newMarket.player_id === selected.player_id) {
        const conflicting = CONFLICT_MAP[newMarket.market_type] || []
        if (conflicting.includes(selected.market_type)) {
          const key = `${newMarket.market_type}_${selected.market_type}`
          const rkey = `${selected.market_type}_${newMarket.market_type}`
          return CONFLICT_LABELS[key] || CONFLICT_LABELS[rkey] || 'Mercados conflitantes para o mesmo jogador.'
        }
      }
    }
    return null
  }

  function toggleMarket(id: string) {
    if (!isBettingOpen) return
    if (selectedIds.has(id)) {
      const next = new Set(selectedIds)
      next.delete(id)
      setSelectedIds(next)
      return
    }
    const conflict = findConflict(id)
    if (conflict) {
      showToast(conflict, 'error')
      return
    }
    const next = new Set(selectedIds)
    next.add(id)
    setSelectedIds(next)
  }

  const totalOdds = useMemo(() => {
    let odds = 1
    for (const id of selectedIds) {
      const market = markets.find(m => m.id === id)
      if (market) odds *= market.odds
    }
    return Math.round(odds * 100) / 100
  }, [selectedIds, markets])

  const potentialPayout = useMemo(() => {
    const val = parseFloat(amount) || 0
    return Math.round(val * totalOdds * 100) / 100
  }, [amount, totalOdds])

  async function handlePlaceBet() {
    const val = parseFloat(amount)
    if (!val || val < BETTING_MIN_AMOUNT) {
      showToast(`Valor mínimo: ${BETTING_MIN_AMOUNT} pontos`, 'error')
      return
    }
    if (val > BETTING_MAX_AMOUNT) {
      showToast(`Valor máximo: ${BETTING_MAX_AMOUNT} pontos`, 'error')
      return
    }
    if (selectedIds.size === 0) {
      showToast('Selecione pelo menos 1 mercado', 'error')
      return
    }
    if (!profileId) return

    setPlacing(true)
    try {
      await placeBet({
        profileId,
        matchId,
        marketIds: Array.from(selectedIds),
        amount: val,
        totalOdds,
      })
      showToast('Aposta realizada com sucesso!')
      setSelectedIds(new Set())
      setAmount('100')
    } catch (err: any) {
      showToast(err?.message || 'Erro ao fazer aposta', 'error')
    }
    setPlacing(false)
  }

  const marketTypeOrder = ['WINNER', 'TOP_SCORER', 'TOP_ASSISTER', 'BEST_PLAYER', 'PLAYER_SCORES', 'PLAYER_ASSIST', 'PLAYER_NUTMEG', 'PLAYER_NO_SHOW']
  const sortedGrouped = [...grouped].sort((a, b) => marketTypeOrder.indexOf(a[0]) - marketTypeOrder.indexOf(b[0]))

  const openMarkets = markets.filter(m => m.status === 'OPEN')
  const hasOpen = openMarkets.length > 0

  if (markets.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400 text-sm mb-3">
          {matchStatus === 'IN_PROGRESS'
            ? 'Ainda não há mercados de apostas para esta partida. Os mercados são gerados automaticamente ao iniciar a partida.'
            : 'Nenhum mercado disponível para esta partida.'}
        </p>
        {isAdmin && matchStatus === 'IN_PROGRESS' && (
          <button
            onClick={onGenerateMarkets}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 transition"
          >
            Gerar Mercados Agora
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sortedGrouped.map(([type, typeMarkets]) => (
        <div key={type}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
            {MARKET_TYPE_LABELS[type as keyof typeof MARKET_TYPE_LABELS] || type}
          </h3>
          <div className="space-y-1">
            {typeMarkets.map(m => {
              const isSelected = selectedIds.has(m.id)
              const settled = m.status === 'SETTLED'
              const won = settled && m.result === true
              const lost = settled && m.result === false

              return (
                <button
                  key={m.id}
                  onClick={() => toggleMarket(m.id)}
                  disabled={!isBettingOpen && !settled}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition ${
                    settled
                      ? won
                        ? 'bg-green-50 border border-green-200 text-green-800'
                        : lost
                        ? 'bg-red-50 border border-red-200 text-red-800'
                        : 'bg-gray-50 border border-gray-200 text-gray-500'
                      : isSelected
                      ? 'bg-yellow-50 border border-yellow-300 text-yellow-800'
                      : isBettingOpen
                      ? 'bg-white border border-gray-200 hover:border-yellow-300 text-gray-700'
                      : 'bg-gray-50 border border-gray-200 text-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {m.player && (
                      m.player.avatar_url ? (
                        <img src={m.player.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-5 h-5 bg-yellow-100 rounded-full flex items-center justify-center text-[10px] font-bold text-yellow-700 shrink-0">
                          {m.player.name.charAt(0)}
                        </div>
                      )
                    )}
                    {m.team && (
                      <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-[10px] font-bold text-blue-700 shrink-0">
                        {m.team.name.charAt(0)}
                      </div>
                    )}
                    <span className="truncate">{m.label}</span>
                    {settled && (
                      <span className="text-xs font-bold">{won ? '✅' : lost ? '❌' : '—'}</span>
                    )}
                  </div>
                  <span className="font-bold text-yellow-600 shrink-0 ml-2">
                    {m.odds.toFixed(2)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {hasOpen && isBettingOpen && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-medium text-gray-700">Bilhete</span>
            {selectedIds.size > 1 && (
              <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded">
                Múltipla ({selectedIds.size} seleções)
              </span>
            )}
          </div>

          <div className="space-y-1 mb-3">
            {Array.from(selectedIds).map(id => {
              const m = markets.find(m => m.id === id)
              if (!m) return null
              return (
                <div key={id} className="flex items-center justify-between text-sm text-gray-600">
                  <span className="truncate">{m.label}</span>
                  <span className="font-bold text-yellow-600 shrink-0 ml-2">{m.odds.toFixed(2)}</span>
                </div>
              )
            })}
            {selectedIds.size === 0 && (
              <p className="text-sm text-gray-400">Clique nos mercados para adicionar</p>
            )}
          </div>

          {selectedIds.size > 0 && (
            <>
              <div className="flex items-center justify-between text-sm font-bold text-gray-700 mb-3">
                <span>Odd Total</span>
                <span className="text-yellow-600">{totalOdds.toFixed(2)}</span>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-gray-600">Valor:</span>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  min={BETTING_MIN_AMOUNT}
                  max={BETTING_MAX_AMOUNT}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 outline-none text-gray-900"
                />
              </div>

              <div className="flex items-center justify-between text-sm text-gray-700 mb-3">
                <span>Potencial Retorno:</span>
                <span className="font-bold text-green-600">{potentialPayout.toFixed(2)} pts</span>
              </div>

              <button
                onClick={handlePlaceBet}
                disabled={placing || selectedIds.size === 0}
                className="w-full py-2.5 bg-yellow-500 text-white rounded-xl font-bold text-sm hover:bg-yellow-600 transition disabled:opacity-50"
              >
                {placing ? 'Apostando...' : 'Fazer Aposta'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function BetsList({ bets, title }: { bets: (Bet & { selections: (BetSelection & { market?: MatchMarket | null })[]; profile?: { id: string; name: string; avatar_url: string | null } | null })[]; title: string }) {
  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    WON: 'bg-green-100 text-green-800',
    LOST: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
  }

  const statusLabels: Record<string, string> = {
    PENDING: 'Pendente',
    WON: 'Ganhou',
    LOST: 'Perdeu',
    CANCELLED: 'Cancelada',
  }

  if (bets.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        Nenhuma aposta encontrada.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {bets.map(bet => (
        <div key={bet.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-gray-900">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {bet.profile && (
                bet.profile.avatar_url ? (
                  <img src={bet.profile.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center text-[10px] font-bold text-yellow-700">
                    {bet.profile.name.charAt(0)}
                  </div>
                )
              )}
              <span className="font-medium text-sm text-gray-900">{bet.profile?.name || 'Você'}</span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[bet.status]}`}>
              {statusLabels[bet.status]}
            </span>
          </div>

          <div className="space-y-1 mb-2">
            {bet.selections.map(sel => (
              <div key={sel.id} className="flex items-center justify-between text-xs">
                <span className="truncate text-gray-600">{sel.market?.label || 'Mercado'}</span>
                <span className="font-medium text-gray-700">{sel.market?.odds.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-200">
            <span className="text-gray-500">
              {bet.bet_type === 'MULTIPLE' ? 'Múltipla' : 'Simples'} · Odd {bet.total_odds.toFixed(2)}
            </span>
            <div className="text-right">
              <span className="text-gray-500">Valor: <strong className="text-gray-900">{bet.amount.toFixed(0)} pts</strong></span>
              {bet.status === 'WON' && (
                <span className="block text-green-600 font-bold">
                  +{(bet.potential_payout - bet.amount).toFixed(0)} pts
                </span>
              )}
              {bet.status === 'LOST' && (
                <span className="block text-red-500 font-bold">
                  -{bet.amount.toFixed(0)} pts
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
