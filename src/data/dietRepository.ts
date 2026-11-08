import { database } from './database'
import { cleanDiet, type DietDraft, type DietPhase } from '../domain/diet'
import { ValidationError } from '../domain/daily'

export function readDietPhases(db = database) {
  return db.dietPhases.orderBy('updatedAt').reverse().toArray()
}

export async function saveDietPhase(draft: DietDraft, id?: string, db = database) {
  const clean = cleanDiet(draft)
  return db.transaction('rw', db.dietPhases, async () => {
    const existing = id ? await db.dietPhases.get(id) : undefined
    if (id && !existing) throw new ValidationError('Esta fase ya no existe. Vuelve a cargar la lista.')
    const now = new Date().toISOString()
    const phase: DietPhase = { ...clean, id: id ?? crypto.randomUUID(), createdAt: existing?.createdAt ?? now, updatedAt: now }
    await db.dietPhases.put(phase)
    return phase
  })
}

export async function deleteDietPhase(id: string, db = database) {
  await db.dietPhases.delete(id)
}
