import { database } from './database'
import { localDate, validateDate, ValidationError } from '../domain/daily'
import { calculateNutrition, FORMULA_VERSION, type NutritionGoal, type NutritionInputs } from '../domain/nutrition'

export function readNutritionGoals(db = database) {
  return db.nutritionGoals.toArray()
}

export async function saveNutritionGoal(inputs: NutritionInputs, effectiveFrom: string, confirmRevision = false, db = database) {
  validateDate(effectiveFrom, '9999-12-31')
  if (effectiveFrom < localDate()) throw new ValidationError('El objetivo nutricional debe empezar hoy o en una fecha futura.')
  const result = calculateNutrition(inputs)
  // Copy the calculation inputs before entering the asynchronous transaction.
  const snapshot = { ...inputs }
  return db.transaction('rw', db.nutritionGoals, async () => {
    const existing = await db.nutritionGoals.where('effectiveFrom').equals(effectiveFrom).toArray()
    if (existing.length && !confirmRevision) throw new ValidationError('Ya existe un objetivo para esa fecha. Confirma una nueva revisión.')
    const goal: NutritionGoal = {
      id: crypto.randomUUID(), effectiveFrom,
      revision: Math.max(0, ...existing.map(goal => goal.revision)) + 1,
      createdAt: new Date().toISOString(), formulaVersion: FORMULA_VERSION,
      inputs: snapshot, result,
    }
    await db.nutritionGoals.add(goal)
    return goal
  })
}
