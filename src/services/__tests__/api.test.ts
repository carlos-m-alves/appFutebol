import { describe, it, expect, vi, beforeEach } from 'vitest'
import { groupService, matchService, getProfileByAuthId, getProfile, updateProfile } from '../api'
import type { GroupMember, Match } from '../../types'

const { mockGetUser, mockFrom, mockRpc } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
    rpc: mockRpc,
  },
}))

function mockChain(overrides: Record<string, any> = {}) {
  const chain: Record<string, any> = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    upsert: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    order: vi.fn(() => chain),
    single: vi.fn(() => chain),
    maybeSingle: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    lte: vi.fn(() => chain),
    then: undefined,
    ...overrides,
  }
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('groupService', () => {
  const profileId = 'profile-1'
  const groupId = 'group-1'

  describe('create', () => {
    it('creates a group and adds creator as ADMIN', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'auth-1' } }, error: null })

      const profileChain = mockChain()
      profileChain.single.mockResolvedValueOnce({ data: { id: profileId }, error: null })

      mockRpc.mockResolvedValueOnce({ data: 'ABC123', error: null })

      const groupInsertChain = mockChain()
      groupInsertChain.select.mockReturnValueOnce(
        mockChain({ data: { id: groupId, name: 'Test Group' }, error: null })
      )

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain
        if (table === 'groups') return groupInsertChain
        if (table === 'group_members') return mockChain()
        return mockChain()
      })

      const result = await groupService.create('Test Group', 'A test group')
      expect(result).toEqual({ id: groupId, name: 'Test Group' })
    })

    it('throws if name is empty after sanitize', async () => {
      await expect(groupService.create('  ', 'desc')).rejects.toThrow('Nome do grupo inválido')
    })

    it('throws if user is not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null })
      await expect(groupService.create('Group', 'desc')).rejects.toThrow('Usuário não autenticado')
    })
  })

  describe('join', () => {
    it('joins a group with valid access code', async () => {
      const groupChain = mockChain()
      groupChain.single.mockResolvedValueOnce({ data: { id: groupId, name: 'Group' }, error: null })
      mockFrom.mockImplementation((table: string) => {
        if (table === 'groups') return groupChain
        if (table === 'group_members') return mockChain()
        return mockChain()
      })

      const result = await groupService.join('abc123', profileId)
      expect(result).toEqual({ id: groupId, name: 'Group' })
    })

    it('throws for invalid access code', async () => {
      const groupChain = mockChain()
      groupChain.single.mockResolvedValueOnce({ data: null, error: new Error('not found') })
      mockFrom.mockImplementation((table: string) => {
        if (table === 'groups') return groupChain
        return mockChain()
      })

      await expect(groupService.join('INVALID', profileId)).rejects.toThrow('Código de acesso inválido')
    })
  })

  describe('getMembers', () => {
    it('returns members list', async () => {
      const members: GroupMember[] = [
        { id: 'm1', group_id: groupId, profile_id: 'p1', role: 'ADMIN', joined_at: '2024-01-01' },
      ]
      mockFrom.mockReturnValueOnce(mockChain({ data: members }))

      const result = await groupService.getMembers(groupId)
      expect(result).toEqual(members)
    })

    it('returns empty array when no members', async () => {
      mockFrom.mockReturnValueOnce(mockChain({ data: null }))
      const result = await groupService.getMembers(groupId)
      expect(result).toEqual([])
    })
  })

  describe('leave and removeMember', () => {
    it('leave deletes membership', async () => {
      const deleteChain = mockChain()
      deleteChain.eq.mockReturnValueOnce(mockChain())
      deleteChain.eq.mockReturnValueOnce(mockChain({ error: null }))
      mockFrom.mockReturnValueOnce(deleteChain)

      await expect(groupService.leave(groupId, profileId)).resolves.not.toThrow()
    })

    it('removeMember deletes membership', async () => {
      mockFrom.mockReturnValueOnce(mockChain())
      await expect(groupService.removeMember(groupId, profileId)).resolves.not.toThrow()
    })
  })

  describe('promoteToAdmin', () => {
    it('updates role to ADMIN', async () => {
      const updateChain = mockChain()
      updateChain.eq.mockReturnValueOnce(mockChain())
      updateChain.eq.mockReturnValueOnce(mockChain({ error: null }))
      mockFrom.mockReturnValueOnce(updateChain)

      await expect(groupService.promoteToAdmin(groupId, profileId)).resolves.not.toThrow()
    })
  })
})

