import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { GroupProvider } from './contexts/GroupContext'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { Layout } from './components/layout/Layout'
import { LoginPage, RegisterPage, ForgotPasswordPage } from './pages/auth/AuthPages'
import { DashboardPage } from './pages/DashboardPage'
import { GroupsListPage, CreateGroupPage, JoinGroupPage, GroupSettingsPage } from './pages/groups/GroupPages'
import { MatchesListPage } from './pages/matches/MatchesListPage'
import { CreateMatchPage } from './pages/matches/CreateMatchPage'
import { MatchDetailPage } from './pages/matches/MatchDetailPage'
import { VotePage } from './pages/matches/VotePage'
import { HallPage } from './pages/hall/HallPage'
import { RankingsPage } from './pages/rankings/RankingsPage'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <GroupProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/auth/callback" element={<LoginPage />} />

              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/" element={<GroupsListPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/groups" element={<GroupsListPage />} />
                <Route path="/groups/new" element={<CreateGroupPage />} />
                <Route path="/groups/join" element={<JoinGroupPage />} />
                <Route path="/groups/settings" element={<GroupSettingsPage />} />
                <Route path="/matches" element={<MatchesListPage />} />
                <Route path="/matches/new" element={<CreateMatchPage />} />
                <Route path="/matches/:id" element={<MatchDetailPage />} />
                <Route path="/matches/:id/vote" element={<VotePage />} />
                <Route path="/hall" element={<HallPage />} />
                <Route path="/rankings" element={<RankingsPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </GroupProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
