# Plano — Atualização em Tempo Real com Supabase Realtime

## Objetivo

As informações da tela devem ser atualizadas de acordo com o banco de dados sem que a página inteira seja recarregada — apenas o elemento que foi alterado deve ser re-renderizado.

## Estratégia

Usar **Supabase Realtime** (WebSocket) para escutar mudanças nas tabelas e invalidar as queries do React Query. O React Query refetch apenas os dados alterados, e somente os componentes afetados re-renderizam.

```
Banco → Realtime WebSocket → hook → invalidateQueries() → React Query refetch → UI atualiza
```

## Arquivos a criar/modificar

| Arquivo | Tipo | Mudança |
|---------|------|---------|
| `supabase/migrations/00013_enable_realtime.sql` | **Novo** | Habilita Realtime nas tabelas |
| `src/hooks/useRealtime.ts` | **Novo** | Hooks de subscription |
| `src/pages/groups/GroupPages.tsx` | **Modificar** | Adicionar `useRealtimeGroupsList()`, remover `loadGroups()` manual |
| `src/pages/matches/MatchDetailPage.tsx` | **Modificar** | Adicionar `useRealtimeMatchDetail()` + `useRealtimeBetting()` |
| `src/components/bets/BettingPanel.tsx` | **Modificar** | Adicionar `useRealtimeBetting()` |

## Passos

### 1. Habilitar Realtime nas tabelas

Criar `supabase/migrations/00013_enable_realtime.sql`:

```sql
alter publication supabase_realtime add table groups;
alter publication supabase_realtime add table group_members;
alter publication supabase_realtime add table group_join_requests;
alter publication supabase_realtime add table matches;
alter publication supabase_realtime add table match_confirmations;
alter publication supabase_realtime add table match_players;
alter publication supabase_realtime add table match_results;
alter publication supabase_realtime add table match_markets;
alter publication supabase_realtime add table bets;
alter publication supabase_realtime add table bet_selections;
```

### 2. Criar `src/hooks/useRealtime.ts`

Hook central com subscriptions por página:

```typescript
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

// ─── Groups List ───────────────────────────────────────
export function useRealtimeGroupsList() {
  const queryClient = useQueryClient()
  const queryKey = ['groups']

  useEffect(() => {
    const channel = supabase
      .channel('groups-list')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'groups' },
        () => queryClient.invalidateQueries({ queryKey })
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'group_members' },
        () => queryClient.invalidateQueries({ queryKey })
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [queryClient])
}

// ─── Match Detail ─────────────────────────────────────
export function useRealtimeMatchDetail(matchId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!matchId) return

    const channel = supabase
      .channel(`match-detail-${matchId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['matches', 'detail', matchId] })
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'match_confirmations', filter: `match_id=eq.${matchId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['matches', 'confirmations', matchId] })
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'match_players', filter: `match_id=eq.${matchId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['matches', 'players', matchId] })
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'match_results', filter: `match_id=eq.${matchId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['matches', 'results', matchId] })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [matchId, queryClient])
}

// ─── Betting ────────────────────────────────────────────
export function useRealtimeBetting(matchId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!matchId) return

    const channel = supabase
      .channel(`betting-${matchId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'match_markets', filter: `match_id=eq.${matchId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['bets', 'markets', matchId] })
          queryClient.invalidateQueries({ queryKey: ['bets', 'list', matchId] })
          queryClient.invalidateQueries({ queryKey: ['bets', 'my', matchId] })
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'bets', filter: `match_id=eq.${matchId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['bets', 'list', matchId] })
          queryClient.invalidateQueries({ queryKey: ['bets', 'my', matchId] })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [matchId, queryClient])
}

// ─── Balanço do usuário ─────────────────────────────────
export function useRealtimeBalance(profileId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!profileId) return

    const channel = supabase
      .channel(`balance-${profileId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${profileId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['bets', 'balance', profileId] })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profileId, queryClient])
}
```

### 3. Migrar `GroupsListPage` para React Query

Remover o `useEffect` + `loadGroups()` manual e criar um hook `useAllGroups()` que usa `useQuery` com React Query. O `useRealtimeGroupsList()` invalida essa query quando houver mudanças.

```typescript
// em src/hooks/useGroups.ts
export function useAllGroups() {
  return useQuery({
    queryKey: ['groups', 'all'],
    queryFn: () => groupService.getAll(), // buscar todos os grupos com member_count
    staleTime: 60 * 1000,
  })
}
```

### 4. Usar os hooks nas páginas

```tsx
// GroupsListPage
export function GroupsListPage() {
  useRealtimeGroupsList()
  const { data: groups, isLoading } = useAllGroups()
  // ... render
}

// MatchDetailPage
export function MatchDetailPage() {
  useRealtimeMatchDetail(id)
  useRealtimeBetting(id)
  // ... render
}

// BettingPanel (já tem matchId como prop)
export function BettingPanel({ matchId, ... }: BettingPanelProps) {
  useRealtimeBetting(matchId)
  // ... render
}
```

## Custo

**Gratuito no Free Plan do Supabase** — 200 conexões Realtime simultâneas, mensagens ilimitadas. Cada usuário mantém 1-3 canais abertos via WebSocket. Zero requisições HTTP extras ao banco.
