// A documented SuperMemo-2 (SM-2) scheduler that can sit beside the simpler
// heuristic in core.js. It uses the same card fields as the app
// (intervalDays, ease, repetitions, lapses, dueAt, lastReviewedAt).
//
// Differences from the 1987 description, chosen to stay compatible with
// normalizeState(): ease is clamped to 1.3-3.0, and a failed review (quality < 3)
// leaves the ease factor unchanged and schedules the card again in one day.

const DAY_MS = 24 * 60 * 60 * 1000;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// ---- Ratings --------------------------------------------------------------

const QUALITY_BY_RATING = { again: 1, hard: 3, good: 4, easy: 5 };

export function ratingToQuality(rating) {
  if (!Object.hasOwn(QUALITY_BY_RATING, rating)) {
    throw new RangeError('Rating must be again, hard, good or easy.');
  }
  return QUALITY_BY_RATING[rating];
}

// ---- Scheduling -----------------------------------------------------------

export function scheduleSM2(card, quality, now = new Date()) {
  if (!Number.isInteger(quality) || quality < 0 || quality > 5) {
    throw new RangeError('Quality must be an integer from 0 to 5.');
  }
  const currentTime = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const priorEase = clamp(Number(card.ease) || 2.5, 1.3, 3);
  const priorInterval = Math.max(0, Number(card.intervalDays) || 0);
  const priorReps = Math.max(0, Number(card.repetitions) || 0);
  const result = { ...card };

  if (quality < 3) {
    result.repetitions = 0;
    result.intervalDays = 1;
    result.lapses = (Number(card.lapses) || 0) + 1;
    result.ease = priorEase;
  } else {
    const delta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
    result.ease = Math.round(clamp(priorEase + delta, 1.3, 3) * 100) / 100;
    result.repetitions = priorReps + 1;
    if (result.repetitions === 1) result.intervalDays = 1;
    else if (result.repetitions === 2) result.intervalDays = 6;
    else result.intervalDays = Math.max(1, Math.round(Math.max(1, priorInterval) * result.ease));
  }
  result.dueAt = new Date(currentTime + result.intervalDays * DAY_MS).toISOString();
  result.lastReviewedAt = new Date(currentTime).toISOString();
  return result;
}

export function scheduleReviewSM2(card, rating, now = new Date()) {
  return scheduleSM2(card, ratingToQuality(rating), now);
}

/** Interval in days each rating would produce, without changing the card. */
export function previewIntervals(card, now = new Date()) {
  const preview = {};
  for (const rating of Object.keys(QUALITY_BY_RATING)) {
    preview[rating] = scheduleReviewSM2(card, rating, now).intervalDays;
  }
  return preview;
}
