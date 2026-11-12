import 'fake-indexeddb/auto'
import { afterEach, expect, it } from 'vitest'
import { AppDatabase } from './database'
import { saveDaily } from './dailyRepository'
import { importDailyRecords, previewDailyImport } from './importRepository'
import type { ImportRecord } from '../domain/csvImport'

const databases: AppDatabase[] = []
function createDb() { const db = new AppDatabase(`import-${crypto.randomUUID()}`); databases.push(db); return db }
afterEach(async () => { for (const db of databases.splice(0)) await db.delete() })
const records: ImportRecord[] = [
  { date: '2026-01-01', values: { waterMl: 3000, sleepMinutes: 450, steps: 5000 }, rows: [2] },
  { date: '2026-01-02', values: { weightKg: 72.5, sleepScore: 0 }, rows: [3] },
]

it('previsualiza sin escribir y completa ausencias conservando ceros, otras métricas y fechas', async () => {
  const db = createDb()
  const first = await saveDaily('2026-01-01', { waterMl: 0, steps: 5000, weightKg: 73 }, db)
  await saveDaily('2026-01-03', { steps: 10 }, db)
  const preview = await previewDailyImport(records, db)
  expect(preview).toMatchObject({ newDays: 1, updatedDays: 1, addedValues: 3, identicalValues: 1, conflictCount: 1 })
  expect(preview.conflicts[0]).toMatchObject({ existing: 0, incoming: 3000, metric: 'waterMl', rows: [2] })
  expect(await db.dailyRecords.count()).toBe(2)
  expect(await db.dailyRecords.get('2026-01-01')).toEqual(first)
  await importDailyRecords(records, db)
  expect(await db.dailyRecords.get('2026-01-01')).toMatchObject({ waterMl: 0, steps: 5000, weightKg: 73, sleepMinutes: 450, createdAt: first!.createdAt })
  expect(await db.dailyRecords.get('2026-01-02')).toMatchObject({ weightKg: 72.5, sleepScore: 0 })
  expect(await db.dailyRecords.get('2026-01-03')).toMatchObject({ steps: 10 })
  const before = await db.dailyRecords.toArray()
  const again = await importDailyRecords(records, db)
  expect(again).toMatchObject({ newDays: 0, updatedDays: 0, unchangedDays: 2, addedValues: 0, conflictCount: 1 })
  expect(await db.dailyRecords.toArray()).toEqual(before)
  expect(db.verno).toBe(5)
})

it('relee los datos al confirmar y conserva cambios posteriores a la previsualización', async () => {
  const db = createDb()
  expect((await previewDailyImport(records, db)).newDays).toBe(2)
  await saveDaily('2026-01-01', { waterMl: 250, sleepMinutes: 480 }, db)
  const result = await importDailyRecords(records, db)
  expect(result).toMatchObject({ newDays: 1, updatedDays: 1, conflictCount: 2 })
  expect(await db.dailyRecords.get('2026-01-01')).toMatchObject({ waterMl: 250, sleepMinutes: 480, steps: 5000 })
})

it('revierte toda la transacción si falla una escritura después de otra válida', async () => {
  const db = createDb()
  const first = await saveDaily('2026-01-01', { waterMl: 0 }, db)
  db.dailyRecords.hook('creating', (_key, record) => {
    if (record.date === '2026-01-02') throw new DOMException('Quota', 'QuotaExceededError')
  })
  await expect(importDailyRecords(records, db)).rejects.toThrow('Quota')
  expect(await db.dailyRecords.toArray()).toEqual([first])
})

it('rechaza datos inválidos o fechas duplicadas antes de escribir', async () => {
  const db = createDb()
  for (const input of [[], [...records, records[0]], [{ ...records[0], values: { sleepMinutes: 1441 } }], [{ ...records[0], date: '2999-01-01' }]]) {
    await expect(importDailyRecords(input, db)).rejects.toThrow()
  }
  expect(await db.dailyRecords.count()).toBe(0)
})

it('serializa importaciones concurrentes sin perder métricas complementarias', async () => {
  const db = createDb()
  await Promise.all([
    importDailyRecords([{ date: '2026-01-01', values: { steps: 100 }, rows: [2] }], db),
    importDailyRecords([{ date: '2026-01-01', values: { waterMl: 250 }, rows: [2] }], db),
  ])
  expect(await db.dailyRecords.get('2026-01-01')).toMatchObject({ steps: 100, waterMl: 250 })
})
