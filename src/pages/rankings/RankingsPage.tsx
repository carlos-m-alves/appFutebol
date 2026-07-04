import { useState, useEffect } from 'react'
import { useGroup } from '../../contexts/GroupContext'
import { rankingService, type PlayerRankingStats } from '../../services/api'
import { groupService } from '../../services/api'
import type { GroupMember } from '../../types'
import { Search, Goal, UserPlus, Shield, Swords, Trophy, Medal, ThumbsDown, Filter, Circle, ChevronRight } from 'lucide-react'

const SORT_OPTIONS = [
  { key: 'goals', label: 'Gols', icon: <Goal size={14} /> },
  { key: 'assists', label: 'Assists', icon: <UserPlus size={14} /> },
  { key: 'own_goals', label: 'G.C.', icon: <ThumbsDown size={14} /> },
  { key: 'nutmeg_given', label: 'Can.Lev', icon: <Shield size={14} /> },
  { key: 'nutmeg_done', label: 'Can.Dadas', icon: <Swords size={14} /> },
  { key: 'wins', label: 'V', icon: <Trophy size={14} /> },
  { key: 'losses', label: 'D', icon: <ThumbsDown size={14} /> },
]

function LastGames({ results }: { results: PlayerRankingStats['last3'] }) {
  const colors = { win: 'text-green-400', draw: 'text-gray-500', loss: 'text-red-400' }
  return (
    <div className="flex items-center gap-0.5">
      {results.map((r, i) => (
        <Circle key={i} size={7} fill="currentColor" className={colors[r]} />
      ))}
    </div>
  )
}

