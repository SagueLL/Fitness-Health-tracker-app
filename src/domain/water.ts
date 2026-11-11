import type { HistoryPoint } from './history'

export const WATER_DAILY_TARGET_ML = 3000
export function waterProgress(points: HistoryPoint[]) {
  const values = points.flatMap(point => point.value !== undefined ? [point.value] : [])
  const totalMl = values.reduce((sum, value) => sum + value, 0)
  const targetMl = points.length * WATER_DAILY_TARGET_ML
  return { totalMl, targetMl, count: values.length, fraction: targetMl > 0 ? Math.min(1, totalMl / targetMl) : 0, reached: targetMl > 0 && totalMl >= targetMl }
}

export function waterAverageTone(averageMl: number | undefined) {
  if (averageMl === undefined || !Number.isFinite(averageMl) || averageMl < 0) return undefined
  if (averageMl >= 3000) return { tone: 'pink', label: 'Excelente' }
  if (averageMl >= 2500) return { tone: 'lime', label: '2,5–<3 L' }
  if (averageMl >= 2000) return { tone: 'green', label: '2–<2,5 L' }
  if (averageMl >= 1500) return { tone: 'yellow', label: '1,5–<2 L' }
  if (averageMl >= 1000) return { tone: 'brown', label: '1–<1,5 L' }
  return { tone: 'red', label: 'Menos de 1 L' }
}
