import type { DailyRecord } from '../data/database'
import { type Metric } from './daily'
import { targetFor, type Goals } from './goals'

export function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00`)
  value.setDate(value.getDate() + days)
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

export function datesBetween(start: string, end: string) {
  const days: string[] = []
  for (let date = start; date <= end; date = shiftDate(date, 1)) days.push(date)
  return days
}

export interface HistoryPoint { date: string; value?: number; target?: number; movingAverage?: number; sleepScore?: number }
export function buildHistory(records: DailyRecord[], goals: Goals[], metric: Metric, start: string, end: string): HistoryPoint[] {
  const byDate = new Map(records.map(record => [record.date, record]))
  return datesBetween(start, end).map(date => {
    const values = metric === 'weightKg' ? datesBetween(shiftDate(date, -6), date).map(day => byDate.get(day)?.weightKg).filter((v): v is number => v !== undefined) : []
    return { date, sleepScore: byDate.get(date)?.sleepScore, value: byDate.get(date)?.[metric], target: targetFor(goals, date, metric), movingAverage: values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : undefined }
  })
}

export function summarize(points: HistoryPoint[]) {
  const values = points.flatMap(point => point.value === undefined ? [] : [point.value])
  const eligible = points.filter(point => point.value !== undefined && point.target !== undefined)
  return {
    count: values.length,
    average: values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : undefined,
    min: values.length ? Math.min(...values) : undefined,
    max: values.length ? Math.max(...values) : undefined,
    change: values.length > 1 ? values.at(-1)! - values[0] : undefined,
    eligible: eligible.length,
    achieved: eligible.filter(point => point.value! >= point.target!).length,
    missing: points.length - values.length,
  }
}

export function formatValue(value: number | undefined, metric: Metric) {
  if (value === undefined) return 'Sin registrar'
  if (metric === 'sleepMinutes') {
    const rounded = Math.round(value)
    return `${Math.floor(rounded / 60)} h ${rounded % 60} min`
  }
  return `${value.toLocaleString('es', { useGrouping: 'always', maximumFractionDigits: metric === 'weightKg' ? 2 : 1 })} ${metric === 'waterMl' ? 'ml' : metric === 'weightKg' ? 'kg' : metric === 'steps' ? 'pasos' : 'puntos'}`
}

export function shortDate(date: string) {
  return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' }).format(new Date(`${date}T12:00:00`))
}
