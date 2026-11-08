import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { AppDatabase, readPreferences, savePreferences } from './database'

import { addWater, readDaily, saveDaily } from './dailyRepository'

const names: string[] = []
afterEach(async () => { for (const name of names.splice(0)) await new AppDatabase(name).delete() })
describe('preferencias locales', () => {
  it('conserva el valor al cerrar y reabrir la base de datos', async () => {
    const name = `test-${crypto.randomUUID()}`; names.push(name)
    const first = new AppDatabase(name)
    expect((await readPreferences(first)).waterShortcutMl).toBe(250)
    await savePreferences(350, first)
    first.close()
    const second = new AppDatabase(name)
    expect((await readPreferences(second)).waterShortcutMl).toBe(350)
    second.close()
  })
  it('rechaza valores inválidos sin sustituir el valor guardado', async () => {
    const name = `test-${crypto.randomUUID()}`; names.push(name)
    const db = new AppDatabase(name)
    await savePreferences(500, db)
    for (const value of [0, -1, 1.5, NaN, Infinity, 2001]) {
      await expect(savePreferences(value, db)).rejects.toThrow('Introduce')
    }
    expect((await readPreferences(db)).waterShortcutMl).toBe(500)
    db.close()
  })
})

describe('registros diarios', () => {
  it('migra desde v1 sin perder preferencias', async () => {
    const name = `test-${crypto.randomUUID()}`; names.push(name)
    const { default: Dexie } = await import('dexie')
    const legacy = new Dexie(name)
    legacy.version(1).stores({ preferences: '&id' })
    await legacy.table('preferences').put({ id: 'personal', waterShortcutMl: 400 })
    legacy.close()
    const db = new AppDatabase(name)
    expect((await readPreferences(db)).waterShortcutMl).toBe(400)
    await saveDaily('2026-01-01', { steps: 0, weightKg: 72.5 }, db)
    db.close()
    const reopened = new AppDatabase(name)
    expect(await readDaily('2026-01-01', reopened)).toMatchObject({ steps: 0, weightKg: 72.5 })
    reopened.close()
  })
  it('edita una sola fila por fecha, conserva otras fechas y borra campos sin convertirlos en cero', async () => {
    const name = `test-${crypto.randomUUID()}`; names.push(name)
    const db = new AppDatabase(name)
    const first = await saveDaily('2026-01-01', { waterMl: 250, steps: 0 }, db)
    await saveDaily('2026-01-02', { weightKg: 70 }, db)
    const edited = await saveDaily('2026-01-01', { steps: 0 }, db)
    expect(edited?.createdAt).toBe(first?.createdAt)
    expect(edited?.waterMl).toBeUndefined()
    expect(await db.dailyRecords.count()).toBe(2)
    await saveDaily('2026-01-01', {}, db)
    expect(await readDaily('2026-01-01', db)).toBeUndefined()
    expect((await readDaily('2026-01-02', db))?.weightKg).toBe(70)
    db.close()
  })
  it('acumula incrementos de agua concurrentes sin perder las demás métricas', async () => {
    const name = `test-${crypto.randomUUID()}`; names.push(name)
    const db = new AppDatabase(name)
    await saveDaily('2026-01-01', { sleepMinutes: 480 }, db)
    await Promise.all([addWater('2026-01-01', 250, db), addWater('2026-01-01', 350, db)])
    expect(await readDaily('2026-01-01', db)).toMatchObject({ waterMl: 600, sleepMinutes: 480 })
    db.close()
  })
  it('rechaza fechas y valores inválidos sin modificar el registro', async () => {
    const name = `test-${crypto.randomUUID()}`; names.push(name)
    const db = new AppDatabase(name)
    await saveDaily('2026-01-01', { steps: 100 }, db)
    for (const values of [{ steps: 1.5 }, { waterMl: -1 }, { sleepMinutes: 1441 }, { sleepScore: 101 }, { weightKg: 0 }, { weightKg: NaN }, { steps: Infinity }]) {
      await expect(saveDaily('2026-01-01', values, db)).rejects.toThrow()
    }
    for (const date of ['2026-02-30', '2999-01-01', 'invalid']) await expect(saveDaily(date, { steps: 1 }, db)).rejects.toThrow()
    expect((await readDaily('2026-01-01', db))?.steps).toBe(100)
    db.close()
  })
})
