import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { AppDatabase, readPreferences, savePreferences } from './database'

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
