import { useEffect, useState, type FormEvent } from 'react'
import { readGoals, saveGoals } from '../data/historyRepository'
import { localDate, metrics, parseValue, ValidationError } from '../domain/daily'
import { goalForDate, goalKeys, type Goals } from '../domain/goals'
import { formatValue, shortDate } from '../domain/history'

type Fields = Record<string, string>
export default function GoalsForm() {
  const [goals, setGoals] = useState<Goals[]>([])
  const [fields, setFields] = useState<Fields>({})
  const [date, setDate] = useState(localDate)
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    readGoals().then(values => {
      if (!active) return
      setGoals(values)
      const current = goalForDate(values)
      setFields(Object.fromEntries(goalKeys.map(key => [key, current?.[key]?.toString().replace('.', ',') ?? ''])))
      setReady(true)
    }).catch(() => { if (active) setError('No se pudieron cargar los objetivos. Vuelve a intentarlo.') })
    return () => { active = false }
  }, [attempt])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setStatus('')
    setSaving(true)
    try {
      const goal: Goals = { ...Object.fromEntries(goalKeys.map(key => [key, parseValue(fields[key] ?? '')])), effectiveFrom: date }
      const replace = goals.some(value => value.effectiveFrom === date)
      if (replace && !window.confirm('Ya hay objetivos con esta fecha de inicio. ¿Sustituirlos? Las comparaciones desde esa fecha usarán los nuevos valores.')) return
      await saveGoals(goal, replace)
      setGoals(values => [...values.filter(value => value.effectiveFrom !== date), goal].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom)))
      setStatus('Objetivos guardados en este dispositivo.')
    } catch (cause) {
      setError(cause instanceof ValidationError ? cause.message : 'No se pudieron guardar los objetivos. Vuelve a intentarlo.')
    } finally { setSaving(false) }
  }
  return <section className="panel" aria-labelledby="goals-title"><h2 id="goals-title">Objetivos sencillos</h2>
    <p>Una referencia diaria para agua, pasos y descanso. El peso es una referencia visual, sin valoración de cumplimiento.</p>
    <p className="footnote">Cada cambio empieza en la fecha elegida. Los días anteriores conservan sus objetivos. Un campo vacío deja esa métrica sin objetivo desde esa fecha.</p>
    {!ready && !error && <p>Cargando objetivos…</p>}
    {!ready && error && <button type="button" className="button" onClick={() => { setError(''); setAttempt(value => value + 1) }}>Reintentar objetivos</button>}
    <form onSubmit={submit}><fieldset disabled={!ready || saving}>
      <div className="daily-fields"><div><label htmlFor="goal-date">Aplicar objetivos desde</label><input id="goal-date" type="date" required min={localDate()} value={date} onChange={event => { setDate(event.target.value); setStatus('') }} /></div>
      {goalKeys.map(key => {
        const metric = metrics.find(metric => metric.key === key)!
        return <div key={key}><label htmlFor={`goal-${key}`}>Objetivo de {metric.label.toLowerCase()} ({metric.unit})</label><input id={`goal-${key}`} type="text" inputMode={metric.integer ? 'numeric' : 'decimal'} placeholder="Sin objetivo" value={fields[key] ?? ''} onChange={event => { setFields({ ...fields, [key]: event.target.value }); setStatus('') }} /></div>
      })}</div>
      <button className="button" type="submit">{saving ? 'Guardando…' : 'Guardar objetivos'}</button>
    </fieldset></form>
    {status && <p role="status" className="success">{status}</p>}{error && <p role="alert" className="error">{error}</p>}
    {goals.length > 0 && <details className="goal-history"><summary>Ver cambios de objetivos ({goals.length})</summary><ul>{[...goals].reverse().map(goal => <li key={goal.effectiveFrom}><strong>Desde {shortDate(goal.effectiveFrom)} de {goal.effectiveFrom.slice(0, 4)}</strong><p>{goalKeys.map(key => `${metrics.find(m => m.key === key)!.label}: ${goal[key] === undefined ? 'sin objetivo' : formatValue(goal[key], key)}`).join(' · ')}</p></li>)}</ul></details>}
  </section>
}
