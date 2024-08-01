import { getDueCards } from './core.js';
import { DEFAULT_SUBJECT, normalizeSubject, subjectKey } from './subjects.js';
import { shiftDayKey, toDayKey } from './formatters.js';

// Read-only analytics over a workspace state object. Nothing here mutates state.

// ---- Per-subject summary --------------------------------------------------

export function summarizeBySubject(state, now = new Date()) {
  const rows = new Map();
  const row = item => {
    const key = subjectKey(item?.subject);
    if (!rows.has(key)) {
      rows.set(key, { subject: normalizeSubject(item?.subject) || DEFAULT_SUBJECT, tasksOpen: 0, tasksDone: 0, openMinutes: 0, cards: 0, dueCards: 0, notes: 0 });
    }
    return rows.get(key);
  };
  for (const task of state.tasks || []) {
    const r = row(task);
    if (task.done) r.tasksDone += 1;
    else { r.tasksOpen += 1; r.openMinutes += Number(task.minutes) || 0; }
  }
  for (const card of state.cards || []) row(card).cards += 1;
  for (const card of getDueCards(state.cards || [], now)) row(card).dueCards += 1;
  for (const note of state.notes || []) row(note).notes += 1;
  return [...rows.values()].sort((a, b) => a.subject.localeCompare(b.subject));
}

// ---- Streaks --------------------------------------------------------------

/** A streak is alive if the latest activity day is today or yesterday. */
export function computeStreak(dates, today = new Date()) {
  const days = [...new Set(dates.map(toDayKey).filter(Boolean))].sort();
  if (!days.length) return { current: 0, longest: 0 };
  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i += 1) {
    run = shiftDayKey(days[i - 1], 1) === days[i] ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  const set = new Set(days);
  const todayKey = toDayKey(today);
  let cursor = set.has(todayKey) ? todayKey : shiftDayKey(todayKey, -1);
  let current = 0;
  while (set.has(cursor)) { current += 1; cursor = shiftDayKey(cursor, -1); }
  return { current, longest };
}

// ---- Activity -------------------------------------------------------------

/** Tasks completed and cards last reviewed on each of the last N days. Only the most recent review of a card is stored, so older review history is not recoverable. */
export function activityByDay(state, days = 7, today = new Date()) {
  const todayKey = toDayKey(today);
  const result = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    result.push({ date: shiftDayKey(todayKey, -offset), tasksCompleted: 0, cardsReviewed: 0 });
  }
  const byDate = new Map(result.map(entry => [entry.date, entry]));
  for (const task of state.tasks || []) {
    const entry = task.done ? byDate.get(toDayKey(task.completedAt)) : null;
    if (entry) entry.tasksCompleted += 1;
  }
  for (const card of state.cards || []) {
    const entry = byDate.get(toDayKey(card.lastReviewedAt));
    if (entry) entry.cardsReviewed += 1;
  }
  return result;
}

// ---- Workload -------------------------------------------------------------

export function workloadForecast(tasks, today = new Date(), days = 7) {
  const todayKey = toDayKey(today);
  const slots = Array.from({ length: days }, (_, i) => ({ date: shiftDayKey(todayKey, i), minutes: 0, count: 0 }));
  const byDate = new Map(slots.map(slot => [slot.date, slot]));
  let overdueMinutes = 0;
  let unscheduledMinutes = 0;
  for (const task of tasks) {
    if (task.done) continue;
    const minutes = Number(task.minutes) || 0;
    if (!task.dueDate) { unscheduledMinutes += minutes; continue; }
    if (task.dueDate < todayKey) { overdueMinutes += minutes; continue; }
    const slot = byDate.get(task.dueDate);
    if (slot) { slot.minutes += minutes; slot.count += 1; }
  }
  return { overdueMinutes, unscheduledMinutes, days: slots };
}

// ---- Card maturity --------------------------------------------------------

export function cardMaturity(cards) {
  const buckets = { new: 0, learning: 0, young: 0, mature: 0 };
  for (const card of cards) {
    const interval = Number(card.intervalDays) || 0;
    if (!card.lastReviewedAt && !Number(card.repetitions)) buckets.new += 1;
    else if (interval < 1) buckets.learning += 1;
    else if (interval < 21) buckets.young += 1;
    else buckets.mature += 1;
  }
  return buckets;
}
