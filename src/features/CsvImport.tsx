import { useState, type ChangeEvent, type FormEvent } from 'react'
import { metrics, type DailyValues } from '../domain/daily'
import { formatValue } from '../domain/history'
import { CSV_MAX_BYTES, defaultCsvMapping, normalizeCsv, parseCsv, type CsvIssue, type CsvMapping, type NormalizedCsv, type ParsedCsv } from '../domain/csvImport'
import { importDailyRecords, previewDailyImport, type ImportPreview } from '../data/importRepository'

function valuesText(values: DailyValues) {
  return metrics.flatMap(({ key, label }) => values[key] === undefined ? [] : [`${label}: ${formatValue(values[key], key)}`]).join(' · ')
}

function ImportCounts({ preview }: { preview: ImportPreview }) {
  return <ul className="import-counts">
    <li><strong>{preview.newDays}</strong> {preview.newDays === 1 ? 'fecha nueva' : 'fechas nuevas'}</li>
    <li><strong>{preview.updatedDays}</strong> {preview.updatedDays === 1 ? 'fecha completada' : 'fechas completadas'}</li>
    <li><strong>{preview.unchangedDays}</strong> {preview.unchangedDays === 1 ? 'fecha sin cambios' : 'fechas sin cambios'}</li>
    <li><strong>{preview.addedValues}</strong> {preview.addedValues === 1 ? 'valor añadido' : 'valores añadidos'}</li>
    <li><strong>{preview.identicalValues}</strong> {preview.identicalValues === 1 ? 'valor ya presente' : 'valores ya presentes'}</li>
    <li><strong>{preview.conflictCount}</strong> {preview.conflictCount === 1 ? 'valor distinto conservado' : 'valores distintos conservados'}</li>
  </ul>
}

