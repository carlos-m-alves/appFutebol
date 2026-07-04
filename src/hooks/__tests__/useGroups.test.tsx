import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { groupService, matchService } from '../../services/api'
import { useGroupMembers, usePlayerStats, useProfile } from '../useGroups'

vi.mock('../../services/api', () => ({
  groupService: {
    getMembers: vi.fn(),
  },
  matchService: {
    getPlayerStats: vi.fn(),
  },
  getProfile: vi.fn(),
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

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useGroupMembers', () => {
  it('returns members when groupId is provided', async () => {
    const members = [
      { id: 'm1', group_id: 'g1', profile_id: 'p1', role: 'ADMIN' as const, joined_at: '2024-01-01' },
    ]
    vi.mocked(groupService.getMembers).mockResolvedValueOnce(members)

    const { result } = renderHook(() => useGroupMembers('g1'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(members)
  })

  it('is not enabled when groupId is undefined', () => {
    const { result } = renderHook(() => useGroupMembers(undefined), { wrapper: createWrapper() })
    expect(result.current.isFetching).toBe(false)
  })
})

describe('usePlayerStats', () => {
  it('returns player stats', async () => {
    const stats = {
      goals: 5, assists: 3, own_goals: 0, nutmeg_given: 1, nutmeg_done: 2,
      matchesPlayed: 10, avgRating: 4.0, matchesWon: 7,
    }
    vi.mocked(matchService.getPlayerStats).mockResolvedValueOnce(stats)

    const { result } = renderHook(() => usePlayerStats('p1', 'g1'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(stats)
  })

  it('is not enabled when profileId is undefined', () => {
    const { result } = renderHook(() => usePlayerStats(undefined), { wrapper: createWrapper() })
    expect(result.current.isFetching).toBe(false)
  })
})

describe('useProfile', () => {
  it('returns profile data', async () => {
    const profile = { id: 'p1', auth_user_id: 'au1', name: 'Player 1', email: 'p1@test.com', avatar_url: null, position: null, birth_date: null, weight: null, dominant_foot: null, created_at: '' }
    const { getProfile } = await import('../../services/api')
    vi.mocked(getProfile).mockResolvedValueOnce(profile)

    const { result } = renderHook(() => useProfile('p1'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(profile)
  })
})
