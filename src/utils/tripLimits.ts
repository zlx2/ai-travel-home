export const MIN_TRIP_DAYS = 1
export const MAX_TRIP_DAYS = 7

export function normalizeTripDays(value: unknown, fallback = 3) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(MAX_TRIP_DAYS, Math.max(MIN_TRIP_DAYS, Math.round(numeric)))
}
