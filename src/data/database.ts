import Dexie, { type EntityTable } from 'dexie'

export interface Preferences {
  id: 'personal'
  waterShortcutMl: number
}

export interface DailyRecord {
  date: string
  waterMl?: number
  sleepMinutes?: number
  sleepScore?: number
  steps?: number
  weightKg?: number
  createdAt: string
  updatedAt: string
}

export class AppDatabase extends Dexie {
  preferences!: EntityTable<Preferences, 'id'>
  dailyRecords!: EntityTable<DailyRecord, 'date'>

  constructor(name = 'fitness-health-tracker') {
    super(name)
    this.version(1).stores({ preferences: '&id' })
    this.version(2).stores({ dailyRecords: '&date' })
  }
}

export const database = new AppDatabase()

export async function readPreferences(db = database): Promise<Preferences> {
  return (await db.preferences.get('personal')) ?? { id: 'personal', waterShortcutMl: 250 }
}

export async function savePreferences(waterShortcutMl: number, db = database) {
  if (!Number.isInteger(waterShortcutMl) || waterShortcutMl < 1 || waterShortcutMl > 2000) {
    throw new Error('Introduce una cantidad entera entre 1 y 2000 ml.')
  }
  await db.preferences.put({ id: 'personal', waterShortcutMl })
}
