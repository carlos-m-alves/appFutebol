import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { matchService } from '../../services/api'
import {
  useMatch, useMatchesList, useMatchTeams, useMatchPlayers,
  useMatchResults, useMatchConfirmations, useMatchAwards, useMatchRatings,
} from '../useMatches'
import type { Match, MatchPlayer, Team, MatchResult, MatchConfirmation } from '../../types'

vi.mock('../../services/api', () => ({
  matchService: {
    get: vi.fn(),
    list: vi.fn(),
    getTeams: vi.fn(),
    getPlayers: vi.fn(),
    getResults: vi.fn(),
    getConfirmations: vi.fn(),
    getAwards: vi.fn(),
    getRatings: vi.fn(),
  },
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

const mockMatch: Match = {
  id: 'm1', group_id: 'g1', match_date: '2024-06-01', location: 'Campo',
  modality: 'SUICO', status: 'SCHEDULED', evaluation_open: false, evaluation_closed: false,
  created_by: 'p1', created_at: '2024-01-01', schedule_id: null,
}

const mockTeam: Team = { id: 't1', match_id: 'm1', name: 'Team A' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useMatch', () => {
  it('returns match data when matchId is provided', async () => {
    vi.mocked(matchService.get).mockResolvedValueOnce(mockMatch)

    const { result } = renderHook(() => useMatch('m1'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockMatch)
  })

  it('is not enabled when matchId is undefined', () => {
    const { result } = renderHook(() => useMatch(undefined), { wrapper: createWrapper() })
    expect(result.current.isFetching).toBe(false)
  })
})

describe('useMatchesList', () => {
  it('returns matches list', async () => {
    vi.mocked(matchService.list).mockResolvedValueOnce([mockMatch])

    const { result } = renderHook(() => useMatchesList('g1'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([mockMatch])
  })
})

describe('useMatchTeams', () => {
  it('returns teams', async () => {
    vi.mocked(matchService.getTeams).mockResolvedValueOnce([mockTeam])

    const { result } = renderHook(() => useMatchTeams('m1'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([mockTeam])
  })
})

describe('useMatchPlayers', () => {
  const mockPlayer: MatchPlayer = {
    id: 'mp1', match_id: 'm1', profile_id: 'p1', team_id: 't1',
    goals: 0, assists: 0, own_goals: 0, nutmeg_given: 0, nutmeg_done: 0,
    no_show: false, won_match: null, guest_name: null, created_at: '',
  }

  it('returns players', async () => {
    vi.mocked(matchService.getPlayers).mockResolvedValueOnce([mockPlayer])

    const { result } = renderHook(() => useMatchPlayers('m1'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([mockPlayer])
  })
})

describe('useMatchResults', () => {
  const mockResult: MatchResult = {
    id: 'r1', match_id: 'm1', team_id: 't1', score: 3,
  }

  it('returns results', async () => {
    vi.mocked(matchService.getResults).mockResolvedValueOnce([mockResult])

    const { result } = renderHook(() => useMatchResults('m1'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([mockResult])
  })
})

describe('useMatchConfirmations', () => {
  const mockConfirmation: MatchConfirmation = {
    id: 'c1', match_id: 'm1', profile_id: 'p1', status: 'PENDING', confirmed_at: null,
  }

  it('returns confirmations', async () => {
    vi.mocked(matchService.getConfirmations).mockResolvedValueOnce([mockConfirmation])

    const { result } = renderHook(() => useMatchConfirmations('m1'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([mockConfirmation])
  })
})

describe('useMatchAwards', () => {
  it('returns awards', async () => {
    vi.mocked(matchService.getAwards).mockResolvedValueOnce(null)

    const { result } = renderHook(() => useMatchAwards('m1'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
  })
})

describe('useMatchRatings', () => {
  it('returns ratings', async () => {
    vi.mocked(matchService.getRatings).mockResolvedValueOnce([])

    const { result } = renderHook(() => useMatchRatings('m1'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })
})
