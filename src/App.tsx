import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { GroupProvider } from './contexts/GroupContext'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { Layout } from './components/layout/Layout'
import { LoginPage, RegisterPage, ForgotPasswordPage, AuthCallbackPage } from './pages/auth/AuthPages'
import { ToastProvider } from './components/ui/Toast'
import { GroupsListPage, CreateGroupPage, JoinGroupPage, GroupSettingsPage } from './pages/groups/GroupPages'
import { MatchesListPage } from './pages/matches/MatchesListPage'
import { CreateMatchPage } from './pages/matches/CreateMatchPage'
import { MatchDetailPage } from './pages/matches/MatchDetailPage'
import { VotePage } from './pages/matches/VotePage'
import { RankingsPage } from './pages/rankings/RankingsPage'
import { ProfilePage } from './pages/profile/ProfilePage'
import { MapPage } from './pages/map/MapPage'
import { FinancePage } from './pages/finances/FinancePage'
import { BetsHistoryPage } from './pages/bets/BetsHistoryPage'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
          <GroupProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />

              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/" element={<GroupsListPage />} />
                <Route path="/groups" element={<GroupsListPage />} />
                <Route path="/groups/new" element={<CreateGroupPage />} />
                <Route path="/groups/join" element={<JoinGroupPage />} />
                <Route path="/groups/settings" element={<GroupSettingsPage />} />
                <Route path="/groups/:id" element={<GroupSettingsPage />} />
                <Route path="/groups/:id/financas" element={<FinancePage />} />
                <Route path="/matches" element={<MatchesListPage />} />
                <Route path="/matches/new" element={<CreateMatchPage />} />
                <Route path="/matches/:id" element={<MatchDetailPage />} />
                <Route path="/matches/:id/vote" element={<VotePage />} />
                <Route path="/rankings" element={<RankingsPage />} />
                <Route path="/bets" element={<BetsHistoryPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/mapa" element={<MapPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </GroupProvider>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
