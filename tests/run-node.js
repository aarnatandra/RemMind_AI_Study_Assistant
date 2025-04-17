import assert from 'node:assert/strict';
import { createEmptyState, getDueCards, normalizeState, scheduleReview, scoreTextMatch, summarizeTasks } from '../src/core.js';

const baseDate = new Date('2026-10-19T10:00:00.000Z');
const card = { id: 'c1', front: 'What is overfitting?', back: 'A model fits noise in training data.', intervalDays: 0, ease: 2.3, repetitions: 0, lapses: 0, dueAt: baseDate.toISOString() };

assert.deepEqual(summarizeTasks([]), { total: 0, open: 0, done: 0, openMinutes: 0 });
assert.deepEqual(summarizeTasks([{ done: false, minutes: 30 }, { done: true, minutes: 45 }]), { total: 2, open: 1, done: 1, openMinutes: 30 });
assert.equal(getDueCards([card], baseDate).length, 1);
assert.equal(getDueCards([{ ...card, dueAt: '2026-10-20T10:00:00.000Z' }], baseDate).length, 0);

const again = scheduleReview(card, 'again', baseDate);
assert.equal(again.repetitions, 0);
assert.equal(again.lapses, 1);
assert.equal(Date.parse(again.dueAt) - baseDate.getTime(), 10 * 60 * 1000);

const hard = scheduleReview(card, 'hard', baseDate);
assert.equal(hard.intervalDays, 1);
assert.equal(hard.repetitions, 1);
const goodAfterFirst = scheduleReview(card, 'good', baseDate);
assert.equal(goodAfterFirst.intervalDays, 1);
const easy = scheduleReview(card, 'easy', baseDate);
assert.equal(easy.intervalDays, 4);
assert.ok(easy.ease > card.ease);
assert.throws(() => scheduleReview(card, 'unknown', baseDate), RangeError);

assert.equal(scoreTextMatch('logistic regression', ['Logistic regression classification']), 5);
assert.equal(scoreTextMatch('overfitting model', ['Ways to reduce overfitting in a model']), 2);
assert.equal(scoreTextMatch('zzzz', ['logistic regression']), 0);

const normalized = normalizeState({ tasks: [{ title: ' Study ', minutes: 900, priority: 'oops' }], cards: [{ front: 'Q', back: 'A' }], notes: [{ title: 'N', content: 'C' }] });
assert.equal(normalized.tasks[0].title, 'Study');
assert.equal(normalized.tasks[0].minutes, 600);
assert.equal(normalized.tasks[0].priority, 'medium');
assert.equal(normalized.cards.length, 1);
assert.equal(normalized.notes.length, 1);
assert.throws(() => normalizeState(null), TypeError);
assert.throws(() => normalizeState({ tasks: {} }), TypeError);
assert.deepEqual(createEmptyState().tasks, []);

console.log('All core unit checks passed.');
