import { useEffect, useRef, useState, type FormEvent } from 'react'
import { deleteDietPhase, readDietPhases, saveDietPhase } from '../data/dietRepository'
import { type DietDraft, type DietMeal, type DietPhase } from '../domain/diet'
import { ValidationError } from '../domain/daily'

const newMeal = (): DietMeal => ({ id: crypto.randomUUID(), name: '', foods: '' })

function DietEditor({ phase, onSave, onCancel }: { phase?: DietPhase; onSave: (phase: DietPhase) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<DietDraft>(() => phase ? { name: phase.name, notes: phase.notes, meals: phase.meals.map(meal => ({ ...meal })) } : { name: '', notes: '', meals: [newMeal()] })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [original] = useState(() => JSON.stringify(draft))
  const nameInput = useRef<HTMLInputElement>(null)
  const dirty = JSON.stringify(draft) !== original
  useEffect(() => { nameInput.current?.focus() }, [])
  useEffect(() => {
    if (!dirty && !saving) return
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault() }
    const navigation = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest('a') : null
      if (link && (saving || !window.confirm('Hay cambios sin guardar en la dieta. ¿Descartarlos y salir?'))) { event.preventDefault(); event.stopPropagation() }
    }
    window.addEventListener('beforeunload', unload)
    document.addEventListener('click', navigation, true)
    return () => { window.removeEventListener('beforeunload', unload); document.removeEventListener('click', navigation, true) }
  }, [dirty, saving])
  function updateMeal(id: string, change: Partial<DietMeal>) {
    setDraft(value => ({ ...value, meals: value.meals.map(meal => meal.id === id ? { ...meal, ...change } : meal) }))
    setError('')
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError('')
    try { onSave(await saveDietPhase(draft, phase?.id)) }
    catch (cause) { setError(cause instanceof ValidationError ? cause.message : 'No se pudo guardar la fase. Tu texto sigue aquí; vuelve a intentarlo.') }
    finally { setSaving(false) }
  }
  return <section className="panel diet-editor" aria-labelledby="diet-editor-title"><h2 id="diet-editor-title">{phase ? 'Editar fase' : 'Nueva fase de dieta'}</h2>
    <p>Escribe las comidas como las organizarías en una libreta. Puedes incluir cantidades, alternativas y preparaciones.</p>
    <form onSubmit={submit}><fieldset disabled={saving}><div className="daily-fields">
      <div><label htmlFor="diet-name">Nombre de la fase</label><input ref={nameInput} id="diet-name" value={draft.name} maxLength={100} required placeholder="Ej. Mi dieta de noviembre" onChange={event => { setDraft({ ...draft, name: event.target.value }); setError('') }} /></div>
      {draft.meals.map((meal, index) => <section className="meal-editor" key={meal.id} aria-label={`Comida ${index + 1}`}>
        <div className="meal-heading"><span className="badge">COMIDA {index + 1}</span>{draft.meals.length > 1 && <button className="delete-value" type="button" aria-label={`Quitar comida ${index + 1}`} onClick={() => {
          if ((!meal.name.trim() && !meal.foods.trim()) || window.confirm('¿Quitar esta comida del formulario? El cambio se aplicará al guardar la fase.')) setDraft({ ...draft, meals: draft.meals.filter(value => value.id !== meal.id) })
        }}>Quitar</button>}</div>
        <label htmlFor={`meal-name-${meal.id}`}>Nombre de la comida {index + 1}</label><input id={`meal-name-${meal.id}`} required maxLength={100} placeholder="Ej. Desayuno" value={meal.name} onChange={event => updateMeal(meal.id, { name: event.target.value })} />
        <label htmlFor={`meal-foods-${meal.id}`}>Alimentos y cantidades de la comida {index + 1}</label><textarea id={`meal-foods-${meal.id}`} required maxLength={5000} rows={5} placeholder={'Ej. Yogur natural\n40 g de avena\nUna pieza de fruta'} value={meal.foods} onChange={event => updateMeal(meal.id, { foods: event.target.value })} />
      </section>)}
      <button type="button" className="outline-button" disabled={draft.meals.length >= 30} onClick={() => setDraft({ ...draft, meals: [...draft.meals, newMeal()] })}>+ Añadir comida</button>
      <div><label htmlFor="diet-notes">Notas de la fase (opcional)</label><textarea id="diet-notes" rows={3} maxLength={3000} value={draft.notes} placeholder="Alternativas, horarios o lo que quieras recordar." onChange={event => setDraft({ ...draft, notes: event.target.value })} /></div>
    </div><div className="diet-actions"><button className="button" type="submit">{saving ? 'Guardando…' : 'Guardar fase'}</button><button className="outline-button" type="button" onClick={() => { if (!dirty || window.confirm('¿Descartar los cambios sin guardar?')) onCancel() }}>Cancelar</button></div></fieldset></form>
    {error && <p role="alert" className="error feedback">{error}</p>}
  </section>
}

