import { useState } from 'react'
import type { Metric } from '../domain/daily'
import { formatValue, shortDate, type HistoryPoint } from '../domain/history'

const W = 640, H = 300, left = 64, right = 18, top = 20, bottom = 44
export default function HistoryChart({ points, metric }: { points: HistoryPoint[]; metric: Metric }) {
  const [selectedDate, setSelectedDate] = useState<string>()
  const selected = points.find(point => point.date === selectedDate)
  const values = points.flatMap(point => [point.value, point.target, metric === 'weightKg' ? point.movingAverage : undefined].filter((v): v is number => v !== undefined))
  if (!points.some(point => point.value !== undefined)) return <div className="chart-empty"><h3>Aún no hay registros en este periodo.</h3><p>Prueba otro periodo o añade un registro desde Registros.</p></div>
  const max = Math.max(...values), min = metric === 'weightKg' ? Math.min(...values) : 0
  const padding = Math.max((max - min) * .12, metric === 'weightKg' ? .5 : 1)
  const lo = metric === 'weightKg' ? Math.max(0, min - padding) : 0, hi = max + padding
  const x = (i: number) => left + i * (W - left - right) / Math.max(1, points.length - 1)
  const y = (v: number) => top + (hi - v) * (H - top - bottom) / (hi - lo)
  function path(key: 'value' | 'target' | 'movingAverage') {
    let drawing = false
    return points.map((point, index) => {
      const value = point[key]
      if (value === undefined) { drawing = false; return '' }
      const command = drawing ? 'L' : 'M'
      const segment = drawing && key === 'target' ? `H${x(index)}V${y(value)}` : `${command}${x(index)},${y(value)}`
      drawing = true
      return segment
    }).join(' ')
  }
  const axis = (v: number) => (metric === 'sleepMinutes' ? v / 60 : v).toLocaleString('es', { maximumFractionDigits: metric === 'weightKg' ? 1 : 0 })
  const unit = metric === 'sleepMinutes' ? 'horas' : metric === 'waterMl' ? 'ml' : metric === 'weightKg' ? 'kg' : metric === 'steps' ? 'pasos' : 'puntos'
  return <>
    <p className="chart-unit">{unit}{metric === 'weightKg' && ' · Eje ajustado'}</p>
    <svg className="history-chart" viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Gráfica de evolución. Toca un registro para ver su detalle; también disponible en la tabla inferior.">
      {[0, 1, 2, 3].map(index => {
        const v = lo + (hi - lo) * index / 3
        return <g key={index}><line x1={left} x2={W - right} y1={y(v)} y2={y(v)} className="chart-grid" /><text x={left - 10} y={y(v) + 4} textAnchor="end">{axis(v)}</text></g>
      })}
      <path d={path('target')} className="chart-goal" />
      {metric === 'weightKg' && <path d={path('movingAverage')} className="chart-average" />}
      <path d={path('value')} className="chart-line" />
      {points.map((point, index) => point.value !== undefined && <circle key={point.date} cx={x(index)} cy={y(point.value)} r={selectedDate === point.date ? 7 : 5} className="chart-point" role="button" tabIndex={0} aria-label={`${shortDate(point.date)}: ${formatValue(point.value, metric)}`} onClick={() => setSelectedDate(point.date)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedDate(point.date) } }}><title>{shortDate(point.date)}: {formatValue(point.value, metric)}</title></circle>)}
      {[0, Math.floor((points.length - 1) / 2), points.length - 1].map(index => <text key={index} x={x(index)} y={H - 10} textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}>{shortDate(points[index].date)}</text>)}
    </svg>
    <div className="chart-legend"><span><i className="legend-value" />Registro</span>{points.some(p => p.target !== undefined) && <span><i className="legend-goal" />Objetivo de cada día</span>}{metric === 'weightKg' && <span><i className="legend-average" />Media móvil de 7 días</span>}</div>
    <p className="footnote">Huecos: días sin registro.{metric === 'weightKg' && ' Media móvil: registros de los últimos 7 días.'}</p>
    <p className={selected ? "point-detail" : "sr-only"} role="status">{selected ? `${shortDate(selected.date)}: ${formatValue(selected.value, metric)}${selected.target === undefined ? ' · Sin objetivo' : ` · Objetivo: ${formatValue(selected.target, metric)}`}` : ''}</p>
  </>
}
