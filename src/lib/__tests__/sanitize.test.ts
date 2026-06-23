import { describe, it, expect } from 'vitest'
import { sanitizeText, sanitizeOptional } from '../sanitize'

describe('sanitizeText', () => {
  it('trims whitespace', () => {
    expect(sanitizeText('  hello  ')).toBe('hello')
  })

  it('removes HTML tags', () => {
    expect(sanitizeText('<script>alert("xss")</script>hello')).toBe('alert("xss")hello')
  })

  it('removes control characters', () => {
    expect(sanitizeText('hello\x00world\x1F')).toBe('helloworld')
  })

  it('truncates to maxLength', () => {
    const long = 'a'.repeat(1000)
    expect(sanitizeText(long, 10)).toBe('a'.repeat(10))
  })

  it('uses default maxLength of 500', () => {
    const long = 'b'.repeat(600)
    expect(sanitizeText(long)).toBe('b'.repeat(500))
  })

  it('handles empty string', () => {
    expect(sanitizeText('')).toBe('')
  })

  it('handles string with only whitespace', () => {
    expect(sanitizeText('   ')).toBe('')
  })

  it('handles multiple nested HTML tags', () => {
    expect(sanitizeText('<div><p>text</p></div>')).toBe('text')
  })
})

describe('sanitizeOptional', () => {
  it('returns undefined for null', () => {
    expect(sanitizeOptional(null)).toBeUndefined()
  })

  it('returns undefined for undefined', () => {
    expect(sanitizeOptional(undefined)).toBeUndefined()
  })

  it('returns undefined for empty string after sanitize', () => {
    expect(sanitizeOptional('   ')).toBeUndefined()
  })

  it('returns sanitized string for valid value', () => {
    expect(sanitizeOptional('  hello  ')).toBe('hello')
  })

  it('applies maxLength', () => {
    expect(sanitizeOptional('a'.repeat(100), 5)).toBe('a'.repeat(5))
  })
})
