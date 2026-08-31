import { Meal } from './nutrition';

export interface LoggedMeal extends Meal {
  id: string;
  loggedAt: number;
}

export type DailyLogs = Record<string, LoggedMeal[]>;

export interface FavoriteMeal {
  id: string;
  slot: Meal['slot'];
  name: string;
  kcal: number;
  macroText: string;
}

export interface FastingState {
  active: boolean;
  startedAt: number | null;
  windowHours: number;
}

export const DEFAULT_FASTING: FastingState = { active: false, startedAt: null, windowHours: 16 };

export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return dateKey(new Date());
}

/** Parses a 'YYYY-MM-DD' key as a local-time Date (avoids the UTC-midnight
 * shift that `new Date('YYYY-MM-DD')` would introduce near timezone edges). */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function lastNDays(n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(dateKey(d));
  }
  return out;
}

export function dayTotal(logs: LoggedMeal[] | undefined): number {
  return (logs || []).reduce((t, m) => t + m.kcal, 0);
}

export function computeStreak(dailyLogs: DailyLogs): number {
  let streak = 0;
  const d = new Date();
  // If today has no entries yet, don't break the streak from yesterday.
  if (!(dailyLogs[dateKey(d)] || []).length) d.setDate(d.getDate() - 1);
  while ((dailyLogs[dateKey(d)] || []).length > 0) {
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}
