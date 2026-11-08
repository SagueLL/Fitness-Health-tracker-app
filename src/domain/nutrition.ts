import { ValidationError } from './daily'

export const FORMULA_VERSION = 'mifflin-pal-macros-v1'
export interface NutritionInputs {
  weightKg: number
  heightCm: number
  age: number
  equation: 'male' | 'female'
  pal: number
  phase: 'maintenance' | 'loss' | 'gain'
  adjustmentMode: 'percent' | 'kcal'
  adjustment: number
  proteinPerKg: number
  fatPerKg: number
}
export interface NutritionResult {
  restingKcal: number
  maintenanceKcal: number
  adjustmentKcal: number
  targetKcal: number
  proteinG: number
  fatG: number
  carbsG: number
  warnings: string[]
}
export interface NutritionGoal {
  id: string
  effectiveFrom: string
  revision: number
  createdAt: string
  formulaVersion: string
  inputs: NutritionInputs
  result: NutritionResult
}

function range(value: number, min: number, max: number, label: string, integer = false) {
  if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    throw new ValidationError(`${label}: introduce ${integer ? 'un entero' : 'un valor'} entre ${min} y ${max}.`)
  }
}

export function calculateNutrition(inputs: NutritionInputs): NutritionResult {
  range(inputs.weightKg, 30, 300, 'Peso')
  range(inputs.heightCm, 120, 230, 'Altura')
  range(inputs.age, 18, 100, 'Edad', true)
  range(inputs.pal, 1.2, 2.2, 'Factor de actividad')
  if (!['male', 'female'].includes(inputs.equation)) throw new ValidationError('Selecciona la variante de la ecuación.')
  if (!['maintenance', 'loss', 'gain'].includes(inputs.phase)) throw new ValidationError('Selecciona una fase válida.')
  if (!['percent', 'kcal'].includes(inputs.adjustmentMode)) throw new ValidationError('Selecciona un tipo de ajuste válido.')
  if (!Number.isFinite(inputs.adjustment) || inputs.adjustment < 0) throw new ValidationError('El ajuste debe ser un número no negativo.')
  for (const [label, value] of [['Proteína', inputs.proteinPerKg], ['Grasa', inputs.fatPerKg]] as const) {
    if (!Number.isFinite(value) || value <= 0) throw new ValidationError(`${label}: el coeficiente debe ser mayor que cero.`)
  }
  const restingKcal = 10 * inputs.weightKg + 6.25 * inputs.heightCm - 5 * inputs.age + (inputs.equation === 'male' ? 5 : -161)
  const maintenanceKcal = restingKcal * inputs.pal
  const direction = inputs.phase === 'loss' ? -1 : inputs.phase === 'gain' ? 1 : 0
  const adjustmentKcal = direction * (inputs.adjustmentMode === 'percent' ? maintenanceKcal * inputs.adjustment / 100 : inputs.adjustment)
  const targetKcal = maintenanceKcal + adjustmentKcal
  if (!Number.isFinite(targetKcal) || targetKcal <= 0) throw new ValidationError('El ajuste deja las calorías objetivo en cero o menos. Reduce el ajuste.')
  const proteinG = inputs.weightKg * inputs.proteinPerKg
  const fatG = inputs.weightKg * inputs.fatPerKg
  const carbsG = (targetKcal - 4 * proteinG - 9 * fatG) / 4
  if (![proteinG, fatG, carbsG].every(Number.isFinite) || carbsG < 0) {
    throw new ValidationError('La proteína y la grasa superan las calorías disponibles. Revisa los coeficientes o el objetivo energético.')
  }
  const energy = 4 * proteinG + 9 * fatG + 4 * carbsG
  if (Math.abs(energy - targetKcal) > 1e-8 * Math.max(1, Math.abs(targetKcal))) throw new ValidationError('No se ha podido obtener un reparto coherente. Revisa los parámetros.')
  const warnings: string[] = []
  if (inputs.age < 19 || inputs.age > 78) warnings.push('La edad queda fuera de los 19–78 años de la muestra original de Mifflin. El resultado es una extrapolación.')
  if (9 * fatG / targetKcal < .2) warnings.push('La grasa aporta menos del 20 % de las calorías. Revisa este reparto antes de usarlo como objetivo.')
  if (carbsG === 0) warnings.push('El reparto no deja hidratos. La consistencia matemática no implica un reparto adecuado para tus necesidades.')
  return { restingKcal, maintenanceKcal, adjustmentKcal, targetKcal, proteinG, fatG, carbsG, warnings }
}

export function nutritionForDate(goals: NutritionGoal[], date: string) {
  return goals.filter(goal => goal.effectiveFrom <= date).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom) || b.revision - a.revision)[0]
}

export function calories(value: number) {
  return `≈${(Math.round(value / 10) * 10).toLocaleString('es', { useGrouping: 'always' })} kcal`
}
export function grams(value: number) { return `${Math.round(value).toLocaleString('es', { useGrouping: 'always' })} g` }
