import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import WaterRing from './WaterRing'
import { waterAverageTone } from '../domain/water'
import { historyTone } from '../domain/historyTone'
import { averageSleepScore, observedSleepRange, type SleepRecord } from '../domain/sleep'
import { readHistory, readSleepHistory } from '../data/historyRepository'
import { localDate, metrics as dailyMetrics } from '../domain/daily'
import { buildHistory, formatValue, shiftDate, shortDate, summarize } from '../domain/history'
import type { DailyRecord } from '../data/database'
import type { Goals } from '../domain/goals'
import HistoryChart from './HistoryChart'
import HistoryTable from './HistoryTable'

const metrics = ['weightKg', 'sleepScore', 'sleepMinutes', 'steps', 'waterMl'].map(key => dailyMetrics.find(metric => metric.key === key)!)

export default function HistoryPage() {
  const [active, setActive] = useState(0)
  const carousel = useRef<HTMLDivElement>(null)
  const metric = metrics[active].key
  const [period, setPeriod] = useState(30)
  const [end] = useState(localDate)
  const [data, setData] = useState<{ records: DailyRecord[]; goals: Goals[] }>({ records: [], goals: [] })
  const [sleepRecords, setSleepRecords] = useState<SleepRecord[]>([])
  const [sleepLoading, setSleepLoading] = useState(true)
  const [sleepError, setSleepError] = useState(false)
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
  useEffect(() => {
    let active = true
    readSleepHistory().then(records => { if (active) { setSleepRecords(records); setSleepError(false); setSleepLoading(false) } })
      .catch(() => { if (active) { setSleepError(true); setSleepLoading(false) } })
    return () => { active = false }
  }, [attempt])
  const sleepAverage = averageSleepScore(data.records, start, end)
  const sleepTone = metric === 'sleepMinutes' ? historyTone('sleepScore', sleepAverage.score) : undefined
  const sleepRange = observedSleepRange(sleepRecords, end)
  useLayoutEffect(() => {
    const track = carousel.current
    if (!track) return
    const lineSlides = Array.from(track.children).slice(0, 4) as HTMLElement[]
    const contents = lineSlides.map(slide => slide.querySelector('.metric-slide-content') as HTMLElement)
    const resize = () => {
      const height = Math.ceil(Math.max(...lineSlides.map((slide, index) => {
        const style = getComputedStyle(slide)
        return contents[index].getBoundingClientRect().height + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)
      })))
      track.style.setProperty('--metric-panel-height', `${height}px`)
      track.style.height = `${height}px`
    }
    resize()
    const observer = new ResizeObserver(resize)
    contents.forEach(content => observer.observe(content))
    return () => observer.disconnect()
  }, [error])
  function changeRange(action: () => void) { setLoading(true); setError(''); action() }
  const points = buildHistory(data.records, data.goals, metric, start, end)
  const summary = summarize(points)
  const averageTone = metric === 'sleepMinutes' ? sleepTone : metric === 'sleepScore' ? historyTone('sleepScore', summary.average) : metric === 'waterMl' ? waterAverageTone(summary.average) : undefined
  const title = metrics.find(value => value.key === metric)!.label
  const rows = points.filter(point => point.value !== undefined).reverse()
  function showMetric(index: number) {
    const track = carousel.current
    if (!track) return
    const slide = track.children[index] as HTMLElement
    track.scrollTo({ left: slide.offsetLeft, behavior: 'instant' })
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
            <div className={`metric-slide-content${item.key === 'waterMl' ? ' water-slide-content' : ''}`}><header className="metric-slide-header"><h2>{item.label}</h2><span>{shortDate(start)} – {shortDate(end)}</span></header>
            {item.key === 'waterMl' ? <WaterRing points={buildHistory(data.records, data.goals, item.key, start, end)} /> : <HistoryChart key={`${item.key}-${start}-${end}`} points={buildHistory(data.records, data.goals, item.key, start, end)} metric={item.key} />}</div>
          </section>)}
        </div>
        <div className="metric-dots" aria-label="Elegir gráfica">{metrics.map((item, index) => <button type="button" key={item.key} aria-label={`Ver ${item.label.toLowerCase()}`} aria-pressed={index === active} onClick={() => showMetric(index)}><span /></button>)}</div>
      </section>
      <div className="period-buttons overview-periods" aria-label="Duración del periodo">{[7, 30, 90].map(days => <button key={days} type="button" aria-pressed={days === period} disabled={days === period} onClick={() => changeRange(() => setPeriod(days))}>{days} días</button>)}</div>
      <div className={`summary-grid${metric === 'sleepScore' ? ' score-summary' : ''}`}>
        <article className={averageTone ? `sleep-average average-highlight tone-${averageTone.tone}` : undefined}><span>Media del periodo</span><strong>{formatValue(summary.average, metric)}</strong><small>{summary.count} de {period} días registrados</small>{metric === 'waterMl' && averageTone && <small>{'label' in averageTone ? averageTone.label : ''}</small>}{metric === 'sleepMinutes' && sleepAverage.score !== undefined && <small className="sleep-quality"><span className="sr-only">Calidad media: </span>{formatValue(sleepAverage.score, 'sleepScore')}<span className="sr-only">; {sleepAverage.count} noches con duración y puntuación</span></small>}</article>
        <article><span>Rango registrado</span><strong>{summary.count ? `${formatValue(summary.min, metric)} – ${formatValue(summary.max, metric)}` : 'Sin registros'}</strong><small>{summary.missing} días sin registrar</small></article>
      </div>
      {metric === 'sleepMinutes' && <section className="panel sleep-insight" aria-labelledby="sleep-range-title"><h2 id="sleep-range-title">Tu rango observado</h2>
        {sleepLoading ? <p>Analizando registros…</p> : sleepError ? <><p>No se pudo cargar el análisis del sueño.</p><button className="outline-button" onClick={() => { setSleepLoading(true); setAttempt(value => value + 1) }}>Reintentar análisis</button></> : sleepRange.state === 'ready' ? <>
          <strong className="sleep-range-value">{formatValue(sleepRange.low, 'sleepMinutes')}{Math.round(sleepRange.low) !== Math.round(sleepRange.high) && ` – ${formatValue(sleepRange.high, 'sleepMinutes')}`}</strong>
          <p>Duración central de tus {sleepRange.bestCount} noches mejor puntuadas, entre {sleepRange.count} noches registradas. Puntuación desde {sleepRange.threshold} puntos.</p>
        </> : <p>{sleepRange.state === 'insufficient' ? `Faltan datos: ${sleepRange.count} de 14 noches con duración mayor que cero y puntuación.` : `Tus ${sleepRange.count} noches tienen puntuaciones demasiado similares para distinguir un rango.`}</p>}
        <details><summary>Cómo se interpreta</summary><p>El color de la media representa la puntuación media de las noches del periodo con ambos datos; la duración media incluye todos los registros de duración.</p><p>El rango usa todo tu histórico hasta hoy. Selecciona el 25 % de noches mejor puntuadas (al menos cinco, incluyendo empates) y muestra los percentiles 25–75 de sus duraciones. Requiere 14 noches emparejadas y una diferencia de al menos 10 puntos entre puntuaciones.</p><p>Es una asociación exploratoria, no un algoritmo clínico validado ni una duración óptima demostrada. No modifica tu objetivo de sueño.</p></details>
      </section>}
      {metric === 'weightKg' && <p className="goal-summary">Cambio del periodo: <strong>{summary.change === undefined ? 'Faltan registros' : `${summary.change > 0 ? '+' : ''}${formatValue(summary.change, metric)}`}</strong></p>}
      {metric !== 'sleepScore' && metric !== 'weightKg' && metric !== 'waterMl' && <p className="goal-summary">{summary.eligible ? `${summary.achieved} de ${summary.eligible} días registrados con objetivo cumplido.` : 'Sin días registrados con objetivo para comparar.'} Los días sin registro no cuentan como cumplidos.</p>}
      <section className="panel history-records"><h2>Registros del periodo</h2>
        {rows.length ? <HistoryTable rows={rows} metric={metric} title={title} period={period} /> : <p>No hay registros para mostrar.</p>}
      </section>
    </>}
  </>
}
