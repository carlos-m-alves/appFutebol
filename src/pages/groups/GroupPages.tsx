import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useGroup } from '../../contexts/GroupContext'
import { groupService, matchService } from '../../services/api'
import type { Group, GroupMember, Match } from '../../types'
import { Plus, LogIn, Users, ArrowRight, Trash2, Crown, Shield, Calendar, MapPin, Trophy, ChevronRight } from 'lucide-react'
import { MATCH_STATUS } from '../../lib/constants'

export function GroupsListPage() {
  const { groups, loading } = useGroup()
  const navigate = useNavigate()

  if (loading) return <div className="text-center py-8">Carregando...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Meus Grupos</h1>
        <div className="flex gap-3">
          <Link to="/groups/join" className="bg-white text-green-600 border-2 border-green-600 px-4 py-2 rounded-lg hover:bg-green-50 transition flex items-center gap-2">
            <LogIn size={18} /> Entrar
          </Link>
          <Link to="/groups/new" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2">
            <Plus size={18} /> Criar
          </Link>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <Users className="mx-auto w-12 h-12 text-gray-300 mb-4" />
          <p className="text-gray-500 mb-4">Você ainda não participa de nenhum grupo.</p>
          <div className="flex gap-4 justify-center">
            <Link to="/groups/new" className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition">Criar Grupo</Link>
            <Link to="/groups/join" className="bg-white text-green-600 border-2 border-green-600 px-6 py-2 rounded-lg hover:bg-green-50 transition">Entrar em Grupo</Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map(group => (
            <GroupCard key={group.id} group={group} onSelect={() => navigate(`/dashboard?group=${group.id}`)} />
          ))}
        </div>
      )}
    </div>
  )
}

function GroupCard({ group, onSelect }: { group: Group; onSelect: () => void }) {
  const [memberCount, setMemberCount] = useState(0)
  const { setCurrentGroup } = useGroup()

  useEffect(() => {
    groupService.getMembers(group.id).then(m => setMemberCount(m.length))
  }, [group.id])

  function handleClick() {
    setCurrentGroup(group)
    onSelect()
  }

  return (
    <button onClick={handleClick} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-left hover:shadow-md transition w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
          <Users className="text-green-600" size={24} />
        </div>
        <ArrowRight size={20} className="text-gray-400" />
      </div>
      <h3 className="font-bold text-lg mb-1 text-gray-900">{group.name}</h3>
      {group.description && <p className="text-sm text-gray-600 mb-3">{group.description}</p>}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><Users size={14} /> {memberCount} membros</span>
        <span>Código: <span className="font-mono font-bold">{group.access_code}</span></span>
      </div>
    </button>
  )
}

export function CreateGroupPage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { refreshGroups } = useGroup()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const group = await groupService.create(name, description)
      if (group) {
        await refreshGroups()
        navigate('/dashboard')
      }
    } catch {
      setError('Erro ao criar grupo')
    }
    setLoading(false)
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Criar Grupo</h1>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Grupo</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-gray-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (opcional)</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-gray-900" />
        </div>
        <button type="submit" disabled={loading}
          className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50">
          {loading ? 'Criando...' : 'Criar Grupo'}
        </button>
      </form>
    </div>
  )
}

export function JoinGroupPage() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { refreshGroups } = useGroup()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (!profile) throw new Error('Not authenticated')
      await groupService.join(code, profile.id)
      await refreshGroups()
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Entrar em Grupo</h1>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Código de Acesso</label>
          <input type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())} required
            placeholder="EX: ABC123" maxLength={6}
            className="w-full px-4 py-3 text-center text-xl font-mono font-bold tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none uppercase text-gray-900" />
        </div>
        <button type="submit" disabled={loading}
          className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50">
          {loading ? 'Entrando...' : 'Entrar no Grupo'}
        </button>
      </form>
    </div>
  )
}

