import assert from 'node:assert/strict';
import { previewIntervals, ratingToQuality, scheduleReviewSM2, scheduleSM2 } from '../src/sm2.js';

const now = new Date('2026-10-20T08:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;
const fresh = { id: 'c1', front: 'Q', back: 'A', intervalDays: 0, ease: 2.5, repetitions: 0, lapses: 0 };

// Rating map
assert.deepEqual(['again', 'hard', 'good', 'easy'].map(ratingToQuality), [1, 3, 4, 5]);
assert.throws(() => ratingToQuality('toString'), RangeError);
assert.throws(() => scheduleSM2(fresh, 6, now), RangeError);
assert.throws(() => scheduleSM2(fresh, 2.5, now), RangeError);

// Classic SM-2 progression: 1 day, 6 days, then interval * EF
const first = scheduleSM2(fresh, 4, now);
assert.equal(first.intervalDays, 1);
assert.equal(first.repetitions, 1);
assert.equal(first.ease, 2.5);
assert.equal(Date.parse(first.dueAt) - now.getTime(), DAY);
const second = scheduleSM2(first, 4, now);
assert.equal(second.intervalDays, 6);
const third = scheduleSM2(second, 4, now);
assert.equal(third.intervalDays, 15);

// Ease changes
assert.equal(scheduleSM2(fresh, 5, now).ease, 2.6);
assert.equal(scheduleSM2(fresh, 3, now).ease, 2.36);
assert.equal(scheduleSM2({ ...fresh, ease: 3 }, 5, now).ease, 3);
assert.equal(scheduleSM2({ ...fresh, ease: 1.3 }, 3, now).ease, 1.3);

// Lapse resets repetitions, keeps ease, counts the lapse
const lapsed = scheduleSM2(third, 1, now);
assert.equal(lapsed.repetitions, 0);
assert.equal(lapsed.intervalDays, 1);
assert.equal(lapsed.lapses, 1);
assert.equal(lapsed.ease, third.ease);

// Input is not mutated, extra fields survive
const input = { ...fresh, subject: 'CS' };
const out = scheduleReviewSM2(input, 'good', now);
assert.equal(input.repetitions, 0);
assert.equal(out.subject, 'CS');
assert.equal(out.lastReviewedAt, now.toISOString());

// Preview
assert.deepEqual(previewIntervals(second, now), { again: 1, hard: 14, good: 15, easy: 16 });

console.log('SM-2 checks passed.');
