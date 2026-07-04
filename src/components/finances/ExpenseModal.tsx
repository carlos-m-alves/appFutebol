import { useState } from 'react'
import { X, Plus } from 'lucide-react'

const EXPENSE_CATEGORIES = [
  { value: 'FIELD', label: 'Campo' },
  { value: 'REFEREE', label: 'Arbitragem' },
  { value: 'EQUIPMENT', label: 'Equipamento' },
  { value: 'SNACKS', label: 'Confraternização' },
  { value: 'OTHER', label: 'Outros' },
]

interface Props {
  open: boolean
  onAdd: (data: { description: string; amount: number; category: string }) => Promise<void>
  onClose: () => void
}

export function ExpenseModal({ open, onAdd, onClose }: Props) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('FIELD')
  const [saving, setSaving] = useState(false)

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description || !amount) return
    setSaving(true)
    try {
      await onAdd({ description, amount: Number(amount), category })
      setDescription('')
      setAmount('')
      setCategory('FIELD')
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-md z-10" onClick={e => e.stopPropagation()}>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-orange-500/30 shadow-[0_0_60px_rgba(0,0,0,0.6)]">
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-gradient-to-br from-orange-500/15 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-orange-500/60 to-transparent" />
          <div className="relative px-6 pt-6 pb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-black text-lg">Nova Despesa</h2>
              <button onClick={onClose} className="p-2 text-gray-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Descrição</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} required
                  placeholder="Ex: Aluguel do campo"
                  className="w-full px-4 py-2.5 bg-white/[0.06] border border-white/[0.10] rounded-xl text-white text-sm focus:outline-none focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 placeholder-gray-600" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Categoria</label>
                <select value={category} onChange={e => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/[0.06] border border-white/[0.10] rounded-xl text-white text-sm focus:outline-none focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20">
                  {EXPENSE_CATEGORIES.map(c => (
                    <option key={c.value} value={c.value} className="bg-[#0f1722]">{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Valor (R$)</label>
                <input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} required
                  className="w-full px-4 py-2.5 bg-white/[0.06] border border-white/[0.10] rounded-xl text-white text-sm focus:outline-none focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 placeholder-gray-600" />
              </div>
              <button type="submit" disabled={saving || !description || !amount}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-black text-sm hover:from-orange-400 hover:to-red-500 transition-all shadow-lg shadow-orange-500/25 disabled:opacity-50">
                <Plus size={16} /> {saving ? 'Adicionando...' : 'Adicionar Despesa'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
