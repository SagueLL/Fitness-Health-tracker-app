import { describe, expect, it } from 'vitest'
import { calculateNutrition, calories, grams, nutritionForDate, type NutritionInputs, type NutritionGoal } from './nutrition'

const base: NutritionInputs = { weightKg: 100, heightCm: 175, age: 40, equation: 'male', pal: 1.3, phase: 'loss', adjustmentMode: 'percent', adjustment: 15, proteinPerKg: 1.8, fatPerKg: .8 }

describe('motor nutricional v1', () => {
  it('reproduce el caso Mifflin masculino con macros sobre peso total sin redondeos intermedios', () => {
    const result = calculateNutrition(base)
    expect(result.restingKcal).toBe(1898.75)
    expect(result.maintenanceKcal).toBeCloseTo(2468.375, 8)
    expect(result.targetKcal).toBeCloseTo(2098.11875, 8)
    expect(result.proteinG).toBe(180)
    expect(result.fatG).toBe(80)
    expect(result.carbsG).toBeCloseTo(164.5296875, 8)
    expect(4 * result.proteinG + 9 * result.fatG + 4 * result.carbsG).toBeCloseTo(result.targetKcal, 10)
    expect(calories(result.targetKcal)).toBe('≈2.100 kcal')
    expect(grams(result.carbsG)).toBe('165 g')
  })
  it('reproduce la variante femenina y cuenta la actividad una sola vez', () => {
    const result = calculateNutrition({ ...base, weightKg: 65, heightCm: 170, age: 30, equation: 'female', pal: 1.4, phase: 'maintenance', adjustment: 0, proteinPerKg: 1.6 })
    expect(result.restingKcal).toBe(1401.5)
    expect(result.maintenanceKcal).toBeCloseTo(1962.1, 8)
    expect(result.targetKcal).toBe(result.maintenanceKcal)
    expect(result.proteinG).toBe(104)
    expect(result.fatG).toBe(52)
    expect(result.carbsG).toBeCloseTo(269.525, 8)
  })
  it('aplica mantenimiento, déficit y superávit porcentual o absoluto sin acumular ajustes', () => {
    const maintenance = calculateNutrition({ ...base, phase: 'maintenance' })
    expect(maintenance.adjustmentKcal).toBe(0)
    expect(maintenance.targetKcal).toBe(maintenance.maintenanceKcal)
    expect(calculateNutrition({ ...base, phase: 'gain', adjustmentMode: 'kcal', adjustment: 300 }).targetKcal).toBeCloseTo(2768.375, 8)
    expect(calculateNutrition({ ...base, phase: 'loss', adjustmentMode: 'kcal', adjustment: 300 }).targetKcal).toBeCloseTo(2168.375, 8)
    expect(calculateNutrition({ ...base, phase: 'gain', adjustment: 10 }).targetKcal).toBeCloseTo(2715.2125, 8)
  })
  it('rechaza entradas inválidas y repartos inviables', () => {
    const invalid: Partial<NutritionInputs>[] = [{ weightKg: 0 }, { weightKg: 301 }, { heightCm: 119 }, { age: 17 }, { age: 40.5 }, { pal: 1.19 }, { pal: 2.21 }, { pal: NaN }, { adjustment: -1 }, { adjustment: Infinity }, { proteinPerKg: 0 }, { fatPerKg: -1 }, { proteinPerKg: Infinity }, { adjustment: 100 }, { adjustmentMode: 'kcal', adjustment: 5000 }, { proteinPerKg: 10, fatPerKg: 10 }]
    for (const value of invalid) expect(() => calculateNutrition({ ...base, ...value })).toThrow()
    expect(() => calculateNutrition({ ...base, equation: 'other' } as unknown as NutritionInputs)).toThrow()
    expect(() => calculateNutrition({ ...base, phase: 'other' } as unknown as NutritionInputs)).toThrow()
  })
  it('marca extrapolación por edad y reparto de grasa bajo sin inventar confianza', () => {
    expect(calculateNutrition({ ...base, age: 18 }).warnings.join(' ')).toContain('extrapolación')
    expect(calculateNutrition({ ...base, phase: 'maintenance', fatPerKg: .1 }).warnings.join(' ')).toContain('20 %')
  })
  it('resuelve la versión por vigencia y revisión sin aplicar objetivos futuros', () => {
    const goal = (effectiveFrom: string, revision: number, id: string): NutritionGoal => ({ id, effectiveFrom, revision, createdAt: '', formulaVersion: 'test', inputs: base, result: calculateNutrition(base) })
    const goals = [goal('2026-01-01', 1, 'a'), goal('2026-01-01', 2, 'b'), goal('2026-02-01', 1, 'c')]
    expect(nutritionForDate(goals, '2025-12-31')).toBeUndefined()
    expect(nutritionForDate(goals, '2026-01-02')?.id).toBe('b')
    expect(nutritionForDate(goals, '2026-02-01')?.id).toBe('c')
    expect(goals[0].id).toBe('a')
  })
})
