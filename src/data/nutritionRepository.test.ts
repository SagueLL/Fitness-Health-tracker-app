import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, expect, it } from 'vitest'
import { AppDatabase, readPreferences } from './database'
import { readNutritionGoals, saveNutritionGoal } from './nutritionRepository'
import { localDate } from '../domain/daily'
import { shiftDate } from '../domain/history'
import { nutritionForDate, type NutritionInputs } from '../domain/nutrition'

const names: string[] = []
afterEach(async () => { for (const name of names.splice(0)) await new AppDatabase(name).delete() })
const inputs: NutritionInputs = { weightKg: 100, heightCm: 175, age: 40, equation: 'male', pal: 1.3, phase: 'loss', adjustmentMode: 'percent', adjustment: 15, proteinPerKg: 1.8, fatPerKg: .8 }

it('migra v3 a v4 sin perder preferencias, registros ni objetivos básicos', async () => {
  const name = `nutrition-${crypto.randomUUID()}`; names.push(name)
  const old = new Dexie(name)
  old.version(3).stores({ preferences: '&id', dailyRecords: '&date', goals: '&effectiveFrom' })
  await old.table('preferences').put({ id: 'personal', waterShortcutMl: 350 })
  await old.table('dailyRecords').put({ date: '2026-01-01', steps: 0, createdAt: '', updatedAt: '' })
  await old.table('goals').put({ effectiveFrom: '2026-01-01', waterMl: 2000 })
  old.close()
  const db = new AppDatabase(name)
  const saved = await saveNutritionGoal(inputs, localDate(), false, db)
  expect((await readPreferences(db)).waterShortcutMl).toBe(350)
  expect((await db.dailyRecords.get('2026-01-01'))?.steps).toBe(0)
  expect((await db.goals.get('2026-01-01'))?.waterMl).toBe(2000)
  db.close()
  const reopened = new AppDatabase(name)
  expect((await readNutritionGoals(reopened))[0]).toEqual(saved)
  expect(saved.result.targetKcal).toBeCloseTo(2098.11875, 8)
  expect(saved.formulaVersion).toBe('mifflin-pal-macros-v1')
  reopened.close()
})
it('conserva instantáneas y exige confirmación para nuevas revisiones de la misma fecha', async () => {
  const name = `nutrition-${crypto.randomUUID()}`; names.push(name)
  const db = new AppDatabase(name), today = localDate()
  const first = await saveNutritionGoal(inputs, today, false, db)
  await expect(saveNutritionGoal({ ...inputs, adjustment: 10 }, today, false, db)).rejects.toThrow('Confirma')
  const second = await saveNutritionGoal({ ...inputs, adjustment: 10 }, today, true, db)
  expect(second.revision).toBe(2)
  expect((await db.nutritionGoals.get(first.id))?.inputs.adjustment).toBe(15)
  expect(nutritionForDate(await readNutritionGoals(db), today)?.id).toBe(second.id)
  const future = await saveNutritionGoal(inputs, shiftDate(today, 1), false, db)
  expect(nutritionForDate(await readNutritionGoals(db), today)?.id).not.toBe(future.id)
  await expect(saveNutritionGoal(inputs, shiftDate(today, -1), false, db)).rejects.toThrow('hoy')
  await expect(saveNutritionGoal({ ...inputs, proteinPerKg: 100 }, today, true, db)).rejects.toThrow()
  expect(await db.nutritionGoals.count()).toBe(3)
  db.close()
})
