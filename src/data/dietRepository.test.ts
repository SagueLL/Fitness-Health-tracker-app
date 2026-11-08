import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, expect, it } from 'vitest'
import { AppDatabase } from './database'
import { deleteDietPhase, duplicateDietPhase, readDietPhases, saveDietPhase } from './dietRepository'
import type { DietDraft } from '../domain/diet'

const names: string[] = []
afterEach(async () => { for (const name of names.splice(0)) await new AppDatabase(name).delete() })
const draft: DietDraft = { name: ' Fase 1 ', notes: ' Sin prisas ', meals: [{ id: 'a', name: ' Desayuno ', foods: 'Yogur\n40 g de avena' }, { id: 'b', name: 'Comida', foods: 'Arroz y pollo' }] }

it('migra v4 a v5 y conserva los datos anteriores al guardar una dieta', async () => {
  const name = `diet-${crypto.randomUUID()}`; names.push(name)
  const old = new Dexie(name)
  old.version(4).stores({ preferences: '&id', dailyRecords: '&date', goals: '&effectiveFrom', nutritionGoals: 'id, effectiveFrom, &[effectiveFrom+revision]' })
  await old.table('preferences').put({ id: 'personal', waterShortcutMl: 400 })
  await old.table('dailyRecords').put({ date: '2026-01-01', weightKg: 70 })
  await old.table('goals').put({ effectiveFrom: '2026-01-01', steps: 8000 })
  await old.table('nutritionGoals').put({ id: 'nutrition', effectiveFrom: '2026-01-01', revision: 1, result: { targetKcal: 2100 } })
  old.close()
  const db = new AppDatabase(name)
  const saved = await saveDietPhase(draft, undefined, db)
  expect(saved.name).toBe('Fase 1')
  expect((await db.preferences.get('personal'))?.waterShortcutMl).toBe(400)
  expect((await db.dailyRecords.get('2026-01-01'))?.weightKg).toBe(70)
  expect((await db.goals.get('2026-01-01'))?.steps).toBe(8000)
  expect((await db.nutritionGoals.get('nutrition'))?.result.targetKcal).toBe(2100)
  db.close()
  const reopened = new AppDatabase(name)
  expect((await readDietPhases(reopened))[0]).toEqual(saved)
  reopened.close()
})
it('edita una fase sin duplicarla ni cambiar las otras fases; elimina solo la seleccionada', async () => {
  const name = `diet-${crypto.randomUUID()}`; names.push(name)
  const db = new AppDatabase(name)
  const first = await saveDietPhase(draft, undefined, db)
  const second = await saveDietPhase({ ...draft, name: 'Fase 2' }, undefined, db)
  const edited = await saveDietPhase({ ...draft, name: 'Fase 1 corregida', meals: [draft.meals[1]] }, first.id, db)
  expect(edited.createdAt).toBe(first.createdAt)
  expect(edited.meals).toEqual([draft.meals[1]])
  expect((await readDietPhases(db))).toHaveLength(2)
  expect((await db.dietPhases.get(second.id))?.name).toBe('Fase 2')
  await deleteDietPhase(first.id, db)
  expect((await readDietPhases(db)).map(value => value.id)).toEqual([second.id])
  await expect(saveDietPhase(draft, first.id, db)).rejects.toThrow('ya no existe')
  db.close()
})
it('rechaza fases y comidas vacías sin cambiar lo guardado', async () => {
  const name = `diet-${crypto.randomUUID()}`; names.push(name)
  const db = new AppDatabase(name)
  const first = await saveDietPhase(draft, undefined, db)
  for (const invalid of [{ ...draft, name: ' ' }, { ...draft, meals: [] }, { ...draft, meals: [{ id: 'a', name: ' ', foods: 'Arroz' }] }, { ...draft, meals: [{ id: 'a', name: 'Cena', foods: ' ' }] }]) {
    await expect(saveDietPhase(invalid, first.id, db)).rejects.toThrow()
  }
  expect(await db.dietPhases.get(first.id)).toEqual(first)
  db.close()
})

it('duplica con identidades independientes, conserva el origen al editar y persiste las copias', async () => {
  const name = `diet-${crypto.randomUUID()}`; names.push(name)
  const db = new AppDatabase(name)
  const original = await saveDietPhase(draft, undefined, db)
  const copy = await duplicateDietPhase(original.id, db)
  const another = await duplicateDietPhase(original.id, db)
  expect(copy.name).toBe('Fase 1 (copia)')
  expect(another.name).toBe('Fase 1 (copia 2)')
  expect(copy.id).not.toBe(original.id)
  expect(copy.meals[0].id).not.toBe(original.meals[0].id)
  expect(copy.meals[0].lineageId).toBe(original.meals[0].id)
  expect(copy.notes).toBe(original.notes)
  const edited = await saveDietPhase({ ...copy, meals: [{ ...copy.meals[0], name: 'Otro desayuno', foods: '50 g de avena' }] }, copy.id, db)
  expect(edited.sourcePhaseId).toBe(original.id)
  expect(edited.meals[0].lineageId).toBe(original.meals[0].id)
  expect(await db.dietPhases.get(original.id)).toEqual(original)
  await deleteDietPhase(original.id, db)
  expect(await db.dietPhases.get(copy.id)).toEqual(edited)
  db.close()
  const reopened = new AppDatabase(name)
  expect(await reopened.dietPhases.get(copy.id)).toEqual(edited)
  expect((await readDietPhases(reopened))).toHaveLength(2)
  reopened.close()
})

it('duplica copias conservando la correspondencia y no crea nada si el origen no existe', async () => {
  const name = `diet-${crypto.randomUUID()}`; names.push(name)
  const db = new AppDatabase(name)
  const original = await saveDietPhase({ ...draft, name: 'a'.repeat(100) }, undefined, db)
  const copy = await duplicateDietPhase(original.id, db)
  const next = await duplicateDietPhase(copy.id, db)
  expect(copy.name.length).toBeLessThanOrEqual(100)
  expect(next.meals[0].lineageId).toBe(original.meals[0].id)
  expect(next.meals[0].id).not.toBe(copy.meals[0].id)
  await expect(duplicateDietPhase('missing', db)).rejects.toThrow('ya no existe')
  expect(await db.dietPhases.count()).toBe(3)
  db.close()
})
