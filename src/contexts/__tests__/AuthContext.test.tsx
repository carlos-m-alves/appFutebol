import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '../../test/test-utils'
import { AuthProvider, useAuth } from '../AuthContext'
import { supabase } from '../../lib/supabase'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  },
}))

function TestConsumer() {
  const { user, profile, loading, signIn, signUp, signOut, signInWithGoogle, resetPassword } = useAuth()
  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'not-loading'}</div>
      <div data-testid="user">{user ? user.email : 'no-user'}</div>
      <div data-testid="profile">{profile ? profile.name : 'no-profile'}</div>
      <button data-testid="signin" onClick={() => signIn('test@test.com', 'password')}>signin</button>
      <button data-testid="signup" onClick={() => signUp('test@test.com', 'password', 'Player')}>signup</button>
      <button data-testid="signout" onClick={() => signOut()}>signout</button>
      <button data-testid="google" onClick={() => signInWithGoogle()}>google</button>
      <button data-testid="reset" onClick={() => resetPassword('test@test.com')}>reset</button>
    </div>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AuthContext', () => {
  it('initializes with loading state', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('not-loading')
    })
  })

  it('sets user from session', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          access_token: 'token', refresh_token: 'refresh', expires_in: 3600, token_type: 'bearer',
          user: { id: 'u1', email: 'test@test.com', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '' },
        },
      },
      error: null,
    } as any)

    const singleChain = vi.fn().mockResolvedValue({
      data: { id: 'p1', name: 'Player', email: 'test@test.com', auth_user_id: 'u1', avatar_url: null, position: null, created_at: '' },
      error: null,
    })
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: singleChain,
        })),
      })),
    } as any)

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('profile').textContent).toBe('Player')
    })
  })

  it('signs in with email and password', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    })
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: {},
      error: null,
    } as any)

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('not-loading')
    })

    fireEvent.click(screen.getByTestId('signin'))

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'password',
      })
    })
  })

  it('signs up a new user', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    })
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: {},
      error: null,
    } as any)

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('not-loading')
    })

    fireEvent.click(screen.getByTestId('signup'))

    await waitFor(() => {
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'password',
        options: { data: { name: 'Player' } },
      })
    })
  })

  it('signs in with Google', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    })
    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
      data: {},
      error: null,
    } as any)

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('not-loading')
    })

    fireEvent.click(screen.getByTestId('google'))

    await waitFor(() => {
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalled()
    })
  })

  it('signs out', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    })
    vi.mocked(supabase.auth.signOut).mockResolvedValue({
      error: null,
    } as any)

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('not-loading')
    })

    fireEvent.click(screen.getByTestId('signout'))

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalledOnce()
    })
  })

  it('resets password', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    })
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({
      data: {},
      error: null,
    } as any)

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('not-loading')
    })

    fireEvent.click(screen.getByTestId('reset'))

    await waitFor(() => {
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('test@test.com', {
        redirectTo: `${window.location.origin}/auth/callback`,
      })
    })
  })
})
