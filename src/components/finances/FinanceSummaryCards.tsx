import { Wallet, TrendingUp, TrendingDown, DollarSign, CreditCard } from 'lucide-react'
import type { FinanceSummary } from '../../types'

interface Props {
  summary: FinanceSummary
  monthlyFee?: number
  matchFee?: number
}

export function FinanceSummaryCards({ summary, monthlyFee = 0, matchFee = 0 }: Props) {
  const cards = [
    {
      label: 'Saldo em Caixa',
      value: summary.balance,
      icon: <Wallet size={20} />,
      color: summary.balance >= 0 ? 'from-emerald-500 to-green-600' : 'from-red-500 to-rose-600',
      textColor: summary.balance >= 0 ? 'text-emerald-400' : 'text-red-400',
    },
    {
      label: 'Total Receitas',
      value: summary.totalRevenue,
      icon: <TrendingUp size={20} />,
      color: 'from-blue-500 to-indigo-600',
      textColor: 'text-blue-400',
    },
    {
      label: 'Total Despesas',
      value: summary.totalExpenses,
      icon: <TrendingDown size={20} />,
      color: 'from-orange-500 to-red-600',
      textColor: 'text-orange-400',
    },
    {
      label: 'Valor Mensalidade',
      value: monthlyFee,
      icon: <DollarSign size={20} />,
      color: 'from-purple-500 to-violet-600',
      textColor: 'text-purple-400',
    },
    {
      label: 'Valor Partida Avulsa',
      value: matchFee,
      icon: <CreditCard size={20} />,
      color: 'from-cyan-500 to-teal-600',
      textColor: 'text-cyan-400',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {cards.map(card => (
        <div key={card.label}
          className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-white/[0.06] p-4 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
          <div className={`absolute -top-6 -right-6 w-16 h-16 bg-gradient-to-br ${card.color} rounded-full opacity-10 blur-xl`} />
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className={`${card.textColor}`}>{card.icon}</div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{card.label}</span>
            </div>
            <p className={`text-xl font-black ${card.textColor}`}>
              R$ {card.value.toFixed(2)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
