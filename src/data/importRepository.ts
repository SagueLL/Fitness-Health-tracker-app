import { metrics, validateDate, validateValues, valuesOf, ValidationError, type DailyValues, type Metric } from '../domain/daily'
import { CSV_MAX_ROWS, type ImportRecord } from '../domain/csvImport'
import { database, type DailyRecord } from './database'

export interface ImportConflict { date: string; metric: Metric; existing: number; incoming: number; rows: number[] }
export interface ImportDayPreview { date: string; added: DailyValues; preserved: DailyValues; isNew: boolean }
export interface ImportPreview {
  newDays: number
  updatedDays: number
  unchangedDays: number
  addedValues: number
  identicalValues: number
  conflictCount: number
  conflicts: ImportConflict[]
  days: ImportDayPreview[]
}

function validateImport(records: ImportRecord[]) {
  if (!records.length || records.length > CSV_MAX_ROWS) throw new ValidationError('Selecciona entre 1 y 50.000 fechas para importar.')
  const dates = new Set<string>()
  for (const record of records) {
    validateDate(record.date)
    validateValues(record.values)
    if (dates.has(record.date) || !metrics.some(({ key }) => record.values[key] !== undefined)) throw new ValidationError('Revisa las fechas repetidas y los valores del archivo.')
    dates.add(record.date)
  }
}

function planMerge(records: ImportRecord[], previous: (DailyRecord | undefined)[]): ImportPreview {
  const preview: ImportPreview = { newDays: 0, updatedDays: 0, unchangedDays: 0, addedValues: 0, identicalValues: 0, conflictCount: 0, conflicts: [], days: [] }
  records.forEach((record, index) => {
    const existing = previous[index]
    const added: DailyValues = {}, preserved: DailyValues = {}
    for (const { key } of metrics) {
      const incoming = record.values[key], saved = existing?.[key]
      if (incoming === undefined) continue
      if (saved === undefined) { added[key] = incoming; preview.addedValues++ }
      else if (saved === incoming) preview.identicalValues++
      else {
        preserved[key] = saved
        preview.conflictCount++
        if (preview.conflicts.length < 100) preview.conflicts.push({ date: record.date, metric: key, existing: saved, incoming, rows: record.rows })
      }
    }
    if (!Object.keys(added).length) preview.unchangedDays++
    else if (existing) preview.updatedDays++
    else preview.newDays++
    preview.days.push({ date: record.date, added, preserved, isNew: !existing })
  })
  return preview
}

export async function previewDailyImport(records: ImportRecord[], db = database) {
  validateImport(records)
  return planMerge(records, await db.dailyRecords.bulkGet(records.map(record => record.date)))
}

/** Re-read inside the same transaction as the writes, including other-tab edits. */
export async function importDailyRecords(records: ImportRecord[], db = database) {
  validateImport(records)
  return db.transaction('rw', db.dailyRecords, async () => {
    const previous = await db.dailyRecords.bulkGet(records.map(record => record.date))
    const preview = planMerge(records, previous)
    const now = new Date().toISOString()
    const writes = preview.days.flatMap((day, index): DailyRecord[] => Object.keys(day.added).length ? [{
      ...valuesOf(previous[index]), ...day.added, date: day.date,
      createdAt: previous[index]?.createdAt ?? now, updatedAt: now,
    }] : [])
    if (writes.length) await db.dailyRecords.bulkPut(writes)
    return preview
  })
}
