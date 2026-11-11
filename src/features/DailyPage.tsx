import GoalsForm from './GoalsForm'
import WaterPreference from './WaterPreference'
import { useSearchParams } from 'react-router-dom'
import { useEffect, useState, type FormEvent } from 'react'
import { readGoals } from '../data/historyRepository'
import { goalForDate, type Goals } from '../domain/goals'
import { formatValue } from '../domain/history'
import { readPreferences, type DailyRecord } from '../data/database'
import { addWater, readDaily, saveDaily } from '../data/dailyRepository'
import { localDate, validateDate, metrics, parseValue, ValidationError, valuesOf, type Metric } from '../domain/daily'

type Fields = Record<Metric, string>
function fieldsOf(record?: DailyRecord): Fields {
  return Object.fromEntries(metrics.map(({ key }) => [key, record?.[key]?.toString().replace('.', ',') ?? ''])) as Fields
}

function DailyEditor({ date, onDirty, waterAmount, goalRevision }: { date: string; onDirty: (dirty: boolean) => void; waterAmount?: number; goalRevision: number }) {
  const [record, setRecord] = useState<DailyRecord>()
  const [fields, setFields] = useState(() => fieldsOf())
  const [shortcut, setShortcut] = useState(250)
  const [goals, setGoals] = useState<Goals>()
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [attempt, setAttempt] = useState(0)
  const dirty = metrics.some(({ key }) => fields[key] !== fieldsOf(record)[key])
  useEffect(() => { onDirty(dirty) }, [dirty, onDirty])
  useEffect(() => {
    let active = true
    Promise.all([readDaily(date), readPreferences(), readGoals()]).then(([value, preferences, versions]) => {
      if (active) { setGoals(goalForDate(versions, date)); setRecord(value); setFields(fieldsOf(value)); setShortcut(preferences.waterShortcutMl); setReady(true); setLoading(false) }
    }).catch(() => { if (active) { setError('No se pudieron cargar tus datos. Vuelve a intentarlo.'); setLoading(false) } })
    return () => { active = false }
  }, [date, attempt])

  useEffect(() => {
    if (!goalRevision) return
    let active = true
    readGoals().then(versions => { if (active) setGoals(goalForDate(versions, date)) })
      .catch(() => { if (active) setError('No se pudo actualizar la referencia de objetivos. Recarga para intentarlo de nuevo.') })
    return () => { active = false }
  }, [goalRevision, date])
  const quickAmount = waterAmount ?? shortcut

  async function persist(action: () => Promise<DailyRecord | undefined>, message: string) {
    setSaving(true); setError(''); setStatus('')
    try {
      const saved = await action()
      setRecord(saved); setFields(fieldsOf(saved)); onDirty(false); setStatus(message)
    } catch (cause) {
      setError(cause instanceof ValidationError ? cause.message : 'No se pudo guardar. Tus cambios siguen en el formulario; vuelve a intentarlo.')
    } finally { setSaving(false) }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      const values = Object.fromEntries(metrics.map(({ key }) => [key, parseValue(fields[key])]))
      const removed = metrics.some(({ key }) => record?.[key] !== undefined && values[key] === undefined)
      if (removed && !window.confirm('Se borrarán los valores que has dejado vacíos. ¿Guardar los cambios?')) return
      void persist(() => saveDaily(date, values), 'Registro guardado en este dispositivo.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Revisa los valores.'); setStatus('') }
  }
  return <>
    <section className="panel" aria-labelledby="daily-title">
      <h2 id="daily-title">Tu registro diario</h2>
      <p>Deja vacío lo que no hayas registrado. Un cero es un valor registrado.</p>
      {loading && <p role="status">Cargando registro…</p>}
      {!ready && !loading && <button className="button" onClick={() => { setLoading(true); setError(''); setAttempt(value => value + 1) }}>Volver a intentar</button>}
      <form onSubmit={submit}>
        <fieldset disabled={loading || saving || !ready}>
          <div className="daily-fields">
            {metrics.map(metric => <div className="daily-field" key={metric.key}>
              <label htmlFor={metric.key}>{metric.label} ({metric.unit})</label>
              {metric.key !== 'sleepScore' && goals?.[metric.key] !== undefined && <p className="footnote">{metric.key === 'weightKg' ? 'Peso de referencia' : 'Objetivo'}: {formatValue(goals[metric.key], metric.key)}{record?.[metric.key] !== undefined && metric.key !== 'weightKg' ? ` · ${Math.round(record[metric.key]! / goals[metric.key]! * 100)} % guardado` : ''}</p>}
              <div className="field-controls">
                <input id={metric.key} type="text" inputMode={metric.integer ? 'numeric' : 'decimal'} autoComplete="off" placeholder="Sin registrar" value={fields[metric.key]} onChange={event => { setFields({ ...fields, [metric.key]: event.target.value }); setStatus(''); setError('') }} />
                {record?.[metric.key] !== undefined && <button type="button" className="delete-value" aria-label={`Borrar ${metric.label.toLowerCase()}`} onClick={() => {
                  if (window.confirm(`¿Borrar ${metric.label.toLowerCase()} de esta fecha? Los otros valores guardados se conservarán.`)) {
                    void persist(() => saveDaily(date, { ...valuesOf(record), [metric.key]: undefined }), 'Valor borrado. Los demás datos guardados se conservan.')
                  }
                }} disabled={dirty}>Borrar</button>}
              </div>
            </div>)}
          </div>
          <button className="button" type="submit">{saving ? 'Guardando…' : 'Guardar registro'}</button>
        </fieldset>
      </form>
      <p role="status" className="success">{status}</p>
      {error && <p role="alert" className="error">{error}</p>}
    </section>
    <section className="panel water-quick"><h2>Un poco más de agua</h2>
      <p>Total guardado: <strong>{record?.waterMl === undefined ? 'Sin registrar' : `${record.waterMl.toLocaleString('es')} ml`}</strong></p>
      <button className="button" disabled={!ready || loading || saving || dirty} onClick={() => void persist(() => addWater(date, quickAmount), 'Agua añadida al registro de esta fecha.')}>Añadir {quickAmount} ml de agua</button>
      {dirty && <p className="footnote">Guarda o descarta los cambios antes de añadir agua o borrar un valor.</p>}
    </section>
    {dirty && <button className="text-link discard" disabled={saving} onClick={() => { if (window.confirm('¿Descartar los cambios sin guardar?')) { setFields(fieldsOf(record)); setError(''); setStatus('Cambios descartados.') } }}>Descartar cambios</button>}
  </>
}

