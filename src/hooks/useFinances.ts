import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { financeService } from '../services/api'
import { queryKeys } from './queryKeys'

export function useFinanceConfig(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.finances.config(groupId!),
    queryFn: () => financeService.getConfig(groupId!),
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000,
  })
}

export function usePlayerFeeSettings(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.finances.playerFees(groupId!),
    queryFn: () => financeService.getPlayerFees(groupId!),
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000,
  })
}

export function usePayments(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.finances.payments(groupId!),
    queryFn: () => financeService.getPayments(groupId!),
    enabled: !!groupId,
    staleTime: 30 * 1000,
  })
}

export function useExpenses(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.finances.expenses(groupId!),
    queryFn: () => financeService.getExpenses(groupId!),
    enabled: !!groupId,
    staleTime: 30 * 1000,
  })
}

export function useFinanceSummary(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.finances.summary(groupId!),
    queryFn: () => financeService.getSummary(groupId!),
    enabled: !!groupId,
    staleTime: 30 * 1000,
  })
}

export function useUpsertFinanceConfig(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { default_monthly_fee?: number; default_match_fee?: number; pix_key?: string | null }) =>
      financeService.upsertConfig(groupId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finances.config(groupId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.finances.summary(groupId) })
    },
  })
}

export function useUpsertPlayerFee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupMemberId, data }: { groupMemberId: string; data: { is_monthly_player?: boolean; monthly_fee?: number | null; match_fee?: number | null } }) =>
      financeService.upsertPlayerFee(groupMemberId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances'] })
    },
  })
}

export function useRecordPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      group_member_id: string
      match_id?: string | null
      payment_type: 'MONTHLY' | 'MATCH'
      amount: number
      reference_month?: string | null
      paid_by: string
      notes?: string | null
    }) => financeService.recordPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances'] })
    },
  })
}

export function useDeletePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (paymentId: string) => financeService.deletePayment(paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances'] })
    },
  })
}

export function useAddExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      group_id: string
      description: string
      amount: number
      category: string
      created_by: string
    }) => financeService.addExpense(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances'] })
    },
  })
}

export function useDeleteExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (expenseId: string) => financeService.deleteExpense(expenseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances'] })
    },
  })
}
