export const queryKeys = {
  matches: {
    all: ['matches'],
    detail: (matchId: string) => ['matches', 'detail', matchId],
    list: (groupId: string) => ['matches', 'list', groupId],
    teams: (matchId: string) => ['matches', 'teams', matchId],
    players: (matchId: string) => ['matches', 'players', matchId],
    results: (matchId: string) => ['matches', 'results', matchId],
    confirmations: (matchId: string) => ['matches', 'confirmations', matchId],
    awards: (matchId: string) => ['matches', 'awards', matchId],
    ratings: (matchId: string) => ['matches', 'ratings', matchId],
    groupStats: (groupId: string) => ['matches', 'groupStats', groupId],
    hallOfFame: (groupId: string, filters?: { year?: number; playerId?: string }) =>
      ['matches', 'hallOfFame', groupId, filters].filter(Boolean),
  },
  groups: {
    all: ['groups'],
    members: (groupId: string) => ['groups', 'members', groupId],
    myStats: (profileId: string, groupId?: string) =>
      ['groups', 'myStats', profileId, groupId].filter(Boolean),
  },
  profiles: {
    detail: (profileId: string) => ['profiles', 'detail', profileId],
  },
}
