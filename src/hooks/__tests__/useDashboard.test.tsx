import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useDashboardData } from '../useDashboard'
import type { Match } from '../../types'

vi.mock('../../services/api', () => ({
  matchService: {
    list: vi.fn(),
    getAwards: vi.fn(),
    getResults: vi.fn(),
    getTeams: vi.fn(),
    getRatings: vi.fn(),
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

const mockFinishedMatch: Match = {
  id: 'm1', group_id: 'g1', match_date: '2024-06-01', location: 'Campo',
  modality: 'SUICO', status: 'FINISHED', evaluation_open: false, evaluation_closed: false,
  created_by: 'p1', created_at: '2024-01-01', schedule_id: null,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useDashboardData', () => {
  it('returns dashboard data', async () => {
    const { matchService } = await import('../../services/api')

    vi.mocked(matchService.list).mockResolvedValueOnce([mockFinishedMatch])
    vi.mocked(matchService.getAwards).mockResolvedValueOnce(null)
    vi.mocked(matchService.getResults).mockResolvedValueOnce([])
    vi.mocked(matchService.getTeams).mockResolvedValueOnce([])
    vi.mocked(matchService.getRatings).mockResolvedValueOnce([])

    const { result } = renderHook(() => useDashboardData('g1'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeDefined()
    expect(result.current.data!.totalMatches).toBe(1)
    expect(result.current.data!.recentMatches).toHaveLength(1)
    expect(result.current.data!.topPlayers).toEqual([])
  })

  it('is not enabled when groupId is undefined', () => {
    const { result } = renderHook(() => useDashboardData(undefined), { wrapper: createWrapper() })
    expect(result.current.isFetching).toBe(false)
  })
})
