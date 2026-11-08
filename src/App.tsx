import { useEffect, useState, type FormEvent } from 'react'
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import { readPreferences, savePreferences } from './data/database'
import './App.css'

const sections = [
  { path: '/', label: 'Hoy', icon: '◷' },
  { path: '/evolucion', label: 'Evolución', icon: '↑' },
  { path: '/dieta', label: 'Dieta', icon: '≋' },
  { path: '/ajustes', label: 'Ajustes', icon: '⚙' },
]

function Today() {
  const [date] = useState(() => new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()))
  return <>
    <p className="eyebrow">TU ESPACIO PERSONAL</p>
    <h1>Un día a la vez.</h1>
    <p className="subtitle date">{date}</p>
    <section className="welcome" aria-labelledby="welcome-title">
      <span className="badge">EL PUNTO DE PARTIDA</span>
      <h2 id="welcome-title">Tus hábitos, en un mismo lugar.</h2>
      <p>Agua, descanso, movimiento y nutrición. Estamos preparando tu espacio para seguir lo que te importa.</p>
      <NavLink className="button" to="/ajustes">Configurar mi espacio <span aria-hidden="true">→</span></NavLink>
    </section>
    <div className="section-heading"><h2>Tu seguimiento diario</h2><span>Próximamente</span></div>
    <div className="metrics">
      {[
        ['Agua', 'Hidratación diaria', 'ml', 'blue'],
        ['Sueño', 'Tiempo y calidad', 'h', 'purple'],
        ['Pasos', 'Movimiento cotidiano', 'pasos', 'orange'],
        ['Peso', 'Evolución personal', 'kg', 'green'],
      ].map(([name, description, unit, color]) => <article className={`metric ${color}`} key={name}>
        <h3>{name}</h3><p className="metric-value">— <small>{unit}</small></p><p>{description}</p>
      </article>)}
    </div>
    <p className="footnote">El registro de métricas llegará en el siguiente hito. Todavía no hay datos de salud guardados.</p>
  </>
}

function Upcoming({ title, description }: { title: string; description: string }) {
  return <><p className="eyebrow">PASO A PASO</p><h1>{title}</h1><p className="subtitle">{description}</p>
    <section className="panel"><span className="badge">PRÓXIMAMENTE</span><h2>Todo empieza con tus registros.</h2>
      <p>Esta sección forma parte del plan del MVP. Primero construiremos el registro diario y después añadiremos estas herramientas.</p>
      <NavLink className="text-link" to="/">Volver a Hoy →</NavLink>
    </section></>
}

function Settings() {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    readPreferences().then(value => { if (active) { setAmount(String(value.waterShortcutMl)); setLoading(false) } })
      .catch(() => { if (active) { setError('No se pudo abrir el almacenamiento local. Recarga para volver a intentarlo.'); setLoading(false) } })
    return () => { active = false }
  }, [])
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus(''); setError(''); setSaving(true)
    try {
      await savePreferences(Number(amount))
      setStatus('Preferencia guardada en este dispositivo.')
    } catch (cause) {
      setError(cause instanceof Error && cause.message.startsWith('Introduce') ? cause.message : 'No se pudo guardar. Comprueba que el navegador permite almacenar datos y vuelve a intentarlo.')
    } finally { setSaving(false) }
  }
  return <><p className="eyebrow">A TU MANERA</p><h1>Tu espacio.</h1><p className="subtitle">Pequeños ajustes para tu día a día.</p>
    <section className="panel"><h2>Registro rápido de agua</h2><p>Elige cuánto añadirá cada pulsación cuando esté disponible el registro diario.</p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="water">Cantidad por pulsación (ml)</label>
        <input id="water" type="number" inputMode="numeric" min="1" max="2000" step="1" required value={amount} disabled={loading || saving} onChange={event => { setAmount(event.target.value); setStatus('') }} />
        <button className="button" disabled={loading || saving || amount === ''}>{saving ? 'Guardando…' : loading ? 'Cargando…' : 'Guardar preferencia'}</button>
      </form>
      <p role="status" className="success">{status}</p>{error && <p role="alert" className="error">{error}</p>}
    </section>
    <section className="panel storage"><span className="badge">SOLO EN TU TELÉFONO</span><h2>Tú tienes tus datos.</h2>
      <p>La información se guarda en este navegador. Esta versión no utiliza cuentas ni envía tus registros a un servidor.</p>
      <p>Si borras los datos del sitio o cambias de navegador o dispositivo, no podrás recuperarlos automáticamente. Las copias de seguridad están previstas para más adelante.</p>
    </section></>
}

export default function App() {
  return <HashRouter><a className="skip-link" href="#main">Saltar al contenido</a>
    <div className="app-shell"><header className="brand"><NavLink to="/" aria-label="Fitness & Health, inicio"><span className="brand-mark" aria-hidden="true">f.</span><span>fitness <span className="brand-light">& health</span></span></NavLink><span className="personal-label">PERSONAL</span></header>
      <main id="main" tabIndex={-1}><Routes>
        <Route path="/" element={<Today />} />
        <Route path="/evolucion" element={<Upcoming title="Tu evolución." description="Una perspectiva de tus hábitos a lo largo del tiempo." />} />
        <Route path="/dieta" element={<Upcoming title="Nutrición con intención." description="Tus objetivos y fases de dieta, organizados." />} />
        <Route path="/ajustes" element={<Settings />} />
        <Route path="*" element={<Upcoming title="Página no encontrada." description="Puedes volver a tu espacio desde la navegación." />} />
      </Routes></main>
      <nav className="bottom-nav" aria-label="Navegación principal">{sections.map(section => <NavLink key={section.path} to={section.path} end><span aria-hidden="true">{section.icon}</span>{section.label}</NavLink>)}</nav>
    </div></HashRouter>
}