export default function DietPlans() {
  const [phases, setPhases] = useState<DietPhase[]>([])
  const [selected, setSelected] = useState<string>()
  const [editor, setEditor] = useState<{ phase?: DietPhase }>()
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [attempt, setAttempt] = useState(0)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    let active = true
    readDietPhases().then(values => { if (active) { setPhases(values); setSelected(values[0]?.id); setReady(true) } })
      .catch(() => { if (active) setError('No se pudieron cargar tus fases. Vuelve a intentarlo.') })
    return () => { active = false }
  }, [attempt])
  const phase = phases.find(value => value.id === selected)
  function closeEditor() { setEditor(undefined); setTimeout(() => heading.current?.focus(), 0) }
  async function remove(value: DietPhase) {
    if (!window.confirm(`¿Eliminar la fase «${value.name}» y sus comidas? Esta acción no se puede deshacer.`)) return
    setBusy(true); setError(''); setStatus('')
    try {
      await deleteDietPhase(value.id)
      const remaining = phases.filter(item => item.id !== value.id)
      setPhases(remaining); setSelected(remaining[0]?.id); setStatus('Fase eliminada.')
    } catch { setError('No se pudo eliminar la fase. Vuelve a intentarlo.') }
    finally { setBusy(false) }
  }
  return <>
    <div className="diet-plan-heading"><div><p className="eyebrow">HECHA POR TI</p><h2 ref={heading} tabIndex={-1}>Mis fases de dieta</h2></div>{ready && !editor && <button className="button" disabled={busy} onClick={() => { setEditor({}); setStatus(''); setError('') }}>Crear fase</button>}</div>
    {!ready && !error && <p role="status">Cargando tus fases…</p>}
    {!ready && error && <button type="button" className="button" onClick={() => { setError(''); setAttempt(value => value + 1) }}>Reintentar fases</button>}
    {editor ? <DietEditor key={editor.phase?.id ?? 'new'} phase={editor.phase} onCancel={closeEditor} onSave={saved => {
      setPhases(values => [saved, ...values.filter(value => value.id !== saved.id)]); setSelected(saved.id); setStatus('Fase guardada en este dispositivo.'); closeEditor()
    }} /> : ready && <>
      {phases.length > 0 && <div className="date-picker"><label htmlFor="diet-phase">Consultar fase</label><select id="diet-phase" value={selected ?? ''} disabled={busy} onChange={event => { setSelected(event.target.value); setStatus(''); setError('') }}>{phases.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select></div>}
      {phase ? <section className="panel diet-view" aria-labelledby="phase-title"><span className="badge">TU PLAN DE COMIDAS</span><h2 id="phase-title">{phase.name}</h2>
        <div className="meal-cards">{phase.meals.map((meal, index) => <article className="meal-card" key={meal.id}><span className="meal-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><div><h3>{meal.name}</h3><p>{meal.foods}</p></div></article>)}</div>
        {phase.notes && <aside className="diet-notes"><h3>Notas</h3><p>{phase.notes}</p></aside>}
        <div className="diet-actions"><button className="button" disabled={busy} onClick={() => { setEditor({ phase }); setError(''); setStatus('') }}>Editar fase</button><button className="delete-value" type="button" disabled={busy} onClick={() => void remove(phase)}>{busy ? 'Eliminando…' : 'Eliminar fase'}</button></div>
      </section> : <section className="panel diet-empty"><span className="badge">TU PRIMER PLAN</span><h3>Tu dieta, escrita a tu manera.</h3><p>Crea una fase, añade tus comidas y escribe lo que quieres comer en cada una. Se guardará en este dispositivo.</p></section>}
      <p className="footnote">Un plan manual de comidas. Las fases son independientes: no tienen activación automática por fecha ni calculan calorías o macros de los alimentos.</p>
    </>}
    {status && <p role="status" className="success feedback">{status}</p>}{error && <p role="alert" className="error feedback">{error}</p>}
  </>
}
