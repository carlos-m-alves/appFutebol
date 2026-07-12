import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useGroup } from '../../contexts/GroupContext'
import { groupService, matchService, groupJoinRequestService } from '../../services/api'
import { uploadGroupImage } from '../../services/storage'
import { supabase } from '../../lib/supabase'
import type { Group, GroupMember, Match, Team, MatchResult, MatchPlayer, GroupJoinRequest } from '../../types'
import { MODALITY_LABELS } from '../../types'
import { Plus, LogIn, Users, ArrowRight, Trash2, Crown, Shield, Calendar, MapPin, Trophy, ChevronRight, Check, X, Clock, UserPlus, Search, Send, DollarSign, QrCode, Edit3, Camera } from 'lucide-react'

import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { QRCodeModal } from '../../components/groups/QRCodeModal'

export function GroupsListPage() {
  const { profile } = useAuth()
  const { setCurrentGroup } = useGroup()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [allGroups, setAllGroups] = useState<(Group & { member_count: number; is_member: boolean; has_pending_request: boolean })[]>([])
  const [loading, setLoading] = useState(true)
  const [sendingRequest, setSendingRequest] = useState<string | null>(null)
  const [pendingModalGroup, setPendingModalGroup] = useState<typeof allGroups[number] | null>(null)
  const [nextMatch, setNextMatch] = useState<(Match & { group: { name: string } }) | null>(null)
  const [pendingFinanceGroups, setPendingFinanceGroups] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    if (profile) loadGroups()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  async function loadGroups() {
    if (!profile) { setLoading(false); return }
    setLoading(true)

    const { data: groups } = await supabase.from('groups').select('*').is('deleted_at', null).order('name')
    if (!groups) { setLoading(false); return }

    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('profile_id', profile.id)

    const memberGroupIds = new Set(memberships?.map(m => m.group_id) ?? [])

    const { data: requests } = await supabase
      .from('group_join_requests')
      .select('group_id')
      .eq('profile_id', profile.id)
      .eq('status', 'PENDING')

    const pendingRequestGroupIds = new Set(requests?.map(r => r.group_id) ?? [])

    const { data: allMembers } = await supabase.from('group_members').select('group_id')
    const countMap = new Map<string, number>()
    for (const m of allMembers ?? []) {
      countMap.set(m.group_id, (countMap.get(m.group_id) ?? 0) + 1)
    }

    const enriched = groups.map(g => ({
      ...g,
      member_count: countMap.get(g.id) ?? 0,
      is_member: memberGroupIds.has(g.id),
      has_pending_request: pendingRequestGroupIds.has(g.id),
    }))

    setAllGroups(enriched)

    // Load next upcoming match for user's groups
    if (memberGroupIds.size > 0) {
      const { data: upcoming } = await supabase
        .from('matches')
        .select('*, group:groups!inner(name)')
        .in('group_id', [...memberGroupIds])
        .in('status', ['SCHEDULED', 'CONFIRMED'])
        .gte('match_date', new Date().toISOString())
        .order('match_date', { ascending: true })
        .limit(1)

      if (upcoming && upcoming.length > 0) {
        setNextMatch(upcoming[0] as any)
      }
    }

    // Load groups with finance config
    if (memberGroupIds.size > 0) {
      const { data: finGroups } = await supabase
        .from('group_finance_config')
        .select('group_id, groups!inner(name)')
        .in('group_id', [...memberGroupIds])
        .or('default_monthly_fee.gt.0,default_match_fee.gt.0')

      if (finGroups) {
        setPendingFinanceGroups(finGroups.map((fg: any) => ({
          id: fg.group_id,
          name: fg.groups?.name || ''
        })))
      }
    }

    setLoading(false)
  }

  const filtered = search
    ? allGroups.filter(g =>
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        g.access_code.toLowerCase().includes(search.toLowerCase()))
    : allGroups

  async function handleRequestJoin(groupId: string) {
    if (!profile) return
    setSendingRequest(groupId)
    try {
      await groupJoinRequestService.create(groupId, profile.id)
      setAllGroups(prev => prev.map(g =>
        g.id === groupId ? { ...g, has_pending_request: true } : g
      ))
    } catch (err: any) {
      alert(err.message)
    }
    setSendingRequest(null)
  }

  function handleGroupClick(group: Group & { is_member: boolean }) {
    setCurrentGroup(group)
    navigate(`/groups/${group.id}`)
  }

  const CARD_GRADIENTS = [
    'from-emerald-500 to-green-700',
    'from-blue-500 to-indigo-700',
    'from-purple-500 to-violet-700',
    'from-rose-500 to-pink-700',
    'from-amber-500 to-orange-700',
    'from-cyan-500 to-teal-700',
  ]

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white tracking-tight">Grupos</h1>
        <div className="flex gap-3">
          <Link to="/groups/join"
            className="bg-white/[0.06] text-white/80 px-4 py-2 rounded-xl font-bold text-sm hover:bg-white/[0.10] transition-all duration-200 flex items-center gap-2 border border-white/[0.08]">
            <LogIn size={16} /> Entrar
          </Link>
          <Link to="/groups/new"
            className="bg-gradient-to-r from-yellow-500 to-amber-600 text-[#0a0e17] px-4 py-2 rounded-xl font-black text-sm hover:from-yellow-400 hover:to-amber-500 transition-all duration-200 flex items-center gap-2 shadow-lg shadow-yellow-500/20">
            <Plus size={16} /> Criar
          </Link>
        </div>
      </div>

      {/* Next Match Card */}
      {nextMatch && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-600/5 to-transparent border border-emerald-500/20 p-5 mb-4">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
              <Calendar size={22} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-[0.15em] mb-0.5">Próxima Partida</p>
              <h3 className="text-white font-bold text-sm truncate">
                {new Date(nextMatch.match_date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                {' às '}
                {new Date(nextMatch.match_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </h3>
              <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
                {nextMatch.location && (
                  <span className="flex items-center gap-1"><MapPin size={11} /> {nextMatch.location}</span>
                )}
                <span className="text-emerald-400/80 font-semibold">{nextMatch.group?.name}</span>
                {nextMatch.modality && (
                  <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[10px] text-gray-500 uppercase tracking-wider">
                    {MODALITY_LABELS[nextMatch.modality as keyof typeof MODALITY_LABELS] || nextMatch.modality}
                  </span>
                )}
              </div>
            </div>
            <button onClick={() => navigate(`/matches/${nextMatch.id}`)}
              className="shrink-0 px-3 py-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-[11px] font-bold hover:bg-emerald-500/30 transition-all">
              Detalhes
            </button>
          </div>
        </div>
      )}

      {/* Pending Finance Cards */}
      {pendingFinanceGroups.length > 0 && (
        <div className="space-y-2 mb-4">
          {pendingFinanceGroups.map(fg => (
            <div key={fg.id}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-transparent border border-amber-500/20 p-4">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl" />
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
                  <DollarSign size={18} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-amber-400/80 uppercase tracking-[0.15em] mb-0.5">Pendência Financeira</p>
                  <p className="text-white font-medium text-sm">Você possui pendências no grupo <span className="font-bold">{fg.name}</span></p>
                </div>
                <button onClick={() => navigate(`/groups/${fg.id}/financas`)}
                  className="shrink-0 px-3 py-2 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl text-[11px] font-bold hover:bg-amber-500/30 transition-all">
                  Finanças
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Pesquisar por nome ou código..."
          className="w-full pl-11 pr-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/40 focus:ring-1 focus:ring-yellow-500/20 transition-all text-sm" />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 text-sm">Carregando grupos...</div>
      ) : filtered.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-white/[0.06] p-12 text-center shadow-[0_0_40px_rgba(0,0,0,0.4)]">
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-gradient-to-br from-yellow-500/5 to-transparent rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent" />

          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-white/[0.08] flex items-center justify-center mx-auto mb-4">
              <Users size={28} className="text-yellow-500/50" />
            </div>
            <h2 className="text-white font-black text-lg mb-1">Nenhum grupo encontrado</h2>
            <p className="text-gray-500 text-sm">
              {search ? 'Tente buscar por outro nome ou código.' : 'Nenhum grupo disponível no momento.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((group, index) => {
            const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length]
            return (
              <div key={group.id}
                className="group relative bg-gradient-to-br from-[#151d2b] to-[#0d1420] rounded-2xl p-[1px] hover:scale-[1.02] transition-all duration-300 w-full">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative rounded-2xl bg-gradient-to-br from-[#151d2b] to-[#0d1420] p-5 h-full overflow-hidden">
                  <div className={`absolute -top-6 -right-6 w-20 h-20 bg-gradient-to-br ${gradient} rounded-full opacity-20 blur-xl`} />
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-500/40 to-transparent" />

                  <div className="flex items-start justify-between mb-3 relative">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
                      <Users className="text-white" size={18} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-yellow-500/10 border border-yellow-500/20">
                        <Users size={10} className="text-yellow-400" />
                        <span className="text-[10px] font-bold text-yellow-400">{group.member_count}</span>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-white font-bold text-sm mb-1 truncate relative">{group.name}</h3>
                  {group.description && (
                    <p className="text-gray-500 text-[11px] mb-3 line-clamp-1 relative">{group.description}</p>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] relative">
                    <span className="text-[10px] text-gray-600 font-mono tracking-widest uppercase bg-white/[0.03] px-2 py-0.5 rounded-md">
                      {group.access_code}
                    </span>
                    <span className="text-[10px] text-gray-600 uppercase tracking-wider">
                      {group.member_count === 1 ? '1 membro' : `${group.member_count} membros`}
                    </span>
                  </div>

                  {/* Action */}
                  <div className="mt-3 relative">
                    {group.is_member ? (
                      <button onClick={() => handleGroupClick(group)}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[11px] font-bold uppercase tracking-wider hover:bg-yellow-500/20 transition-all">
                        Acessar <ArrowRight size={14} />
                      </button>
                    ) : group.has_pending_request ? (
                      <button onClick={() => setPendingModalGroup(group)}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[11px] font-bold uppercase tracking-wider hover:bg-yellow-500/20 transition-all">
                        <Clock size={14} /> Solicitação Enviada
                      </button>
                    ) : (
                      <button onClick={() => handleRequestJoin(group.id)} disabled={sendingRequest === group.id}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold uppercase tracking-wider hover:bg-emerald-500/20 transition-all disabled:opacity-50">
                        <Send size={14} /> {sendingRequest === group.id ? 'Enviando...' : 'Solicitar Entrada'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* FIFA-Styled Pending Request Modal */}
      {pendingModalGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setPendingModalGroup(null)}>
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal Card */}
          <div className="relative w-full max-w-sm z-10"
            onClick={e => e.stopPropagation()}>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-yellow-500/30 shadow-[0_0_60px_rgba(0,0,0,0.6)] shadow-yellow-500/10">
              {/* Glow */}
              <div className="absolute -top-20 -right-20 w-48 h-48 bg-gradient-to-br from-yellow-500/15 to-transparent rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-gradient-to-br from-yellow-500/5 to-transparent rounded-full blur-3xl" />
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-500/60 to-transparent" />

              {/* Header Accent */}
              <div className="absolute top-4 left-6 right-6 h-12 bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-transparent rounded-full blur-xl" />

              <div className="relative px-6 pt-8 pb-6 text-center">
                {/* Icon */}
                <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/30">
                  <Clock size={28} className="text-[#0a0e17]" />
                </div>

                {/* Title */}
                <h2 className="text-white font-black text-xl mb-2 tracking-tight">
                  Solicitação Enviada
                </h2>

                {/* Group name */}
                <p className="text-yellow-400/80 font-bold text-sm mb-4 uppercase tracking-wider">
                  {pendingModalGroup.name}
                </p>

                {/* Message */}
                <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 mb-6">
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Você já solicitou entrada neste grupo. Aguarde a aprovação do administrador.
                  </p>
                </div>

                {/* Código */}
                <div className="flex items-center justify-center gap-2 mb-6">
                  <span className="text-[10px] text-gray-600 uppercase tracking-[0.15em]">Código</span>
                  <span className="font-mono font-bold text-yellow-400/80 text-sm bg-yellow-500/10 px-3 py-1 rounded-md border border-yellow-500/20">
                    {pendingModalGroup.access_code}
                  </span>
                </div>

                {/* Close Button */}
                <button onClick={() => setPendingModalGroup(null)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-[#0a0e17] font-black text-sm hover:from-yellow-400 hover:to-amber-500 transition-all duration-200 shadow-lg shadow-yellow-500/25">
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function CreateGroupPage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { setCurrentGroup, refreshGroups } = useGroup()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const group = await groupService.create(name, description)
      if (group) {
        setCurrentGroup(group)
        await refreshGroups()
        navigate(`/groups/${group.id}`)
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
  const [success, setSuccess] = useState<string | null>(null)
  const { profile } = useAuth()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const codeParam = searchParams.get('code')
    if (codeParam) {
      setCode(codeParam.toUpperCase())
    }
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      if (!profile) throw new Error('Not authenticated')

      const { data: group } = await supabase
        .from('groups')
        .select('id, name')
        .eq('access_code', code.toUpperCase())
        .single()

      if (!group) throw new Error('Código de acesso inválido')

      await groupJoinRequestService.create(group.id, profile.id)
      setSuccess(`Solicitação enviada para entrar em "${group.name}". Aguarde a aprovação do administrador.`)
      setCode('')
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Entrar em Grupo</h1>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 p-3 rounded-lg mb-4 text-sm">{success}</div>}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Código de Acesso</label>
          <input type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())} required
            placeholder="EX: ABC123" maxLength={6}
            className="w-full px-4 py-3 text-center text-xl font-mono font-bold tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none uppercase text-gray-900" />
        </div>
        <button type="submit" disabled={loading}
          className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50">
          {loading ? 'Enviando...' : 'Solicitar Entrada'}
        </button>
      </form>
    </div>
  )
}

export function GroupSettingsPage() {
  const { id } = useParams<{ id: string }>()
  const { currentGroup, setCurrentGroup, groups } = useGroup()
  const { profile } = useAuth()

  const [loadingAccess, setLoadingAccess] = useState(true)
  const [isMember, setIsMember] = useState(false)
  const [publicGroup, setPublicGroup] = useState<Group | null>(null)
  const [pendingRequest, setPendingRequest] = useState<'none' | 'pending' | 'sent'>('none')
  const [sendingRequest, setSendingRequest] = useState(false)
  const [memberCount, setMemberCount] = useState(0)

  useEffect(() => {
    if (id && profile) checkAccess()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, profile])

  async function checkAccess() {
    if (!id || !profile) return
    setLoadingAccess(true)

    const { data: membership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', id)
      .eq('profile_id', profile.id)
      .maybeSingle()

    if (membership) {
      setIsMember(true)
      if (!currentGroup || currentGroup.id !== id) {
        const group = groups.find(g => g.id === id)
        if (group) setCurrentGroup(group)
        else {
          const { data } = await supabase.from('groups').select('*').eq('id', id).single()
          if (data) setCurrentGroup(data)
        }
      }
    } else {
      setIsMember(false)
      const { data } = await supabase.from('groups').select('*').eq('id', id).is('deleted_at', null).single()
      setPublicGroup(data)

      const { data: members } = await supabase
        .from('group_members')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', id)
      setMemberCount(members?.length ?? 0)

      const { data: req } = await supabase
        .from('group_join_requests')
        .select('id, status')
        .eq('group_id', id)
        .eq('profile_id', profile.id)
        .maybeSingle()
      if (req?.status === 'PENDING') setPendingRequest('pending')
    }

    setLoadingAccess(false)
  }

  async function handleRequestJoin() {
    if (!publicGroup || !profile) return
    setSendingRequest(true)
    try {
      await groupJoinRequestService.create(publicGroup.id, profile.id)
      setPendingRequest('sent')
    } catch (err: any) {
      alert(err.message)
    }
    setSendingRequest(false)
  }

  if (loadingAccess) {
    return <div className="text-center py-8 text-gray-400">Carregando...</div>
  }

  if (!isMember) {
    if (!publicGroup) {
      return <div className="text-center py-8 text-gray-400">Grupo não encontrado.</div>
    }

    return (
      <div className="max-w-lg mx-auto">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-white/[0.06] shadow-[0_0_40px_rgba(0,0,0,0.4)]">
          <div className="absolute -top-16 -right-16 w-40 h-40 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent" />

          <div className="relative p-6">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/20 mb-4">
                <Users size={28} className="text-[#0a0e17]" />
              </div>
              <h1 className="text-white font-black text-2xl tracking-tight">{publicGroup.name}</h1>
              {publicGroup.description && (
                <p className="text-gray-400 text-sm mt-2">{publicGroup.description}</p>
              )}
              <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Users size={14} /> {memberCount} {memberCount === 1 ? 'membro' : 'membros'}</span>
                <span>Código: <span className="font-mono font-bold text-yellow-400/90">{publicGroup.access_code}</span></span>
              </div>
            </div>

            {(pendingRequest === 'pending' || pendingRequest === 'sent') ? (
              <div className="text-center py-4">
                <div className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm">
                  <Clock size={16} />
                  Solicitação enviada. Aguarde a aprovação do administrador.
                </div>
              </div>
            ) : (
              <button onClick={handleRequestJoin} disabled={sendingRequest}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-gradient-to-r from-yellow-500 to-amber-600 text-[#0a0e17] rounded-xl font-black text-sm hover:from-yellow-400 hover:to-amber-500 transition-all duration-200 shadow-lg shadow-yellow-500/25 disabled:opacity-50">
                <UserPlus size={18} /> {sendingRequest ? 'Enviando...' : 'Solicitar Entrada no Grupo'}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return <GroupSettingsContent />
}

function GroupSettingsContent() {
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
  const [joinRequests, setJoinRequests] = useState<GroupJoinRequest[]>([])
  const [matches, setMatches] = useState<(Match & { results: (MatchResult & { team: Team })[]; players: MatchPlayer[] })[]>([])
  const [loadingMatches, setLoadingMatches] = useState(true)
  const [removingMember, setRemovingMember] = useState<string | null>(null)
  const [demotingMember, setDemotingMember] = useState<string | null>(null)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [matchPage, setMatchPage] = useState(1)
  const [showQRCode, setShowQRCode] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [editNameValue, setEditNameValue] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const MATCHES_PER_PAGE = 10

  useEffect(() => {
    if (currentGroup) { loadMembers(); loadJoinRequests(); loadMatches() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGroup])

  async function loadMembers() {
    if (!currentGroup) return
    const m = await groupService.getMembers(currentGroup.id)
    setMembers(m)
  }

  async function loadJoinRequests() {
    if (!currentGroup) return
    const requests = await groupJoinRequestService.getPending(currentGroup.id)
    setJoinRequests(requests)
  }

  async function handleApproveRequest(requestId: string, profileId: string) {
    if (!currentGroup) return
    try {
      await groupJoinRequestService.approve(requestId, currentGroup.id, profileId)
      await loadJoinRequests()
      await loadMembers()
    } catch { alert('Erro ao aprovar solicitação') }
  }

  async function handleRejectRequest(requestId: string) {
    try {
      await groupJoinRequestService.reject(requestId)
      await loadJoinRequests()
    } catch { alert('Erro ao rejeitar solicitação') }
  }

  async function loadMatches() {
    if (!currentGroup) return
    setLoadingMatches(true)
    const data = await matchService.listWithResults(currentGroup.id)
    setMatches(data)
    setMatchPage(1)
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

  async function handleUpdateGroupName(newName: string) {
    if (!currentGroup || !newName.trim() || newName.trim() === currentGroup.name) {
      setEditingName(false)
      return
    }
    try {
      await groupService.update(currentGroup.id, { name: newName.trim() })
      setCurrentGroup({ ...currentGroup, name: newName.trim() })
      setEditingName(false)
    } catch { alert('Erro ao atualizar nome do grupo') }
  }

  async function handleDeleteGroup() {
    if (!currentGroup) return
    try {
      await groupService.softDelete(currentGroup.id)
      setCurrentGroup(null)
      navigate('/groups')
    } catch { alert('Erro ao excluir grupo') }
  }

  async function handleLeave() {
    if (!profile || !currentGroup) return
    try {
      await groupService.leave(currentGroup.id, profile.id)
      await refreshGroups()
      navigate('/groups')
    } catch { alert('Erro ao sair do grupo') }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !currentGroup) return
    setUploadingImage(true)
    try {
      const url = await uploadGroupImage(file, currentGroup.id)
      await groupService.update(currentGroup.id, { image_url: url })
      setCurrentGroup({ ...currentGroup, image_url: url })
    } catch (err: any) {
      alert(err?.message || 'Erro ao atualizar imagem do grupo')
    }
    setUploadingImage(false)
  }

  const upcomingAll = matches.filter(m => m.status === 'SCHEDULED' || m.status === 'CONFIRMED').sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
  const nextMatch = upcomingAll[0]
  const upcomingMatches = upcomingAll.slice(1)
  const inProgressMatches = matches.filter(m => m.status === 'IN_PROGRESS').sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
  const finishedMatches = matches.filter(m => m.status === 'FINISHED').sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())
  const totalMatchPages = Math.max(1, Math.ceil(finishedMatches.length / MATCHES_PER_PAGE))
  const paginatedMatches = finishedMatches.slice((matchPage - 1) * MATCHES_PER_PAGE, matchPage * MATCHES_PER_PAGE)

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
            <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/20 shrink-0 overflow-hidden">
              {currentGroup.image_url ? (
                <img src={currentGroup.image_url} alt={currentGroup.name} className="w-full h-full object-cover" />
              ) : (
                <Users size={24} className="text-[#0a0e17]" />
              )}
              {currentGroupRole === 'ADMIN' && (
                <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 cursor-pointer transition-opacity">
                  <Camera size={18} className="text-white" />
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage} />
                </label>
              )}
              {uploadingImage && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
              <div className="min-w-0 flex-1">
               {editingName ? (
                 <div className="flex items-center gap-2">
                   <input type="text" value={editNameValue}
                     onChange={e => setEditNameValue(e.target.value)}
                     onKeyDown={e => { if (e.key === 'Enter') handleUpdateGroupName(editNameValue); if (e.key === 'Escape') setEditingName(false) }}
                     className="flex-1 px-3 py-1.5 bg-white/[0.08] border border-white/20 rounded-lg text-white font-black text-2xl tracking-tight outline-none focus:ring-2 focus:ring-yellow-500" autoFocus />
                   <button onClick={() => handleUpdateGroupName(editNameValue)}
                     className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg transition-all" title="Salvar">
                     <Check size={18} />
                   </button>
                   <button onClick={() => setEditingName(false)}
                     className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all" title="Cancelar">
                     <X size={18} />
                   </button>
                 </div>
               ) : (
                 <div className="flex items-center gap-2">
                   <h1 className="text-white font-black text-2xl tracking-tight truncate">{currentGroup.name}</h1>
                   {currentGroupRole === 'ADMIN' && (
                     <button onClick={() => { setEditNameValue(currentGroup.name); setEditingName(true) }}
                       className="p-1.5 text-gray-500 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-all shrink-0" title="Editar nome">
                       <Edit3 size={16} />
                     </button>
                   )}
                 </div>
               )}
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
              <button onClick={() => setShowQRCode(true)}
                className="text-yellow-400/80 hover:text-yellow-400 transition-colors ml-1" title="Compartilhar QR Code">
                <QrCode size={16} />
              </button>
            </span>
            <span className="text-gray-500">
              Criado em {new Date(currentGroup.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Link to={`/groups/${currentGroup.id}/campeonatos`}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-white/[0.06] text-white rounded-xl font-black text-sm hover:bg-white/[0.10] transition-all duration-200 border border-white/[0.08]">
          <Trophy size={18} /> Campeonatos
        </Link>
        <Link to={`/groups/${currentGroup.id}/financas`}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-white/[0.06] text-white rounded-xl font-black text-sm hover:bg-white/[0.10] transition-all duration-200 border border-white/[0.08]">
          <DollarSign size={18} /> Finanças
        </Link>
        {currentGroupRole === 'ADMIN' && (
          <Link to="/matches/new"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-gradient-to-r from-yellow-500 to-amber-600 text-[#0a0e17] rounded-xl font-black text-sm hover:from-yellow-400 hover:to-amber-500 transition-all duration-200 shadow-lg shadow-yellow-500/25">
            <Plus size={18} /> Criar Partida
          </Link>
        )}
      </div>

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

      {/* In Progress Matches */}
      {inProgressMatches.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-yellow-500/20 shadow-[0_0_40px_rgba(0,0,0,0.4)]">
          <div className="absolute -top-16 -right-16 w-40 h-40 bg-gradient-to-br from-yellow-500/10 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-500/40 to-transparent" />
          <div className="relative px-6 pt-5 pb-5">
            <h2 className="font-black text-sm uppercase tracking-[0.15em] text-yellow-400/80 mb-4 flex items-center gap-2">
              <Calendar size={16} /> Em Andamento
              <span className="text-[10px] text-gray-600 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06] ml-auto">
                {inProgressMatches.length}
              </span>
            </h2>
            <div className="space-y-2">
              {inProgressMatches.map(m => <MatchRowSmall key={m.id} match={m} />)}
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Matches */}
      {upcomingMatches.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-blue-500/20 shadow-[0_0_40px_rgba(0,0,0,0.4)]">
          <div className="absolute -top-16 -right-16 w-40 h-40 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
          <div className="relative px-6 pt-5 pb-5">
            <h2 className="font-black text-sm uppercase tracking-[0.15em] text-blue-400/80 mb-4 flex items-center gap-2">
              <Calendar size={16} /> Próximas Partidas
              <span className="text-[10px] text-gray-600 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06] ml-auto">
                {upcomingMatches.length}
              </span>
            </h2>
            <div className="space-y-2">
              {upcomingMatches.map(m => <MatchRowSmall key={m.id} match={m} />)}
            </div>
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
              {paginatedMatches.map(m => {
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
                      <div className="flex items-center gap-1.5 font-black text-sm">
                        <span className="text-yellow-400">{scores[0] ?? 0}</span>
                        <span className="text-gray-600 text-xs">×</span>
                        <span className="text-yellow-400">{scores[1] ?? 0}</span>
                      </div>
                      <ChevronRight size={16} className="text-gray-600 group-hover:text-yellow-400 transition-colors" />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {finishedMatches.length > MATCHES_PER_PAGE && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => setMatchPage(p => Math.max(1, p - 1))}
                disabled={matchPage === 1}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.12] transition disabled:opacity-30 disabled:cursor-not-allowed border border-white/[0.06]"
              >
                Anterior
              </button>
              {Array.from({ length: totalMatchPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setMatchPage(p)}
                  className={`w-8 h-8 text-xs font-bold rounded-lg transition border ${
                    p === matchPage
                      ? 'bg-yellow-500 text-[#0a0e17] border-yellow-500'
                      : 'bg-white/[0.06] text-gray-400 hover:text-white border-white/[0.06]'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setMatchPage(p => Math.min(totalMatchPages, p + 1))}
                disabled={matchPage === totalMatchPages}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.12] transition disabled:opacity-30 disabled:cursor-not-allowed border border-white/[0.06]"
              >
                Próximo
              </button>
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

      {/* Pending Approvals - Admin only */}
      {currentGroupRole === 'ADMIN' && joinRequests.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-yellow-500/30 shadow-[0_0_40px_rgba(0,0,0,0.4)]">
          <div className="absolute -top-16 -right-16 w-40 h-40 bg-gradient-to-br from-yellow-500/15 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />

          <div className="relative px-6 pt-5 pb-5">
            <h2 className="font-black text-sm uppercase tracking-[0.15em] text-yellow-400/80 mb-4 flex items-center gap-2">
              <UserPlus size={16} /> Solicitações de Entrada
              <span className="text-[10px] text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20 ml-auto">
                {joinRequests.length}
              </span>
            </h2>
            <div className="space-y-2">
              {joinRequests.map(req => (
                <div key={req.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all duration-200">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 ring-2 ring-white/[0.08]">
                      {req.profile?.avatar_url ? (
                        <img src={req.profile.avatar_url} alt={req.profile.name}
                          className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-[#0a0e17] font-black text-sm">
                          {req.profile?.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{req.profile?.name}</p>
                      <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                        <Clock size={10} />
                        {new Date(req.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => handleApproveRequest(req.id, req.profile_id)}
                      className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg transition-all" title="Aprovar">
                      <Check size={18} />
                    </button>
                    <button onClick={() => handleRejectRequest(req.id)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all" title="Rejeitar">
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Leave Group Button */}
      <button onClick={() => setShowLeaveModal(true)}
        className="w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-[0.1em] text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all duration-200">
        Sair do Grupo
      </button>

      {currentGroupRole === 'ADMIN' && (
        <button onClick={() => setShowDeleteModal(true)}
          className="w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-[0.1em] text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all duration-200">
          Excluir Grupo
        </button>
      )}

      {/* Delete Group Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setShowDeleteModal(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm z-10"
            onClick={e => e.stopPropagation()}>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-red-500/30 shadow-[0_0_60px_rgba(0,0,0,0.6)]">
              <div className="absolute -top-20 -right-20 w-48 h-48 bg-gradient-to-br from-red-500/15 to-transparent rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-gradient-to-br from-red-500/5 to-transparent rounded-full blur-3xl" />
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />

              <div className="relative px-6 pt-8 pb-6 text-center">
                <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/30">
                  <Trash2 size={28} className="text-[#0a0e17]" />
                </div>

                <h2 className="text-white font-black text-xl mb-2 tracking-tight">
                  Excluir Grupo
                </h2>

                <p className="text-red-400/80 font-bold text-sm mb-4 uppercase tracking-wider">
                  {currentGroup?.name}
                </p>

                <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 mb-6">
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Tem certeza que deseja excluir este grupo? Esta ação não pode ser desfeita.
                    Todos os dados permanecem no banco, mas o grupo não será mais exibido para ninguém.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setShowDeleteModal(false)}
                    className="flex-1 py-3 rounded-xl bg-white/[0.06] text-white font-bold text-sm hover:bg-white/[0.10] transition-all duration-200 border border-white/[0.08]">
                    Cancelar
                  </button>
                  <button onClick={handleDeleteGroup}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-black text-sm hover:from-red-400 hover:to-rose-500 transition-all duration-200 shadow-lg shadow-red-500/25">
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showQRCode && currentGroup && (
        <QRCodeModal
          groupName={currentGroup.name}
          accessCode={currentGroup.access_code}
          onClose={() => setShowQRCode(false)}
        />
      )}

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

      {/* FIFA-Styled Leave Confirmation Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setShowLeaveModal(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm z-10"
            onClick={e => e.stopPropagation()}>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-red-500/30 shadow-[0_0_60px_rgba(0,0,0,0.6)]">
              <div className="absolute -top-20 -right-20 w-48 h-48 bg-gradient-to-br from-red-500/15 to-transparent rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-gradient-to-br from-red-500/5 to-transparent rounded-full blur-3xl" />
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />

              <div className="relative px-6 pt-8 pb-6 text-center">
                <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/30">
                  <LogIn size={28} className="text-[#0a0e17] rotate-180" />
                </div>

                <h2 className="text-white font-black text-xl mb-2 tracking-tight">
                  Sair do Grupo
                </h2>

                <p className="text-red-400/80 font-bold text-sm mb-4 uppercase tracking-wider">
                  {currentGroup?.name}
                </p>

                <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 mb-6">
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Tem certeza que deseja sair deste grupo? Você precisará solicitar entrada novamente para retornar.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setShowLeaveModal(false)}
                    className="flex-1 py-3 rounded-xl bg-white/[0.06] text-white font-bold text-sm hover:bg-white/[0.10] transition-all duration-200 border border-white/[0.08]">
                    Cancelar
                  </button>
                  <button onClick={handleLeave}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-black text-sm hover:from-red-400 hover:to-rose-500 transition-all duration-200 shadow-lg shadow-red-500/25">
                    Sair
                  </button>
                    </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MatchRowSmall({ match }: { match: Match & { results: (MatchResult & { team: Team })[]; players: MatchPlayer[] } }) {
  return (
    <Link to={`/matches/${match.id}`}
      className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-all duration-200 border border-white/[0.06] group">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-white">
          {new Date(match.match_date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
        </p>
        {match.location && <p className="text-xs text-gray-500 mt-0.5">{match.location}</p>}
      </div>
      <ChevronRight size={16} className="text-gray-600 group-hover:text-yellow-400 transition-colors" />
    </Link>
  )
}
