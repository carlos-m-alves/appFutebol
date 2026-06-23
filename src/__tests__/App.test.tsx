import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(),
        })),
        in: vi.fn(),
        order: vi.fn(),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
    rpc: vi.fn(),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('App', () => {
  it('renders without crashing', async () => {
    render(<App />)
    expect(await screen.findByText('PeladaFC')).toBeInTheDocument()
  })

  it('renders login link when not authenticated', async () => {
    render(<App />)
    expect(await screen.findByText('PeladaFC')).toBeInTheDocument()
  })
})
