import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Trophy, Plus, ArrowLeft, ChevronRight, Calendar, Users, Swords, Check, X, Shuffle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useGroup } from '../../contexts/GroupContext'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../hooks/queryKeys'
import { useChampionships, useChampionship, useChampionshipRounds, useChampionshipStandings, useCreateChampionship, useStartChampionship, useFinishChampionship, useGenerateRounds, useStartRoundMatch } from '../../hooks/useChampionships'
import { balanceTeams } from '../../services/teamBalancer'
import { FifaErrorScreen } from '../../components/ui/FifaErrorScreen'
import { supabase } from '../../lib/supabase'
import type { ChampionshipStatus } from '../../types'

const STATUS_CONFIG: Record<ChampionshipStatus, { label: string; color: string }> = {
  DRAFT: { label: 'Rascunho', color: 'text-gray-400 bg-gray-500/20 border-gray-500/30' },
  ACTIVE: { label: 'Em Andamento', color: 'text-green-400 bg-green-500/20 border-green-500/30' },
  FINISHED: { label: 'Finalizado', color: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30' },
}

export function ChampionshipListPage() {
  const { id: groupId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentGroup } = useGroup()
  const { data: championships = [], isLoading } = useChampionships(groupId)

  if (!groupId) return <div className="text-center py-8 text-gray-400">Grupo não encontrado.</div>

  const group = currentGroup

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:text-white hover:bg-white/[0.08] rounded-xl transition-all">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-black text-white tracking-tight">Campeonatos</h1>
        </div>
        {group && (
          <Link to={`/groups/${groupId}/campeonatos/new`}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-600 text-[#0a0e17] rounded-xl font-black text-sm hover:from-yellow-400 hover:to-amber-500 transition-all duration-200 shadow-lg shadow-yellow-500/25">
            <Plus size={16} /> Novo
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Carregando...</div>
      ) : championships.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-white/[0.06] shadow-[0_0_40px_rgba(0,0,0,0.4)]">
          <div className="relative px-6 py-12 text-center">
            <Trophy size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400 mb-4">Nenhum campeonato criado ainda.</p>
            {group && (
              <Link to={`/groups/${groupId}/campeonatos/new`}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-600 text-[#0a0e17] rounded-xl font-black text-sm">
                <Plus size={16} /> Criar Campeonato
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {championships.map(c => {
            const status = STATUS_CONFIG[c.status]
            return (
              <Link key={c.id} to={`/campeonatos/${c.id}`}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-white/[0.06] shadow-[0_0_40px_rgba(0,0,0,0.4)] block hover:border-yellow-500/30 transition-all duration-200 group">
                <div className="relative px-6 py-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-white text-base">{c.name}</h3>
                    <ChevronRight size={18} className="text-gray-600 group-hover:text-yellow-400 transition-colors" />
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className={`px-2 py-0.5 rounded-full border font-bold ${status.color}`}>
                      {status.label}
                    </span>
                    <span className="text-gray-500">{c.team_count} times</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function ChampionshipCreatePage() {
  const { id: groupId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentGroup } = useGroup()
  const { profile } = useAuth()
  const createChampionship = useCreateChampionship()

  const [name, setName] = useState('')
  const [teamCount, setTeamCount] = useState(2)
  const [divisionMode, setDivisionMode] = useState<'auto' | 'manual'>('manual')
  const [teams, setTeams] = useState<{ name: string; players: { profile_id?: string; guest_name?: string; position?: string }[] }[]>([])
  const [availablePlayers, setAvailablePlayers] = useState<{ id: string; name: string }[]>([])
  const [loadingPlayers, setLoadingPlayers] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!groupId) return
    setLoadingPlayers(true)
    supabase
      .from('group_members')
      .select('profile:profiles(id, name)')
      .eq('group_id', groupId)
      .then(({ data }: any) => {
        setAvailablePlayers((data || []).map((m: any) => m.profile).filter(Boolean))
        setLoadingPlayers(false)
      })
  }, [groupId])

  function handleDivisionModeChange(mode: 'auto' | 'manual') {
    setDivisionMode(mode)
    if (mode === 'auto') {
      setTeamCount(prev => prev >= 2 ? prev : 2)
    }
  }

  function resetTeams() {
    setTeams(Array.from({ length: teamCount }, (_, i) => ({
      name: `Time ${i + 1}`,
      players: [] as { profile_id?: string; guest_name?: string; position?: string }[],
    })))
  }

  useEffect(() => {
    resetTeams()
  }, [teamCount, divisionMode])

  async function handleAutoDivide() {
    const selectedIds = teams.flatMap(t => t.players.map(p => p.profile_id).filter(Boolean) as string[])
    const selectedPlayers = availablePlayers.filter(p => selectedIds.includes(p.id))

    if (selectedPlayers.length < 2) {
      setError('Selecione pelo menos 2 jogadores para divisão automática.')
      return
    }

    try {
      const balanced = await balanceTeams(
        groupId!,
        selectedPlayers.map(p => ({ profile_id: p.id, name: p.name, position: null })),
        teamCount
      )
      const newTeams = balanced.map((t, i) => ({
        name: `Time ${i + 1}`,
        players: t.playerIds.map(pid => ({ profile_id: pid })),
      }))
      setTeams(newTeams)
    } catch (err) {
      setError('Erro ao dividir times.')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!groupId || !currentGroup || !profile) return

    if (!name.trim()) {
      setError('Nome do campeonato é obrigatório.')
      return
    }

    const nonEmptyTeams = teams.filter(t => t.players.length > 0)
    if (nonEmptyTeams.length < 2) {
      setError('Pelo menos 2 times precisam ter jogadores.')
      return
    }

    setError(null)
    try {
      const result = await createChampionship.mutateAsync({
        group_id: groupId,
        name: name.trim(),
        team_count: nonEmptyTeams.length,
        teams: nonEmptyTeams,
      })
      if (result) {
        navigate(`/campeonatos/${result.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar campeonato')
    }
  }

  function addPlayerToTeam(teamIdx: number, playerId: string) {
    setTeams(prev => {
      const next = [...prev]
      next[teamIdx] = {
        ...next[teamIdx],
        players: [...next[teamIdx].players, { profile_id: playerId }],
      }
      return next
    })
  }

  function removePlayerFromTeam(teamIdx: number, playerIdx: number) {
    setTeams(prev => {
      const next = [...prev]
      next[teamIdx] = {
        ...next[teamIdx],
        players: next[teamIdx].players.filter((_, i) => i !== playerIdx),
      }
      return next
    })
  }

  const allSelectedIds = teams.flatMap(t => t.players.map(p => p.profile_id).filter(Boolean))

  if (!groupId || !currentGroup) return <div className="text-center py-8 text-gray-400">Selecione um grupo primeiro.</div>

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:text-white hover:bg-white/[0.08] rounded-xl transition-all">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black text-white tracking-tight">Novo Campeonato</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-white/[0.06] shadow-[0_0_40px_rgba(0,0,0,0.4)]">
          <div className="relative px-6 py-5 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Nome do Campeonato</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/[0.08] border border-white/20 rounded-lg text-white font-medium text-sm outline-none focus:ring-2 focus:ring-yellow-500 placeholder:text-gray-600"
                placeholder="Ex: Copa do Grupo" maxLength={100} />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Divisão dos Times</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => handleDivisionModeChange('manual')}
                  className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-sm transition-all border ${
                    divisionMode === 'manual'
                      ? 'bg-yellow-500 text-[#0a0e17] border-yellow-500'
                      : 'bg-white/[0.06] text-gray-400 border-white/[0.06] hover:bg-white/[0.10]'
                  }`}>
                  Manual
                </button>
                <button type="button" onClick={() => handleDivisionModeChange('auto')}
                  className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-sm transition-all border ${
                    divisionMode === 'auto'
                      ? 'bg-yellow-500 text-[#0a0e17] border-yellow-500'
                      : 'bg-white/[0.06] text-gray-400 border-white/[0.06] hover:bg-white/[0.10]'
                  }`}>
                  Automática
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Número de Times</label>
              <div className="flex gap-2">
                {[2, 3, 4, 5, 6, 7, 8].map(n => (
                  <button key={n} type="button" onClick={() => setTeamCount(n)}
                    className={`w-10 h-10 rounded-xl font-bold text-sm transition-all border ${
                      teamCount === n
                        ? 'bg-yellow-500 text-[#0a0e17] border-yellow-500'
                        : 'bg-white/[0.06] text-gray-400 border-white/[0.06] hover:bg-white/[0.10]'
                    }`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {divisionMode === 'auto' && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-white/[0.06] shadow-[0_0_40px_rgba(0,0,0,0.4)]">
            <div className="relative px-6 py-5">
              <h2 className="font-black text-sm uppercase tracking-[0.15em] text-gray-400 mb-4">Selecionar Jogadores</h2>
              <div className="flex flex-wrap gap-2 mb-4">
                {loadingPlayers ? (
                  <p className="text-sm text-gray-500">Carregando jogadores...</p>
                ) : (
                  availablePlayers.map(p => {
                    const isSelected = allSelectedIds.includes(p.id)
                    return (
                      <button key={p.id} type="button" onClick={() => {
                        if (isSelected) {
                          setTeams(prev => prev.map(t => ({
                            ...t,
                            players: t.players.filter(pp => pp.profile_id !== p.id),
                          })))
                        } else {
                          setTeams(prev => {
                            const next = [...prev]
                            next[0] = { ...next[0], players: [...next[0].players, { profile_id: p.id }] }
                            return next
                          })
                        }
                      }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                          isSelected
                            ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
                            : 'bg-white/[0.06] text-gray-400 border-white/[0.06] hover:bg-white/[0.10]'
                        }`}>
                        {p.name}
                      </button>
                    )
                  })
                )}
              </div>
              <button type="button" onClick={handleAutoDivide}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-600 text-[#0a0e17] rounded-xl font-black text-sm hover:from-yellow-400 hover:to-amber-500 transition-all duration-200">
                <Shuffle size={16} /> Dividir Times ({teamCount})
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {teams.map((team, ti) => (
            <div key={ti} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-white/[0.06] shadow-[0_0_40px_rgba(0,0,0,0.4)]">
              <div className="relative px-4 py-4">
                <input type="text" value={team.name} onChange={e => {
                  const next = [...teams]
                  next[ti] = { ...next[ti], name: e.target.value }
                  setTeams(next)
                }}
                  className="w-full px-3 py-1.5 bg-white/[0.08] border border-white/20 rounded-lg text-white font-bold text-sm outline-none focus:ring-2 focus:ring-yellow-500 mb-3"
                  placeholder={`Time ${ti + 1}`} maxLength={50} />

                {divisionMode === 'manual' && (
                  <div className="space-y-1 mb-3">
                    {loadingPlayers ? (
                      <p className="text-xs text-gray-500">Carregando...</p>
                    ) : (
                      <select onChange={e => {
                        if (e.target.value) {
                          addPlayerToTeam(ti, e.target.value)
                          e.target.value = ''
                        }
                      }} value="" className="w-full px-3 py-1.5 bg-white/[0.08] border border-white/20 rounded-lg text-white text-xs outline-none focus:ring-2 focus:ring-yellow-500">
                        <option value="">Adicionar jogador...</option>
                        {availablePlayers
                          .filter(p => !allSelectedIds.includes(p.id))
                          .map(p => (
                            <option key={p.id} value={p.id} className="text-gray-900">{p.name}</option>
                          ))}
                      </select>
                    )}
                  </div>
                )}

                {team.players.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-2">Nenhum jogador</p>
                ) : (
                  <div className="space-y-1">
                    {team.players.map((p, pi) => {
                      const player = availablePlayers.find(ap => ap.id === p.profile_id)
                      return (
                        <div key={pi} className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-white/[0.04] text-xs">
                          <span className="text-white">{player?.name || p.guest_name || 'Convidado'}</span>
                          <button type="button" onClick={() => removePlayerFromTeam(ti, pi)}
                            className="p-0.5 text-red-400 hover:bg-red-500/10 rounded transition-all">
                            <X size={14} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <button type="submit" disabled={createChampionship.isPending}
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-gradient-to-r from-yellow-500 to-amber-600 text-[#0a0e17] rounded-xl font-black text-sm hover:from-yellow-400 hover:to-amber-500 transition-all duration-200 shadow-lg shadow-yellow-500/25 disabled:opacity-50">
          {createChampionship.isPending ? 'Criando...' : 'Criar Campeonato'}
        </button>
      </form>

      <FifaErrorScreen
        open={!!error}
        title="Erro"
        message={error || ''}
        onDismiss={() => setError(null)}
        actionLabel="OK"
        onAction={() => setError(null)}
      />
    </div>
  )
}

export function ChampionshipDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: championship, isLoading: loadingChamp } = useChampionship(id)
  const { data: rounds = [], isLoading: loadingRounds } = useChampionshipRounds(id)
  const { data: standings = [], isLoading: loadingStandings } = useChampionshipStandings(id)
  const { mutateAsync: startChampionship, isPending: starting } = useStartChampionship()
  const { mutateAsync: finishChampionship, isPending: finishing } = useFinishChampionship()
  const { mutateAsync: generateRounds, isPending: generating } = useGenerateRounds()
  const { mutateAsync: startRoundMatch, isPending: startingRound } = useStartRoundMatch()

  const queryClient = useQueryClient()

  const [error, setError] = useState<string | null>(null)
  const [showStartModal, setShowStartModal] = useState(false)
  const [roundDates, setRoundDates] = useState<{ round_number: number; match_date: string; location: string }[]>([])
  const [roundType, setRoundType] = useState<'first' | 'all'>('all')

  useEffect(() => {
    if (rounds.length > 0 && roundDates.length === 0) {
      setRoundDates(rounds.map(r => ({
        round_number: r.round_number,
        match_date: new Date().toISOString().split('T')[0],
        location: '',
      })))
    }
  }, [rounds])

  if (loadingChamp) return <div className="text-center py-8 text-gray-400">Carregando...</div>
  if (!championship) return <div className="text-center py-8 text-gray-400">Campeonato não encontrado.</div>

  const champ = championship
  const status = STATUS_CONFIG[champ.status]

  async function handleStart() {
    setError(null)
    try {
      await startChampionship({ id: champ.id, roundDates })
      setShowStartModal(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar campeonato')
    }
  }

  async function handleFinish() {
    try {
      await finishChampionship(champ.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao finalizar campeonato')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:text-white hover:bg-white/[0.08] rounded-xl transition-all">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black text-white tracking-tight">{champ.name}</h1>
      </div>

      {/* Championship Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-white/[0.06] shadow-[0_0_40px_rgba(0,0,0,0.4)]">
        <div className="relative px-6 py-5">
          <div className="flex items-center justify-between mb-3">
            <span className={`px-3 py-1 rounded-full border font-bold text-xs ${status.color}`}>{status.label}</span>
            <span className="text-xs text-gray-500">{champ.team_count} times</span>
          </div>

          {champ.status === 'DRAFT' && rounds.length > 0 && (
            <button onClick={() => setShowStartModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-600 text-[#0a0e17] rounded-xl font-black text-sm hover:from-yellow-400 hover:to-amber-500 transition-all duration-200 shadow-lg shadow-yellow-500/25">
              <Swords size={16} /> Iniciar Campeonato
            </button>
          )}
          {champ.status === 'ACTIVE' && (
            <button onClick={handleFinish} disabled={finishing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-black text-sm hover:from-red-400 hover:to-red-500 transition-all duration-200 disabled:opacity-50">
              <Check size={16} /> {finishing ? 'Finalizando...' : 'Finalizar Campeonato'}
            </button>
          )}
        </div>
      </div>

      {/* Create Matches Card */}
      {champ.status === 'DRAFT' && rounds.length === 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-white/[0.06] shadow-[0_0_40px_rgba(0,0,0,0.4)]">
          <div className="relative px-6 py-5">
            <h2 className="font-black text-sm uppercase tracking-[0.15em] text-gray-400 mb-4 flex items-center gap-2">
              <Swords size={16} /> Criar Partidas
            </h2>

            <p className="text-sm text-gray-400 mb-4">
              Escolha o formato das partidas do campeonato:
            </p>

            <div className="flex gap-3 mb-4">
              <button type="button" onClick={() => setRoundType('first')}
                className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm transition-all border text-left ${
                  roundType === 'first'
                    ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
                    : 'bg-white/[0.06] text-gray-400 border-white/[0.06] hover:bg-white/[0.10]'
                }`}>
                <p className="font-black mb-0.5">Só Turno</p>
                <p className="text-[10px] opacity-70">Cada time enfrenta os outros uma vez</p>
              </button>
              <button type="button" onClick={() => setRoundType('all')}
                className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm transition-all border text-left ${
                  roundType === 'all'
                    ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
                    : 'bg-white/[0.06] text-gray-400 border-white/[0.06] hover:bg-white/[0.10]'
                }`}>
                <p className="font-black mb-0.5">Turno e Returno</p>
                <p className="text-[10px] opacity-70">Cada time enfrenta os outros duas vezes</p>
              </button>
            </div>

            {error && (
              <p className="text-sm text-red-400 mb-3">{error}</p>
            )}

            <button onClick={async () => {
              setError(null)
              try {
                await generateRounds({ id: champ.id, type: roundType })
                queryClient.invalidateQueries({ queryKey: queryKeys.championships.rounds(champ.id) })
                queryClient.invalidateQueries({ queryKey: queryKeys.championships.detail(champ.id) })
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Erro ao gerar partidas')
              }
            }} disabled={generating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-600 text-[#0a0e17] rounded-xl font-black text-sm hover:from-yellow-400 hover:to-amber-500 transition-all duration-200 shadow-lg shadow-yellow-500/25 disabled:opacity-50">
              <Swords size={16} /> {generating ? 'Gerando...' : 'Gerar Partidas'}
            </button>
          </div>
        </div>
      )}

      {/* Teams Card */}
      {champ.teams && champ.teams.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-white/[0.06] shadow-[0_0_40px_rgba(0,0,0,0.4)]">
          <div className="relative px-6 py-5">
            <h2 className="font-black text-sm uppercase tracking-[0.15em] text-gray-400 mb-4 flex items-center gap-2">
              <Users size={16} /> Times
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {champ.teams.map((team, i) => (
                <div key={team.id} className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                  <p className="font-bold text-white text-sm mb-2">
                    <span className="text-yellow-500 mr-1">{i + 1}.</span> {team.name}
                  </p>
                  <div className="space-y-1">
                    {team.players?.map(p => (
                      <p key={p.id} className="text-xs text-gray-400">
                        {p.profile?.name || p.guest_name || 'Convidado'}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Standings Card */}
      {standings.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-white/[0.06] shadow-[0_0_40px_rgba(0,0,0,0.4)]">
          <div className="relative px-6 py-5">
            <h2 className="font-black text-sm uppercase tracking-[0.15em] text-gray-400 mb-4 flex items-center gap-2">
              <Trophy size={16} className="text-yellow-500" /> Classificação
            </h2>
            {loadingStandings ? (
              <p className="text-sm text-gray-500">Carregando...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-white/[0.06]">
                      <th className="text-left py-2 pr-2">#</th>
                      <th className="text-left py-2 pr-2">Time</th>
                      <th className="text-center py-2 px-2">P</th>
                      <th className="text-center py-2 px-2">J</th>
                      <th className="text-center py-2 px-2">V</th>
                      <th className="text-center py-2 px-2">E</th>
                      <th className="text-center py-2 px-2">D</th>
                      <th className="text-center py-2 px-2">GP</th>
                      <th className="text-center py-2 px-2">GC</th>
                      <th className="text-center py-2 pl-2">SG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((s, i) => (
                      <tr key={s.team_id} className="border-b border-white/[0.04] hover:bg-white/[0.04] transition-colors">
                        <td className={`py-2 pr-2 font-bold ${i < 3 ? 'text-yellow-400' : 'text-gray-400'}`}>{i + 1}</td>
                        <td className="py-2 pr-2 text-white font-medium truncate max-w-[120px]">{s.team_name}</td>
                        <td className="text-center py-2 px-2 text-yellow-400 font-black">{s.points}</td>
                        <td className="text-center py-2 px-2 text-gray-400">{s.played}</td>
                        <td className="text-center py-2 px-2 text-green-400">{s.wins}</td>
                        <td className="text-center py-2 px-2 text-gray-400">{s.draws}</td>
                        <td className="text-center py-2 px-2 text-red-400">{s.losses}</td>
                        <td className="text-center py-2 px-2 text-white">{s.goals_for}</td>
                        <td className="text-center py-2 px-2 text-white">{s.goals_against}</td>
                        <td className="text-center py-2 pl-2 font-bold text-white">{s.goal_diff > 0 ? `+${s.goal_diff}` : s.goal_diff}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rounds Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-white/[0.06] shadow-[0_0_40px_rgba(0,0,0,0.4)]">
        <div className="relative px-6 py-5">
          <h2 className="font-black text-sm uppercase tracking-[0.15em] text-gray-400 mb-4 flex items-center gap-2">
            <Calendar size={16} /> Rodadas
          </h2>
          {loadingRounds ? (
            <p className="text-sm text-gray-500">Carregando...</p>
          ) : rounds.length === 0 ? (
            <p className="text-sm text-gray-500">
              {champ.status === 'DRAFT'
                ? `${generating ? 'Gerando partidas...' : 'Nenhuma partida gerada ainda. Use a opção "Criar Partidas" acima para gerar os confrontos.'}`
                : 'Nenhuma rodada encontrada.'}
            </p>
          ) : (
            <div className="space-y-2">
              {rounds.map(r => {
                const homeTeam = r.home_team || champ.teams?.find(t => t.id === r.home_team_id)
                const awayTeam = r.away_team || champ.teams?.find(t => t.id === r.away_team_id)
                const hasMatch = !!r.match
                const isFinished = r.match?.status === 'FINISHED'
                const isInProgress = r.match?.status === 'IN_PROGRESS'
                const homeScore = r.match?.home_score
                const awayScore = r.match?.away_score

                return (
                  <button key={r.id} onClick={async () => {
                    if (hasMatch) {
                      navigate(`/matches/${r.match.id}`)
                    } else {
                      try {
                        const matchId = await startRoundMatch(r.id)
                        navigate(`/matches/${matchId}`)
                      } catch (err) {
                        setError(err instanceof Error ? err.message : String(err))
                      }
                    }
                  }} disabled={startingRound}
                    className={`w-full text-left block p-3 rounded-xl border transition-all duration-200 ${
                      hasMatch
                        ? 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.06]'
                        : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.04]'
                    }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-yellow-500/20 text-yellow-400 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {r.round_number}
                        </span>
                        <div className="min-w-0">
                          {isFinished && homeScore !== null && awayScore !== null ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">{homeTeam?.name || 'Time A'}</span>
                              <span className="text-lg font-black text-yellow-400">{homeScore}</span>
                              <span className="text-xs text-gray-500 font-bold">×</span>
                              <span className="text-lg font-black text-yellow-400">{awayScore}</span>
                              <span className="text-sm font-bold text-white">{awayTeam?.name || 'Time B'}</span>
                            </div>
                          ) : (
                            <p className="text-sm font-bold text-white">
                              {homeTeam?.name || 'Time A'} vs {awayTeam?.name || 'Time B'}
                            </p>
                          )}
                          {hasMatch ? (
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-xs text-gray-500">
                                {new Date(r.match.match_date).toLocaleDateString('pt-BR')}
                                {r.match.location && ` - ${r.match.location}`}
                              </p>
                              {isFinished && (
                                <span className="text-[10px] text-green-400 font-bold">Finalizado</span>
                              )}
                              {isInProgress && (
                                <span className="text-[10px] text-yellow-400 font-bold flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                                  Ao Vivo
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-xs text-gray-600">Aguardando início</p>
                              {startingRound && (
                                <span className="text-[10px] text-yellow-400">Criando...</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-gray-600 shrink-0" />
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Start Modal */}
      {showStartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2332] via-[#0f1722] to-[#0a0f18] border border-white/[0.06] shadow-[0_0_40px_rgba(0,0,0,0.4)]">
            <div className="relative px-6 py-5">
              <h2 className="font-black text-white text-lg mb-4">Iniciar Campeonato</h2>
              <p className="text-sm text-gray-400 mb-4">Defina data e local para cada rodada:</p>

              <div className="space-y-3 max-h-80 overflow-y-auto">
                {roundDates.map((rd, i) => (
                  <div key={i} className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06] space-y-2">
                    <p className="text-xs font-bold text-yellow-400">Rodada {rd.round_number}</p>
                    <input type="date" value={rd.match_date} onChange={e => {
                      const next = [...roundDates]
                      next[i] = { ...next[i], match_date: e.target.value }
                      setRoundDates(next)
                    }}
                      className="w-full px-3 py-1.5 bg-white/[0.08] border border-white/20 rounded-lg text-white text-xs outline-none focus:ring-2 focus:ring-yellow-500" />
                    <input type="text" value={rd.location} onChange={e => {
                      const next = [...roundDates]
                      next[i] = { ...next[i], location: e.target.value }
                      setRoundDates(next)
                    }}
                      className="w-full px-3 py-1.5 bg-white/[0.08] border border-white/20 rounded-lg text-white text-xs outline-none focus:ring-2 focus:ring-yellow-500 placeholder:text-gray-600"
                      placeholder="Local da partida" />
                  </div>
                ))}
              </div>

              <div className="flex gap-3 mt-4">
                <button onClick={() => setShowStartModal(false)}
                  className="flex-1 px-4 py-2.5 bg-white/[0.06] text-gray-400 rounded-xl font-bold text-sm hover:bg-white/[0.10] transition-all border border-white/[0.06]">
                  Cancelar
                </button>
                <button onClick={handleStart} disabled={starting}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-600 text-[#0a0e17] rounded-xl font-black text-sm hover:from-yellow-400 hover:to-amber-500 transition-all duration-200 disabled:opacity-50">
                  {starting ? 'Iniciando...' : 'Iniciar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <FifaErrorScreen
        open={!!error}
        title="Erro"
        message={error || ''}
        onDismiss={() => setError(null)}
        actionLabel="OK"
        onAction={() => setError(null)}
      />
    </div>
  )
}