describe('matchService', () => {
  const matchId = 'match-1'
  const groupId = 'group-1'
  const profileId = 'profile-1'

  describe('create', () => {
    it('creates a match', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'auth-1' } }, error: null })

      const profileChain = mockChain()
      profileChain.single.mockResolvedValueOnce({ data: { id: profileId }, error: null })

      const matchInsertChain = mockChain()
      matchInsertChain.select.mockReturnValueOnce(
        mockChain({ data: { id: matchId, location: 'Campo', status: 'SCHEDULED' }, error: null })
      )

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain
        if (table === 'matches') return matchInsertChain
        return mockChain()
      })

      const result = await matchService.create({
        group_id: groupId,
        match_date: '2024-06-01',
        location: 'Campo Municipal',
      })
      expect(result).toEqual({ id: matchId, location: 'Campo', status: 'SCHEDULED' })
    })

    it('throws with empty location', async () => {
      await expect(matchService.create({
        group_id: groupId,
        match_date: '2024-06-01',
        location: '  ',
      })).rejects.toThrow('Local inválido')
    })
  })

  describe('list', () => {
    it('returns matches ordered by date desc', async () => {
      const matches: Match[] = [
        { id: matchId, group_id: groupId, match_date: '2024-06-01', location: 'Campo',
          modality: 'SUICO', status: 'SCHEDULED', evaluation_open: false, evaluation_closed: false,
          created_by: profileId, created_at: '2024-01-01', schedule_id: null },
      ]
      mockFrom.mockReturnValueOnce(mockChain({ data: matches }))

      const result = await matchService.list(groupId)
      expect(result).toEqual(matches)
    })
  })

  describe('get', () => {
    it('returns a single match', async () => {
      const match: Match = {
        id: matchId, group_id: groupId, match_date: '2024-06-01', location: 'Campo',
        modality: 'SUICO', status: 'SCHEDULED', evaluation_open: false, evaluation_closed: false,
        created_by: profileId, created_at: '2024-01-01', schedule_id: null,
      }
      const chain = mockChain()
      chain.single.mockResolvedValueOnce({ data: match, error: null })
      mockFrom.mockReturnValueOnce(chain)

      const result = await matchService.get(matchId)
      expect(result).toEqual(match)
    })
  })

  describe('update', () => {
    it('updates match fields', async () => {
      const updateChain = mockChain()
      updateChain.eq.mockReturnValueOnce(mockChain({ error: null }))
      mockFrom.mockReturnValueOnce(updateChain)

      await expect(matchService.update(matchId, { status: 'FINISHED' })).resolves.not.toThrow()
    })
  })

  describe('confirmations', () => {
    it('getConfirmations returns array', async () => {
      mockFrom.mockReturnValueOnce(mockChain({ data: [] }))
      const result = await matchService.getConfirmations(matchId)
      expect(result).toEqual([])
    })

    it('confirmAttendance inserts when no existing', async () => {
      const findChain = mockChain()
      findChain.single.mockResolvedValueOnce({ data: null, error: null })
      mockFrom.mockImplementation((table: string) => {
        if (table === 'match_confirmations') return findChain
        return mockChain()
      })

      await expect(
        matchService.confirmAttendance(matchId, profileId, 'CONFIRMED')
      ).resolves.not.toThrow()
    })
  })

  describe('teams', () => {
    it('getTeams returns array', async () => {
      mockFrom.mockReturnValueOnce(mockChain({ data: [] }))
      const result = await matchService.getTeams(matchId)
      expect(result).toEqual([])
    })

    it('saveTeams deletes old and inserts new', async () => {
      const deleteChain = mockChain()
      deleteChain.eq.mockReturnValueOnce(mockChain({ error: null }))

      const insertChain = mockChain()
      insertChain.select.mockReturnValueOnce(mockChain({ data: [{ id: 't1', name: 'Team A' }] }))

      let teamsCallCount = 0
      mockFrom.mockImplementation((table: string) => {
        if (table === 'teams') {
          teamsCallCount++
          return teamsCallCount === 1 ? deleteChain : insertChain
        }
        return mockChain()
      })

      const result = await matchService.saveTeams(matchId, [{ name: 'Team A' }])
      expect(result).toEqual([{ id: 't1', name: 'Team A' }])
    })
  })

  describe('players', () => {
    it('getPlayers returns array', async () => {
      mockFrom.mockReturnValueOnce(mockChain({ data: [] }))
      const result = await matchService.getPlayers(matchId)
      expect(result).toEqual([])
    })

    it('addPlayer inserts', async () => {
      const insertChain = mockChain()
      insertChain.insert.mockReturnValueOnce(mockChain({ error: null }))
      mockFrom.mockReturnValueOnce(insertChain)

      await expect(matchService.addPlayer(matchId, profileId)).resolves.not.toThrow()
    })

    it('addGuestPlayer sanitizes name', async () => {
      const insertChain = mockChain()
      insertChain.insert.mockReturnValueOnce(mockChain({ error: null }))
      mockFrom.mockReturnValueOnce(insertChain)

      await expect(matchService.addGuestPlayer(matchId, '  Guest Name  ')).resolves.not.toThrow()
    })

    it('addGuestPlayer throws for invalid name', async () => {
      await expect(matchService.addGuestPlayer(matchId, '  ')).rejects.toThrow('Nome do convidado inválido')
    })
  })

  describe('results', () => {
    it('getResults returns array', async () => {
      mockFrom.mockReturnValueOnce(mockChain({ data: [] }))
      const result = await matchService.getResults(matchId)
      expect(result).toEqual([])
    })

    it('saveResults deletes old and inserts new', async () => {
      const deleteChain = mockChain()
      deleteChain.eq.mockReturnValueOnce(mockChain({ error: null }))
      mockFrom.mockImplementation((table: string) => {
        if (table === 'match_results') return deleteChain
        return mockChain()
      })

      await expect(
        matchService.saveResults(matchId, [{ team_id: 't1', score: 3 }])
      ).resolves.not.toThrow()
    })
  })

  describe('ratings', () => {
    it('getRatings returns array', async () => {
      mockFrom.mockReturnValueOnce(mockChain({ data: [] }))
      const result = await matchService.getRatings(matchId)
      expect(result).toEqual([])
    })

    it('submitRating inserts', async () => {
      mockFrom.mockReturnValueOnce(mockChain({ error: null }))
      await expect(
        matchService.submitRating(matchId, 'rater-1', 'rated-1', 4.5, 'Great')
      ).resolves.not.toThrow()
    })

    it('getPublicRatings aggregates ratings', async () => {
      const ratings = [
        { id: 'r1', match_id: matchId, rater_profile_id: 'u1', rated_profile_id: 'p1', rating: 4, comment: null, created_at: '', rated_profile: { id: 'p1', auth_user_id: 'au1', name: 'Player 1', email: 'p1@test.com', avatar_url: null, created_at: '' } },
        { id: 'r2', match_id: matchId, rater_profile_id: 'u2', rated_profile_id: 'p1', rating: 5, comment: null, created_at: '', rated_profile: { id: 'p1', auth_user_id: 'au1', name: 'Player 1', email: 'p1@test.com', avatar_url: null, created_at: '' } },
      ]
      mockFrom.mockReturnValueOnce(mockChain({ data: ratings }))

      const result = await matchService.getPublicRatings(matchId)
      expect(result).toHaveLength(1)
      expect(result[0].rating).toBe(4.5)
    })
  })

  describe('awards', () => {
    it('getAwards returns null when none', async () => {
      const chain = mockChain()
      chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
      mockFrom.mockReturnValueOnce(chain)

      const result = await matchService.getAwards(matchId)
      expect(result).toBeNull()
    })

    it('calculateAwards calls RPC', async () => {
      mockRpc.mockResolvedValueOnce({ error: null })
      await expect(matchService.calculateAwards(matchId)).resolves.not.toThrow()
    })
  })

  describe('getSchedules', () => {
    it('returns active schedules', async () => {
      mockFrom.mockReturnValueOnce(mockChain({ data: [] }))
      const result = await matchService.getSchedules(groupId)
      expect(result).toEqual([])
    })
  })

  describe('getPlayerStats', () => {
    it('returns empty stats when no data', async () => {
      const matchPlayersChain = mockChain()
      matchPlayersChain.eq.mockReturnValueOnce(mockChain({ data: [] }))
      mockFrom.mockImplementation((table: string) => {
        if (table === 'match_players') return matchPlayersChain
        return mockChain({ data: [] })
      })

      const result = await matchService.getPlayerStats(profileId)
      expect(result).toEqual({
        goals: 0, assists: 0, own_goals: 0, nutmeg_given: 0, nutmeg_done: 0,
        matchesPlayed: 0, avgRating: null, matchesWon: 0,
      })
    })
  })

  describe('getGroupStats', () => {
    it('returns empty when no matches', async () => {
      const matchIdsChain = mockChain()
      matchIdsChain.eq.mockReturnValueOnce(mockChain({ data: null }))
      mockFrom.mockImplementation((table: string) => {
        if (table === 'matches') return matchIdsChain
        return mockChain()
      })

      const result = await matchService.getGroupStats(groupId)
      expect(result).toEqual([])
    })
  })
})

describe('profile functions', () => {
  it('getProfileByAuthId returns profile', async () => {
    const chain = mockChain()
    chain.single.mockResolvedValueOnce({ data: { id: 'p1', name: 'Player' }, error: null })
    mockFrom.mockReturnValueOnce(chain)

    const result = await getProfileByAuthId('auth-1')
    expect(result).toEqual({ id: 'p1', name: 'Player' })
  })

  it('getProfile returns profile', async () => {
    const chain = mockChain()
    chain.single.mockResolvedValueOnce({ data: { id: 'p1', name: 'Player' }, error: null })
    mockFrom.mockReturnValueOnce(chain)

    const result = await getProfile('p1')
    expect(result).toEqual({ id: 'p1', name: 'Player' })
  })

  it('updateProfile updates name', async () => {
    const updateChain = mockChain()
    updateChain.eq.mockReturnValueOnce(mockChain({ error: null }))
    mockFrom.mockReturnValueOnce(updateChain)

    await expect(updateProfile('p1', { name: 'New Name' })).resolves.not.toThrow()
  })

  it('updateProfile throws for empty name', async () => {
    await expect(updateProfile('p1', { name: '  ' })).rejects.toThrow('Nome inválido')
  })
})