function PlayerRow({ player, rank }: { player: PlayerRankingStats; rank: number }) {
  const initials = player.player_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const rankDisplay = rank === 1 ? <Trophy size={14} className="text-yellow-400" />
    : rank === 2 ? <Medal size={14} className="text-gray-300" />
    : rank === 3 ? <Medal size={14} className="text-amber-600" />
    : <span className="text-gray-500 text-xs font-bold">#{rank}</span>

  const rankBg = rank === 1 ? 'ring-yellow-400/40 bg-yellow-400/10'
    : rank === 2 ? 'ring-gray-300/30 bg-gray-300/10'
    : rank === 3 ? 'ring-amber-600/30 bg-amber-600/10'
    : 'ring-white/10 bg-white/5'

  const avatarBg = rank === 1 ? 'bg-yellow-400/20 text-yellow-400 ring-yellow-400/30'
    : rank === 2 ? 'bg-gray-300/20 text-gray-300 ring-gray-300/30'
    : rank === 3 ? 'bg-amber-600/20 text-amber-600 ring-amber-600/30'
    : 'bg-white/10 text-gray-300 ring-white/20'

  return (
    <div className="flex items-center gap-2 py-2.5 px-3 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all duration-200">
      {/* Rank + Avatar + Name + Last3 */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ring-2 ${rankBg}`}>
          {rankDisplay}
        </div>
        <div className="flex items-center gap-2 min-w-0 w-[120px] shrink-0">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] ring-2 shrink-0 ${avatarBg}`}>
            {player.player_avatar ? (
              <img src={player.player_avatar} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <span className="text-white text-xs font-semibold truncate">{player.player_name}</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          <LastGames results={player.last3} />
        </div>
      </div>

      {/* All stats */}
      <div className="flex items-center gap-3 shrink-0 ml-auto">
        <div className="flex flex-col items-center w-7">
          <span className="text-white text-xs font-black tabular-nums">{player.goals}</span>
          <span className="text-[8px] text-gray-600 uppercase leading-tight">Gols</span>
        </div>
        <div className="flex flex-col items-center w-7">
          <span className="text-white text-xs font-black tabular-nums">{player.assists}</span>
          <span className="text-[8px] text-gray-600 uppercase leading-tight">Ass</span>
        </div>
        <div className="hidden xs:flex flex-col items-center w-7">
          <span className="text-red-400 text-xs font-black tabular-nums">{player.own_goals}</span>
          <span className="text-[8px] text-gray-600 uppercase leading-tight">GC</span>
        </div>
        <div className="hidden md:flex flex-col items-center w-7">
          <span className="text-orange-400 text-xs font-black tabular-nums">{player.nutmeg_given}</span>
          <span className="text-[8px] text-gray-600 uppercase leading-tight">CL</span>
        </div>
        <div className="hidden md:flex flex-col items-center w-7">
          <span className="text-emerald-400 text-xs font-black tabular-nums">{player.nutmeg_done}</span>
          <span className="text-[8px] text-gray-600 uppercase leading-tight">CD</span>
        </div>
        <div className="flex items-center gap-1.5 pl-2 border-l border-white/10">
          <div className="flex flex-col items-center w-5">
            <span className="text-green-400 text-xs font-black">{player.wins}</span>
            <span className="text-[8px] text-gray-600 uppercase leading-tight">V</span>
          </div>
          <div className="flex flex-col items-center w-5">
            <span className="text-gray-400 text-xs font-black">{player.draws}</span>
            <span className="text-[8px] text-gray-600 uppercase leading-tight">E</span>
          </div>
          <div className="flex flex-col items-center w-5">
            <span className="text-red-400 text-xs font-black">{player.losses}</span>
            <span className="text-[8px] text-gray-600 uppercase leading-tight">D</span>
          </div>
        </div>
      </div>

      <ChevronRight size={14} className="text-gray-600 shrink-0" />
    </div>
  )
}

export function RankingsPage() {
  const { currentGroup } = useGroup()
  const [stats, setStats] = useState<PlayerRankingStats[]>([])
  const [members, setMembers] = useState<GroupMember[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('goals')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedPlayer, setSelectedPlayer] = useState('')

  const currentYear = new Date().getFullYear()
  const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => currentYear - i)

  useEffect(() => {
    if (!currentGroup) return
    setLoading(true)
    groupService.getMembers(currentGroup.id).then(setMembers)
    rankingService.getStats(currentGroup.id, {
      year: selectedYear,
      playerId: selectedPlayer || undefined,
    }).then(data => {
      setStats(data)
      setLoading(false)
    }).catch(() => {
      setStats([])
      setLoading(false)
    })
  }, [currentGroup, selectedYear, selectedPlayer])

  const sorted = [...stats].sort((a, b) => {
    switch (sortBy) {
      case 'goals': return b.goals - a.goals
      case 'assists': return b.assists - a.assists
      case 'own_goals': return b.own_goals - a.own_goals
      case 'nutmeg_given': return b.nutmeg_given - a.nutmeg_given
      case 'nutmeg_done': return b.nutmeg_done - a.nutmeg_done
      case 'wins': return b.wins - a.wins
      case 'losses': return b.losses - a.losses
      default: return b.goals - a.goals
    }
  })

  if (!currentGroup) return <div className="text-center py-8 text-gray-400">Selecione um grupo primeiro.</div>

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Swords size={20} className="text-yellow-500" /> Rankings
        </h1>
      </div>

      {/* Filters */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-3 mb-4 shadow-lg">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10 flex-wrap">
          <Filter size={13} className="text-gray-500 shrink-0" />
          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
            className="bg-white/10 text-gray-300 border border-white/10 rounded-lg px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-yellow-500/50">
            {YEAR_OPTIONS.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <div className="relative flex-1 min-w-[140px] max-w-[200px]">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <select value={selectedPlayer} onChange={e => setSelectedPlayer(e.target.value)}
              className="w-full bg-white/10 text-gray-300 border border-white/10 rounded-lg pl-8 pr-2 py-1 text-xs outline-none focus:ring-2 focus:ring-yellow-500/50 appearance-none truncate">
              <option value="">Todos os jogadores</option>
              {members.map(m => (
                <option key={m.profile_id} value={m.profile_id}>{m.profile?.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {SORT_OPTIONS.map(item => (
            <button key={item.key} onClick={() => setSortBy(item.key)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all duration-200 ${
                sortBy === item.key
                  ? 'bg-yellow-500 text-slate-900 shadow-lg shadow-yellow-500/25'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}>
              {item.icon} {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Column headers */}
      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 mb-1">
        <div className="w-7" />
        <div className="w-[120px] shrink-0" />
        <div className="w-14 shrink-0">
          <span className="text-[9px] text-gray-600 uppercase tracking-wider">Últ. 3</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[9px] text-gray-600 uppercase tracking-wider w-7 text-center">Gols</span>
          <span className="text-[9px] text-gray-600 uppercase tracking-wider w-7 text-center">Ass</span>
          <span className="hidden xs:inline text-[9px] text-gray-600 uppercase tracking-wider w-7 text-center">GC</span>
          <span className="hidden md:inline text-[9px] text-gray-600 uppercase tracking-wider w-7 text-center">CL</span>
          <span className="hidden md:inline text-[9px] text-gray-600 uppercase tracking-wider w-7 text-center">CD</span>
          <span className="text-[9px] text-gray-600 uppercase tracking-wider pl-2 border-l border-white/10 flex items-center gap-1.5">
            <span className="w-5 text-center">V</span>
            <span className="w-5 text-center">E</span>
            <span className="w-5 text-center">D</span>
          </span>
        </div>
        <div className="w-4" />
      </div>

      {/* Player List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500 text-sm">Carregando...</div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-12 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-white/10">
          <Swords className="mx-auto w-10 h-10 text-gray-600 mb-3" />
          <p className="text-gray-400 text-sm">Nenhuma estatística disponível para esta temporada.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {sorted.map((player, i) => (
            <PlayerRow key={player.player_id} player={player} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
