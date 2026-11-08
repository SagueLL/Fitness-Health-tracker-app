import type { NutritionGoal } from '../domain/nutrition'
import type { Goals } from '../domain/goals'
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
  goals!: EntityTable<Goals, 'effectiveFrom'>
  nutritionGoals!: EntityTable<NutritionGoal, 'id'>

  constructor(name = 'fitness-health-tracker') {
    super(name)
    this.version(1).stores({ preferences: '&id' })
    this.version(2).stores({ dailyRecords: '&date' })
    this.version(3).stores({ goals: '&effectiveFrom' })
    this.version(4).stores({ nutritionGoals: 'id, effectiveFrom, &[effectiveFrom+revision]' })
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
