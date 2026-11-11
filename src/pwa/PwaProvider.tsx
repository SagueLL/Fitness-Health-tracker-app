import { useEffect, useRef, useState, type ReactNode } from 'react'
import { PwaContext } from './PwaContext'
import { useRegisterSW } from 'virtual:pwa-register/react'

interface InstallPrompt extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
export default function PwaProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(() => navigator.onLine)
  const [installed, setInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  const [prompt, setPrompt] = useState<InstallPrompt>()
  const [installing, setInstalling] = useState(false)
  const [offlineAvailable, setOfflineAvailable] = useState(false)
  const [message, setMessage] = useState('')
  const [updating, setUpdating] = useState(false)
  const [deferred, setDeferred] = useState(false)
  const registration = useRef<ServiceWorkerRegistration | undefined>(undefined)
  const lastCheck = useRef(0)
  const reloadRequested = useRef(false)
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    // Reload only the tab that explicitly accepted the update, including updates
    // received later in the same session as the first installation.
    onNeedReload() {},
    onRegisteredSW(_url, value) { registration.current = value },
    onRegisterError() { setMessage('No se pudo preparar el uso sin conexión. Comprueba la conexión y vuelve a abrir Alpha.') },
  })
  useEffect(() => {
    let active = true
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      void navigator.serviceWorker.ready.then(() => { if (active) setOfflineAvailable(true) })
    }
    const connectivity = () => {
      setOnline(navigator.onLine)
      if (navigator.onLine) refresh()
    }
    function refresh() {
      if (!navigator.onLine || document.visibilityState !== 'visible' || Date.now() - lastCheck.current < 60000) return
      lastCheck.current = Date.now()
      void registration.current?.update().catch(() => { /* Retry on next visit or manual check. */ })
    }
    const controllerChanged = () => { if (reloadRequested.current) window.location.reload() }
    navigator.serviceWorker?.addEventListener('controllerchange', controllerChanged)
    const reloadStarted = () => { if (reloadRequested.current) { reloadRequested.current = false; setUpdating(false) } }
    window.addEventListener('beforeunload', reloadStarted)
    const beforeInstall = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt) }
    const installedEvent = () => { setInstalled(true); setPrompt(undefined) }
    const media = window.matchMedia('(display-mode: standalone)')
    const displayChanged = () => setInstalled(media.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
    window.addEventListener('online', connectivity)
    window.addEventListener('offline', connectivity)
    window.addEventListener('beforeinstallprompt', beforeInstall)
    window.addEventListener('appinstalled', installedEvent)
    document.addEventListener('visibilitychange', refresh)
    media.addEventListener('change', displayChanged)
    return () => {
      active = false
      window.removeEventListener('online', connectivity)
      window.removeEventListener('offline', connectivity)
      window.removeEventListener('beforeinstallprompt', beforeInstall)
      window.removeEventListener('appinstalled', installedEvent)
      document.removeEventListener('visibilitychange', refresh)
      media.removeEventListener('change', displayChanged)
      navigator.serviceWorker?.removeEventListener('controllerchange', controllerChanged)
      window.removeEventListener('beforeunload', reloadStarted)
    }
  }, [])
  async function install() {
    if (!prompt) return
    setInstalling(true); setMessage('')
    try {
      await prompt.prompt()
      const choice = await prompt.userChoice
      setMessage(choice.outcome === 'accepted' ? 'Instalación solicitada al navegador.' : 'Puedes instalar Alpha más adelante.')
      setPrompt(undefined)
    } catch { setMessage('No se pudo abrir la instalación. Puedes utilizar el menú del navegador.') }
    finally { setInstalling(false) }
  }
  async function checkUpdate() {
    if (!online) { setMessage('Conecta a internet para buscar actualizaciones.'); return }
    if (!registration.current) { setMessage('La instalación sin conexión aún no está preparada. Vuelve a abrir Alpha con conexión.'); return }
    try { await registration.current.update(); setMessage('Comprobación realizada. Si hay una versión nueva, aparecerá el aviso para actualizar.') }
    catch { setMessage('No se pudo buscar una actualización. Vuelve a intentarlo con conexión.') }
  }
  async function applyUpdate() {
    if (!window.confirm('Alpha se reiniciará para actualizarse. Guarda primero los cambios de los formularios. ¿Actualizar ahora?')) return
    setUpdating(true)
    reloadRequested.current = true
    try {
      if (registration.current?.waiting) await updateServiceWorker(true)
      else window.location.reload()
    } catch { reloadRequested.current = false; setMessage('No se pudo aplicar la actualización. Vuelve a intentarlo.'); setUpdating(false) }
  }
  return <PwaContext.Provider value={{ online, installed, canInstall: Boolean(prompt), installing, offlineAvailable, needRefresh, updating, applyUpdate, message, install, checkUpdate }}>
    {children}
    <div className="pwa-notices">
      {!online && <aside className="pwa-offline" role="status">Sin conexión</aside>}
      {needRefresh && !deferred && <aside className="pwa-update" aria-label="Actualización disponible"><strong>Nueva versión de Alpha</strong>{message.startsWith('No se pudo aplicar') && <p role="alert">{message}</p>}<p>Guarda tus cambios antes de actualizar.</p><button className="button" disabled={updating} onClick={() => void applyUpdate()}>{updating ? 'Actualizando…' : 'Actualizar Alpha'}</button><button className="outline-button" disabled={updating} onClick={() => setDeferred(true)}>Más tarde</button></aside>}
    </div>
  </PwaContext.Provider>
}
