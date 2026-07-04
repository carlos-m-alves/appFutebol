import { Trash2, CheckCircle } from 'lucide-react'
import type { Payment, GroupMember, Profile, Match } from '../../types'

interface PaymentFull extends Payment {
  group_member?: GroupMember & { profile?: Profile }
  paid_by_profile?: Profile
  match?: Match
}

interface Props {
  payments: PaymentFull[]
  isAdmin: boolean
  onDelete: (id: string) => void
  currentProfileId?: string
}

export function PaymentHistory({ payments, isAdmin, onDelete, currentProfileId }: Props) {
  if (payments.length === 0) {
    return (
      <div className="rounded-xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-white/[0.06] p-6 text-center">
        <p className="text-gray-500 text-sm">Nenhum pagamento registrado.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-white/[0.06] shadow-[0_0_20px_rgba(0,0,0,0.3)]">
      <div className="relative px-5 pt-4 pb-2">
        <h3 className="text-sm font-black text-gray-300 uppercase tracking-[0.15em] flex items-center gap-2">
          <CheckCircle size={16} className="text-emerald-400" />
          Histórico de Pagamentos
          <span className="text-[10px] text-gray-500 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06] ml-auto">
            {payments.length}
          </span>
        </h3>
      </div>
      <div className="relative px-5 pb-4 space-y-1 max-h-80 overflow-y-auto">
        {payments.map(p => {
          const playerId = p.group_member?.profile?.id || p.paid_by_profile?.id
          const isCurrentUser = currentProfileId && playerId === currentProfileId
          return (
          <div key={p.id}
            className={`flex items-center justify-between p-2.5 rounded-xl transition-all ${
              isCurrentUser
                ? 'bg-yellow-500/10 border border-yellow-500/30 ring-1 ring-yellow-500/20'
                : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06]'
            }`}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 ring-2 ring-white/[0.06]">
                {p.group_member?.profile?.avatar_url ? (
                  <img src={p.group_member.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center text-white font-black text-[10px]">
                    {p.group_member?.profile?.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-bold truncate ${isCurrentUser ? 'text-yellow-300' : 'text-white'}`}>
                  {p.group_member?.profile?.name || 'Desconhecido'}
                  {isCurrentUser && (
                    <span className="ml-2 text-[9px] font-bold uppercase tracking-wider bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">Você</span>
                  )}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${p.payment_type === 'MONTHLY' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'}`}>
                    {p.payment_type === 'MONTHLY' ? 'Mensalidade' : 'Partida'}
                  </span>
                  <span className="text-[10px] text-gray-600">
                    {new Date(p.paid_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </span>
                  {p.match && (
                    <span className="text-[10px] text-gray-600 truncate max-w-[100px]">
                      {new Date(p.match.match_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-black text-emerald-400">+ R$ {Number(p.amount).toFixed(2)}</span>
              {isAdmin && (
                <button onClick={() => onDelete(p.id)}
                  className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
          )
        })}
      </div>
    </div>
  )
}
