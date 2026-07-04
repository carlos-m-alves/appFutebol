import { useState } from 'react'
import { X, Check } from 'lucide-react'
import type { Profile, Match } from '../../types'

interface PlayerWithFees {
  group_member_id: string
  profile: Profile
  is_monthly_player: boolean
  monthly_fee: number
  match_fee: number
}

interface Props {
  open: boolean
  members: PlayerWithFees[]
  matches: Match[]
  onRecordPayment: (data: {
    group_member_id: string
    match_id?: string | null
    payment_type: 'MONTHLY' | 'MATCH'
    amount: number
    reference_month?: string | null
    paid_by: string
  }) => Promise<void>
  profileId: string
  onClose: () => void
}

export function PaymentModal({ open, members, matches, onRecordPayment, profileId, onClose }: Props) {
  const [selectedMember, setSelectedMember] = useState('')
  const [paymentType, setPaymentType] = useState<'MONTHLY' | 'MATCH'>('MATCH')
  const [selectedMatch, setSelectedMatch] = useState('')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const filteredMatches = matches.filter(m => m.status === 'FINISHED' || m.status === 'CONFIRMED')
  const selectedPlayer = members.find(m => m.group_member_id === selectedMember)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedMember || !amount) return
    setSaving(true)
    try {
      await onRecordPayment({
        group_member_id: selectedMember,
        match_id: paymentType === 'MATCH' ? selectedMatch || null : null,
        payment_type: paymentType,
        amount: Number(amount),
        reference_month: paymentType === 'MONTHLY'
          ? new Date().toISOString().slice(0, 7)
          : null,
        paid_by: profileId,
      })
      setSelectedMember('')
      setAmount('')
      setSelectedMatch('')
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-md z-10" onClick={e => e.stopPropagation()}>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-emerald-500/30 shadow-[0_0_60px_rgba(0,0,0,0.6)]">
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-gradient-to-br from-emerald-500/15 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />
          <div className="relative px-6 pt-6 pb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-black text-lg">Registrar Pagamento</h2>
              <button onClick={onClose} className="p-2 text-gray-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Jogador</label>
                <select value={selectedMember} onChange={e => {
                  setSelectedMember(e.target.value)
                  const p = members.find(m => m.group_member_id === e.target.value)
                  if (p) {
                    if (p.is_monthly_player) {
                      setPaymentType('MONTHLY')
                      setAmount(String(p.monthly_fee))
                    } else {
                      setPaymentType('MATCH')
                      setAmount(String(p.match_fee))
                    }
                    setSelectedMatch('')
                  }
                }}
                  className="w-full px-4 py-2.5 bg-white/[0.06] border border-white/[0.10] rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20">
                  <option value="" className="bg-[#0f1722]">Selecione...</option>
                  {members.map(m => (
                    <option key={m.group_member_id} value={m.group_member_id} className="bg-[#0f1722]">
                      {m.profile.name} {m.is_monthly_player ? '(Mensalista)' : '(Avulso)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Tipo</label>
                <div className="flex gap-2">
                  <button type="button"
                    onClick={() => { if (selectedPlayer?.is_monthly_player) return; setPaymentType('MATCH'); setSelectedMatch('') }}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                      selectedPlayer?.is_monthly_player
                        ? 'opacity-30 cursor-not-allowed bg-white/[0.04] border-white/[0.08] text-gray-500'
                        : paymentType === 'MATCH'
                          ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                          : 'bg-white/[0.04] border-white/[0.08] text-gray-500 hover:bg-white/[0.08]'
                    }`}>
                    Partida
                  </button>
                  <button type="button"
                    onClick={() => { if (selectedPlayer && !selectedPlayer.is_monthly_player) return; setPaymentType('MONTHLY') }}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                      selectedPlayer && !selectedPlayer.is_monthly_player
                        ? 'opacity-30 cursor-not-allowed bg-white/[0.04] border-white/[0.08] text-gray-500'
                        : paymentType === 'MONTHLY'
                          ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                          : 'bg-white/[0.04] border-white/[0.08] text-gray-500 hover:bg-white/[0.08]'
                    }`}>
                    Mensalidade
                  </button>
                </div>
              </div>

              {paymentType === 'MATCH' && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Partida</label>
                  <select value={selectedMatch} onChange={e => setSelectedMatch(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/[0.06] border border-white/[0.10] rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20">
                    <option value="" className="bg-[#0f1722]">Sem partida específica</option>
                    {filteredMatches.map(m => (
                      <option key={m.id} value={m.id} className="bg-[#0f1722]">
                        {new Date(m.match_date).toLocaleDateString('pt-BR')} - {m.location}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Valor (R$)
                </label>
                <input type="number" step="0.01" min="0" value={amount}
                  onChange={e => setAmount(e.target.value)} required
                  className="w-full px-4 py-2.5 bg-white/[0.06] border border-white/[0.10] rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 placeholder-gray-600" />
                {selectedPlayer && (
                  <p className="text-[10px] text-gray-500 mt-1">
                    Valor sugerido: R$ {selectedPlayer.is_monthly_player
                      ? selectedPlayer.monthly_fee.toFixed(2)
                      : selectedPlayer.match_fee.toFixed(2)}
                  </p>
                )}
              </div>

              <button type="submit" disabled={saving || !selectedMember || !amount}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-black text-sm hover:from-emerald-400 hover:to-green-500 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50">
                <Check size={16} /> {saving ? 'Registrando...' : 'Registrar Pagamento'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