export function GroupSettingsPage() {
  const { currentGroup, currentGroupRole, refreshGroups } = useGroup()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [members, setMembers] = useState<GroupMember[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loadingMatches, setLoadingMatches] = useState(true)

  useEffect(() => {
    if (currentGroup) { loadMembers(); loadMatches() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGroup])

  async function loadMembers() {
    if (!currentGroup) return
    const m = await groupService.getMembers(currentGroup.id)
    setMembers(m)
  }

  async function loadMatches() {
    if (!currentGroup) return
    setLoadingMatches(true)
    const data = await matchService.list(currentGroup.id)
    setMatches(data)
    setLoadingMatches(false)
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm('Remover este membro do grupo?')) return
    try {
      await groupService.removeMember(currentGroup!.id, memberId)
      await loadMembers()
    } catch { alert('Erro ao remover membro') }
  }

  async function handlePromote(memberId: string) {
    try {
      await groupService.promoteToAdmin(currentGroup!.id, memberId)
      await loadMembers()
    } catch { alert('Erro ao promover membro') }
  }

  async function handleDemote(memberId: string) {
    if (!confirm('Remover cargo de administrador deste membro?')) return
    try {
      await groupService.demoteFromAdmin(currentGroup!.id, memberId)
      await loadMembers()
    } catch { alert('Erro ao rebaixar membro') }
  }

  async function handleLeave() {
    if (!profile || !currentGroup) return
    if (!confirm('Tem certeza que deseja sair do grupo?')) return
    try {
      await groupService.leave(currentGroup.id, profile.id)
      await refreshGroups()
      navigate('/groups')
    } catch { alert('Erro ao sair do grupo') }
  }

  const statusColors: Record<string, string> = {
    SCHEDULED: 'bg-blue-100 text-blue-800',
    CONFIRMED: 'bg-green-100 text-green-800',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
    FINISHED: 'bg-gray-100 text-gray-800',
    CANCELLED: 'bg-red-100 text-red-800'
  }

  const nextMatch = matches.filter(m => m.status === 'SCHEDULED' || m.status === 'CONFIRMED').sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())[0]
  const finishedMatches = matches.filter(m => m.status === 'FINISHED').sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())

  if (!currentGroup) return <div className="text-center py-8">Selecione um grupo primeiro.</div>

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Configurações do Grupo</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="font-bold text-lg mb-2 text-gray-900">{currentGroup.name}</h2>
        <p className="text-sm text-gray-500 mb-1">Código: <span className="font-mono font-bold">{currentGroup.access_code}</span></p>
        <p className="text-xs text-gray-400">
          Criado em {new Date(currentGroup.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
        </p>
        {currentGroup.description && <p className="text-sm text-gray-500 mt-1">{currentGroup.description}</p>}
      </div>

      <Link to="/matches/new"
        className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition shadow-sm mb-6">
        <Plus size={18} /> Criar Partida
      </Link>

      {nextMatch && (
        <div className="bg-white rounded-xl shadow-sm border border-green-200 border-2 p-6 mb-6">
          <h2 className="font-bold text-lg mb-3 flex items-center gap-2 text-green-700">
            <Calendar size={20} /> Próxima Partida
          </h2>
          <Link to={`/matches/${nextMatch.id}`} className="block p-4 rounded-lg bg-green-50 hover:bg-green-100 transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {new Date(nextMatch.match_date).toLocaleDateString('pt-BR', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </p>
                {nextMatch.location && <p className="text-sm text-gray-500 mt-1"><MapPin size={14} className="inline" /> {nextMatch.location}</p>}
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </div>
          </Link>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Trophy size={20} className="text-yellow-500" /> Partidas Realizadas ({finishedMatches.length})
        </h2>
        {loadingMatches ? (
          <p className="text-sm text-gray-500">Carregando...</p>
        ) : finishedMatches.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma partida realizada ainda.</p>
        ) : (
          <div className="space-y-2">
            {finishedMatches.map(m => (
              <Link key={m.id} to={`/matches/${m.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition">
                <div>
                  <p className="text-sm font-medium">
                    {new Date(m.match_date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  {m.location && <p className="text-xs text-gray-500">{m.location}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[m.status]}`}>
                    {MATCH_STATUS[m.status as keyof typeof MATCH_STATUS]}
                  </span>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-bold text-lg mb-4">Membros ({members.length})</h2>
        <div className="space-y-3">
          {members.map(m => (
            <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold">
                    {m.profile?.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{m.profile?.name}</p>
                    <p className="text-xs text-gray-500">{m.role === 'ADMIN' ? 'Administrador' : 'Membro'}</p>
                  </div>
                  {m.role === 'ADMIN' && <Crown size={16} className="text-yellow-500" />}
                </div>
              {currentGroupRole === 'ADMIN' && m.profile_id !== profile?.id && (
                <div className="flex gap-2">
                  {m.role === 'MEMBER' ? (
                    <button onClick={() => handlePromote(m.profile_id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Promover a admin">
                      <Shield size={18} />
                    </button>
                  ) : (
                    <button onClick={() => handleDemote(m.profile_id)}
                      className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition" title="Rebaixar para membro">
                      <Shield size={18} />
                    </button>
                  )}
                  <button onClick={() => handleRemoveMember(m.profile_id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="Remover">
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <button onClick={handleLeave}
          className="w-full bg-red-50 text-red-600 py-3 rounded-lg hover:bg-red-100 transition font-medium">
          Sair do Grupo
        </button>
      </div>
    </div>
  )
}
