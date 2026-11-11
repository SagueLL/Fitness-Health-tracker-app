import { expect, it } from 'vitest'
import { waterAverageTone, waterProgress } from './water'
const points = (days: number, value?: number) => Array.from({ length: days }, (_, i) => ({ date: String(i), value }))
it('usa 3 litros por cada día del periodo y limita el círculo al 100 %', () => {
  for (const days of [7, 30, 90]) {
    expect(waterProgress(points(days, 3000))).toMatchObject({ totalMl: days * 3000, targetMl: days * 3000, fraction: 1, reached: true })
  }
  expect(waterProgress(points(7, 3500))).toMatchObject({ totalMl: 24500, fraction: 1, reached: true })
  expect(waterProgress(points(7, 1500)).fraction).toBe(.5)
})
it('no reduce la meta cuando faltan registros y distingue ausencias de cero', () => {
  expect(waterProgress([...points(6), { date: '6', value: 0 }])).toMatchObject({ count: 1, targetMl: 21000, totalMl: 0, fraction: 0 })
  expect(waterProgress([])).toMatchObject({ fraction: 0, reached: false })
})
it('colorea la media por tramos absolutos de medio litro', () => {
  for (const [value, tone] of [[3000, 'pink'], [3500, 'pink'], [2999, 'lime'], [2500, 'lime'], [2000, 'green'], [1500, 'yellow'], [1000, 'brown'], [999, 'red'], [0, 'red']] as const) {
    expect(waterAverageTone(value)?.tone).toBe(tone)
  }
  expect(waterAverageTone(3000)?.label).toBe('Excelente')
  expect(waterAverageTone(undefined)).toBeUndefined()
})
