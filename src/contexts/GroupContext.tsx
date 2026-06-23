import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Group } from '../types'
import { useAuth } from './AuthContext'

interface GroupContextType {
  currentGroup: Group | null
  currentGroupRole: 'ADMIN' | 'MEMBER' | null
  setCurrentGroup: (group: Group | null) => void
  groups: Group[]
  loading: boolean
  refreshGroups: () => Promise<void>
}

const GroupContext = createContext<GroupContextType | undefined>(undefined)

export function GroupProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null)
  const [currentGroupRole, setCurrentGroupRole] = useState<'ADMIN' | 'MEMBER' | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) {
      refreshGroups()
    } else {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  useEffect(() => {
    if (currentGroup && profile) {
      supabase
        .from('group_members')
        .select('role')
        .eq('group_id', currentGroup.id)
        .eq('profile_id', profile.id)
        .single()
        .then(({ data }) => {
          setCurrentGroupRole(data?.role as 'ADMIN' | 'MEMBER' ?? null)
        })
    } else {
      setCurrentGroupRole(null)
    }
  }, [currentGroup, profile])

  async function refreshGroups() {
    if (!profile) return
    setLoading(true)
    const { data } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('profile_id', profile.id)
    if (!data) { setLoading(false); return }

    const ids = data.map(m => m.group_id)
    if (ids.length === 0) { setLoading(false); return }

    const { data: groupsData } = await supabase
      .from('groups')
      .select('*')
      .in('id', ids)
      .order('created_at', { ascending: false })

    setGroups(groupsData ?? [])
    setLoading(false)
  }

  return (
    <GroupContext.Provider value={{ currentGroup, currentGroupRole, setCurrentGroup, groups, loading, refreshGroups }}>
      {children}
    </GroupContext.Provider>
  )
}

export function useGroup() {
  const context = useContext(GroupContext)
  if (!context) throw new Error('useGroup must be used within a GroupProvider')
  return context
}
