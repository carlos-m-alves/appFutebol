import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useGroup } from '../contexts/GroupContext'
import { matchService, getProfile, groupService } from '../services/api'
import type { Match, MatchAward, Profile, Group } from '../types'
import { Users, Trophy, Calendar, ArrowRight, Star, Swords } from 'lucide-react'
import { DisplayRating } from '../components/ui/StarRating'

function GroupCard({ group, onSelect }: { group: Group; onSelect: () => void }) {
  const [memberCount, setMemberCount] = useState(0)

  useEffect(() => {
    groupService.getMembers(group.id).then(m => setMemberCount(m.length))
  }, [group.id])

  return (
    <button onClick={onSelect} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-left hover:shadow-md transition w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
          <Users className="text-green-600" size={24} />
        </div>
        <ArrowRight size={20} className="text-gray-300" />
      </div>
      <h3 className="font-bold text-lg mb-1">{group.name}</h3>
      {group.description && <p className="text-sm text-gray-500 mb-3">{group.description}</p>}
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1"><Users size={14} /> {memberCount} membros</span>
        <span>Código: <span className="font-mono font-bold">{group.access_code}</span></span>
      </div>
    </button>
  )
}

export function DashboardPage() {
  const { currentGroup, setCurrentGroup, groups } = useGroup()
  const navigate = useNavigate()
  const [stats, setStats] = useState<{ members: number; matches: number }>({ members: 0, matches: 0 })
  const [recentMatches, setRecentMatches] = useState<(Match & { awards?: MatchAward | null })[]>([])
  const [topPlayers, setTopPlayers] = useState<{ profile: Profile; avgRating: number }[]>([])

  useEffect(() => {
    if (!currentGroup?.id) return
    loadDashboard()
  }, [currentGroup?.id])

  async function loadDashboard() {
    if (!currentGroup) return

    const [members, matches] = await Promise.all([
      matchService.getMembers(currentGroup.id),
      matchService.list(currentGroup.id)
    ])

    setStats({ members: members.length, matches: matches.length })

    const finished = matches.filter(m => m.status === 'FINISHED').slice(0, 5)
    const withAwards = await Promise.all(
      finished.map(async (m) => {
        const awards = await matchService.getAwards(m.id)
        return { ...m, awards }
      })
    )
    setRecentMatches(withAwards)

    const playerRatings: Map<string, { total: number; count: number }> = new Map()
    for (const m of finished) {
      const ratings = await matchService.getRatings(m.id)
      for (const r of ratings) {
        if (!playerRatings.has(r.rated_profile_id)) {
          playerRatings.set(r.rated_profile_id, { total: 0, count: 0 })
        }
        const s = playerRatings.get(r.rated_profile_id)!
        s.total += r.rating
        s.count++
      }
    }

    const top: { profile: Profile; avgRating: number }[] = []
    for (const [id, s] of playerRatings) {
      if (s.count >= 2) {
        const prof = await getProfile(id)
        if (prof) top.push({ profile: prof, avgRating: Math.round((s.total / s.count) * 2) / 2 })
      }
    }
    setTopPlayers(top.sort((a, b) => b.avgRating - a.avgRating).slice(0, 5))
  }

  if (!currentGroup) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Meus Grupos</h1>
          <div className="flex gap-3">
            <Link to="/groups/join" className="bg-white text-green-600 border-2 border-green-600 px-4 py-2 rounded-lg hover:bg-green-50 transition flex items-center gap-2">
              <Users size={18} /> Entrar
            </Link>
            <Link to="/groups/new" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2">
              <Calendar size={18} /> Criar
            </Link>
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <Swords className="mx-auto w-16 h-16 text-green-500 mb-4" />
            <h1 className="text-2xl font-bold mb-4">Bem-vindo ao PeladaFC!</h1>
            <p className="text-gray-600 mb-8">Crie ou entre em um grupo para começar.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/groups/new" className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition">
                Criar Grupo
              </Link>
              <Link to="/groups/join" className="bg-white text-green-600 border-2 border-green-600 px-6 py-3 rounded-lg hover:bg-green-50 transition">
                Entrar em Grupo
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map(group => (
              <GroupCard key={group.id} group={group}
                onSelect={() => { setCurrentGroup(group); navigate(`/dashboard?group=${group.id}`) }} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">{currentGroup.name}</h1>
          <p className="text-gray-500 text-sm">Código: <span className="font-mono font-bold">{currentGroup.access_code}</span></p>
        </div>
        <Link to="/matches/new" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2">
          <Calendar size={18} /> Nova Partida
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-3">
            <Users className="text-green-500" size={28} />
            <div>
              <p className="text-sm text-gray-500">Membros</p>
              <p className="text-2xl font-bold">{stats.members}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-3">
            <Trophy className="text-yellow-500" size={28} />
            <div>
              <p className="text-sm text-gray-500">Partidas</p>
              <p className="text-2xl font-bold">{stats.matches}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-3">
            <Star className="text-purple-500" size={28} />
            <div>
              <p className="text-sm text-gray-500">Top Avaliado</p>
              <p className="text-lg font-bold truncate">{topPlayers[0]?.profile.name ?? '-'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="font-bold text-lg mb-4">Últimas Partidas</h2>
          {recentMatches.length === 0 ? (
            <p className="text-gray-400 text-sm">Nenhuma partida finalizada ainda.</p>
          ) : (
            <div className="space-y-3">
              {recentMatches.map(m => (
                <Link key={m.id} to={`/matches/${m.id}`}
                  className="block p-3 rounded-lg hover:bg-gray-50 transition border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{new Date(m.match_date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      <p className="text-xs text-gray-500">{m.location || 'Local não definido'}</p>
                    </div>
                    <ArrowRight size={18} className="text-gray-400" />
                  </div>
                  {m.awards?.best_player && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-yellow-600">
                      <Star size={14} /> Craque: {m.awards.best_player.name}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
          {stats.matches > 5 && (
            <Link to="/matches" className="block mt-4 text-sm text-green-600 hover:text-green-700 text-center">
              Ver todas as partidas
            </Link>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="font-bold text-lg mb-4">Top 5 Jogadores</h2>
          {topPlayers.length === 0 ? (
            <p className="text-gray-400 text-sm">Nenhuma avaliação ainda.</p>
          ) : (
            <div className="space-y-3">
              {topPlayers.map((p, i) => (
                <div key={p.profile.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-400 w-6">#{i + 1}</span>
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-sm">
                      {p.profile.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium">{p.profile.name}</span>
                  </div>
                  <DisplayRating value={p.avgRating} size="sm" />
                </div>
              ))}
            </div>
          )}
          <Link to="/rankings" className="block mt-4 text-sm text-green-600 hover:text-green-700 text-center">
            Ver ranking completo
          </Link>
        </div>
      </div>
    </div>
  )
}


