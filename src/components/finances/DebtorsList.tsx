import { AlertTriangle, CheckCircle, DollarSign } from 'lucide-react'

interface Debtor {
  group_member_id: string
  profile_id: string
  player_name: string
  player_avatar: string | null
  is_monthly_player: boolean
  monthly_fee: number
  match_fee: number
  last_monthly_payment: string | null
  last_match_payment: string | null
  monthly_overdue?: boolean
}

interface Props {
  debtors: Debtor[]
  onMarkPayment: (debtor: Debtor, type: 'MONTHLY' | 'MATCH') => void
  isAdmin: boolean
  currentProfileId?: string
}

export function DebtorsList({ debtors, onMarkPayment, isAdmin, currentProfileId }: Props) {
  const overdue = debtors.filter(d =>
    (d.is_monthly_player && d.monthly_overdue && d.monthly_fee > 0) ||
    (!d.is_monthly_player && d.match_fee > 0)
  )

  if (overdue.length === 0) {
    return (
      <div className="rounded-xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-white/[0.06] p-6 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <CheckCircle size={22} className="text-emerald-400" />
        </div>
        <p className="text-emerald-400 font-bold text-sm">Todos os jogadores em dia!</p>
        <p className="text-gray-500 text-xs mt-1">Nenhum pagamento pendente.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-white/[0.06] shadow-[0_0_20px_rgba(0,0,0,0.3)]">
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
      <div className="relative px-5 pt-4 pb-2">
        <h3 className="text-sm font-black text-gray-300 uppercase tracking-[0.15em] flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-400" />
          Jogadores Devedores
          <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20 ml-auto">
            {overdue.length}
          </span>
        </h3>
      </div>
      <div className="relative px-5 pb-4 space-y-2">
        {overdue.map(d => {
          const debtValue = d.is_monthly_player ? d.monthly_fee : d.match_fee
          const debtLabel = d.is_monthly_player ? 'Mensalidade pendente' : 'Taxa de partida pendente'
          return (
            <div key={d.group_member_id}
              className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                d.profile_id === currentProfileId
                  ? 'bg-yellow-500/10 border border-yellow-500/30 ring-1 ring-yellow-500/20'
                  : 'bg-white/[0.04] border border-red-500/10 hover:bg-white/[0.08]'
              }`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 ring-2 ring-red-500/20">
                  {d.player_avatar ? (
                    <img src={d.player_avatar} alt={d.player_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-red-400 to-rose-600 flex items-center justify-center text-white font-black text-sm">
                      {d.player_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-bold truncate ${d.profile_id === currentProfileId ? 'text-yellow-300' : 'text-white'}`}>
                    {d.player_name}
                    {d.profile_id === currentProfileId && (
                      <span className="ml-2 text-[9px] font-bold uppercase tracking-wider bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">Você</span>
                    )}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${d.is_monthly_player ? 'bg-purple-500/10 text-purple-400' : 'bg-cyan-500/10 text-cyan-400'}`}>
                      {d.is_monthly_player ? 'Mensalista' : 'Avulso'}
                    </span>
                    <span className="text-[10px] text-gray-500 flex items-center gap-1">
                      <DollarSign size={10} /> R$ {debtValue.toFixed(2)}
                    </span>
                    <span className="text-[9px] text-red-400/80">{debtLabel}</span>
                  </div>
                </div>
              </div>
              {isAdmin && (
                <button
                  onClick={() => onMarkPayment(d, d.is_monthly_player ? 'MONTHLY' : 'MATCH')}
                  className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all shrink-0">
                  Pagar
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
