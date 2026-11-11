import { expect, it } from 'vitest'
import { averageSleepScore, observedSleepRange, type SleepRecord } from './sleep'

const nights = (count: number): SleepRecord[] => Array.from({ length: count }, (_, i) => ({ date: `2026-01-${String(i + 1).padStart(2, '0')}`, sleepMinutes: 420, sleepScore: 60 + i }))
it('exige datos emparejados suficientes y variación antes de proponer un rango', () => {
  expect(observedSleepRange(nights(13), '2026-02-01')).toMatchObject({ state: 'insufficient', count: 13 })
  expect(observedSleepRange(nights(20).map(n => ({ ...n, sleepScore: 85 })), '2026-02-01')).toMatchObject({ state: 'similar', count: 20 })
})
it('usa el rango intercuartílico de las mejores noches para reducir el efecto de extremos', () => {
  const records = nights(20)
  const durations = [480, 480, 495, 510, 900]
  durations.forEach((sleepMinutes, index) => { records[index] = { ...records[index], sleepMinutes, sleepScore: 100 - index } })
  const original = JSON.stringify(records)
  expect(observedSleepRange(records, '2026-02-01')).toMatchObject({ state: 'ready', count: 20, bestCount: 5, threshold: 96, low: 480, high: 510 })
  expect(JSON.stringify(records)).toBe(original)
})
it('incluye empates y excluye fechas futuras, datos ausentes, cero duración y puntuaciones inválidas', () => {
  const records = nights(20)
  for (let i = 0; i < 7; i++) records[i] = { ...records[i], sleepScore: 95, sleepMinutes: 480 }
  const extra = [
    { date: '2026-03-01', sleepMinutes: 600, sleepScore: 100 },
    { date: '2026-01-25', sleepMinutes: 0, sleepScore: 100 },
    { date: '2026-01-26', sleepMinutes: 500 },
    { date: '2026-01-27', sleepMinutes: 500, sleepScore: NaN },
  ]
  expect(observedSleepRange([...records, ...extra], '2026-02-01')).toMatchObject({ state: 'ready', count: 20, bestCount: 7, low: 480, high: 480 })
})
it('colorea la media con calidad emparejada del periodo, sin sustituir ausencias por ceros', () => {
  expect(averageSleepScore([
    { date: '2026-01-01', sleepMinutes: 480, sleepScore: 100 },
    { date: '2026-01-02', sleepMinutes: 400, sleepScore: 0 },
    { date: '2026-01-03', sleepMinutes: 600 },
    { date: '2025-12-31', sleepMinutes: 480, sleepScore: 100 },
  ], '2026-01-01', '2026-01-03')).toEqual({ count: 2, score: 50 })
})
