import { useState } from 'react'
import { Save, X } from 'lucide-react'

interface PlayerFee {
  group_member_id: string
  profile_id: string
  player_name: string
  player_avatar: string | null
  is_monthly_player: boolean
  monthly_fee: number | null
  match_fee: number | null
}

interface Props {
  players: PlayerFee[]
  defaultMonthlyFee: number
  defaultMatchFee: number
  onSave: (groupMemberId: string, data: { is_monthly_player?: boolean; monthly_fee?: number | null; match_fee?: number | null }) => Promise<void>
  onClose: () => void
  open: boolean
  currentProfileId?: string
}

export function PlayerFeeManager({ players, defaultMonthlyFee, defaultMatchFee, onSave, onClose, open, currentProfileId }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<{ is_monthly: boolean; monthly: string; match: string }>({ is_monthly: false, monthly: '', match: '' })
  const [saving, setSaving] = useState(false)

  if (!open) return null

  function startEdit(p: PlayerFee) {
    setEditingId(p.group_member_id)
    setEditData({
      is_monthly: p.is_monthly_player,
      monthly: String(p.monthly_fee ?? defaultMonthlyFee),
      match: String(p.match_fee ?? defaultMatchFee),
    })
  }

  async function handleSave(groupMemberId: string) {
    setSaving(true)
    try {
      await onSave(groupMemberId, {
        is_monthly_player: editData.is_monthly,
        monthly_fee: Number(editData.monthly) || null,
        match_fee: Number(editData.match) || null,
      })
      setEditingId(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-2xl z-10" onClick={e => e.stopPropagation()}>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-yellow-500/30 shadow-[0_0_60px_rgba(0,0,0,0.6)] max-h-[80vh] flex flex-col">
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-gradient-to-br from-yellow-500/15 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-500/60 to-transparent" />
          <div className="relative px-6 pt-6 pb-4 border-b border-white/[0.06]">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-black text-lg">Valores por Jogador</h2>
              <button onClick={onClose} className="p-2 text-gray-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Valores padrão: Mensalidade R$ {defaultMonthlyFee.toFixed(2)} | Partida R$ {defaultMatchFee.toFixed(2)}</p>
          </div>
          <div className="relative px-6 py-4 overflow-y-auto space-y-2 flex-1">
            {players.map(p => {
              const isCurrentUser = currentProfileId && p.profile_id === currentProfileId
              return (
              <div key={p.group_member_id}
                className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                  isCurrentUser
                    ? 'bg-yellow-500/10 border border-yellow-500/30 ring-1 ring-yellow-500/20'
                    : 'bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08]'
                }`}>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 ring-2 ring-white/[0.08]">
                    {p.player_avatar ? (
                      <img src={p.player_avatar} alt={p.player_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-[#0a0e17] font-black text-sm">
                        {p.player_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-bold ${isCurrentUser ? 'text-yellow-300' : 'text-white'}`}>
                      {p.player_name}
                      {isCurrentUser && (
                        <span className="ml-2 text-[9px] font-bold uppercase tracking-wider bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">Você</span>
                      )}
                    </p>
                    {editingId === p.group_member_id ? (
                      <div className="flex items-center gap-2 mt-2">
                        <button type="button" onClick={() => setEditData(prev => ({ ...prev, is_monthly: true }))}
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all ${editData.is_monthly ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'bg-white/[0.04] border-white/[0.08] text-gray-500'}`}>
                          Mensalista
                        </button>
                        <button type="button" onClick={() => setEditData(prev => ({ ...prev, is_monthly: false }))}
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all ${!editData.is_monthly ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-white/[0.04] border-white/[0.08] text-gray-500'}`}>
                          Avulso
                        </button>
                        <input type="number" step="0.01" min="0" value={editData.monthly}
                          onChange={e => setEditData(prev => ({ ...prev, monthly: e.target.value }))}
                          placeholder="Mensal"
                          className="w-20 px-2 py-1 text-xs bg-white/[0.06] border border-white/[0.10] rounded-lg text-white text-center focus:outline-none focus:border-yellow-500/40" />
                        <input type="number" step="0.01" min="0" value={editData.match}
                          onChange={e => setEditData(prev => ({ ...prev, match: e.target.value }))}
                          placeholder="Partida"
                          className="w-20 px-2 py-1 text-xs bg-white/[0.06] border border-white/[0.10] rounded-lg text-white text-center focus:outline-none focus:border-yellow-500/40" />
                        <button onClick={() => handleSave(p.group_member_id)} disabled={saving}
                          className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all">
                          <Save size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${p.is_monthly_player ? 'bg-purple-500/10 text-purple-400' : 'bg-cyan-500/10 text-cyan-400'}`}>
                          {p.is_monthly_player ? 'Mensalista' : 'Avulso'}
                        </span>
                        <span className="text-[10px] text-gray-500">Mensal: R$ {(p.monthly_fee ?? defaultMonthlyFee).toFixed(2)}</span>
                        <span className="text-[10px] text-gray-500">Partida: R$ {(p.match_fee ?? defaultMatchFee).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
                {editingId !== p.group_member_id && (
                  <button onClick={() => startEdit(p)}
                    className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 transition-all shrink-0">
                    Ajustar
                  </button>
                )}
              </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
