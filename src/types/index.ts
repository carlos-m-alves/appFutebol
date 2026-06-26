export interface Profile {
  id: string
  auth_user_id: string
  name: string
  email: string
  avatar_url: string | null
  created_at: string
}

export interface Group {
  id: string
  name: string
  description: string | null
  access_code: string
  created_by: string
  created_at: string
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
