import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import type { GroupFinanceConfig } from '../../types'

interface Props {
  open: boolean
  config: GroupFinanceConfig | null
  onSave: (data: { default_monthly_fee: number; default_match_fee: number; pix_key?: string | null }) => void
  onClose: () => void
}

export function FinanceConfigModal({ open, config, onSave, onClose }: Props) {
  const [monthlyFee, setMonthlyFee] = useState('')
  const [matchFee, setMatchFee] = useState('')
  const [pixKey, setPixKey] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setMonthlyFee(String(config?.default_monthly_fee ?? '0'))
      setMatchFee(String(config?.default_match_fee ?? '0'))
      setPixKey(config?.pix_key ?? '')
    }
  }, [open, config])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({
        default_monthly_fee: Number(monthlyFee) || 0,
        default_match_fee: Number(matchFee) || 0,
        pix_key: pixKey.trim() || null,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-md z-10" onClick={e => e.stopPropagation()}>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-yellow-500/30 shadow-[0_0_60px_rgba(0,0,0,0.6)]">
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-gradient-to-br from-yellow-500/15 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-500/60 to-transparent" />
          <div className="relative px-6 pt-6 pb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-black text-lg">Configurar Finanças</h2>
              <button onClick={onClose} className="p-2 text-gray-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Valor Mensalidade Padrão (R$)
                </label>
                <input type="number" step="0.01" min="0" value={monthlyFee}
                  onChange={e => setMonthlyFee(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/[0.06] border border-white/[0.10] rounded-xl text-white text-sm focus:outline-none focus:border-yellow-500/40 focus:ring-1 focus:ring-yellow-500/20 placeholder-gray-600" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Valor Partida Padrão (R$)
                </label>
                <input type="number" step="0.01" min="0" value={matchFee}
                  onChange={e => setMatchFee(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/[0.06] border border-white/[0.10] rounded-xl text-white text-sm focus:outline-none focus:border-yellow-500/40 focus:ring-1 focus:ring-yellow-500/20 placeholder-gray-600" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Chave PIX (opcional)
                </label>
                <input type="text" value={pixKey}
                  onChange={e => setPixKey(e.target.value)}
                  placeholder="CPF, CNPJ, email ou telefone"
                  className="w-full px-4 py-2.5 bg-white/[0.06] border border-white/[0.10] rounded-xl text-white text-sm focus:outline-none focus:border-yellow-500/40 focus:ring-1 focus:ring-yellow-500/20 placeholder-gray-600" />
              </div>
              <button type="submit" disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-[#0a0e17] font-black text-sm hover:from-yellow-400 hover:to-amber-500 transition-all shadow-lg shadow-yellow-500/25 disabled:opacity-50">
                <Save size={16} /> {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
