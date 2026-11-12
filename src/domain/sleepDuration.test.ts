import { expect, it } from 'vitest'
import { formatSleepDuration, parseSleepDuration } from './sleepDuration'

it('convierte duraciones HH:mm sin cambiar los minutos de los registros existentes', () => {
  for (const [text, minutes] of [['00:00', 0], ['00:01', 1], ['07:30', 450], ['23:59', 1439], ['24:00', 1440]] as const) {
    expect(parseSleepDuration(text)).toBe(minutes)
    expect(formatSleepDuration(minutes)).toBe(text)
  }
  expect(parseSleepDuration(' 07:30 ')).toBe(450)
  expect(parseSleepDuration(' ')).toBeUndefined()
  expect(formatSleepDuration(undefined)).toBe('')
})

it('rechaza formatos ambiguos y duraciones fuera de rango', () => {
  for (const raw of ['7:30', '07:3', '07:60', '24:01', '25:00', '-01:00', '450', '7,5', '07:30:00', 'ab:cd']) {
    expect(() => parseSleepDuration(raw), raw).toThrow('HH:mm')
  }
})
