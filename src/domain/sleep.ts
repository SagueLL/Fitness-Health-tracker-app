import type { DailyRecord } from '../data/database'

export type SleepRecord = Pick<DailyRecord, 'date' | 'sleepMinutes' | 'sleepScore'>
export function pairedNights(records: SleepRecord[]) {
  return records.filter((record): record is SleepRecord & { sleepMinutes: number; sleepScore: number } =>
    record.sleepMinutes !== undefined && Number.isFinite(record.sleepMinutes) && record.sleepMinutes > 0 && record.sleepMinutes <= 1440 &&
    record.sleepScore !== undefined && Number.isFinite(record.sleepScore) && record.sleepScore >= 0 && record.sleepScore <= 100)
}

export function averageSleepScore(records: SleepRecord[], start: string, end: string) {
  const pairs = pairedNights(records.filter(record => record.date >= start && record.date <= end))
  return { count: pairs.length, score: pairs.length ? pairs.reduce((sum, record) => sum + record.sleepScore, 0) / pairs.length : undefined }
}

function percentile(sorted: number[], fraction: number) {
  const index = (sorted.length - 1) * fraction
  const lower = Math.floor(index)
  return sorted[lower] + (sorted[Math.ceil(index)] - sorted[lower]) * (index - lower)
}

// Exploratory association, not a prescription: IQR of the highest-scoring nights.
export function observedSleepRange(records: SleepRecord[], end: string) {
  const pairs = pairedNights(records.filter(record => record.date <= end))
  if (pairs.length < 14) return { state: 'insufficient' as const, count: pairs.length }
  const ranked = [...pairs].sort((a, b) => b.sleepScore - a.sleepScore)
  if (ranked[0].sleepScore - ranked.at(-1)!.sleepScore < 10) return { state: 'similar' as const, count: pairs.length }
  const threshold = ranked[Math.max(5, Math.ceil(ranked.length * .25)) - 1].sleepScore
  const best = ranked.filter(record => record.sleepScore >= threshold)
  const durations = best.map(record => record.sleepMinutes).sort((a, b) => a - b)
  return {
    state: 'ready' as const, count: pairs.length, bestCount: best.length, threshold,
    low: percentile(durations, .25), high: percentile(durations, .75),
    score: best.reduce((sum, record) => sum + record.sleepScore, 0) / best.length,
  }
}
