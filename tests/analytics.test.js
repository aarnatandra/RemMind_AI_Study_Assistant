import assert from 'node:assert/strict';
import { activityByDay, cardMaturity, computeStreak, summarizeBySubject, workloadForecast } from '../src/analytics.js';

const today = new Date(2026, 9, 20, 12, 0, 0); // 20 Oct 2026, local noon
const at = (month, day, hour = 12) => new Date(2026, month, day, hour).toISOString();

// computeStreak
assert.deepEqual(computeStreak([], today), { current: 0, longest: 0 });
assert.deepEqual(computeStreak([at(9, 20), at(9, 19), at(9, 18)], today), { current: 3, longest: 3 });
assert.deepEqual(computeStreak([at(9, 19), at(9, 18)], today), { current: 2, longest: 2 });
assert.deepEqual(computeStreak([at(9, 17)], today), { current: 0, longest: 1 });
assert.deepEqual(computeStreak([at(9, 20, 8), at(9, 20, 18), at(9, 10), at(9, 11), at(9, 12), at(9, 13)], today), { current: 1, longest: 4 });
assert.deepEqual(computeStreak(['not a date', '2026-10-20'], today), { current: 1, longest: 1 });

// summarizeBySubject
const state = {
  tasks: [
    { subject: 'Math', done: false, minutes: 30 }, { subject: 'math', done: true, minutes: 20 }, { subject: '', done: false, minutes: 10 }
  ],
  cards: [
    { subject: 'Math', dueAt: at(9, 19) }, { subject: 'Math', dueAt: at(9, 25) }, { subject: 'Physics', dueAt: at(9, 1) }
  ],
  notes: [{ subject: 'Physics' }]
};
const summary = summarizeBySubject(state, today);
assert.deepEqual(summary.map(r => r.subject), ['General', 'Math', 'Physics']);
const math = summary.find(r => r.subject === 'Math');
assert.deepEqual(math, { subject: 'Math', tasksOpen: 1, tasksDone: 1, openMinutes: 30, cards: 2, dueCards: 1, notes: 0 });
assert.equal(summary.find(r => r.subject === 'General').openMinutes, 10);
assert.equal(summary.find(r => r.subject === 'Physics').notes, 1);
assert.deepEqual(summarizeBySubject({}, today), []);

// activityByDay
const activity = activityByDay({
  tasks: [{ done: true, completedAt: at(9, 20) }, { done: true, completedAt: at(9, 18) }, { done: false, completedAt: at(9, 20) }, { done: true, completedAt: at(8, 1) }],
  cards: [{ lastReviewedAt: at(9, 20) }, { lastReviewedAt: at(9, 20, 20) }, { lastReviewedAt: '' }]
}, 3, today);
assert.deepEqual(activity, [
  { date: '2026-10-18', tasksCompleted: 1, cardsReviewed: 0 },
  { date: '2026-10-19', tasksCompleted: 0, cardsReviewed: 0 },
  { date: '2026-10-20', tasksCompleted: 1, cardsReviewed: 2 }
]);

// workloadForecast
const forecast = workloadForecast([
  { done: false, minutes: 30, dueDate: '2026-10-19' },
  { done: false, minutes: 45, dueDate: '2026-10-20' },
  { done: false, minutes: 15, dueDate: '2026-10-20' },
  { done: false, minutes: 60, dueDate: '2026-10-22' },
  { done: false, minutes: 25, dueDate: '2026-12-01' },
  { done: false, minutes: 20, dueDate: '' },
  { done: true, minutes: 99, dueDate: '2026-10-20' }
], today, 7);
assert.equal(forecast.overdueMinutes, 30);
assert.equal(forecast.unscheduledMinutes, 20);
assert.equal(forecast.days.length, 7);
assert.deepEqual(forecast.days[0], { date: '2026-10-20', minutes: 60, count: 2 });
assert.deepEqual(forecast.days[2], { date: '2026-10-22', minutes: 60, count: 1 });
assert.equal(forecast.days[6].date, '2026-10-26');

// cardMaturity
assert.deepEqual(cardMaturity([
  { repetitions: 0, intervalDays: 0 },
  { repetitions: 0, intervalDays: 0, lastReviewedAt: at(9, 20) },
  { repetitions: 2, intervalDays: 6, lastReviewedAt: at(9, 20) },
  { repetitions: 5, intervalDays: 40, lastReviewedAt: at(9, 20) }
]), { new: 1, learning: 1, young: 1, mature: 1 });

console.log('Analytics checks passed.');
