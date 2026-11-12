import Papa from 'papaparse'
import { localDate, metrics, validateDate, validateValues, ValidationError, type DailyValues, type Metric } from './daily'
import { parseSleepDuration } from './sleepDuration'

export const CSV_MAX_BYTES = 10 * 1024 * 1024
export const CSV_MAX_ROWS = 50_000
export const CSV_MAX_ISSUES = 100
export type DateFormat = 'iso' | 'dmy' | 'mdy'
export type SleepUnit = 'minutes' | 'decimalHours' | 'hhmm'
export interface CsvMapping {
  dateColumn?: number
  columns: Partial<Record<Metric, number>>
  dateFormat: DateFormat
  waterUnit: 'ml' | 'l'
  sleepUnit: SleepUnit
  decimalSeparator: ',' | '.'
}
export interface CsvIssue { row?: number; column: string; message: string }
export interface CsvRow { line: number; cells: string[] }
export interface ParsedCsv {
  headers: string[]
  rows: CsvRow[]
  delimiter: string
  issues: CsvIssue[]
  issueCount: number
}
export interface ImportRecord { date: string; values: DailyValues; rows: number[] }
export interface NormalizedCsv {
  records: ImportRecord[]
  issues: CsvIssue[]
  issueCount: number
  duplicateRows: number
  emptyRows: number
}

export function defaultCsvMapping(): CsvMapping {
  return { columns: {}, dateFormat: 'iso', waterUnit: 'ml', sleepUnit: 'hhmm', decimalSeparator: ',' }
}

/** Row numbers refer to physical lines, including quoted fields with newlines. */
export function parseCsv(text: string): ParsedCsv {
  const result: ParsedCsv = { headers: [], rows: [], delimiter: '', issues: [], issueCount: 0 }
  const issue = (value: CsvIssue) => {
    result.issueCount++
    if (result.issues.length < CSV_MAX_ISSUES) result.issues.push(value)
  }
  if (new TextEncoder().encode(text).length > CSV_MAX_BYTES) {
    issue({ column: 'Archivo', message: 'El archivo supera el límite de 10 MB.' })
    return result
  }
  const source = text.replace(/^\uFEFF/, '')
  let cursor = 0, line = 1
  Papa.parse<string[]>(source, {
    delimitersToGuess: [',', ';', '\t'],
    step: (step, parser) => {
      const rowLine = line
      // Count CRLF once, and support files using either LF or CR.
      line += (source.slice(cursor, step.meta.cursor).match(/\r\n|\n|\r/g) ?? []).length
      cursor = step.meta.cursor
      result.delimiter = step.meta.delimiter
      for (const error of step.errors) issue({ row: rowLine, column: 'Archivo', message: error.code === 'UndetectableDelimiter' ? 'No se reconoce el separador. Usa coma, punto y coma o tabulador.' : 'CSV mal formado: revisa las comillas y los separadores.' })
      if (step.data.every(cell => !cell.trim())) return
      if (!result.headers.length) {
        result.headers = step.data.map(cell => cell.trim())
        const seen = new Set<string>()
        for (const name of result.headers) {
          if (!name || seen.has(name.toLocaleLowerCase('es'))) issue({ row: rowLine, column: 'Cabeceras', message: 'Cada columna necesita un nombre único y no vacío.' })
          seen.add(name.toLocaleLowerCase('es'))
        }
        return
      }
      if (result.rows.length >= CSV_MAX_ROWS) {
        issue({ row: rowLine, column: 'Archivo', message: 'El archivo supera el límite de 50.000 filas de datos.' })
        parser.abort()
        return
      }
      if (step.data.length !== result.headers.length) issue({ row: rowLine, column: 'Archivo', message: `Se esperaban ${result.headers.length} columnas y hay ${step.data.length}.` })
      result.rows.push({ line: rowLine, cells: step.data })
    },
  })
  if (!result.headers.length || !result.rows.length) issue({ column: 'Archivo', message: 'Incluye una cabecera y al menos una fila de datos.' })
  return result
}

