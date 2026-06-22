import { useState, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { updateProfile } from '../../services/api'
import { uploadAvatar } from '../../services/storage'
import { User, Save, Camera } from 'lucide-react'

export function ProfilePage() {
  const { profile } = useAuth()
  const [name, setName] = useState(profile?.name || '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
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
      await updateProfile(profile.id, { name, avatar_url })
      setAvatarFile(null)
      setAvatarPreview(null)
      setMessage('Perfil atualizado com sucesso!')
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar perfil')
    }
    setSaving(false)
  }

  const displayUrl = avatarPreview || profile?.avatar_url || null

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
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
          <h1 className="text-xl font-bold">{profile?.name}</h1>
          <p className="text-sm text-gray-500">{profile?.email}</p>
          <span className="text-xs text-gray-400 mt-1">Clique na foto para alterar (até 1MB)</span>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input type="text" value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" />
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
    </div>
  )
}
