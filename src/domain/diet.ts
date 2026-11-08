import { ValidationError } from './daily'

export interface DietMeal {
  id: string
  name: string
  foods: string
}
export interface DietDraft {
  name: string
  notes: string
  meals: DietMeal[]
}
export interface DietPhase extends DietDraft {
  id: string
  createdAt: string
  updatedAt: string
}

export function cleanDiet(draft: DietDraft): DietDraft {
  const name = draft.name.trim()
  if (!name || name.length > 100) throw new ValidationError('El nombre de la fase debe tener entre 1 y 100 caracteres.')
  if (draft.notes.length > 3000) throw new ValidationError('Las notas no pueden superar los 3000 caracteres.')
  if (!draft.meals.length || draft.meals.length > 30) throw new ValidationError('Añade entre 1 y 30 comidas a la fase.')
  const ids = new Set<string>()
  const meals = draft.meals.map((meal, index) => {
    if (!meal.id || ids.has(meal.id)) throw new ValidationError('Cada comida debe ser independiente. Revisa la lista.')
    ids.add(meal.id)
    if (!meal.name.trim() || meal.name.trim().length > 100) throw new ValidationError(`Pon un nombre de hasta 100 caracteres a la comida ${index + 1}.`)
    if (!meal.foods.trim() || meal.foods.length > 5000) throw new ValidationError(`Escribe los alimentos de la comida ${index + 1} (hasta 5000 caracteres).`)
    return { id: meal.id, name: meal.name.trim(), foods: meal.foods.trim() }
  })
  return { name, notes: draft.notes.trim(), meals }
}
