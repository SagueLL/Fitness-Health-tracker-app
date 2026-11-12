import { ValidationError } from './daily'

/** A duration, not a time of day. Preserve the existing 24-hour maximum. */
export function parseSleepDuration(raw: string): number | undefined {
  const value = raw.trim()
  if (!value) return undefined
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) && value !== '24:00') {
    throw new ValidationError('Introduce la duración del sueño en HH:mm, entre 00:00 y 24:00. Ejemplo: 07:30.')
  }
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

export function formatSleepDuration(minutes: number | undefined): string {
  if (minutes === undefined) return ''
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}
