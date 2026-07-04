import { Trash2, TrendingDown } from 'lucide-react'
import type { GroupExpense, Profile } from '../../types'

interface ExpenseWithProfile extends GroupExpense {
  created_by_profile?: Profile
}

interface Props {
  expenses: ExpenseWithProfile[]
  isAdmin: boolean
  onDelete: (id: string) => void
}

const CATEGORY_COLORS: Record<string, string> = {
  FIELD: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  REFEREE: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  EQUIPMENT: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  SNACKS: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  OTHER: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
}

const CATEGORY_LABELS: Record<string, string> = {
  FIELD: 'Campo',
  REFEREE: 'Arbitragem',
  EQUIPMENT: 'Equipamento',
  SNACKS: 'Confraternização',
  OTHER: 'Outros',
}

export function ExpenseList({ expenses, isAdmin, onDelete }: Props) {
  if (expenses.length === 0) {
    return (
      <div className="rounded-xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-white/[0.06] p-6 text-center">
        <p className="text-gray-500 text-sm">Nenhuma despesa registrada.</p>
      </div>
    )
  }

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

  return (
    <div className="rounded-xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-white/[0.06] shadow-[0_0_20px_rgba(0,0,0,0.3)]">
      <div className="relative px-5 pt-4 pb-2">
        <h3 className="text-sm font-black text-gray-300 uppercase tracking-[0.15em] flex items-center gap-2">
          <TrendingDown size={16} className="text-orange-400" />
          Despesas
          <span className="text-[10px] text-gray-500 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06] ml-auto">
            Total: R$ {total.toFixed(2)}
          </span>
        </h3>
      </div>
      <div className="relative px-5 pb-4 space-y-2">
        {expenses.map(e => (
          <div key={e.id}
            className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-white">{e.description}</p>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${CATEGORY_COLORS[e.category] || CATEGORY_COLORS.OTHER}`}>
                  {CATEGORY_LABELS[e.category] || e.category}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-gray-500">
                  {new Date(e.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                </span>
                {e.created_by_profile && (
                  <span className="text-[10px] text-gray-600">{e.created_by_profile.name}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-black text-red-400">- R$ {Number(e.amount).toFixed(2)}</span>
              {isAdmin && (
                <button onClick={() => onDelete(e.id)}
                  className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
