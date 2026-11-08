import type { DailyRecord } from '../data/database'

export type Metric = 'waterMl' | 'sleepMinutes' | 'sleepScore' | 'steps' | 'weightKg'
export type DailyValues = Partial<Record<Metric, number>>
export class ValidationError extends Error {}
export const metrics: { key: Metric; label: string; unit: string; integer?: boolean; max?: number; positive?: boolean }[] = [
  { key: 'waterMl', label: 'Agua', unit: 'ml' },
  { key: 'sleepMinutes', label: 'Duración del sueño', unit: 'min', integer: true, max: 1440 },
  { key: 'sleepScore', label: 'Puntuación del sueño', unit: '0–100', max: 100 },
  { key: 'steps', label: 'Pasos', unit: 'pasos', integer: true },
  { key: 'weightKg', label: 'Peso', unit: 'kg', positive: true },
]

export function localDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function validateDate(date: string, today = localDate()) {
  const parsed = new Date(`${date}T12:00:00`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || localDate(parsed) !== date || date > today) {
    throw new ValidationError('Elige una fecha válida que no sea futura.')
  }
}

export function validateValues(values: DailyValues) {
  for (const metric of metrics) {
    const value = values[metric.key]
    if (value === undefined) continue
    if (!Number.isFinite(value) || value < 0 || (metric.positive && value === 0) || (metric.integer && !Number.isSafeInteger(value)) || (metric.max !== undefined && value > metric.max)) {
      throw new ValidationError(`Revisa ${metric.label.toLowerCase()}: el valor no es válido.`)
    }
  }
}

export function parseValue(raw: string): number | undefined {
  if (!raw.trim()) return undefined
  const normalized = raw.trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(normalized)) throw new ValidationError('Introduce un número válido, sin separadores de miles.')
  return Number(normalized)
}

export function valuesOf(record?: DailyRecord): DailyValues {
  return Object.fromEntries(metrics.filter(metric => record?.[metric.key] !== undefined).map(metric => [metric.key, record![metric.key]]))
}
