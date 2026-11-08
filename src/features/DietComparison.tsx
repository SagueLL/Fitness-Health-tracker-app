import { useState } from 'react'
import type { DietPhase } from '../domain/diet'
import { compareDiets } from '../domain/dietComparison'

const labels = { added: 'Añadida', removed: 'Eliminada', changed: 'Modificada', same: 'Sin cambios' }
export default function DietComparison({ phases, initialBefore, initialAfter, onClose }: { phases: DietPhase[]; initialBefore: string; initialAfter: string; onClose: () => void }) {
  const [beforeId, setBeforeId] = useState(initialBefore)
  const [afterId, setAfterId] = useState(initialAfter)
  const [changesOnly, setChangesOnly] = useState(true)
  const before = phases.find(phase => phase.id === beforeId)
  const after = phases.find(phase => phase.id === afterId)
  if (!before || !after) return <section className="panel"><p>Alguna fase ya no está disponible.</p><button className="outline-button" onClick={onClose}>Cerrar comparación</button></section>
  const comparison = compareDiets(before, after)
  const visible = comparison.meals.filter(meal => !changesOnly || meal.state !== 'same')
  return <section className="panel diet-comparison" aria-labelledby="comparison-title"><span className="badge">ANTES Y DESPUÉS</span><h2 id="comparison-title">Comparar fases</h2>
    <p>Compara el contenido guardado de dos planes. Las cantidades se muestran tal como las escribiste, sin cálculos de nutrientes.</p>
    <div className="comparison-selectors"><div><label htmlFor="comparison-before">Fase de referencia</label><select id="comparison-before" value={beforeId} onChange={event => setBeforeId(event.target.value)}>{phases.map(phase => <option value={phase.id} key={phase.id}>{phase.name}</option>)}</select></div>
      <div><label htmlFor="comparison-after">Fase a comparar</label><select id="comparison-after" value={afterId} onChange={event => setAfterId(event.target.value)}>{phases.map(phase => <option value={phase.id} key={phase.id}>{phase.name}</option>)}</select></div></div>
    <button type="button" className="outline-button" onClick={() => { setBeforeId(afterId); setAfterId(beforeId) }}>Intercambiar fases</button>
    {beforeId === afterId ? <p role="status">Selecciona dos fases diferentes para comparar.</p> : <>
      <p className="comparison-summary">{comparison.counts.added} añadidas · {comparison.counts.removed} eliminadas · {comparison.counts.changed} modificadas · {comparison.counts.same} sin cambios</p>
      <label className="comparison-toggle"><input type="checkbox" checked={changesOnly} onChange={event => setChangesOnly(event.target.checked)} />Solo comidas con cambios</label>
      {comparison.nameChanged && <p className="footnote">Nombre de fase: «{before.name}» → «{after.name}».</p>}
      {!comparison.counts.added && !comparison.counts.removed && !comparison.counts.changed && !comparison.notesChanged && <p className="comparison-empty">Las comidas y las notas son iguales en ambas fases.</p>}
      {!visible.length && !comparison.notesChanged && comparison.counts.changed + comparison.counts.added + comparison.counts.removed > 0 && <p>No hay comidas que mostrar.</p>}
      <div className="comparison-meals">{visible.map((meal, index) => <article key={`${meal.before?.id ?? ''}-${meal.after?.id ?? ''}-${index}`} className={`comparison-change comparison-${meal.state}`} aria-label={`${meal.before?.name ?? meal.after?.name}: ${labels[meal.state]}`}>
        <div className="comparison-heading"><strong>{meal.after?.name ?? meal.before?.name}</strong><span className="change-badge">{labels[meal.state]}</span></div>
        {meal.moved && <p className="footnote">Posición {meal.beforeIndex! + 1} → {meal.afterIndex! + 1}</p>}
        <div className="comparison-columns"><div><span className="badge">REFERENCIA</span>{meal.before ? <><h3>{meal.before.name}</h3><p>{meal.before.foods}</p></> : <p className="absent-meal">No estaba en esta fase.</p>}</div>
          <div><span className="badge">COMPARADA</span>{meal.after ? <><h3>{meal.after.name}</h3><p>{meal.after.foods}</p></> : <p className="absent-meal">Ya no está en esta fase.</p>}</div></div>
      </article>)}</div>
      {comparison.notesChanged && <section className="comparison-change" aria-labelledby="comparison-notes"><h3 id="comparison-notes">Cambios en las notas</h3><div className="comparison-columns"><div><span className="badge">REFERENCIA</span><p>{before.notes || 'Sin notas'}</p></div><div><span className="badge">COMPARADA</span><p>{after.notes || 'Sin notas'}</p></div></div></section>}
      <p className="footnote">Las copias conservan la correspondencia de sus comidas aunque cambies el nombre. Entre fases independientes se emparejan por nombre; si se repite, por orden de aparición. Se comparan las versiones guardadas actuales.</p>
    </>}
    <button type="button" className="outline-button" onClick={onClose}>Cerrar comparación</button>
  </section>
}
