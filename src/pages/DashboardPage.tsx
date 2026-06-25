import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useGroup } from '../contexts/GroupContext'
import { useGroupMembers } from '../hooks/useGroups'
import type { Group } from '../types'
import { Users, Plus, LogIn, Swords, ChevronRight, Calendar, Trophy, Star } from 'lucide-react'

const CARD_GRADIENTS = [
  'from-emerald-500 to-green-700',
  'from-blue-500 to-indigo-700',
  'from-purple-500 to-violet-700',
  'from-rose-500 to-pink-700',
  'from-amber-500 to-orange-700',
  'from-cyan-500 to-teal-700',
]

function GroupCard({ group, index }: { group: Group; index: number }) {
  const { setCurrentGroup } = useGroup()
  const { data: members = [] } = useGroupMembers(group.id)
  const navigate = useNavigate()
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length]

  return (
    <button onClick={() => { setCurrentGroup(group); navigate(`/groups/${group.id}`) }}
      className="group relative bg-gradient-to-br from-[#151d2b] to-[#0d1420] rounded-2xl p-[1px] hover:scale-[1.02] transition-all duration-300 w-full text-left">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative rounded-2xl bg-gradient-to-br from-[#151d2b] to-[#0d1420] p-5 h-full overflow-hidden">
        {/* card header accent */}
        <div className={`absolute -top-6 -right-6 w-20 h-20 bg-gradient-to-br ${gradient} rounded-full opacity-20 blur-xl`} />
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-500/40 to-transparent" />

        <div className="flex items-start justify-between mb-3 relative">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
            <Users className="text-white" size={18} />
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-yellow-500/10 border border-yellow-500/20">
              <Users size={10} className="text-yellow-400" />
              <span className="text-[10px] font-bold text-yellow-400">{members.length}</span>
            </div>
            <ChevronRight size={16} className="text-gray-600 group-hover:text-yellow-400 transition-colors" />
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
            {members.length === 1 ? '1 membro' : `${members.length} membros`}
          </span>
        </div>
      </div>
    </button>
  )
}

export function DashboardPage() {
  const { profile } = useAuth()
  const { groups } = useGroup()

  const initials = profile?.name
    ?.split(' ')
    .map(n => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : ''

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Player Card - FIFA style */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-white/[0.06] shadow-[0_0_40px_rgba(0,0,0,0.4)]">
        {/* card visual effects */}
        <div className="absolute -top-16 -right-16 w-40 h-40 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent" />

        {/* top badge */}
        <div className="relative px-6 pt-5 pb-3">
          <div className="flex items-center gap-1.5">
            <Trophy size={12} className="text-yellow-500" />
            <span className="text-[10px] font-bold text-yellow-500/80 uppercase tracking-[0.2em]">Jogador</span>
          </div>
        </div>

        <div className="relative px-6 pb-6 flex items-center gap-5">
          {/* avatar como escudo do clube */}
          <div className="relative shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.name}
                className="w-20 h-20 rounded-2xl object-cover shadow-lg shadow-yellow-500/20 ring-2 ring-yellow-400/30" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-yellow-500/20 ring-2 ring-yellow-400/30">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent" />
                <span className="relative">{initials}</span>
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#0a0e17] border-2 border-yellow-500/30 flex items-center justify-center">
              <Star size={10} className="text-yellow-400 fill-yellow-400" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-white font-black text-xl tracking-tight truncate">{profile?.name}</h1>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Swords size={12} className="text-yellow-500/60" />
                Membro desde {memberSince}
              </span>
            </div>
          </div>

          {/* stat rating */}
          <div className="hidden sm:flex flex-col items-center gap-1 shrink-0">
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-white/[0.08] flex items-center justify-center">
                <span className="text-white font-black text-xl">{groups.length}</span>
              </div>
            </div>
            <span className="text-[9px] text-gray-600 uppercase tracking-[0.15em] font-bold">
              {groups.length === 1 ? 'GRUPO' : 'GRUPOS'}
            </span>
          </div>
        </div>
      </div>

      {/* Groups section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/20">
            <Users size={15} className="text-white" />
          </div>
          <h2 className="text-white font-black text-lg tracking-tight">Meus Grupos</h2>
        </div>
        <span className="text-[10px] text-gray-600 uppercase tracking-wider font-bold bg-white/[0.04] px-3 py-1 rounded-full border border-white/[0.06]">
          {groups.length} Ativos
        </span>
      </div>

      {groups.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-white/[0.06] p-12 text-center shadow-[0_0_40px_rgba(0,0,0,0.4)]">
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-gradient-to-br from-yellow-500/5 to-transparent rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent" />

          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-white/[0.08] flex items-center justify-center mx-auto mb-5">
              <Swords size={36} className="text-yellow-500/50" />
            </div>
            <h2 className="text-white font-black text-xl mb-2">Bem-vindo ao PeladaFC</h2>
            <p className="text-gray-500 text-sm mb-8 max-w-sm mx-auto">
              Crie um grupo ou entre em um existente para começar a organizar suas peladas.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/groups/new"
                className="bg-gradient-to-r from-yellow-500 to-amber-600 text-[#0a0e17] px-7 py-3.5 rounded-xl font-black text-sm hover:from-yellow-400 hover:to-amber-500 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/25">
                <Plus size={18} /> Criar Grupo
              </Link>
              <Link to="/groups/join"
                className="bg-white/[0.06] text-white/80 px-7 py-3.5 rounded-xl font-bold text-sm hover:bg-white/[0.10] transition-all duration-200 flex items-center justify-center gap-2 border border-white/[0.08] backdrop-blur-sm">
                <LogIn size={18} /> Entrar em Grupo
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {groups.map((group, i) => (
              <GroupCard key={group.id} group={group} index={i} />
            ))}
          </div>

          {/* Quick actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/groups/new"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-gradient-to-r from-yellow-500 to-amber-600 text-[#0a0e17] rounded-xl font-black text-sm hover:from-yellow-400 hover:to-amber-500 transition-all duration-200 shadow-lg shadow-yellow-500/20">
              <Plus size={18} /> Criar Grupo
            </Link>
            <Link to="/groups/join"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-white/[0.06] text-white/80 rounded-xl font-bold text-sm hover:bg-white/[0.10] transition-all duration-200 border border-white/[0.08] backdrop-blur-sm">
              <LogIn size={18} /> Entrar em Grupo
            </Link>
            <Link to="/matches"
              className="flex items-center justify-center gap-2 px-4 py-3.5 bg-white/[0.03] text-gray-500 rounded-xl font-bold text-sm hover:bg-white/[0.06] hover:text-gray-300 transition-all duration-200 border border-white/[0.06]">
              <Calendar size={18} /> Partidas
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
