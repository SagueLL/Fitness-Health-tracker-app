import { expect, it } from 'vitest'
import { compareDiets } from './dietComparison'
import type { DietMeal, DietPhase } from './diet'
const phase = (meals: DietMeal[], notes = ''): DietPhase => ({ id: 'phase', name: 'Dieta', notes, meals, createdAt: '', updatedAt: '' })
const meal = (id: string, name: string, foods = 'Arroz'): DietMeal => ({ id, name, foods })

it('detecta cambios de cantidades, comidas añadidas/eliminadas y notas sin modificar las fases', () => {
  const before = phase([meal('a', 'Desayuno', '40 g de avena'), meal('b', 'Cena')], 'Nota original')
  const after = phase([{ ...meal('c', 'Desayuno', '50 g de avena'), lineageId: 'a' }, meal('d', 'Merienda')], 'Nota nueva')
  const snapshot = JSON.stringify([before, after])
  const result = compareDiets(before, after)
  expect(result.counts).toEqual({ added: 1, removed: 1, changed: 1, same: 0 })
  expect(result.notesChanged).toBe(true)
  expect(JSON.stringify([before, after])).toBe(snapshot)
})
it('reserva la correspondencia de las copias antes de emparejar nombres y detecta cambios de orden', () => {
  const before = phase([meal('a', 'Comida'), meal('b', 'Cena')])
  const after = phase([{ ...meal('c', 'Comida'), lineageId: 'b' }, { ...meal('d', 'Almuerzo'), lineageId: 'a' }])
  const result = compareDiets(before, after)
  expect(result.meals[0].after?.id).toBe('d')
  expect(result.meals[1].after?.id).toBe('c')
  expect(result.counts).toEqual({ added: 0, removed: 0, changed: 2, same: 0 })
  expect(result.meals.every(change => change.moved)).toBe(true)
})
it('empareja fases independientes con nombres repetidos una sola vez por aparición', () => {
  const before = phase([meal('a', 'Comida'), meal('b', 'Comida', 'Pollo')])
  const after = phase([meal('c', 'comida'), meal('d', 'Comida', 'Pollo'), meal('e', 'Comida', 'Fruta')])
  const result = compareDiets(before, after)
  expect(result.meals[0].after?.id).toBe('c')
  expect(result.meals[1].after?.id).toBe('d')
  expect(result.counts).toEqual({ added: 1, removed: 0, changed: 1, same: 1 })
})
it('identifica copias iguales y la inversión de añadidas y eliminadas', () => {
  const before = phase([meal('a', 'Desayuno')])
  const same = phase([{ ...meal('b', 'Desayuno'), lineageId: 'a' }])
  expect(compareDiets(before, same).counts.same).toBe(1)
  const more = phase([...same.meals, meal('c', 'Cena')])
  expect(compareDiets(before, more).counts.added).toBe(1)
  expect(compareDiets(more, before).counts.removed).toBe(1)
})
