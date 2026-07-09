export type PlayerPosition = 'GOLEIRO' | 'ZAGUEIRO' | 'LATERAL' | 'MEIO_CAMPO' | 'ATACANTE'

export const POSITION_LABELS: Record<PlayerPosition, string> = {
  GOLEIRO: 'Goleiro',
  ZAGUEIRO: 'Zagueiro',
  LATERAL: 'Lateral',
  MEIO_CAMPO: 'Meio-Campo',
  ATACANTE: 'Atacante',
}

export type DominantFoot = 'DIREITO' | 'ESQUERDO' | 'AMBOS'

export const DOMINANT_FOOT_LABELS: Record<DominantFoot, string> = {
  DIREITO: 'Direito',
  ESQUERDO: 'Esquerdo',
  AMBOS: 'Ambos',
}

export interface Profile {
  id: string
  auth_user_id: string
  name: string
  email: string
  avatar_url: string | null
  position: PlayerPosition | null
  birth_date: string | null
  weight: number | null
  dominant_foot: DominantFoot | null
  created_at: string
}

export interface Group {
  id: string
  name: string
  description: string | null
  access_code: string
  created_by: string
  created_at: string
  image_url: string | null
}

export interface GroupMember {
  id: string
  group_id: string
  profile_id: string
  role: 'ADMIN' | 'MEMBER'
  joined_at: string
  profile?: Profile
}

export interface RecurringSchedule {
  id: string
  group_id: string
  frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM'
  day_of_week: number | null
  day_of_month: number | null
  hour: string
  active: boolean
}

export interface Match {
  id: string
  group_id: string
  schedule_id: string | null
  match_date: string
  location: string
  status: 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED'
  evaluation_open: boolean
  evaluation_closed: boolean
  created_by: string
  created_at: string
}

export interface MatchConfirmation {
  id: string
  match_id: string
  profile_id: string
  status: 'PENDING' | 'CONFIRMED' | 'DECLINED'
  confirmed_at: string | null
  profile?: Profile
}

export interface Team {
  id: string
  match_id: string
  name: string
}

export interface MatchPlayer {
  id: string
  match_id: string
  profile_id: string | null
  team_id: string | null
  goals: number
  assists: number
  own_goals: number
  nutmeg_given: number
  nutmeg_done: number
  no_show: boolean
  won_match: boolean | null
  guest_name: string | null
  created_at: string
  profile?: Profile
  team?: Team
}

export interface MatchResult {
  id: string
  match_id: string
  team_id: string
  score: number
  team?: Team
}

export interface PlayerRating {
  id: string
  match_id: string
  rater_profile_id: string
  rated_profile_id: string
  rating: number
  comment: string | null
  created_at: string
}

export interface MatchAward {
  id: string
  match_id: string
  best_player_profile_id: string | null
  top_scorer_profile_id: string | null
  top_assist_profile_id: string | null
  worst_player_profile_id: string | null
  best_player_rating: number | null
  created_at: string
  best_player?: Profile
  top_scorer?: Profile
  top_assist?: Profile
  worst_player?: Profile
}

export interface VoterPenalty {
  id: string
  match_id: string
  profile_id: string
  warned: boolean
  penalty_count: number
  created_at: string
}

export interface Court {
  id: string
  name: string
  address: string | null
  latitude: number
  longitude: number
  phone: string | null
  website: string | null
  surface: string | null
  has_lighting: boolean
  has_rental: boolean
  opening_hours: string | null
  image_url: string | null
  created_at: string
}

export interface GroupJoinRequest {
  id: string
  group_id: string
  profile_id: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  created_at: string
  profile?: Profile
}

export interface GroupFinanceConfig {
  id: string
  group_id: string
  default_monthly_fee: number
  default_match_fee: number
  pix_key: string | null
  created_at: string
  updated_at: string
}

export interface PlayerFeeSettings {
  id: string
  group_member_id: string
  is_monthly_player: boolean
  monthly_fee: number | null
  match_fee: number | null
  updated_at: string
  group_member?: GroupMember & { profile?: Profile }
}

export interface Payment {
  id: string
  group_member_id: string
  match_id: string | null
  payment_type: 'MONTHLY' | 'MATCH'
  amount: number
  reference_month: string | null
  paid_at: string
  paid_by: string
  notes: string | null
  created_at: string
  paid_by_profile?: Profile
  group_member?: GroupMember & { profile?: Profile }
  match?: Match
}

export interface GroupExpense {
  id: string
  group_id: string
  description: string
  amount: number
  category: 'FIELD' | 'REFEREE' | 'EQUIPMENT' | 'SNACKS' | 'OTHER'
  created_by: string
  created_at: string
  created_by_profile?: Profile
}

export interface FinanceSummary {
  totalRevenue: number
  totalExpenses: number
  balance: number
  monthlyRevenue: number
  matchRevenue: number
  pendingPayments: {
    group_member_id: string
    profile_id: string
    player_name: string
    player_avatar: string | null
    is_monthly_player: boolean
    monthly_fee: number
    match_fee: number
    last_monthly_payment: string | null
    last_match_payment: string | null
  }[]
  recentPayments: Payment[]
  recentExpenses: GroupExpense[]
  balanceHistory: { date: string; balance: number; revenue: number; expense: number }[]
}

export interface MatchStats {
  player_id: string
  player_name: string
  player_avatar: string | null
  goals: number
  assists: number
  own_goals: number
  nutmeg_given: number
  nutmeg_done: number
  matches_played: number
  avg_rating: number | null
}

export type MarketType = 'WINNER' | 'TOP_SCORER' | 'TOP_ASSISTER' | 'BEST_PLAYER' | 'PLAYER_SCORES' | 'PLAYER_ASSIST' | 'PLAYER_NUTMEG' | 'PLAYER_NO_SHOW'

export type MarketStatus = 'OPEN' | 'SETTLED'

export type BetStatus = 'PENDING' | 'WON' | 'LOST' | 'CANCELLED'

export type BetType = 'SINGLE' | 'MULTIPLE'

export const MARKET_TYPE_LABELS: Record<MarketType, string> = {
  WINNER: 'Vencedor',
  TOP_SCORER: 'Artilheiro',
  TOP_ASSISTER: 'Assistência',
  BEST_PLAYER: 'Melhor Jogador',
  PLAYER_SCORES: 'Faz Gol',
  PLAYER_ASSIST: 'Dá Assistência',
  PLAYER_NUTMEG: 'Aplica Caneta',
  PLAYER_NO_SHOW: 'Furão',
}

export interface MatchMarket {
  id: string
  match_id: string
  market_type: MarketType
  label: string
  odds: number
  status: MarketStatus
  result: boolean | null
  player_id: string | null
  team_id: string | null
  created_at: string
  player?: Profile | null
  team?: Team | null
}

export interface Bet {
  id: string
  match_id: string
  profile_id: string
  bet_type: BetType
  amount: number
  total_odds: number
  potential_payout: number
  status: BetStatus
  created_at: string
  profile?: Profile | null
  selections: (BetSelection & { market?: MatchMarket | null })[]
}

export interface BetSelection {
  id: string
  bet_id: string
  market_id: string
  market?: MatchMarket | null
}