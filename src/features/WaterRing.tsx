import type { HistoryPoint } from '../domain/history'
import { waterProgress } from '../domain/water'
const liters = (ml: number) => (ml / 1000).toLocaleString('es', { maximumFractionDigits: 2 })
export default function WaterRing({ points }: { points: HistoryPoint[] }) {
  const progress = waterProgress(points)
  const percent = progress.reached ? 100 : Math.floor(progress.fraction * 100)
  return <div className="water-ring-panel">
    <div className="water-ring" role="progressbar" aria-label="Agua acumulada del periodo" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={`${liters(progress.totalMl)} de ${liters(progress.targetMl)} litros registrados, ${percent} %`}>
      <svg viewBox="0 0 240 240" aria-hidden="true"><circle className="water-ring-track" cx="120" cy="120" r="98" /><circle className="water-ring-fill" cx="120" cy="120" r="98" pathLength="100" strokeDasharray={`${progress.fraction * 100} 100`} transform="rotate(-90 120 120)" /></svg>
      <div className="water-ring-value"><strong>{percent} %</strong><span>{liters(progress.totalMl)} / {liters(progress.targetMl)} L</span></div>
    </div>
    <p className="water-ring-goal">Meta: 3 L/día · {points.length} días</p>
    <p className="water-ring-caption">{progress.reached ? 'Meta del periodo alcanzada' : progress.count ? `${liters(Math.max(0, progress.targetMl - progress.totalMl))} L para completar la meta` : 'Sin registros de agua'}</p>
    <small>{progress.count} de {points.length} días registrados</small>
  </div>
}
