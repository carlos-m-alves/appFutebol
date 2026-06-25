import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useGroup } from '../../contexts/GroupContext'
import { groupService, matchService } from '../../services/api'
import type { Group, GroupMember, Match, Team, MatchResult, MatchPlayer } from '../../types'
import { Plus, LogIn, Users, ArrowRight, Trash2, Crown, Shield, Calendar, MapPin, Trophy, ChevronRight } from 'lucide-react'
import { MATCH_STATUS } from '../../lib/constants'
import { ConfirmModal } from '../../components/ui/ConfirmModal'

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
            <GroupCard key={group.id} group={group} onSelect={() => navigate(`/groups/${group.id}`)} />
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
  const { id } = useParams<{ id: string }>()
  const { currentGroup, setCurrentGroup, groups, currentGroupRole, refreshGroups } = useGroup()
  const { profile } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (id && (!currentGroup || currentGroup.id !== id)) {
      const group = groups.find(g => g.id === id)
      if (group) setCurrentGroup(group)
    }
  }, [id, groups, currentGroup, setCurrentGroup])

  const [members, setMembers] = useState<GroupMember[]>([])
  const [matches, setMatches] = useState<(Match & { results: (MatchResult & { team: Team })[]; players: MatchPlayer[] })[]>([])
  const [loadingMatches, setLoadingMatches] = useState(true)
  const [removingMember, setRemovingMember] = useState<string | null>(null)
  const [demotingMember, setDemotingMember] = useState<string | null>(null)

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
    const data = await matchService.listWithResults(currentGroup.id)
    setMatches(data)
    setLoadingMatches(false)
  }

  async function handleRemoveMember(memberId: string) {
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

  if (!currentGroup) return <div className="text-center py-8 text-gray-400">Selecione um grupo primeiro.</div>

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Group Hero Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-white/[0.06] shadow-[0_0_40px_rgba(0,0,0,0.4)]">
        <div className="absolute -top-16 -right-16 w-40 h-40 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent" />

        <div className="relative px-6 pt-5 pb-3">
          <div className="flex items-center gap-1.5">
            <Users size={12} className="text-yellow-500" />
            <span className="text-[10px] font-black text-yellow-500/80 uppercase tracking-[0.2em]">Grupo</span>
          </div>
        </div>

        <div className="relative px-6 pb-6">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/20 shrink-0">
              <Users size={24} className="text-[#0a0e17]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-white font-black text-2xl tracking-tight truncate">{currentGroup.name}</h1>
              {currentGroup.description && (
                <p className="text-gray-400 text-sm mt-0.5">{currentGroup.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-gray-500 flex items-center gap-1.5">
              <span className="text-yellow-500/60 font-black uppercase tracking-[0.1em]">Código</span>
              <span className="font-mono font-black text-yellow-400/90 bg-yellow-500/10 px-2 py-0.5 rounded-md border border-yellow-500/20">
                {currentGroup.access_code}
              </span>
            </span>
            <span className="text-gray-500">
              Criado em {new Date(currentGroup.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
            </span>
          </div>
        </div>
      </div>

      {/* Create Match Button */}
      <Link to="/matches/new"
        className="flex items-center justify-center gap-2 px-4 py-3.5 bg-gradient-to-r from-yellow-500 to-amber-600 text-[#0a0e17] rounded-xl font-black text-sm hover:from-yellow-400 hover:to-amber-500 transition-all duration-200 shadow-lg shadow-yellow-500/25">
        <Plus size={18} /> Criar Partida
      </Link>

      {/* Next Match Card */}
      {nextMatch && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-yellow-500/20 shadow-[0_0_40px_rgba(0,0,0,0.4)]">
          <div className="absolute -top-16 -right-16 w-40 h-40 bg-gradient-to-br from-yellow-500/10 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-500/40 to-transparent" />

          <div className="relative px-6 pt-5 pb-5">
            <h2 className="font-black text-sm uppercase tracking-[0.15em] text-yellow-400/80 mb-3 flex items-center gap-2">
              <Calendar size={16} /> Próxima Partida
            </h2>
            <Link to={`/matches/${nextMatch.id}`}
              className="block p-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-all duration-200 border border-white/[0.06] group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-sm">
                    {new Date(nextMatch.match_date).toLocaleDateString('pt-BR', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </p>
                  {nextMatch.location && (
                    <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                      <MapPin size={12} /> {nextMatch.location}
                    </p>
                  )}
                </div>
                <ChevronRight size={18} className="text-gray-600 group-hover:text-yellow-400 transition-colors" />
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Finished Matches Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-white/[0.06] shadow-[0_0_40px_rgba(0,0,0,0.4)]">
        <div className="absolute -top-16 -right-16 w-40 h-40 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

        <div className="relative px-6 pt-5 pb-5">
          <h2 className="font-black text-sm uppercase tracking-[0.15em] text-gray-400 mb-4 flex items-center gap-2">
            <Trophy size={16} className="text-yellow-500" /> Partidas Realizadas
            <span className="text-[10px] text-gray-600 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06] ml-auto">
              {finishedMatches.length}
            </span>
          </h2>
          {loadingMatches ? (
            <p className="text-sm text-gray-500">Carregando...</p>
          ) : finishedMatches.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhuma partida realizada ainda.</p>
          ) : (
            <div className="space-y-2">
              {finishedMatches.map(m => {
                const scores = m.results
                  .sort((a, b) => (a.team?.name || '').localeCompare(b.team?.name || ''))
                  .map(r => r.score)
                return (
                  <Link key={m.id} to={`/matches/${m.id}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-all duration-200 border border-white/[0.06] group">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white">
                        {new Date(m.match_date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      {m.location && <p className="text-xs text-gray-500 mt-0.5">{m.location}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      {scores.length === 2 && (
                        <div className="flex items-center gap-1.5 font-black text-sm">
                          <span className="text-yellow-400">{scores[0]}</span>
                          <span className="text-gray-600 text-xs">×</span>
                          <span className="text-yellow-400">{scores[1]}</span>
                        </div>
                      )}
                      <ChevronRight size={16} className="text-gray-600 group-hover:text-yellow-400 transition-colors" />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Members Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-white/[0.06] shadow-[0_0_40px_rgba(0,0,0,0.4)]">
        <div className="absolute -top-16 -right-16 w-40 h-40 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />

        <div className="relative px-6 pt-5 pb-5">
          <h2 className="font-black text-sm uppercase tracking-[0.15em] text-gray-400 mb-4 flex items-center gap-2">
            <Users size={16} /> Membros
            <span className="text-[10px] text-gray-600 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06] ml-auto">
              {members.length}
            </span>
          </h2>
          <div className="space-y-2">
            {members.map(m => (
              <div key={m.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all duration-200">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 ring-2 ring-white/[0.08]">
                    {m.profile?.avatar_url ? (
                      <img src={m.profile.avatar_url} alt={m.profile.name}
                        className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-[#0a0e17] font-black text-sm">
                        {m.profile?.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{m.profile?.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {m.role === 'ADMIN' && <Crown size={12} className="text-yellow-500 shrink-0" />}
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                        {m.role === 'ADMIN' ? 'Administrador' : 'Membro'}
                      </p>
                    </div>
                  </div>
                </div>
                {currentGroupRole === 'ADMIN' && m.profile_id !== profile?.id && (
                  <div className="flex gap-1 shrink-0">
                    {m.role === 'MEMBER' ? (
                      <button onClick={() => handlePromote(m.profile_id)}
                        className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all" title="Promover a admin">
                        <Shield size={16} />
                      </button>
                    ) : (
                      <button onClick={() => setDemotingMember(m.profile_id)}
                        className="p-2 text-orange-400 hover:bg-orange-500/10 rounded-lg transition-all" title="Rebaixar para membro">
                        <Shield size={16} />
                      </button>
                    )}
                    <button onClick={() => setRemovingMember(m.profile_id)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all" title="Remover">
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Leave Group Button */}
      <button onClick={handleLeave}
        className="w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-[0.1em] text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all duration-200">
        Sair do Grupo
      </button>

      <ConfirmModal
        open={!!demotingMember}
        title="Remover Administrador"
        message="Tem certeza que deseja remover o cargo de administrador deste membro?"
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        onConfirm={() => {
          if (demotingMember) handleDemote(demotingMember)
          setDemotingMember(null)
        }}
        onCancel={() => setDemotingMember(null)}
      />

      <ConfirmModal
        open={!!removingMember}
        title="Remover Membro"
        message="Tem certeza que deseja remover este membro do grupo?"
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        onConfirm={() => {
          if (removingMember) handleRemoveMember(removingMember)
          setRemovingMember(null)
        }}
        onCancel={() => setRemovingMember(null)}
      />
    </div>
  )
}
