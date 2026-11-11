import { useLayoutEffect } from 'react'
import { HashRouter, Navigate, NavLink, Route, Routes, useLocation, useSearchParams } from 'react-router-dom'
import './App.css'
import DailyPage from './features/DailyPage'
import HistoryPage from './features/HistoryPage'
import DietPage from './features/DietPage'

const sections = [
  { path: '/', label: 'Resumen', icon: 'M4 19V5M4 19h16M8 15l4-5 4 2 4-7' },
  { path: '/registros', label: 'Registros', icon: 'M9 5H6a2 2 0 0 0-2 2v13h16V7a2 2 0 0 0-2-2h-3M9 3h6v4H9zM8 12h8M8 16h5' },
  { path: '/dieta', label: 'Dieta', icon: 'M4 3v6a3 3 0 0 0 6 0V3M7 3v18M19 21V3c-4 3-4 9 0 10' },
  { path: '/ajustes', label: 'Ajustes', icon: 'M4 7h16M4 17h16M9 4v6M15 14v6' },
]

function RouteScrollReset() {
  const { pathname } = useLocation()
  useLayoutEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }) }, [pathname])
  return null
}

function Home() {
  const [params] = useSearchParams()
  return params.has('date') ? <Navigate to={`/registros?${params.toString()}`} replace /> : <HistoryPage />
}
function Settings() {
  return <><h1 className="page-title">Ajustes</h1>
    <section className="panel settings-empty"><span className="settings-symbol" aria-hidden="true">α</span><h2>Próximamente</h2></section>
  </>
}
function NotFound() {
  return <><h1>Página no encontrada</h1><NavLink to="/" className="button">Volver al resumen</NavLink></>
}

export default function App() {
  return <HashRouter><RouteScrollReset /><a className="skip-link" href="#main" onClick={event => { event.preventDefault(); document.getElementById('main')?.focus() }}>Saltar al contenido</a>
    <div className="app-shell"><header className="brand"><NavLink to="/" aria-label="Alpha, inicio"><span className="brand-mark" aria-hidden="true">α</span><span className="brand-name">Alpha</span></NavLink><span className="personal-label"><i aria-hidden="true" /> PERSONAL</span></header>
      <main id="main" tabIndex={-1}><Routes>
        <Route path="/" element={<Home />} />
        <Route path="/registros" element={<DailyPage />} />
        <Route path="/evolucion" element={<Navigate to="/" replace />} />
        <Route path="/dieta/*" element={<DietPage />} />
        <Route path="/ajustes" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Routes></main>
      <nav className="bottom-nav" aria-label="Navegación principal">{sections.map(section => <NavLink key={section.path} to={section.path} end={section.path !== '/dieta'}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={section.icon} /></svg>{section.label}</NavLink>)}</nav>
    </div></HashRouter>
}
