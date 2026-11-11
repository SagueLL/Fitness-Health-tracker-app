import { expect, it } from 'vitest'
import { historyTone } from './historyTone'

it('asigna límites sin solapamientos, incluyendo 80 y 90 exactos', () => {
  for (const [score, tone] of [[100, 'pink'], [90, 'pink'], [89.9, 'lime'], [80, 'lime'], [79.9, 'green'], [70, 'green'], [60, 'yellow'], [50, 'brown'], [49.9, 'red'], [0, 'red']] as const) {
    expect(historyTone('sleepScore', score)?.tone).toBe(tone)
  }
})
it('usa el objetivo de cada registro sin premiar exceso ni clasificar peso o datos ausentes', () => {
  expect(historyTone('waterMl', 1800, 2000)?.tone).toBe('pink')
  expect(historyTone('waterMl', 1800, 3000)?.tone).toBe('yellow')
  expect(historyTone('steps', 8000, 10000)?.tone).toBe('lime')
  expect(historyTone('sleepMinutes', 336, 480)?.tone).toBe('green')
  expect(historyTone('waterMl', 5000, 2000)?.tone).toBe('pink')
  expect(historyTone('weightKg', 75, 80)).toBeUndefined()
  expect(historyTone('steps', 100)).toBeUndefined()
  expect(historyTone('sleepScore', undefined)).toBeUndefined()
  expect(historyTone('waterMl', 0, 0)).toBeUndefined()
})
