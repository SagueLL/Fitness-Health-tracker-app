import { useLayoutEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import type { Metric } from '../domain/daily'
import { formatValue, shortDate, type HistoryPoint } from '../domain/history'
import { historyTone, toneBands } from '../domain/historyTone'

export default function HistoryTable({ rows, metric, title, period }: { rows: HistoryPoint[]; metric: Metric; title: string; period: number }) {
  const showObjective = metric === 'steps' || metric === 'weightKg'
  const container = useRef<HTMLDivElement>(null)
  const table = useRef<HTMLTableElement>(null)
  useLayoutEffect(() => {
    const view = container.current, element = table.current
    if (!view || !element) return
    view.scrollTop = 0
    function measure() {
      if (!view || !element) return
      const fifth = element.tBodies[0]?.rows[4]
      view.style.maxHeight = rows.length > 5 && fifth ? `${Math.ceil(fifth.getBoundingClientRect().bottom - element.getBoundingClientRect().top)}px` : 'none'
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [metric, period, rows])
  return <>
    <div ref={container} className="table-scroll history-table-scroll" role="region" aria-label={`Tabla de ${title.toLowerCase()}${rows.length > 5 ? ', desplázate para ver más registros' : ''}`} tabIndex={rows.length > 5 ? 0 : undefined}>
      <table ref={table} className={metric === 'sleepScore' || metric === 'sleepMinutes' ? 'sleep-records' : undefined}><caption className="sr-only">{title}: {showObjective ? 'valores y objetivos' : 'registros'} por fecha</caption><thead><tr><th scope="col">Fecha</th><th scope="col">Registro</th>{showObjective && <th scope="col">Objetivo</th>}</tr></thead><tbody>{rows.map(point => {
        const band = historyTone(metric, point.value, point.target, point.sleepScore)
        return <tr key={point.date} className={band ? `record-tone tone-${band.tone}` : undefined}>
          <th scope="row"><NavLink to={`/registros?date=${point.date}`} aria-label={`Editar registro del ${point.date}`}>{shortDate(point.date)}<small>{point.date.slice(0, 4)}</small></NavLink></th>
          <td><span className="record-value">{formatValue(point.value, metric)}</span>{band && <span className="sr-only"> · Tramo {band.label}{metric === 'sleepScore' || metric === 'sleepMinutes' ? ' puntos de sueño' : ' % del objetivo'}</span>}</td>
          {showObjective && <td>{point.target === undefined ? 'Sin objetivo' : <>{formatValue(point.target, metric)}{metric !== 'weightKg' && <small>{Math.round(point.value! / point.target * 100)} %</small>}</>}</td>}
        </tr>
      })}</tbody></table>
    </div>
    {metric !== 'weightKg' && <details className="tone-legend"><summary>Escala de colores</summary>
      <p>{metric === 'sleepMinutes' ? 'Color según la puntuación de sueño de la misma fecha. Sin puntuación, color neutro.' : metric === 'sleepScore' ? 'Puntuación de sueño (0–100).' : 'Porcentaje del objetivo vigente en cada fecha. Sin objetivo, color neutro.'}</p>
      <ul>{toneBands.map(band => <li key={band.tone}><span className={`tone-dot tone-${band.tone}`} />{band.label}{metric === 'sleepScore' || metric === 'sleepMinutes' ? ' puntos de sueño' : ' %'}</li>)}</ul>
      {metric !== 'sleepScore' && metric !== 'sleepMinutes' && <p>A partir del 100 % el color no aumenta. La escala visual no implica que más cantidad sea mejor.</p>}
    </details>}
  </>
}
