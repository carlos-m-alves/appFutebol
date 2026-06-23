import { describe, it, expect, vi, beforeEach } from 'vitest'
import { uploadAvatar } from '../storage'

const mockUpload = vi.fn()
const mockGetPublicUrl = vi.fn(() => ({ data: { publicUrl: 'https://example.com/avatar.jpg' } }))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      })),
    },
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

function createFile(name: string, size: number, type = 'image/jpeg'): File {
  const blob = new Blob([new Uint8Array(size)], { type })
  return new File([blob], name, { type })
}

describe('uploadAvatar', () => {
  const profileId = 'profile-123'

  it('throws if file exceeds 1MB', async () => {
    const largeFile = createFile('avatar.jpg', 2 * 1024 * 1024)
    await expect(uploadAvatar(largeFile, profileId)).rejects.toThrow(
      'A imagem deve ter no máximo 1MB'
    )
  })

  it('uploads file and returns public URL', async () => {
    mockUpload.mockResolvedValueOnce({ error: null })
    mockGetPublicUrl.mockReturnValueOnce({ data: { publicUrl: 'https://example.com/avatar.jpg' } })

    const file = createFile('avatar.jpg', 500 * 1024)
    const url = await uploadAvatar(file, profileId)

    expect(url).toBe('https://example.com/avatar.jpg')
    expect(mockUpload).toHaveBeenCalledOnce()
  })

  it('uses correct file path format', async () => {
    mockUpload.mockResolvedValueOnce({ error: null })

    const file = createFile('foto.png', 300 * 1024)
    await uploadAvatar(file, profileId)

    const filePath = mockUpload.mock.calls[0][0]
    expect(filePath).toMatch(new RegExp(`^img/${profileId}/avatar\\.`))
  })

  it('extracts file extension from name', async () => {
    mockUpload.mockResolvedValueOnce({ error: null })

    const file = createFile('my-photo.PNG', 100 * 1024)
    await uploadAvatar(file, profileId)

    const filePath = mockUpload.mock.calls[0][0]
    expect(filePath.endsWith('.png')).toBe(true)
  })

  it('uses filename as extension when no dot in name', async () => {
    mockUpload.mockResolvedValueOnce({ error: null })

    const file = createFile('avatar', 100 * 1024)
    await uploadAvatar(file, profileId)

    const filePath = mockUpload.mock.calls[0][0]
    expect(filePath.endsWith('avatar')).toBe(true)
  })

  it('throws on upload error', async () => {
    mockUpload.mockResolvedValueOnce({ error: new Error('Storage error') })

    const file = createFile('avatar.jpg', 500 * 1024)
    await expect(uploadAvatar(file, profileId)).rejects.toThrow('Storage error')
  })
})
