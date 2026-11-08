import { database } from './database'
import { localDate, ValidationError } from '../domain/daily'
import { validateGoals, type Goals } from '../domain/goals'

export function readGoals(db = database) {
  return db.goals.orderBy('effectiveFrom').toArray()
}

export async function saveGoals(goals: Goals, replace = false, db = database) {
  validateGoals(goals)
  if (goals.effectiveFrom < localDate()) throw new ValidationError('Los cambios de objetivo empiezan hoy o en una fecha futura.')
  return db.transaction('rw', db.goals, async () => {
    if (!replace && await db.goals.get(goals.effectiveFrom)) throw new ValidationError('Ya existe un objetivo para esa fecha. Confirma su sustitución.')
    await db.goals.put(goals)
  })
}

export async function readHistory(start: string, end: string, db = database) {
  return db.transaction('r', db.dailyRecords, db.goals, async () => ({
    records: await db.dailyRecords.where('date').between(start, end, true, true).toArray(),
    goals: await readGoals(db),
  }))
}
