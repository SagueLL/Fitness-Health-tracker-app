import { usePwa } from './PwaContext'
import CsvImport from '../features/CsvImport'

export default function PwaSettings() {
  const pwa = usePwa()
  return <><h1 className="page-title">Ajustes</h1>
    <CsvImport />
    <section className="panel" aria-labelledby="install-title"><h2 id="install-title">Instalar Alpha</h2>
      {pwa.installed ? <p>Alpha está abierta como aplicación instalada.</p> : <>
        <p>Añade Alpha a tu pantalla de inicio para abrirla como una app.</p>
        {pwa.canInstall && <button className="button" disabled={pwa.installing} onClick={() => void pwa.install()}>{pwa.installing ? 'Abriendo instalación…' : 'Instalar Alpha'}</button>}
        <details className="pwa-instructions" open={!pwa.canInstall}><summary>Instalación desde el navegador</summary><ul><li><strong>Android / Chrome:</strong> menú ⋮ → Instalar aplicación o Añadir a pantalla de inicio.</li><li><strong>iPhone / iPad (Safari):</strong> Compartir → Añadir a pantalla de inicio → Añadir.</li><li><strong>Ordenador (Chrome / Edge):</strong> icono de instalación en la barra de direcciones o menú → Instalar Alpha.</li></ul></details>
      </>}
      {!window.isSecureContext && <p className="footnote">La instalación y el uso sin conexión requieren una dirección HTTPS. Para pruebas en el ordenador también sirve localhost.</p>}
    </section>
    <section className="panel" aria-labelledby="offline-title"><h2 id="offline-title">Disponibilidad</h2><p>{import.meta.env.DEV ? 'Para probar la instalación y el modo sin conexión, abre la versión compilada de Alpha.' : pwa.offlineAvailable ? 'Alpha está preparada para abrirse sin conexión en este navegador.' : 'Abre Alpha con conexión y espera a que termine de prepararse para usarla sin internet.'}</p>
      <p className="footnote">La primera carga necesita internet. Los registros siguen guardándose en este dispositivo; la instalación no crea una copia de seguridad.</p>
      {pwa.needRefresh && <p><button className="button" disabled={pwa.updating} onClick={() => void pwa.applyUpdate()}>{pwa.updating ? 'Actualizando…' : 'Actualizar Alpha'}</button></p>}
      <button className="outline-button" onClick={() => void pwa.checkUpdate()}>Buscar actualizaciones</button>
      {pwa.message && <p role="status">{pwa.message}</p>}
    </section>
  </>
}
