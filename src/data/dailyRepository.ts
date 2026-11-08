import { database, type AppDatabase, type DailyRecord } from './database'
import { validateDate, validateValues, valuesOf, type DailyValues } from '../domain/daily'

export async function readDaily(date: string, db = database) {
  validateDate(date)
  return db.dailyRecords.get(date)
}

async function writeDaily(date: string, values: DailyValues, previous: DailyRecord | undefined, db: AppDatabase) {
  validateValues(values)
  const present = Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined))
  if (!Object.keys(present).length) {
    await db.dailyRecords.delete(date)
    return undefined
  }
  const now = new Date().toISOString()
  const record: DailyRecord = { ...present, date, createdAt: previous?.createdAt ?? now, updatedAt: now }
  await db.dailyRecords.put(record)
  return record
}

export async function saveDaily(date: string, values: DailyValues, db = database) {
  validateDate(date)
  return db.transaction('rw', db.dailyRecords, async () => writeDaily(date, values, await db.dailyRecords.get(date), db))
}

export async function addWater(date: string, amount: number, db = database) {
  validateDate(date)
  if (!Number.isInteger(amount) || amount <= 0 || amount > 2000) throw new Error('Cantidad de agua no válida.')
  return db.transaction('rw', db.dailyRecords, async () => {
    const previous = await db.dailyRecords.get(date)
    return writeDaily(date, { ...valuesOf(previous), waterMl: (previous?.waterMl ?? 0) + amount }, previous, db)
  })
}