export default function CsvImport() {
  const [parsed, setParsed] = useState<ParsedCsv>()
  const [filename, setFilename] = useState('')
  const [mapping, setMapping] = useState<CsvMapping>(defaultCsvMapping)
  const [normalized, setNormalized] = useState<NormalizedCsv>()
  const [preview, setPreview] = useState<ImportPreview>()
  const [result, setResult] = useState<ImportPreview>()
  const [issues, setIssues] = useState<CsvIssue[]>([])
  const [issueCount, setIssueCount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setFilename(file.name); setParsed(undefined); setPreview(undefined); setResult(undefined); setNormalized(undefined)
    setIssues([]); setIssueCount(0); setError(''); setMapping(defaultCsvMapping()); setBusy(true)
    try {
      if (file.size > CSV_MAX_BYTES) throw new Error('El archivo supera el límite de 10 MB.')
      const bytes = await file.arrayBuffer()
      let text: string
      try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes) }
      catch { throw new Error('Guarda el archivo como CSV UTF-8 y vuelve a seleccionarlo.') }
      const data = parseCsv(text)
      setParsed(data); setIssues(data.issues); setIssueCount(data.issueCount)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo leer el archivo.') }
    finally { setBusy(false) }
  }

  function changeMapping(next: CsvMapping) {
    setMapping(next); setIssues(parsed?.issues ?? []); setIssueCount(parsed?.issueCount ?? 0); setError('')
  }
  async function review(event: FormEvent) {
    event.preventDefault()
    if (!parsed) return
    setError(''); setBusy(true)
    try {
      const data = normalizeCsv(parsed, mapping)
      setIssues(data.issues); setIssueCount(data.issueCount); setNormalized(data)
      if (!data.issueCount) setPreview(await previewDailyImport(data.records))
    } catch { setError('No se pudieron revisar tus registros guardados. Vuelve a intentarlo.') }
    finally { setBusy(false) }
  }
  async function confirm() {
    if (!normalized || normalized.issueCount || !preview) return
    setBusy(true); setError('')
    try {
      const saved = await importDailyRecords(normalized.records)
      setResult(saved); setPreview(undefined)
    } catch { setError('No se pudo importar. No se ha guardado ningún cambio; puedes volver a intentarlo.') }
    finally { setBusy(false) }
  }
  function columnSelect(id: string, label: string, value: number | undefined, update: (value: number | undefined) => void) {
    return <div className="csv-field"><label htmlFor={id}>{label}</label><select id={id} value={value ?? ''} onChange={event => update(event.target.value === '' ? undefined : Number(event.target.value))}>
      <option value="">{id === 'csv-date' ? 'Selecciona una columna' : 'No importar'}</option>
      {parsed?.headers.map((name, index) => <option value={index} key={index}>{name || `Columna ${index + 1}`}</option>)}
    </select></div>
  }

  return <section className="panel csv-import" aria-labelledby="csv-title"><h2 id="csv-title">Importar CSV</h2>
    <p>Completa tu histórico desde un archivo. Los valores que ya tengas guardados se conservan. El archivo se procesa en este dispositivo, también sin conexión.</p>
    <a className="text-link" href={`${import.meta.env.BASE_URL}plantilla-registros.csv`} download>Descargar plantilla CSV</a>
    <div className="csv-file"><label htmlFor="csv-file">Archivo CSV</label><input id="csv-file" type="file" accept=".csv,text/csv" disabled={busy} onChange={event => void chooseFile(event)} />
      <p className="footnote">UTF-8 · Hasta 10 MB y 50.000 filas · Coma, punto y coma o tabulador.</p>
      {filename && <p className="csv-filename">{filename}{parsed && ` · ${parsed.rows.length.toLocaleString('es')} filas`}</p>}
    </div>
    {parsed && !preview && !result && <form onSubmit={event => void review(event)}><fieldset disabled={busy}>
      <h3>Columnas y formatos</h3>
      <div className="csv-fields">
        {columnSelect('csv-date', 'Columna de fecha', mapping.dateColumn, value => changeMapping({ ...mapping, dateColumn: value }))}
        {metrics.map(({ key, label }) => <div key={key}>{columnSelect(`csv-${key}`, `Columna de ${label.toLowerCase()}`, mapping.columns[key], value => changeMapping({ ...mapping, columns: { ...mapping.columns, [key]: value } }))}</div>)}
        <div className="csv-field"><label htmlFor="csv-date-format">Formato de fecha</label><select id="csv-date-format" value={mapping.dateFormat} onChange={event => changeMapping({ ...mapping, dateFormat: event.target.value as CsvMapping['dateFormat'] })}><option value="iso">YYYY-MM-DD</option><option value="dmy">DD/MM/YYYY</option><option value="mdy">MM/DD/YYYY</option></select></div>
        <div className="csv-field"><label htmlFor="csv-decimal">Separador decimal</label><select id="csv-decimal" value={mapping.decimalSeparator} onChange={event => changeMapping({ ...mapping, decimalSeparator: event.target.value as ',' | '.' })}><option value=",">Coma: 72,5</option><option value=".">Punto: 72.5</option></select></div>
        {mapping.columns.waterMl !== undefined && <div className="csv-field"><label htmlFor="csv-water-unit">Unidad del agua</label><select id="csv-water-unit" value={mapping.waterUnit} onChange={event => changeMapping({ ...mapping, waterUnit: event.target.value as 'ml' | 'l' })}><option value="ml">Mililitros</option><option value="l">Litros</option></select></div>}
        {mapping.columns.sleepMinutes !== undefined && <div className="csv-field"><label htmlFor="csv-sleep-unit">Formato de duración del sueño</label><select id="csv-sleep-unit" value={mapping.sleepUnit} onChange={event => changeMapping({ ...mapping, sleepUnit: event.target.value as CsvMapping['sleepUnit'] })}><option value="hhmm">HH:mm (07:30)</option><option value="minutes">Minutos (450)</option><option value="decimalHours">Horas decimales (7,5)</option></select></div>}
      </div>
      <p className="footnote">Peso en kg. Sin separadores de miles. Los vacíos no añaden datos; los ceros sí.</p>
      <button className="button" type="submit" disabled={busy || Boolean(parsed.issueCount)}>Revisar importación</button>
    </fieldset></form>}
    {issueCount > 0 && <div role="alert" className="csv-errors"><h3>Corrige el archivo o la selección de columnas</h3><p>{issueCount} {issueCount === 1 ? 'error' : 'errores'}. No se importará ningún dato.</p>
      <ul>{issues.map((issue, index) => <li key={index}>{issue.row !== undefined && `Fila ${issue.row} · `}<strong>{issue.column}:</strong> {issue.message}</li>)}</ul>
      {issueCount > issues.length && <p>Se muestran los primeros {issues.length} errores.</p>}
    </div>}
    {preview && normalized && <div className="import-preview"><h3>Revisar antes de importar</h3>
      <ImportCounts preview={preview} />
      {normalized.duplicateRows > 0 && <p>{normalized.duplicateRows} filas repetidas combinadas por fecha.</p>}
      {normalized.emptyRows > 0 && <p>{normalized.emptyRows} filas sin valores seleccionados omitidas.</p>}
      <p>Previsualización · primeras {Math.min(preview.days.length, 20)} de {preview.days.length} fechas</p>
      <ul className="import-days" aria-label="Previsualización por fecha">{preview.days.slice(0, 20).map(day => <li key={day.date}><strong>{day.date}</strong><dl><dt>Se añadirá</dt><dd>{valuesText(day.added) || 'Sin cambios'}</dd>{Object.keys(day.preserved).length > 0 && <><dt>Se conservará</dt><dd>{valuesText(day.preserved)}</dd></>}</dl></li>)}</ul>
      {preview.conflictCount > 0 && <details className="import-conflicts"><summary>Ver diferencias ({preview.conflictCount})</summary><p>Se conservan los valores guardados. Se muestran hasta 100 diferencias.</p><ul>{preview.conflicts.map(conflict => <li key={`${conflict.date}-${conflict.metric}`}>{conflict.date} · {metrics.find(metric => metric.key === conflict.metric)!.label} · filas {conflict.rows.join(', ')}: guardado {formatValue(conflict.existing, conflict.metric)}; archivo {formatValue(conflict.incoming, conflict.metric)}.</li>)}</ul></details>}
      <p>Al confirmar se revisarán de nuevo los datos guardados. Solo se completarán los valores que sigan vacíos.</p>
      <div className="import-actions"><button type="button" className="button" disabled={busy} onClick={() => void confirm()}>Importar datos</button><button type="button" className="outline-button" disabled={busy} onClick={() => { setPreview(undefined); setError('') }}>Volver a columnas</button></div>
    </div>}
    {result && <div role="status" className="import-result"><h3>Importación completada</h3><ImportCounts preview={result} /><p>Los datos han quedado guardados en este dispositivo.</p></div>}
    {busy && <p role="status">Procesando…</p>}
    {error && <p role="alert" className="error">{error}</p>}
  </section>
}
