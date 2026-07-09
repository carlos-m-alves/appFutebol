export const RATING_OPTIONS = [
  1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0
] as const

export const MATCH_STATUS = {
  SCHEDULED: 'Agendada',
  CONFIRMED: 'Confirmada',
  IN_PROGRESS: 'Em Andamento',
  FINISHED: 'Finalizada',
  CANCELLED: 'Cancelada'
} as const

export const FREQUENCY_LABELS = {
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quinzenal',
  MONTHLY: 'Mensal',
  CUSTOM: 'Personalizada'
} as const

export const BETTING_MIN_AMOUNT = 10
export const BETTING_MAX_AMOUNT = 5000
export const BETTING_DEFAULT_BALANCE = 5000
export const BETTING_VIG = 0.95
