import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { readHistory } from '../data/historyRepository'
import { localDate, metrics, type Metric } from '../domain/daily'
import { buildHistory, formatValue, shiftDate, shortDate, summarize } from '../domain/history'
import type { DailyRecord } from '../data/database'
import type { Goals } from '../domain/goals'
import HistoryChart from './HistoryChart'

export default function HistoryPage() {
  const [metric, setMetric] = useState<Metric>('waterMl')
  const [period, setPeriod] = useState(30)
  const [end, setEnd] = useState(localDate)
  const [data, setData] = useState<{ records: DailyRecord[]; goals: Goals[] }>({ records: [], goals: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const start = shiftDate(end, 1 - period)
  useEffect(() => {
    let active = true
    readHistory(shiftDate(start, -6), end).then(result => { if (active) { setData(result); setLoading(false) } })
      .catch(() => { if (active) { setError('No se pudo cargar el histórico. Vuelve a intentarlo.'); setLoading(false) } })
    return () => { active = false }
  }, [start, end, attempt])
  function changeRange(action: () => void) { setLoading(true); setError(''); action() }
  const points = buildHistory(data.records, data.goals, metric, start, end)
  const summary = summarize(points)
  const title = metrics.find(value => value.key === metric)!.label
  const rows = points.filter(point => point.value !== undefined).reverse()
  return <><p className="eyebrow">PERSPECTIVA, DÍA A DÍA</p><h1>Tu evolución.</h1><p className="subtitle">Mira tus hábitos con un poco de distancia.</p>
    <section className="panel history-filters" aria-label="Filtros del histórico">
      <label htmlFor="history-metric">Métrica</label><select id="history-metric" value={metric} onChange={event => setMetric(event.target.value as Metric)}>{metrics.map(value => <option value={value.key} key={value.key}>{value.label}</option>)}</select>
      <div className="period-buttons" aria-label="Duración del periodo">{[7, 30, 90].map(days => <button key={days} type="button" aria-pressed={days === period} disabled={days === period} onClick={() => changeRange(() => setPeriod(days))}>{days} días</button>)}</div>
      <label htmlFor="history-end">Hasta el día</label><input id="history-end" type="date" max={localDate()} value={end} onChange={event => { if (event.target.value && event.target.value !== end && event.target.value <= localDate()) changeRange(() => setEnd(event.target.value)) }} />
      <div className="range-navigation"><button type="button" onClick={() => changeRange(() => setEnd(shiftDate(end, -period)))}>← Anterior</button><button type="button" disabled={end >= localDate()} onClick={() => changeRange(() => setEnd([shiftDate(end, period), localDate()].sort()[0]))}>Siguiente →</button></div>
      {end !== localDate() && <button className="text-link discard" type="button" onClick={() => changeRange(() => setEnd(localDate()))}>Volver al periodo actual</button>}
    </section>
    {loading ? <p role="status">Cargando histórico…</p> : error ? <section className="panel"><p role="alert">{error}</p><button className="button" onClick={() => changeRange(() => setAttempt(value => value + 1))}>Reintentar histórico</button></section> : <>
      <div className="section-heading"><h2>{title}</h2><span>{shortDate(start)} – {shortDate(end)} · {end.slice(0, 4)}</span></div>
      <div className="summary-grid">
        <article><span>Media del periodo</span><strong>{formatValue(summary.average, metric)}</strong><small>{summary.count} de {period} días registrados</small></article>
        <article><span>{metric === 'weightKg' ? 'Cambio entre extremos' : 'Rango registrado'}</span><strong>{metric === 'weightKg' ? summary.change === undefined ? 'Faltan registros' : `${summary.change > 0 ? '+' : ''}${formatValue(summary.change, metric)}` : summary.count ? `${formatValue(summary.min, metric)} – ${formatValue(summary.max, metric)}` : 'Sin registros'}</strong><small>{metric === 'weightKg' ? 'Último menos primer peso del periodo' : `${summary.missing} días sin registrar`}</small></article>
      </div>
      {metric !== 'sleepScore' && metric !== 'weightKg' && <p className="goal-summary">{summary.eligible ? `${summary.achieved} de ${summary.eligible} días registrados con objetivo cumplido.` : 'Sin días registrados con objetivo para comparar.'} Los días sin registro no cuentan como cumplidos.</p>}
      <section className="panel chart-panel" aria-label={`Gráfica de ${title.toLowerCase()}`}><HistoryChart key={`${metric}-${start}-${end}`} points={points} metric={metric} /></section>
      <section className="panel history-records"><h2>Registros del periodo</h2><p>Los días sin datos de esta métrica no aparecen en la tabla.</p>
        {rows.length ? <div className="table-scroll"><table><caption className="sr-only">{title}: valores y objetivos por fecha</caption><thead><tr><th scope="col">Fecha</th><th scope="col">Registro</th><th scope="col">Objetivo</th></tr></thead><tbody>{rows.map(point => <tr key={point.date}><th scope="row"><NavLink to={`/?date=${point.date}`} aria-label={`Editar registro del ${point.date}`}>{shortDate(point.date)}<small>{point.date.slice(0, 4)}</small></NavLink></th><td>{formatValue(point.value, metric)}</td><td>{point.target === undefined ? 'Sin objetivo' : <>{formatValue(point.target, metric)}{metric !== 'weightKg' && <small>{Math.round(point.value! / point.target * 100)} %</small>}</>}</td></tr>)}</tbody></table></div> : <p>No hay registros para mostrar.</p>}
        <NavLink className="text-link" to="/">Ir al registro diario →</NavLink>
      </section>
    </>}
  </>
}
