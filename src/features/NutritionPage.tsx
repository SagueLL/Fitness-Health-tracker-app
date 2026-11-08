import { useEffect, useState, type FormEvent } from 'react'
import { NavLink } from 'react-router-dom'
import { readNutritionGoals, saveNutritionGoal } from '../data/nutritionRepository'
import { localDate, parseValue, ValidationError } from '../domain/daily'
import { calculateNutrition, calories, grams, nutritionForDate, type NutritionGoal, type NutritionInputs, type NutritionResult } from '../domain/nutrition'
import { shortDate } from '../domain/history'

type Fields = Record<keyof NutritionInputs, string>
const defaults: Fields = { weightKg: '', heightCm: '', age: '', equation: '', pal: '1,55', phase: 'maintenance', adjustmentMode: 'percent', adjustment: '15', proteinPerKg: '1,6', fatPerKg: '0,8' }
const phaseLabels = { maintenance: 'Mantenimiento', loss: 'Definición', gain: 'Volumen' }
const numbers = ['weightKg', 'heightCm', 'age', 'pal', 'adjustment', 'proteinPerKg', 'fatPerKg'] as const
const fieldsMeta = [
  { key: 'weightKg', label: 'Peso de cálculo (kg)', hint: '30–300 kg. Este peso se usa también para calcular proteína y grasa.' },
  { key: 'heightCm', label: 'Altura (cm)', hint: '120–230 cm.' },
  { key: 'age', label: 'Edad (años cumplidos)', hint: '18–100 años. Calculadora para adultos.' },
  { key: 'pal', label: 'Factor de actividad (PAL)', hint: '1,20–2,20. Incluye tu actividad y entrenamiento habituales; no sumaremos pasos ni ejercicio aparte.' },
  { key: 'proteinPerKg', label: 'Proteína (g/kg de peso)', hint: 'Valor inicial editable: 1,6. Se aplica al peso de cálculo, no a masa libre de grasa.' },
  { key: 'fatPerKg', label: 'Grasa (g/kg de peso)', hint: 'Valor inicial editable: 0,8. Los hidratos utilizan las calorías restantes.' },
] as const

function fieldsFrom(inputs: NutritionInputs): Fields {
  return Object.fromEntries(Object.entries(inputs).map(([key, value]) => [key, typeof value === 'number' ? String(value).replace('.', ',') : value])) as Fields
}
function inputsFrom(fields: Fields): NutritionInputs {
  const numeric = Object.fromEntries(numbers.map(key => {
    const value = fields.phase === 'maintenance' && key === 'adjustment' ? 0 : parseValue(fields[key])
    if (value === undefined) throw new ValidationError('Completa todos los parámetros del cálculo.')
    return [key, value]
  }))
  return { ...numeric, equation: fields.equation, phase: fields.phase, adjustmentMode: fields.adjustmentMode } as NutritionInputs
}

