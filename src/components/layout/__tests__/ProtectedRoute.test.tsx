import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '../../../test/test-utils'
import { ProtectedRoute } from '../ProtectedRoute'
import { useAuth } from '../../../contexts/AuthContext'

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => <div>Redirect to {to}</div>,
  }
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ProtectedRoute', () => {
  it('shows loading state when loading is true', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: true,
      profile: null,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
    })

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    expect(screen.getByText('Carregando...')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('redirects to login when user is null', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      profile: null,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
    })

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    expect(screen.getByText(/Redirect to \/login/)).toBeInTheDocument()
  })

  it('renders children when user is authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u1', email: 'test@test.com' } as any,
      loading: false,
      profile: { id: 'p1', name: 'Player' } as any,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
    })

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })
})
