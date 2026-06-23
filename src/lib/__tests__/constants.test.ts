import { describe, it, expect } from 'vitest'
import { RATING_OPTIONS, MATCH_STATUS, FREQUENCY_LABELS } from '../constants'

describe('RATING_OPTIONS', () => {
  it('has 9 values', () => {
    expect(RATING_OPTIONS).toHaveLength(9)
  })

  it('contains expected values', () => {
    expect(RATING_OPTIONS).toEqual([1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0])
  })

  it('starts at 1.0 and ends at 5.0', () => {
    expect(RATING_OPTIONS[0]).toBe(1.0)
    expect(RATING_OPTIONS[RATING_OPTIONS.length - 1]).toBe(5.0)
  })

  it('all values are numbers', () => {
    RATING_OPTIONS.forEach(v => expect(typeof v).toBe('number'))
  })
})

describe('MATCH_STATUS', () => {
  it('has 5 status values', () => {
    expect(Object.keys(MATCH_STATUS)).toHaveLength(5)
  })

  it('has SCHEDULED as Agendada', () => {
    expect(MATCH_STATUS.SCHEDULED).toBe('Agendada')
  })

  it('has FINISHED as Finalizada', () => {
    expect(MATCH_STATUS.FINISHED).toBe('Finalizada')
  })
})

describe('FREQUENCY_LABELS', () => {
  it('has 4 frequency types', () => {
    expect(Object.keys(FREQUENCY_LABELS)).toHaveLength(4)
  })

  it('has WEEKLY as Semanal', () => {
    expect(FREQUENCY_LABELS.WEEKLY).toBe('Semanal')
  })

  it('has CUSTOM as Personalizada', () => {
    expect(FREQUENCY_LABELS.CUSTOM).toBe('Personalizada')
  })
})
