import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, expect, it } from 'vitest'
import { AppDatabase, readPreferences } from './database'
import { readGoals, readHistory, saveGoals } from './historyRepository'
import { localDate } from '../domain/daily'
import { shiftDate } from '../domain/history'

const names: string[] = []
afterEach(async () => { for (const name of names.splice(0)) await new AppDatabase(name).delete() })
it('migra v2 conservando registros y preferencias y persiste los objetivos', async () => {
  const name = `history-${crypto.randomUUID()}`; names.push(name)
  const legacy = new Dexie(name)
  legacy.version(2).stores({ preferences: '&id', dailyRecords: '&date' })
  await legacy.table('preferences').put({ id: 'personal', waterShortcutMl: 350 })
  await legacy.table('dailyRecords').put({ date: '2026-01-01', steps: 0, createdAt: '', updatedAt: '' })
  legacy.close()
  const db = new AppDatabase(name)
  await saveGoals({ effectiveFrom: localDate(), steps: 7000 }, false, db)
  expect((await readPreferences(db)).waterShortcutMl).toBe(350)
  expect((await readHistory('2026-01-01', '2026-01-02', db)).records[0].steps).toBe(0)
  db.close()
  const reopened = new AppDatabase(name)
  expect((await readGoals(reopened))[0].steps).toBe(7000)
  reopened.close()
})
it('requiere sustitución explícita por fecha y rechaza objetivos inválidos o retroactivos', async () => {
  const name = `history-${crypto.randomUUID()}`; names.push(name)
  const db = new AppDatabase(name), today = localDate()
  await saveGoals({ effectiveFrom: today, waterMl: 2000 }, false, db)
  await expect(saveGoals({ effectiveFrom: today, waterMl: 2500 }, false, db)).rejects.toThrow('Confirma')
  await expect(saveGoals({ effectiveFrom: today, steps: 1.5 }, true, db)).rejects.toThrow()
  await expect(saveGoals({ effectiveFrom: today, waterMl: 0 }, true, db)).rejects.toThrow()
  await expect(saveGoals({ effectiveFrom: shiftDate(today, -1), steps: 100 }, false, db)).rejects.toThrow('hoy')
  expect((await readGoals(db))[0].waterMl).toBe(2000)
  await saveGoals({ effectiveFrom: today, steps: 8000 }, true, db)
  await saveGoals({ effectiveFrom: shiftDate(today, 1), waterMl: 2500 }, false, db)
  expect(await readGoals(db)).toEqual([{ effectiveFrom: today, steps: 8000 }, { effectiveFrom: shiftDate(today, 1), waterMl: 2500 }])
  db.close()
})
