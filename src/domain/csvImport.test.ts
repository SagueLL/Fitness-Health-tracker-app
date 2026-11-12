import { describe, expect, it } from 'vitest'
import { CSV_MAX_BYTES, CSV_MAX_ROWS, defaultCsvMapping, normalizeCsv, parseCsv, type CsvMapping } from './csvImport'

const today = '2026-11-12'
const mapping = (overrides: Partial<CsvMapping> = {}): CsvMapping => ({ ...defaultCsvMapping(), dateColumn: 0, columns: { waterMl: 1 }, ...overrides })
const normalize = (text: string, config = mapping()) => normalizeCsv(parseCsv(text), config, today)

describe('lectura CSV', () => {
  it('admite BOM, separadores, campos entrecomillados y líneas físicas', () => {
    for (const delimiter of [',', ';', '\t']) {
      const parsed = parseCsv(`\uFEFFfecha${delimiter}agua${delimiter}nota\r\n2026-01-01${delimiter}2500${delimiter}"texto${delimiter} con\r\nsalto"\r\n\r\n2026-01-02${delimiter}0${delimiter}fin`)
      expect(parsed.issueCount).toBe(0)
      expect(parsed.delimiter).toBe(delimiter)
      expect(parsed.rows.map(row => row.line)).toEqual([2, 5])
      expect(parsed.rows[0].cells[2]).toContain('salto')
      expect(normalizeCsv(parsed, mapping(), today).records[1].values.waterMl).toBe(0)
    }
  })
  it('bloquea cabeceras, columnas y comillas incorrectas y archivos sin datos', () => {
    for (const text of ['', 'fecha;agua', 'fecha;agua;Agua\n2026-01-01;1;2', 'fecha;\n2026-01-01;1', 'fecha;agua\n2026-01-01;1;2', 'fecha;agua\n2026-01-01;"2500']) {
      const parsed = parseCsv(text)
      expect(parsed.issueCount, text).toBeGreaterThan(0)
      expect(normalizeCsv(parsed, mapping(), today).issueCount).toBeGreaterThan(0)
    }
  })
  it('limita bytes, filas y errores mostrados', () => {
    expect(parseCsv('ñ'.repeat(CSV_MAX_BYTES / 2 + 1)).issues[0].message).toContain('10 MB')
    const parsed = parseCsv(`fecha;agua\n${'2026-01-01;1\n'.repeat(CSV_MAX_ROWS + 1)}`)
    expect(parsed.rows).toHaveLength(CSV_MAX_ROWS)
    expect(parsed.issues[0].message).toContain('50.000')
    const invalid = normalize(`fecha;agua\n${'2026-01-01;-1\n'.repeat(150)}`)
    expect(invalid.issueCount).toBe(150)
    expect(invalid.issues).toHaveLength(100)
  })
})

