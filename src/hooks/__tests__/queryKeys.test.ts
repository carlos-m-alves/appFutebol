import { describe, it, expect } from 'vitest'
import { queryKeys } from '../queryKeys'

describe('queryKeys', () => {
  describe('matches', () => {
    it('all returns base key', () => {
      expect(queryKeys.matches.all).toEqual(['matches'])
    })

    it('detail returns key with matchId', () => {
      expect(queryKeys.matches.detail('m1')).toEqual(['matches', 'detail', 'm1'])
    })

    it('list returns key with groupId', () => {
      expect(queryKeys.matches.list('g1')).toEqual(['matches', 'list', 'g1'])
    })

    it('teams returns key with matchId', () => {
      expect(queryKeys.matches.teams('m1')).toEqual(['matches', 'teams', 'm1'])
    })

    it('players returns key with matchId', () => {
      expect(queryKeys.matches.players('m1')).toEqual(['matches', 'players', 'm1'])
    })

    it('results returns key with matchId', () => {
      expect(queryKeys.matches.results('m1')).toEqual(['matches', 'results', 'm1'])
    })

    it('confirmations returns key with matchId', () => {
      expect(queryKeys.matches.confirmations('m1')).toEqual(['matches', 'confirmations', 'm1'])
    })

    it('awards returns key with matchId', () => {
      expect(queryKeys.matches.awards('m1')).toEqual(['matches', 'awards', 'm1'])
    })

    it('ratings returns key with matchId', () => {
      expect(queryKeys.matches.ratings('m1')).toEqual(['matches', 'ratings', 'm1'])
    })

    it('groupStats returns key with groupId', () => {
      expect(queryKeys.matches.groupStats('g1')).toEqual(['matches', 'groupStats', 'g1'])
    })

    it('hallOfFame returns key with groupId and filters', () => {
      const key = queryKeys.matches.hallOfFame('g1', { year: 2024 })
      expect(key).toContain('g1')
    })
  })

  describe('groups', () => {
    it('all returns base key', () => {
      expect(queryKeys.groups.all).toEqual(['groups'])
    })

    it('members returns key with groupId', () => {
      expect(queryKeys.groups.members('g1')).toEqual(['groups', 'members', 'g1'])
    })

    it('myStats returns key with profileId and groupId', () => {
      const key = queryKeys.groups.myStats('p1', 'g1')
      expect(key).toContain('p1')
      expect(key).toContain('g1')
    })
  })

  describe('profiles', () => {
    it('detail returns key with profileId', () => {
      expect(queryKeys.profiles.detail('p1')).toEqual(['profiles', 'detail', 'p1'])
    })
  })
})
