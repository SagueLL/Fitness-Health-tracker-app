import { useEffect, useState, type FormEvent } from 'react'
import { readPreferences, savePreferences } from '../data/database'

export default function WaterPreference({ onSaved }: { onSaved: (amount: number) => void }) {
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
      onSaved(Number(amount))
      setStatus('Preferencia guardada en este dispositivo.')
    } catch (cause) {
      setError(cause instanceof Error && cause.message.startsWith('Introduce') ? cause.message : 'No se pudo guardar. Comprueba que el navegador permite almacenar datos y vuelve a intentarlo.')
    } finally { setSaving(false) }
  }
  return <section className="panel" aria-labelledby="water-preference-title"><h2 id="water-preference-title">Registro rápido de agua</h2><p>Elige cuánto añade cada pulsación al registro diario.</p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="water">Cantidad por pulsación (ml)</label>
        <input id="water" type="number" inputMode="numeric" min="1" max="2000" step="1" required value={amount} disabled={loading || saving} onChange={event => { setAmount(event.target.value); setStatus('') }} />
        <button className="button" disabled={loading || saving || amount === ''}>{saving ? 'Guardando…' : loading ? 'Cargando…' : 'Guardar preferencia'}</button>
      </form>
      <p role="status" className="success">{status}</p>{error && <p role="alert" className="error">{error}</p>}
    </section>
}
