import { useState, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useAllMyBets, useBetSummary } from '../../hooks/useBets'
import { MARKET_TYPE_LABELS } from '../../types'
import { Coins, TrendingUp, TrendingDown, Target, ScrollText } from 'lucide-react'

type Tab = 'all' | 'pending' | 'won' | 'lost'

export function BetsHistoryPage() {
  const { profile } = useAuth()
  const { data: allBets = [] } = useAllMyBets(profile?.id)
  const summary = useBetSummary(profile?.id)
  const [tab, setTab] = useState<Tab>('all')

  const tabs = [
    { key: 'all' as Tab, label: `Todas (${summary.totalBets})` },
    { key: 'pending' as Tab, label: `Pendentes (${summary.pendingBets})` },
    { key: 'won' as Tab, label: `Ganhas (${summary.wonBets})` },
    { key: 'lost' as Tab, label: `Perdidas (${summary.lostBets})` },
  ]

  const filtered = useMemo(() => {
    if (tab === 'all') return allBets
    return allBets.filter((b: any) => b.status === tab.toUpperCase())
  }, [allBets, tab])

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    WON: 'bg-green-100 text-green-800',
    LOST: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
  }

  const statusLabels: Record<string, string> = {
    PENDING: 'Pendente',
    WON: 'Ganha',
    LOST: 'Perdida',
    CANCELLED: 'Cancelada',
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-white/[0.06] p-4">
          <div className="absolute -top-8 -right-8 w-16 h-16 bg-gradient-to-br from-yellow-500/10 to-transparent rounded-full blur-2xl" />
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center mb-2">
              <Coins size={16} className="text-[#0a0e17]" />
            </div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.1em]">Saldo</p>
            <p className="text-white font-black text-lg">{summary.balance.toFixed(0)}</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-white/[0.06] p-4">
          <div className="absolute -top-8 -right-8 w-16 h-16 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-2xl" />
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-2">
              <TrendingDown size={16} className="text-white" />
            </div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.1em]">Investido</p>
            <p className="text-white font-black text-lg">{summary.totalInvested.toFixed(0)}</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-white/[0.06] p-4">
          <div className="absolute -top-8 -right-8 w-16 h-16 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-2xl" />
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mb-2">
              <TrendingUp size={16} className="text-white" />
            </div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.1em]">Retorno</p>
            <p className="text-white font-black text-lg">{summary.totalReturned.toFixed(0)}</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-white/[0.06] p-4">
          <div className="absolute -top-8 -right-8 w-16 h-16 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-2xl" />
          <div className="relative">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${summary.netProfit >= 0 ? 'bg-gradient-to-br from-emerald-500 to-green-600' : 'bg-gradient-to-br from-red-500 to-rose-600'}`}>
              {summary.netProfit >= 0 ? <TrendingUp size={16} className="text-white" /> : <TrendingDown size={16} className="text-white" />}
            </div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.1em]">Lucro</p>
            <p className={`font-black text-lg ${summary.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {summary.netProfit >= 0 ? '+' : ''}{summary.netProfit.toFixed(0)}
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-white/[0.06] p-4">
          <div className="absolute -top-8 -right-8 w-16 h-16 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-2xl" />
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center mb-2">
              <Target size={16} className="text-white" />
            </div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.1em]">Acerto</p>
            <p className="text-white font-black text-lg">{summary.winRate}%</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/[0.06]">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition border-b-2 -mb-px ${
              tab === t.key
                ? 'text-yellow-400 border-yellow-500'
                : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Bets List */}
      {filtered.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-white/[0.06] p-12 text-center">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-white/[0.08] flex items-center justify-center mx-auto mb-4">
            <ScrollText size={24} className="text-yellow-500/50" />
          </div>
          <p className="text-white font-bold text-sm mb-1">Nenhuma aposta encontrada</p>
          <p className="text-gray-500 text-xs">
            {tab === 'all' ? 'Você ainda não fez nenhuma aposta.' : `Nenhuma aposta ${statusLabels[tab.toUpperCase()]?.toLowerCase() || 'nesta categoria'}.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((bet: any) => (
            <div key={bet.id}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-white/[0.06] p-4">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

              <div className="relative flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm truncate">
                    {bet.match?.group?.name || 'Grupo'} — {bet.match ? new Date(bet.match.match_date).toLocaleDateString('pt-BR') : 'Data desconhecida'}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {bet.bet_type === 'MULTIPLE' ? 'Múltipla' : 'Simples'} · Odd {Number(bet.total_odds).toFixed(2)} · {new Date(bet.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${statusColors[bet.status]}`}>
                  {statusLabels[bet.status]}
                </span>
              </div>

              <div className="space-y-1 mb-3">
                {bet.selections?.map((sel: any) => (
                  <div key={sel.id} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {sel.market?.result === true && <span className="text-green-400 shrink-0">✅</span>}
                      {sel.market?.result === false && <span className="text-red-400 shrink-0">❌</span>}
                      {sel.market?.result === null && <span className="text-gray-600 shrink-0">—</span>}
                      <span className="truncate text-gray-400">{sel.market?.label || 'Mercado'}</span>
                    </div>
                    <span className="font-medium text-gray-300 shrink-0 ml-2">{Number(sel.market?.odds || 1).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                <div className="text-xs text-gray-500">
                  <span className="font-medium text-gray-300">{bet.amount.toFixed(0)} pts</span>
                </div>
                <div className="text-right">
                  {bet.status === 'WON' && (
                    <span className="text-[11px] font-bold text-green-400">
                      +{(bet.potential_payout - bet.amount).toFixed(0)} pts
                    </span>
                  )}
                  {bet.status === 'LOST' && (
                    <span className="text-[11px] font-bold text-red-400">
                      -{bet.amount.toFixed(0)} pts
                    </span>
                  )}
                  {bet.status === 'PENDING' && (
                    <span className="text-[11px] font-bold text-yellow-400/80">
                      {bet.potential_payout.toFixed(0)} pts
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
