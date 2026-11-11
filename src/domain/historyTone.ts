import type { Metric } from './daily'

export const toneBands = [
  { tone: 'pink', label: '90–100', min: 90 },
  { tone: 'lime', label: '80–<90', min: 80 },
  { tone: 'green', label: '70–<80', min: 70 },
  { tone: 'yellow', label: '60–<70', min: 60 },
  { tone: 'brown', label: '50–<60', min: 50 },
  { tone: 'red', label: '0–<50', min: 0 },
] as const

export function historyTone(metric: Metric, value: number | undefined, target?: number, sleepScore?: number): ((typeof toneBands)[number] & { score: number }) | undefined {
  if (metric === 'weightKg' || value === undefined || !Number.isFinite(value) || value < 0) return undefined
  if (metric === 'sleepMinutes') return sleepScore !== undefined && sleepScore >= 0 && sleepScore <= 100 ? historyTone('sleepScore', sleepScore) : undefined
  if (metric !== 'sleepScore' && (target === undefined || !Number.isFinite(target) || target <= 0)) return undefined
  const score = metric === 'sleepScore' ? value : value / target! * 100
  return { ...toneBands.find(band => Math.min(100, score) >= band.min)!, score }
}
