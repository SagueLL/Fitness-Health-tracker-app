import type { DietMeal, DietPhase } from './diet'

export interface MealChange {
  before?: DietMeal
  after?: DietMeal
  beforeIndex?: number
  afterIndex?: number
  state: 'added' | 'removed' | 'changed' | 'same'
  moved: boolean
}
const identity = (meal: DietMeal) => meal.lineageId ?? meal.id
const normalizedName = (meal: DietMeal) => meal.name.trim().toLocaleLowerCase('es')

export function compareDiets(before: DietPhase, after: DietPhase) {
  const matches = new Map<number, number>()
  const used = new Set<number>()
  // Reserve lineage matches first so a coincidental name cannot steal a renamed meal.
  for (const [index, meal] of before.meals.entries()) {
    const match = after.meals.findIndex((other, candidate) => !used.has(candidate) && identity(meal) === identity(other))
    if (match >= 0) { matches.set(index, match); used.add(match) }
  }
  for (const [index, meal] of before.meals.entries()) {
    if (matches.has(index)) continue
    const match = after.meals.findIndex((other, candidate) => !used.has(candidate) && normalizedName(meal) === normalizedName(other))
    if (match >= 0) { matches.set(index, match); used.add(match) }
  }
  const meals: MealChange[] = before.meals.map((meal, beforeIndex) => {
    const afterIndex = matches.get(beforeIndex)
    if (afterIndex === undefined) return { before: meal, beforeIndex, state: 'removed', moved: false }
    const other = after.meals[afterIndex]
    const moved = beforeIndex !== afterIndex
    return { before: meal, after: other, beforeIndex, afterIndex, moved, state: meal.name === other.name && meal.foods === other.foods && !moved ? 'same' : 'changed' }
  })
  for (const [afterIndex, meal] of after.meals.entries()) {
    if (!used.has(afterIndex)) meals.push({ after: meal, afterIndex, state: 'added', moved: false })
  }
  return {
    meals, nameChanged: before.name !== after.name, notesChanged: before.notes !== after.notes,
    counts: {
      added: meals.filter(meal => meal.state === 'added').length,
      removed: meals.filter(meal => meal.state === 'removed').length,
      changed: meals.filter(meal => meal.state === 'changed').length,
      same: meals.filter(meal => meal.state === 'same').length,
    },
  }
}