function csvDate(raw: string, format: DateFormat, today: string) {
  let date = raw.trim()
  if (format !== 'iso') {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date)
    if (!match) throw new ValidationError('La fecha no coincide con el formato seleccionado.')
    date = `${match[3]}-${format === 'dmy' ? match[2] : match[1]}-${format === 'dmy' ? match[1] : match[2]}`
  }
  validateDate(date, today)
  return date
}

function csvValue(raw: string, key: Metric, mapping: CsvMapping) {
  const text = raw.trim()
  if (!text) return undefined
  if (key === 'sleepMinutes' && mapping.sleepUnit === 'hhmm') return parseSleepDuration(text)
  const expression = mapping.decimalSeparator === ',' ? /^\d+(,\d+)?$/ : /^\d+(\.\d+)?$/
  if (!expression.test(text)) throw new ValidationError('Usa el separador decimal seleccionado, sin separadores de miles ni unidades.')
  let value = Number(text.replace(',', '.'))
  if (key === 'waterMl' && mapping.waterUnit === 'l') value *= 1000
  if (key === 'sleepMinutes' && mapping.sleepUnit === 'decimalHours') {
    value *= 60
    if (Math.abs(value - Math.round(value)) < 1e-9) value = Math.round(value)
  }
  validateValues({ [key]: value })
  return value
}

export function normalizeCsv(parsed: ParsedCsv, mapping: CsvMapping, today = localDate()): NormalizedCsv {
  const result: NormalizedCsv = { records: [], issues: [...parsed.issues], issueCount: parsed.issueCount, duplicateRows: 0, emptyRows: 0 }
  const issue = (value: CsvIssue) => {
    result.issueCount++
    if (result.issues.length < CSV_MAX_ISSUES) result.issues.push(value)
  }
  const selected = metrics.filter(({ key }) => mapping.columns[key] !== undefined)
  const indexes = [mapping.dateColumn, ...selected.map(({ key }) => mapping.columns[key])]
  if (mapping.dateColumn === undefined || !selected.length) {
    issue({ column: 'Columnas', message: 'Selecciona la fecha y al menos una métrica.' })
  } else if (indexes.some(index => !Number.isInteger(index) || index! < 0 || index! >= parsed.headers.length) || new Set(indexes).size !== indexes.length) {
    issue({ column: 'Columnas', message: 'Asigna una columna distinta a cada campo.' })
  }
  if (result.issueCount) return result
  const byDate = new Map<string, ImportRecord>()
  const sourceLines = new Map<string, Partial<Record<Metric, number>>>()
  for (const row of parsed.rows) {
    let date: string | undefined
    try { date = csvDate(row.cells[mapping.dateColumn!], mapping.dateFormat, today) }
    catch (cause) { issue({ row: row.line, column: parsed.headers[mapping.dateColumn!], message: (cause as Error).message }) }
    const values: DailyValues = {}
    for (const { key } of selected) {
      const index = mapping.columns[key]!
      try {
        const value = csvValue(row.cells[index], key, mapping)
        if (value !== undefined) values[key] = value
      } catch (cause) { issue({ row: row.line, column: parsed.headers[index], message: (cause as Error).message }) }
    }
    if (!date) continue
    if (!Object.keys(values).length) { result.emptyRows++; continue }
    const previous = byDate.get(date)
    if (previous) {
      const sources = sourceLines.get(date)!
      result.duplicateRows++
      for (const { key } of selected) {
        const value = values[key]
        if (value === undefined) continue
        if (previous.values[key] !== undefined && previous.values[key] !== value) {
          issue({ row: row.line, column: parsed.headers[mapping.columns[key]!], message: `Valor contradictorio para ${date}; revisa también la fila ${sources[key]}.` })
        } else {
          if (previous.values[key] === undefined) sources[key] = row.line
          previous.values[key] = value
        }
      }
      previous.rows.push(row.line)
    } else {
      byDate.set(date, { date, values, rows: [row.line] })
      sourceLines.set(date, Object.fromEntries(Object.keys(values).map(key => [key, row.line])))
    }
  }
  result.records = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
  if (!result.records.length && !result.issueCount) issue({ column: 'Datos', message: 'No hay valores para importar en las columnas seleccionadas.' })
  return result
}
