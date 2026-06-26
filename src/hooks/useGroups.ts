import { useQuery } from '@tanstack/react-query'
import { groupService, matchService, getProfile, groupJoinRequestService } from '../services/api'
import { queryKeys } from './queryKeys'

export function useGroupMembers(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.groups.members(groupId!),
    queryFn: () => groupService.getMembers(groupId!),
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000,
  })
}

export function usePlayerStats(profileId: string | undefined, groupId?: string) {
  return useQuery({
    queryKey: queryKeys.groups.myStats(profileId!, groupId),
    queryFn: () => matchService.getPlayerStats(profileId!, groupId),
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useGroupJoinRequests(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.groups.joinRequests(groupId!),
    queryFn: () => groupJoinRequestService.getPending(groupId!),
    enabled: !!groupId,
    staleTime: 30 * 1000,
  })
}

export function useProfile(profileId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.profiles.detail(profileId!),
    queryFn: () => getProfile(profileId!),
    enabled: !!profileId,
    staleTime: 10 * 60 * 1000,
  })
}
