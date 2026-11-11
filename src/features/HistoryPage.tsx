import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { readHistory } from '../data/historyRepository'
import { localDate, metrics } from '../domain/daily'
import { buildHistory, formatValue, shiftDate, shortDate, summarize } from '../domain/history'
import type { DailyRecord } from '../data/database'
import type { Goals } from '../domain/goals'
import HistoryChart from './HistoryChart'

export default function HistoryPage() {
  const [active, setActive] = useState(0)
  const carousel = useRef<HTMLDivElement>(null)
  const metric = metrics[active].key
  const [period, setPeriod] = useState(30)
  const [end] = useState(localDate)
  const [data, setData] = useState<{ records: DailyRecord[]; goals: Goals[] }>({ records: [], goals: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const start = shiftDate(end, 1 - period)
  useEffect(() => {
    let active = true
    readHistory(shiftDate(start, -6), end).then(result => { if (active) { setData(result); setLoading(false) } })
      .catch(() => { if (active) { setError('No se pudo cargar el histórico. Vuelve a intentarlo.'); setActive(0); setLoading(false) } })
    return () => { active = false }
  }, [start, end, attempt])
  function changeRange(action: () => void) { setLoading(true); setError(''); action() }
  const points = buildHistory(data.records, data.goals, metric, start, end)
  const summary = summarize(points)
  const title = metrics.find(value => value.key === metric)!.label
  const rows = points.filter(point => point.value !== undefined).reverse()
  function showMetric(index: number) {
    const track = carousel.current
    if (!track) return
    const slide = track.children[index] as HTMLElement
    track.scrollTo({ left: slide.offsetLeft, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }
  return <><h1 className="page-title">Resumen</h1>
    {error ? <section className="panel"><p role="alert">{error}</p><button className="button" onClick={() => changeRange(() => setAttempt(value => value + 1))}>Reintentar histórico</button></section> : <>
      {loading && <p role="status">Cargando histórico…</p>}
      <section className="metrics-overview" aria-label="Gráficas por métrica">
        <div className="carousel-toolbar"><span className="carousel-position" aria-live="polite">{active + 1} / {metrics.length}</span><div><button type="button" className="carousel-arrow" aria-label="Métrica anterior" disabled={active === 0} onClick={() => showMetric(active - 1)}>←</button><button type="button" className="carousel-arrow" aria-label="Métrica siguiente" disabled={active === metrics.length - 1} onClick={() => showMetric(active + 1)}>→</button></div></div>
        <div className="metric-carousel" ref={carousel} tabIndex={0} role="group" aria-roledescription="carrusel" aria-label="Desliza para cambiar de métrica" onKeyDown={event => {
          if (event.target !== event.currentTarget) return
          if (event.key === 'ArrowRight' && active < metrics.length - 1) { event.preventDefault(); showMetric(active + 1) }
          if (event.key === 'ArrowLeft' && active > 0) { event.preventDefault(); showMetric(active - 1) }
        }} onScroll={() => {
          const track = carousel.current
          if (!track) return
          const distances = Array.from(track.children).map(child => Math.abs((child as HTMLElement).offsetLeft - track.scrollLeft))
          setActive(distances.indexOf(Math.min(...distances)))
        }}>
          {metrics.map((item, index) => <section className="panel chart-panel metric-slide" key={item.key} aria-label={`Gráfica de ${item.label.toLowerCase()}`} aria-hidden={index !== active} inert={index !== active}>
            <header className="metric-slide-header"><h2>{item.label}</h2><span>{shortDate(start)} – {shortDate(end)}</span></header>
            <HistoryChart key={`${item.key}-${start}-${end}`} points={buildHistory(data.records, data.goals, item.key, start, end)} metric={item.key} />
          </section>)}
        </div>
        <div className="metric-dots" aria-label="Elegir gráfica">{metrics.map((item, index) => <button type="button" key={item.key} aria-label={`Ver ${item.label.toLowerCase()}`} aria-pressed={index === active} onClick={() => showMetric(index)}><span /></button>)}</div>
      </section>
      <div className="period-buttons overview-periods" aria-label="Duración del periodo">{[7, 30, 90].map(days => <button key={days} type="button" aria-pressed={days === period} disabled={days === period} onClick={() => changeRange(() => setPeriod(days))}>{days} días</button>)}</div>
      <div className="summary-grid">
        <article><span>Media del periodo</span><strong>{formatValue(summary.average, metric)}</strong><small>{summary.count} de {period} días registrados</small></article>
        <article><span>Rango registrado</span><strong>{summary.count ? `${formatValue(summary.min, metric)} – ${formatValue(summary.max, metric)}` : 'Sin registros'}</strong><small>{summary.missing} días sin registrar</small></article>
      </div>
      {metric === 'weightKg' && <p className="goal-summary">Cambio del periodo: <strong>{summary.change === undefined ? 'Faltan registros' : `${summary.change > 0 ? '+' : ''}${formatValue(summary.change, metric)}`}</strong></p>}
      {metric !== 'sleepScore'  && metric !== 'weightKg' && <p className="goal-summary">{summary.eligible ? `${summary.achieved} de ${summary.eligible} días registrados con objetivo cumplido.` : 'Sin días registrados con objetivo para comparar.'} Los días sin registro no cuentan como cumplidos.</p>}
      <section className="panel history-records"><h2>Registros del periodo</h2><p>Los días sin datos de esta métrica no aparecen en la tabla.</p>
        {rows.length ? <div className="table-scroll"><table><caption className="sr-only">{title}: valores y objetivos por fecha</caption><thead><tr><th scope="col">Fecha</th><th scope="col">Registro</th><th scope="col">Objetivo</th></tr></thead><tbody>{rows.map(point => <tr key={point.date}><th scope="row"><NavLink to={`/registros?date=${point.date}`} aria-label={`Editar registro del ${point.date}`}>{shortDate(point.date)}<small>{point.date.slice(0, 4)}</small></NavLink></th><td>{formatValue(point.value, metric)}</td><td>{point.target === undefined ? 'Sin objetivo' : <>{formatValue(point.target, metric)}{metric !== 'weightKg' && <small>{Math.round(point.value! / point.target * 100)} %</small>}</>}</td></tr>)}</tbody></table></div> : <p>No hay registros para mostrar.</p>}
        <NavLink className="text-link" to="/registros">Ir al registro diario →</NavLink>
      </section>
    </>}
  </>
}
