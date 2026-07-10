import { useState, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { updateProfile } from '../../services/api'
import { uploadAvatar } from '../../services/storage'
import { usePlayerStats } from '../../hooks/useGroups'
import { User, Save, Camera, Swords, Goal, Star, Trophy, Edit3, Footprints } from 'lucide-react'
import { POSITION_LABELS, DOMINANT_FOOT_LABELS, type PlayerPosition, type DominantFoot } from '../../types'

const POSITIONS: { value: PlayerPosition; label: string }[] = Object.entries(POSITION_LABELS).map(([value, label]) => ({
  value: value as PlayerPosition, label
}))

const FEET: { value: DominantFoot; label: string }[] = Object.entries(DOMINANT_FOOT_LABELS).map(([value, label]) => ({
  value: value as DominantFoot, label
}))

export function ProfilePage() {
  const { profile } = useAuth()
  const { data: stats } = usePlayerStats(profile?.id)
  const [name, setName] = useState(profile?.name || '')
  const [position, setPosition] = useState(profile?.position || '')
  const [birthDate, setBirthDate] = useState(profile?.birth_date?.split('T')[0] || '')
  const [weight, setWeight] = useState(profile?.weight?.toString() || '')
  const [dominantFoot, setDominantFoot] = useState(profile?.dominant_foot || '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 1MB')
      return
    }
    setError(null)
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = () => setAvatarPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      let avatar_url = profile.avatar_url
      if (avatarFile) {
        avatar_url = await uploadAvatar(avatarFile, profile.id)
      }
      await updateProfile(profile.id, {
        name,
        avatar_url,
        position: position || null,
        birth_date: birthDate || null,
        weight: weight ? Number(weight) : null,
        dominant_foot: dominantFoot || null,
      })
      setAvatarFile(null)
      setAvatarPreview(null)
      setMessage('Perfil atualizado com sucesso!')
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar perfil')
    }
    setSaving(false)
  }

  const displayUrl = avatarPreview || profile?.avatar_url || null

  const statItems = [
    { label: 'Partidas', value: stats?.matchesPlayed ?? 0, icon: <Swords size={18} />, color: 'text-blue-400 bg-blue-500/10' },
    { label: 'Gols', value: stats?.goals ?? 0, icon: <Goal size={18} />, color: 'text-emerald-400 bg-emerald-500/10' },
    { label: 'Assist.', value: stats?.assists ?? 0, icon: <Footprints size={18} />, color: 'text-purple-400 bg-purple-500/10' },
    { label: 'Média', value: stats?.avgRating ?? '-', icon: <Star size={18} />, color: 'text-yellow-400 bg-yellow-500/10' },
    { label: 'Vitórias', value: stats?.matchesWon ?? 0, icon: <Trophy size={18} />, color: 'text-amber-400 bg-amber-500/10' },
  ]

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Player Card - FIFA style */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-white/[0.06] shadow-[0_0_40px_rgba(0,0,0,0.4)]">
        <div className="absolute -top-16 -right-16 w-40 h-40 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent" />

        <div className="relative px-6 pt-5 pb-3">
          <div className="flex items-center gap-1.5">
            <Trophy size={12} className="text-yellow-500" />
            <span className="text-[10px] font-bold text-yellow-500/80 uppercase tracking-[0.2em]">Jogador</span>
          </div>
        </div>

        <div className="relative px-6 pb-6 flex items-center gap-5">
          <div className="relative shrink-0">
            {displayUrl ? (
              <img src={displayUrl} alt={profile?.name}
                className="w-20 h-20 rounded-2xl object-cover shadow-lg shadow-yellow-500/20 ring-2 ring-yellow-400/30" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-yellow-500/20 ring-2 ring-yellow-400/30">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent" />
                <span className="relative">{profile?.name?.charAt(0).toUpperCase() || '?'}</span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-white font-black text-xl tracking-tight truncate">{profile?.name}</h1>
            <p className="text-gray-400 text-xs mt-0.5">{profile?.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="px-2 py-0.5 rounded bg-white/[0.06] text-[10px] text-gray-500 uppercase tracking-wider">
                {profile?.position ? POSITION_LABELS[profile.position as PlayerPosition] || profile.position : 'Sem posição'}
              </div>
              {profile?.dominant_foot && (
                <div className="px-2 py-0.5 rounded bg-white/[0.06] text-[10px] text-gray-500 uppercase tracking-wider">
                  {DOMINANT_FOOT_LABELS[profile.dominant_foot as DominantFoot] || profile.dominant_foot}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - FIFA style */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-white/[0.06] shadow-[0_0_40px_rgba(0,0,0,0.4)]">
        <div className="absolute -top-16 -right-16 w-40 h-40 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

        <div className="relative px-6 pt-5 pb-3">
          <div className="flex items-center gap-1.5">
            <Swords size={12} className="text-blue-500" />
            <span className="text-[10px] font-bold text-blue-500/80 uppercase tracking-[0.2em]">Estatísticas Gerais</span>
          </div>
        </div>

        <div className="relative px-6 pb-6">
          <div className="grid grid-cols-5 gap-3">
            {statItems.map(item => (
              <div key={item.label} className="flex flex-col items-center gap-1.5">
                <div className={`w-9 h-9 rounded-xl ${item.color} flex items-center justify-center`}>
                  {item.icon}
                </div>
                <span className="text-white font-black text-lg">{item.value}</span>
                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.1em]">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Section */}
      {!editing ? (
        <button onClick={() => setEditing(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-[#0a0e17] font-black text-sm hover:from-yellow-400 hover:to-amber-500 transition-all duration-200 shadow-lg shadow-yellow-500/25">
          <Edit3 size={18} /> Editar Perfil
        </button>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-lg text-gray-900 flex items-center gap-2">
              <User size={20} /> Editar Perfil
            </h2>
            <button onClick={() => setEditing(false)}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium">
              Cancelar
            </button>
          </div>

          <div className="flex flex-col items-center mb-6">
            <button type="button" onClick={() => fileRef.current?.click()}
              className="relative w-24 h-24 rounded-full overflow-hidden group mb-2">
              {displayUrl ? (
                <img src={displayUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-2xl">
                  {profile?.name?.charAt(0).toUpperCase() || <User size={32} />}
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <Camera size={24} className="text-white" />
              </div>
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            <span className="text-xs text-gray-400">Clique na foto para alterar (até 1MB)</span>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input type="text" value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none text-gray-900" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Posição</label>
              <select value={position} onChange={e => setPosition(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none text-gray-900">
                <option value="">Selecione uma posição</option>
                {POSITIONS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento</label>
              <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none text-gray-900" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
              <input type="number" value={weight} onChange={e => setWeight(e.target.value)}
                step="0.1" min="0" max="300" placeholder="Ex: 75.5"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none text-gray-900" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pé Dominante</label>
              <select value={dominantFoot} onChange={e => setDominantFoot(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none text-gray-900">
                <option value="">Selecione</option>
                {FEET.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            {message && (
              <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm">{message}</div>
            )}
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
            )}

            <button type="submit" disabled={saving}
              className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition text-sm flex items-center justify-center gap-2 disabled:opacity-50">
              <Save size={16} /> {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
