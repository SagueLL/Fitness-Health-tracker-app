import { describe, expect, it } from 'vitest'
import { localDate, parseValue, validateDate } from './daily'

describe('entradas del registro', () => {
  it('interpreta coma decimal, cero y vacíos sin confundirlos', () => {
    expect(parseValue(' 72,5 ')).toBe(72.5)
    expect(parseValue('0')).toBe(0)
    expect(parseValue(' ')).toBeUndefined()
    for (const raw of ['1,2,3', '1e3', '-1', 'Infinity']) expect(() => parseValue(raw)).toThrow()
  })
  it('usa fechas de calendario local y rechaza días futuros o inexistentes', () => {
    expect(localDate(new Date(2026, 0, 2, 0, 5))).toBe('2026-01-02')
    expect(() => validateDate('2026-01-03', '2026-01-02')).toThrow()
    expect(() => validateDate('2026-02-30', '2026-03-01')).toThrow()
    expect(() => validateDate('2024-02-29', '2026-01-02')).not.toThrow()
  })
})
