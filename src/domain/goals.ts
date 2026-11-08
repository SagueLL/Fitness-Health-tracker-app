import { localDate, validateDate, validateValues, ValidationError, type DailyValues, type Metric } from './daily'

export type GoalMetric = 'waterMl' | 'sleepMinutes' | 'steps' | 'weightKg'
export type GoalValues = Partial<Record<GoalMetric, number>>
export interface Goals extends GoalValues { effectiveFrom: string }
export const goalKeys: GoalMetric[] = ['waterMl', 'sleepMinutes', 'steps', 'weightKg']

export function validateGoals(goal: Goals) {
  validateDate(goal.effectiveFrom, '9999-12-31')
  validateValues(goal as DailyValues)
  for (const key of goalKeys) {
    if (goal[key] !== undefined && goal[key]! <= 0) throw new ValidationError('Los objetivos deben ser mayores que cero; deja vacío lo que no necesites.')
  }
}

export function goalForDate(goals: Goals[], date = localDate()): Goals | undefined {
  return goals.filter(goal => goal.effectiveFrom <= date).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0]
}

export function targetFor(goals: Goals[], date: string, metric: Metric): number | undefined {
  return metric === 'sleepScore' ? undefined : goalForDate(goals, date)?.[metric]
}
