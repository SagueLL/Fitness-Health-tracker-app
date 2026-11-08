import { describe, expect, it } from 'vitest'
import { buildHistory, shiftDate, summarize } from './history'
import { goalForDate } from './goals'
import type { DailyRecord } from '../data/database'

const record = (date: string, values: Partial<DailyRecord>): DailyRecord => ({ date, createdAt: '', updatedAt: '', ...values })
describe('histórico y objetivos', () => {
  it('elige la versión vigente y permite dejar métricas sin objetivo', () => {
    const goals = [{ effectiveFrom: '2026-01-01', waterMl: 2000 }, { effectiveFrom: '2026-01-03', steps: 8000 }]
    expect(goalForDate(goals, '2025-12-31')).toBeUndefined()
    expect(goalForDate([...goals].reverse(), '2026-01-02')?.waterMl).toBe(2000)
    expect(goalForDate(goals, '2026-01-03')?.waterMl).toBeUndefined()
  })
  it('conserva huecos, incluye ceros y calcula cobertura y cumplimiento con el objetivo de cada día', () => {
    const points = buildHistory([
      record('2026-01-01', { waterMl: 0 }), record('2026-01-03', { waterMl: 2000 }), record('2026-01-04', { waterMl: 2500 }),
    ], [{ effectiveFrom: '2026-01-02', waterMl: 2000 }, { effectiveFrom: '2026-01-04', waterMl: 3000 }], 'waterMl', '2026-01-01', '2026-01-04')
    expect(points[1].value).toBeUndefined()
    expect(points.map(point => point.target)).toEqual([undefined, 2000, 2000, 3000])
    expect(summarize(points)).toMatchObject({ count: 3, average: 1500, eligible: 2, achieved: 1, missing: 1, min: 0, max: 2500 })
  })
  it('calcula la media móvil del peso con siete días naturales, no siete registros', () => {
    const points = buildHistory([
      record('2026-01-01', { weightKg: 90 }), record('2026-01-02', { weightKg: 80 }), record('2026-01-08', { weightKg: 70 }),
    ], [], 'weightKg', '2026-01-08', '2026-01-09')
    expect(points[0].movingAverage).toBe(75)
    expect(points[1].movingAverage).toBe(70)
    expect(summarize(points).change).toBeUndefined()
  })
  it('no inventa medias sin registros y atraviesa límites de mes', () => {
    expect(summarize(buildHistory([], [], 'steps', '2026-01-01', '2026-01-07'))).toMatchObject({ count: 0, average: undefined, missing: 7 })
    expect(shiftDate('2024-03-01', -1)).toBe('2024-02-29')
  })
})
