import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useGroup } from '../../contexts/GroupContext'
import { groupService, matchService } from '../../services/api'
import { useFinanceSummary, useFinanceConfig, useUpsertFinanceConfig, useUpsertPlayerFee, useRecordPayment, useDeletePayment, useAddExpense, useDeleteExpense, usePlayerFeeSettings } from '../../hooks/useFinances'
import { supabase } from '../../lib/supabase'
import type { GroupMember, Match } from '../../types'
import { Settings, Plus, ArrowLeft, DollarSign, Users } from 'lucide-react'

import { FinanceSummaryCards } from '../../components/finances/FinanceSummaryCards'
import { CashFlowChart } from '../../components/finances/CashFlowChart'
import { DebtorsList } from '../../components/finances/DebtorsList'
import { FinanceConfigModal } from '../../components/finances/FinanceConfigModal'
import { PaymentModal } from '../../components/finances/PaymentModal'
import { ExpenseModal } from '../../components/finances/ExpenseModal'
import { ExpenseList } from '../../components/finances/ExpenseList'
import { PaymentHistory } from '../../components/finances/PaymentHistory'
import { PlayerFeeManager } from '../../components/finances/PlayerFeeManager'

export function FinancePage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const { currentGroup, setCurrentGroup, groups, currentGroupRole } = useGroup()

  const [loadingAccess, setLoadingAccess] = useState(true)
  const [isMember, setIsMember] = useState(false)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [matches, setMatches] = useState<Match[]>([])

  const [showConfigModal, setShowConfigModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showPlayerFeesModal, setShowPlayerFeesModal] = useState(false)

  const isAdmin = currentGroupRole === 'ADMIN'

  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useFinanceSummary(id)
  const { data: config } = useFinanceConfig(id)
  const { data: playerFees } = usePlayerFeeSettings(id)

  const upsertConfig = useUpsertFinanceConfig(id!)
  const upsertFee = useUpsertPlayerFee()
  const recordPayment = useRecordPayment()
  const deletePayment = useDeletePayment()
  const addExpense = useAddExpense()
  const deleteExpense = useDeleteExpense()

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
      const [m, matchList] = await Promise.all([
        groupService.getMembers(id),
        matchService.list(id),
      ])
      setMembers(m)
      setMatches(matchList)
    } else {
      setIsMember(false)
    }

    setLoadingAccess(false)
  }

  if (loadingAccess) {
    return <div className="text-center py-8 text-gray-400">Carregando...</div>
  }

  if (!isMember || !currentGroup) {
    return <div className="text-center py-8 text-gray-400">Acesso negado.</div>
  }

  const playerFeeList = members.map(m => {
    const fee = playerFees?.find(f => f.group_member_id === m.id)
    return {
      group_member_id: m.id,
      profile_id: m.profile_id,
      player_name: m.profile?.name ?? 'Desconhecido',
      player_avatar: m.profile?.avatar_url ?? null,
      is_monthly_player: fee?.is_monthly_player ?? false,
      monthly_fee: fee?.monthly_fee ?? null,
      match_fee: fee?.match_fee ?? null,
    }
  })

  async function handleRecordPayment(data: {
    group_member_id: string
    match_id?: string | null
    payment_type: 'MONTHLY' | 'MATCH'
    amount: number
    reference_month?: string | null
    paid_by: string
  }) {
    await recordPayment.mutateAsync(data)
    refetchSummary()
  }

  async function handleAddExpense(data: { description: string; amount: number; category: string }) {
    if (!id || !profile) return
    const myProfile = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', profile.id)
      .single()
    if (!myProfile.data) return

    await addExpense.mutateAsync({
      group_id: id,
      description: data.description,
      amount: data.amount,
      category: data.category,
      created_by: myProfile.data.id,
    })
    refetchSummary()
  }

  async function handleDeletePayment(paymentId: string) {
    await deletePayment.mutateAsync(paymentId)
    refetchSummary()
  }

  async function handleDeleteExpense(expenseId: string) {
    await deleteExpense.mutateAsync(expenseId)
    refetchSummary()
  }

  async function handleSavePlayerFee(groupMemberId: string, data: { is_monthly_player?: boolean; monthly_fee?: number | null; match_fee?: number | null }) {
    await upsertFee.mutateAsync({ groupMemberId, data })
    refetchSummary()
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={`/groups/${id}`}
            className="p-2 text-gray-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <DollarSign size={18} className="text-yellow-500" />
              <h1 className="text-xl font-black text-white tracking-tight">Finanças</h1>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{currentGroup.name}</p>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap justify-end">
          {isAdmin && (
            <>
              <button onClick={() => setShowPlayerFeesModal(true)}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-xl bg-white/[0.06] text-gray-300 text-[11px] sm:text-xs font-bold hover:bg-white/[0.10] transition-all border border-white/[0.08]">
                <Users size={13} /> Jogadores
              </button>
              <button onClick={() => setShowExpenseModal(true)}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-xl bg-white/[0.06] text-gray-300 text-[11px] sm:text-xs font-bold hover:bg-white/[0.10] transition-all border border-white/[0.08]">
                <Plus size={13} /> Despesa
              </button>
              <button onClick={() => setShowPaymentModal(true)}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-[11px] sm:text-xs font-bold hover:bg-emerald-500/20 transition-all border border-emerald-500/20">
                <Plus size={13} /> Pagamento
              </button>
              <button onClick={() => setShowConfigModal(true)}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-xl bg-yellow-500/10 text-yellow-400 text-[11px] sm:text-xs font-bold hover:bg-yellow-500/20 transition-all border border-yellow-500/20">
                <Settings size={13} /> Configurar
              </button>
            </>
          )}
        </div>
      </div>

      {summaryLoading ? (
        <div className="text-center py-12 text-gray-500 text-sm">Carregando dados financeiros...</div>
      ) : !summary ? (
        <div className="text-center py-12 text-gray-500 text-sm">Erro ao carregar dados financeiros.</div>
      ) : (
        <>
          {/* Summary Cards */}
          <FinanceSummaryCards summary={summary} monthlyFee={config?.default_monthly_fee ?? 0} matchFee={config?.default_match_fee ?? 0} />

          {/* Chart */}
          <CashFlowChart data={summary.balanceHistory} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Debtors */}
            <DebtorsList
              debtors={summary.pendingPayments}
              onMarkPayment={(_debtor, _type) => {
                if (isAdmin) setShowPaymentModal(true)
              }}
              isAdmin={isAdmin}
              currentProfileId={profile?.id}
            />

            {/* Recent Payments */}
            <PaymentHistory
              payments={summary.recentPayments}
              isAdmin={isAdmin}
              onDelete={handleDeletePayment}
              currentProfileId={profile?.id}
            />
          </div>

          {/* Expenses */}
          <ExpenseList
            expenses={summary.recentExpenses}
            isAdmin={isAdmin}
            onDelete={handleDeleteExpense}
          />
        </>
      )}

      {/* Modals */}
      <FinanceConfigModal
        open={showConfigModal}
        config={config ?? null}
        onSave={async (data) => {
          await upsertConfig.mutateAsync(data)
          refetchSummary()
          setShowConfigModal(false)
        }}
        onClose={() => setShowConfigModal(false)}
      />

      <PaymentModal
        open={showPaymentModal}
        members={playerFeeList.map(p => ({
          group_member_id: p.group_member_id,
          profile: members.find(m => m.id === p.group_member_id)?.profile ?? { id: '', auth_user_id: '', name: p.player_name, email: '', avatar_url: p.player_avatar, position: null, birth_date: null, weight: null, dominant_foot: null, created_at: '' },
          is_monthly_player: p.is_monthly_player,
          monthly_fee: p.monthly_fee ?? config?.default_monthly_fee ?? 0,
          match_fee: p.match_fee ?? config?.default_match_fee ?? 0,
        }))}
        matches={matches}
        onRecordPayment={handleRecordPayment}
        profileId={profile?.id ?? ''}
        onClose={() => setShowPaymentModal(false)}
      />

      <ExpenseModal
        open={showExpenseModal}
        onAdd={handleAddExpense}
        onClose={() => setShowExpenseModal(false)}
      />

      <PlayerFeeManager
        open={showPlayerFeesModal}
        players={playerFeeList}
        defaultMonthlyFee={config?.default_monthly_fee ?? 0}
        defaultMatchFee={config?.default_match_fee ?? 0}
        onSave={handleSavePlayerFee}
        onClose={() => setShowPlayerFeesModal(false)}
        currentProfileId={profile?.id}
      />
    </div>
  )
}
