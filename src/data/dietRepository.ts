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
    const phase: DietPhase = { ...clean, id: id ?? crypto.randomUUID(), createdAt: existing?.createdAt ?? now, updatedAt: now, ...(existing?.sourcePhaseId ? { sourcePhaseId: existing.sourcePhaseId, sourcePhaseName: existing.sourcePhaseName } : {}) }
    await db.dietPhases.put(phase)
    return phase
  })
}

export async function deleteDietPhase(id: string, db = database) {
  await db.dietPhases.delete(id)
}

export async function duplicateDietPhase(id: string, db = database) {
  return db.transaction('rw', db.dietPhases, async () => {
    const source = await db.dietPhases.get(id)
    if (!source) throw new ValidationError('La fase de origen ya no existe. Vuelve a cargar la lista.')
    const names = new Set((await db.dietPhases.toArray()).map(phase => phase.name))
    let index = 1, name: string
    do {
      const suffix = index === 1 ? ' (copia)' : ` (copia ${index})`
      name = source.name.slice(0, 100 - suffix.length) + suffix
      index++
    } while (names.has(name))
    const now = new Date().toISOString()
    const copy: DietPhase = {
      ...cleanDiet(source), id: crypto.randomUUID(), name,
      meals: source.meals.map(meal => ({ ...meal, id: crypto.randomUUID(), lineageId: meal.lineageId ?? meal.id })),
      createdAt: now, updatedAt: now, sourcePhaseId: source.id, sourcePhaseName: source.name,
    }
    await db.dietPhases.add(copy)
    return copy
  })
}