describe('normalización del histórico', () => {
  it('exige fecha, al menos una métrica y columnas distintas', () => {
    const parsed = parseCsv('fecha;agua\n2026-01-01;2500')
    for (const config of [defaultCsvMapping(), mapping({ columns: {} }), mapping({ columns: { steps: 0 } }), mapping({ columns: { steps: 1, waterMl: 1 } }), mapping({ dateColumn: 10 })]) {
      expect(normalizeCsv(parsed, config, today).issueCount).toBeGreaterThan(0)
    }
  })
  it('interpreta fechas explícitas sin invertir día y mes', () => {
    for (const [dateFormat, raw, expected] of [['iso', '2026-01-02', '2026-01-02'], ['dmy', '02/01/2026', '2026-01-02'], ['mdy', '02/01/2026', '2026-02-01']] as const) {
      const result = normalize(`fecha;agua\n${raw};1`, mapping({ dateFormat }))
      expect(result.issueCount).toBe(0)
      expect(result.records[0].date).toBe(expected)
    }
    for (const raw of ['2026-02-30', '2026-11-13', '02/01/2026', 'no es fecha']) expect(normalize(`fecha;agua\n${raw};1`).issueCount).toBeGreaterThan(0)
  })
  it('convierte litros y todos los formatos de sueño; ignora columnas no seleccionadas', () => {
    const columns = { waterMl: 1, sleepMinutes: 2, sleepScore: 3, steps: 4, weightKg: 5 }
    for (const [sleepUnit, raw] of [['hhmm', '07:30'], ['minutes', '450'], ['decimalHours', '7,5']] as const) {
      const result = normalize(`fecha;agua;sueno;calidad;pasos;peso;ignorada\n2026-01-01;2,5;${raw};85;0;72,5;cualquier texto`, mapping({ columns, waterUnit: 'l', sleepUnit }))
      expect(result.issueCount).toBe(0)
      expect(result.records[0].values).toEqual({ waterMl: 2500, sleepMinutes: 450, sleepScore: 85, steps: 0, weightKg: 72.5 })
    }
    expect(normalize('fecha;agua\n2026-01-01;2.5', mapping({ decimalSeparator: '.', waterUnit: 'l' })).records[0].values.waterMl).toBe(2500)
  })
  it('distingue vacíos y ceros, omite filas sin métricas y no inventa valores', () => {
    const result = normalize('fecha;agua;pasos\n2026-01-01;;0\n2026-01-02;0;\n2026-01-03;;', mapping({ columns: { waterMl: 1, steps: 2 } }))
    expect(result.issueCount).toBe(0)
    expect(result.records.map(row => row.values)).toEqual([{ steps: 0 }, { waterMl: 0 }])
    expect(result.emptyRows).toBe(1)
    expect(normalize('fecha;agua\n2026-01-01;').issueCount).toBeGreaterThan(0)
  })
  it('reutiliza límites y rechaza miles, unidades, fracciones y notación científica', () => {
    for (const [metric, raw, extra] of [
      ['waterMl', '1.000,5', {}], ['waterMl', '1,000.5', {}], ['waterMl', '-1', {}], ['waterMl', '1e3', {}], ['waterMl', '3 L', {}],
      ['sleepMinutes', '24:01', {}], ['sleepMinutes', '1441', { sleepUnit: 'minutes' }], ['sleepMinutes', '7,333', { sleepUnit: 'decimalHours' }],
      ['sleepScore', '101', {}], ['steps', '1,5', {}], ['weightKg', '0', {}],
    ] as const) {
      const result = normalize(`fecha;valor\n2026-01-01;${raw}`, mapping({ columns: { [metric]: 1 }, ...extra }))
      expect(result.issueCount, `${metric}: ${raw}`).toBeGreaterThan(0)
      expect(result.issues[0]).toMatchObject({ row: 2, column: 'valor' })
    }
  })
  it('combina duplicados idénticos y complementarios; bloquea contradicciones', () => {
    const config = mapping({ columns: { waterMl: 1, steps: 2 } })
    const result = normalize('fecha;agua;pasos\n2026-01-01;0;\n2026-01-01;;100\n2026-01-01;0;100', config)
    expect(result.issueCount).toBe(0)
    expect(result.duplicateRows).toBe(2)
    expect(result.records).toEqual([{ date: '2026-01-01', values: { waterMl: 0, steps: 100 }, rows: [2, 3, 4] }])
    const conflict = normalize('fecha;agua\n2026-01-01;0\n2026-01-01;1')
    expect(conflict.issueCount).toBe(1)
    expect(conflict.issues[0]).toMatchObject({ row: 3, column: 'agua' })
    expect(conflict.issues[0].message).toContain('fila 2')
    const laterConflict = normalize('fecha;agua;pasos\n2026-01-01;1;\n2026-01-01;;100\n2026-01-01;;200', config)
    expect(laterConflict.issues[0].message).toContain('fila 3')
  })
})
