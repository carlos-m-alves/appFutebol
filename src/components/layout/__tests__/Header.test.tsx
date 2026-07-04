import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../../test/test-utils'
import { Header } from '../Header'
import { useAuth } from '../../../contexts/AuthContext'
import { useGroup } from '../../../contexts/GroupContext'

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../../contexts/GroupContext', () => ({
  useGroup: vi.fn(),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Header', () => {
  const baseAuth = {
    user: { id: 'u1' } as any,
    profile: { id: 'p1', name: 'Player 1', avatar_url: null, auth_user_id: 'au1', email: 'p1@test.com', position: null, birth_date: null, weight: null, dominant_foot: null, created_at: '' },
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
  }

  const groupContext = {
    currentGroup: { id: 'g1', name: 'Group 1', description: null, access_code: 'ABC', created_by: 'p1', created_at: '', image_url: null },
    currentGroupRole: 'MEMBER' as const,
    setCurrentGroup: vi.fn(),
    groups: [],
    loading: false,
    refreshGroups: vi.fn(),
  }

  const noGroupContext = {
    currentGroup: null,
    currentGroupRole: null,
    setCurrentGroup: vi.fn(),
    groups: [],
    loading: false,
    refreshGroups: vi.fn(),
  }

  it('renders logo', () => {
    vi.mocked(useAuth).mockReturnValue(baseAuth)
    vi.mocked(useGroup).mockReturnValue(groupContext)
    render(<Header />, { initialEntries: ['/dashboard'] })
    expect(screen.getByText('PeladaFC')).toBeInTheDocument()
  })

  it('shows navigation items when group is selected', () => {
    vi.mocked(useAuth).mockReturnValue(baseAuth)
    vi.mocked(useGroup).mockReturnValue(groupContext)
    render(<Header />, { initialEntries: ['/dashboard'] })
    expect(screen.getAllByText('Início')).toHaveLength(2)
    expect(screen.getAllByText('Partidas')).toHaveLength(2)
    expect(screen.getAllByText('Hall da Pelada')).toHaveLength(2)
    expect(screen.getAllByText('Rankings')).toHaveLength(2)
    expect(screen.getAllByText('Grupos')).toHaveLength(2)
    expect(screen.getAllByText('Quadras')).toHaveLength(2)
  })

  it('hides Partidas nav item when no group is selected', () => {
    vi.mocked(useAuth).mockReturnValue(baseAuth)
    vi.mocked(useGroup).mockReturnValue(noGroupContext)
    render(<Header />, { initialEntries: ['/dashboard'] })
    expect(screen.getByText('Início')).toBeInTheDocument()
    expect(screen.queryByText('Partidas')).not.toBeInTheDocument()
  })

  it('shows profile name with avatar fallback', () => {
    vi.mocked(useAuth).mockReturnValue(baseAuth)
    vi.mocked(useGroup).mockReturnValue(groupContext)
    render(<Header />, { initialEntries: ['/dashboard'] })
    expect(screen.getByText('Player 1')).toBeInTheDocument()
  })

  it('calls signOut when logout button is clicked', async () => {
    const signOut = vi.fn()
    vi.mocked(useAuth).mockReturnValue({ ...baseAuth, signOut })
    vi.mocked(useGroup).mockReturnValue(noGroupContext)
    render(<Header />, { initialEntries: ['/dashboard'] })

    const logoutBtn = screen.getByTitle('Sair')
    fireEvent.click(logoutBtn)
    expect(signOut).toHaveBeenCalledOnce()
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })
})