export default function DailyPage() {
  const [params] = useSearchParams()
  const [date, setDate] = useState(() => {
    const requested = params.get('date')
    if (requested) { try { validateDate(requested); return requested } catch { /* Fall back to today for invalid links. */ } }
    return localDate()
  })
  const [waterAmount, setWaterAmount] = useState<number>()
  const [goalRevision, setGoalRevision] = useState(0)
  const [dirty, setDirty] = useState(false)
  useEffect(() => {
    if (!dirty) return
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault() }
    const navigation = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest('a') : null
      if (anchor && !window.confirm('Tienes cambios sin guardar. ¿Descartarlos y salir?')) {
        event.preventDefault(); event.stopPropagation()
      }
    }
    window.addEventListener('beforeunload', beforeUnload)
    document.addEventListener('click', navigation, true)
    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      document.removeEventListener('click', navigation, true)
    }
  }, [dirty])
  return <><p className="eyebrow">TU DÍA, EN DATOS</p><h1>Registros</h1>
    <p className="subtitle">Registra tus hábitos de hoy o completa un día anterior.</p>
    <div className="date-picker"><label htmlFor="record-date">Fecha del registro</label>
      <input id="record-date" type="date" value={date} max={localDate()} required onChange={event => {
        if (!event.target.value || event.target.value > localDate()) return
        if (dirty && !window.confirm('Tienes cambios sin guardar. ¿Descartarlos y cambiar de fecha?')) return
        setDirty(false); setDate(event.target.value)
      }} />
    </div>
    <DailyEditor key={date} date={date} onDirty={setDirty} waterAmount={waterAmount} goalRevision={goalRevision} />
    <details className="record-options"><summary>Objetivos y registro rápido</summary>
      <GoalsForm onSaved={() => setGoalRevision(value => value + 1)} />
      <WaterPreference onSaved={setWaterAmount} />
    </details>
  </>
}