function Result({ result }: { result: NutritionResult }) {
  return <>
    <p className="nutrition-energy">{calories(result.targetKcal)}<small>al día · estimación</small></p>
    <div className="macro-grid"><div><span>Proteína</span><strong>{grams(result.proteinG)}</strong></div><div><span>Grasa</span><strong>{grams(result.fatG)}</strong></div><div><span>Hidratos</span><strong>{grams(result.carbsG)}</strong></div></div>
    <details className="calculation-detail"><summary>Ver desglose del cálculo</summary><dl>
      <div><dt>Reposo · Mifflin–St Jeor</dt><dd>{calories(result.restingKcal)}</dd></div>
      <div><dt>Mantenimiento · reposo × PAL</dt><dd>{calories(result.maintenanceKcal)}</dd></div>
      <div><dt>Ajuste de fase</dt><dd>{result.adjustmentKcal > 0 ? '+' : result.adjustmentKcal < 0 ? '−' : ''}{calories(Math.abs(result.adjustmentKcal))}</dd></div>
      <div><dt>Objetivo energético</dt><dd>{calories(result.targetKcal)}</dd></div>
    </dl><p className="footnote">Proteína = peso × coeficiente. Grasa = peso × coeficiente. Hidratos = (calorías objetivo − 4 × proteína − 9 × grasa) ÷ 4.</p></details>
    <p className="footnote">Se guarda la precisión completa. Las kcal se muestran redondeadas a 10 y los macros a 1 g; los valores visibles pueden no sumar exactamente.</p>
    {result.warnings.length > 0 && <ul className="nutrition-notes">{result.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>}
  </>
}

export default function NutritionPage() {
  const [goals, setGoals] = useState<NutritionGoal[]>([])
  const [fields, setFields] = useState<Fields>(defaults)
  const [preview, setPreview] = useState<{ inputs: NutritionInputs; result: NutritionResult }>()
  const [effectiveFrom, setEffectiveFrom] = useState(localDate)
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    readNutritionGoals().then(values => {
      if (!active) return
      setGoals(values)
      const previous = nutritionForDate(values, localDate()) ?? [...values].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
      if (previous) setFields(fieldsFrom(previous.inputs))
      setReady(true)
    }).catch(() => { if (active) setError('No se pudieron cargar los objetivos nutricionales. Vuelve a intentarlo.') })
    return () => { active = false }
  }, [attempt])
  function update(key: keyof Fields, value: string) { setFields(current => ({ ...current, [key]: value })); setPreview(undefined); setError(''); setStatus('') }
  function calculate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setStatus(''); setPreview(undefined)
    try { const inputs = inputsFrom(fields); setPreview({ inputs, result: calculateNutrition(inputs) }) }
    catch (cause) { setError(cause instanceof ValidationError ? cause.message : 'No se pudo calcular. Revisa los parámetros.') }
  }
  async function save() {
    if (!preview) return
    const revision = goals.some(goal => goal.effectiveFrom === effectiveFrom)
    if (revision && !window.confirm('Ya hay un objetivo con esta fecha. ¿Guardar una nueva revisión? Se conservará la anterior y la nueva será la vigente desde esa fecha.')) return
    setSaving(true); setError(''); setStatus('')
    try {
      const goal = await saveNutritionGoal(preview.inputs, effectiveFrom, revision)
      setGoals(current => [...current, goal]); setStatus('Objetivo nutricional guardado en este dispositivo.')
    } catch (cause) { setError(cause instanceof ValidationError ? cause.message : 'No se pudo guardar. El cálculo sigue disponible; vuelve a intentarlo.') }
    finally { setSaving(false) }
  }
  const current = nutritionForDate(goals, localDate())
  const ordered = [...goals].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom) || b.revision - a.revision)
  return <><p className="eyebrow">ENERGÍA CON CONTEXTO</p><h1>Nutrición con intención.</h1><p className="subtitle">Una primera estimación para organizar tu alimentación.</p>
    {current && <section className="panel current-nutrition" aria-labelledby="current-nutrition"><span className="badge">OBJETIVO VIGENTE</span><h2 id="current-nutrition">{phaseLabels[current.inputs.phase]} · desde {shortDate(current.effectiveFrom)}</h2><Result result={current.result} /></section>}
    <section className="panel" aria-labelledby="calculator-title"><h2 id="calculator-title">Calculadora de calorías y macros</h2><p>Mifflin–St Jeor + actividad habitual. Ajusta los parámetros y revisa el cálculo antes de guardarlo.</p>
      <p className="footnote">Orientada a adultos. La fórmula general no está diseñada para embarazo, lactancia ni necesidades clínicas específicas. El resultado es una estimación, no una medición de tu gasto.</p>
      {!ready && !error && <p>Cargando tus parámetros…</p>}
      {!ready && error && <button type="button" className="button" onClick={() => { setError(''); setAttempt(value => value + 1) }}>Reintentar carga</button>}
      <form onSubmit={calculate}><fieldset disabled={!ready || saving}><div className="daily-fields">
        <div><label htmlFor="nutrition-equation">Variante de Mifflin–St Jeor</label><select id="nutrition-equation" required value={fields.equation} onChange={event => update('equation', event.target.value)}><option value="">Seleccionar variante</option><option value="male">Masculina (+5)</option><option value="female">Femenina (−161)</option></select><p className="field-hint">Elige el coeficiente fisiológico de la ecuación que vas a utilizar.</p></div>
        {fieldsMeta.slice(0, 4).map(({ key, label, hint }) => <div key={key}><label htmlFor={`nutrition-${key}`}>{label}</label><input id={`nutrition-${key}`} type="text" inputMode={key === 'age' ? 'numeric' : 'decimal'} value={fields[key]} required aria-describedby={`hint-${key}`} onChange={event => update(key, event.target.value)} /><p id={`hint-${key}`} className="field-hint">{hint}</p></div>)}
        <details className="pal-guide"><summary>Cómo elegir el factor de actividad</summary><p>Rangos orientativos: 1,20–1,35 muy sedentario; 1,35–1,50 poca actividad; 1,50–1,65 moderada; 1,65–1,85 alta; 1,85–2,20 muy alta. Son aproximaciones, no medidas individuales.</p></details>
        <div><label htmlFor="nutrition-phase">Fase nutricional</label><select id="nutrition-phase" value={fields.phase} onChange={event => update('phase', event.target.value)}>{Object.entries(phaseLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
        {fields.phase !== 'maintenance' && <><div><label htmlFor="nutrition-mode">Tipo de ajuste</label><select id="nutrition-mode" value={fields.adjustmentMode} onChange={event => update('adjustmentMode', event.target.value)}><option value="percent">Porcentaje del mantenimiento</option><option value="kcal">Calorías diarias</option></select></div><div><label htmlFor="nutrition-adjustment">{fields.phase === 'loss' ? 'Déficit' : 'Superávit'} ({fields.adjustmentMode === 'percent' ? '%' : 'kcal/día'})</label><input id="nutrition-adjustment" type="text" inputMode="decimal" required value={fields.adjustment} onChange={event => update('adjustment', event.target.value)} /><p className="field-hint">Introduce la magnitud sin signo. La fase determina si se resta o suma.</p></div></>}
        {fieldsMeta.slice(4).map(({ key, label, hint }) => <div key={key}><label htmlFor={`nutrition-${key}`}>{label}</label><input id={`nutrition-${key}`} type="text" inputMode="decimal" required value={fields[key]} aria-describedby={`hint-${key}`} onChange={event => update(key, event.target.value)} /><p id={`hint-${key}`} className="field-hint">{hint}</p></div>)}
      </div><button className="button" type="submit">Calcular estimación</button></fieldset></form>
    </section>
    {preview && <section className="panel nutrition-preview" aria-labelledby="preview-title"><span className="badge">VISTA PREVIA · SIN APLICAR</span><h2 id="preview-title">Tu estimación</h2><Result result={preview.result} />
      <label htmlFor="nutrition-effective">Aplicar objetivo desde</label><input id="nutrition-effective" type="date" min={localDate()} required value={effectiveFrom} disabled={saving} onChange={event => { setEffectiveFrom(event.target.value); setStatus(''); setError('') }} />
      <button className="button" type="button" disabled={saving || !effectiveFrom} onClick={() => void save()}>{saving ? 'Guardando…' : 'Guardar objetivo nutricional'}</button>
      <p className="footnote">El guardado no cambia tus registros de peso ni los objetivos básicos. No se recalcula automáticamente con nuevos pesajes.</p>
    </section>}
    {status && <p className="success feedback" role="status">{status}</p>}{error && <p className="error feedback" role="alert">{error}</p>}
    {ordered.length > 0 && <section className="panel" aria-labelledby="nutrition-history"><h2 id="nutrition-history">Histórico nutricional</h2><p>Se conservan los parámetros y los resultados de cada revisión.</p><div className="nutrition-history">{ordered.map(goal => <details key={goal.id}><summary>{goal.effectiveFrom} · {phaseLabels[goal.inputs.phase]} · revisión {goal.revision}{goal.id === current?.id ? ' · vigente' : goal.effectiveFrom > localDate() ? ' · programado' : ''}</summary>
      <Result result={goal.result} /><p className="footnote">Peso: {goal.inputs.weightKg} kg · Altura: {goal.inputs.heightCm} cm · Edad: {goal.inputs.age} · Variante: {goal.inputs.equation === 'male' ? 'masculina' : 'femenina'} · PAL: {goal.inputs.pal}. Proteína: {goal.inputs.proteinPerKg} g/kg; grasa: {goal.inputs.fatPerKg} g/kg. Ajuste: {goal.inputs.adjustment} {goal.inputs.adjustmentMode === 'percent' ? '%' : 'kcal'}. Método: {goal.formulaVersion}. Calculado: {new Date(goal.createdAt).toLocaleString('es')}.</p>
      <button type="button" className="text-link discard" disabled={saving} onClick={() => { setFields(fieldsFrom(goal.inputs)); setPreview(undefined); setStatus('Parámetros cargados. Revisa el formulario y calcula para crear otro objetivo.'); setError('') }}>Usar estos parámetros</button>
    </details>)}</div></section>}
    <section className="panel"><span className="badge">SIGUIENTE ETAPA</span><h2>Tu plan de comidas</h2><p>Las fases de dieta, comidas e ingredientes llegarán en el siguiente hito. Esta calculadora guarda objetivos, no alimentos consumidos.</p><NavLink to="/evolucion" className="text-link">Consultar mi evolución →</NavLink></section>
  </>
}
