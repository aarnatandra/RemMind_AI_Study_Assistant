import assert from 'node:assert/strict';
import { filterBySubject, groupBySubject, listSubjects, makeCard, makeNote, normalizeSubject, partitionNewCards, subjectKey } from '../src/subjects.js';
import { formatDuration, formatPercent, formatRelativeDue, pluralize, shiftDayKey, slugify, toDayKey, truncate } from '../src/formatters.js';
import { normalizeState } from '../src/core.js';

const now = new Date('2026-10-20T08:00:00.000Z');

// ---- subjects.js ----
assert.equal(normalizeSubject('  Machine   Learning '), 'Machine Learning');
assert.equal(normalizeSubject(null), '');
assert.equal(subjectKey(''), 'general');
assert.equal(subjectKey(' MATH '), 'math');

const card = makeCard({ front: ' Q ', back: ' A ', subject: 'cs' }, now);
assert.equal(card.front, 'Q');
assert.equal(card.dueAt, now.toISOString());
assert.equal(makeCard({ front: 'only front' }, now), null);
assert.equal(makeNote({ content: 'body' }, now).title, 'Untitled note');

// Records built here must survive the app's own validator unchanged
const normalized = normalizeState({ cards: [card], notes: [makeNote({ title: 'T', content: 'C', subject: 'cs' }, now)] });
assert.equal(normalized.cards[0].front, 'Q');
assert.equal(normalized.cards[0].dueAt, now.toISOString());
assert.equal(normalized.notes[0].title, 'T');

const items = [{ subject: 'Math' }, { subject: 'math ' }, { subject: '' }, { subject: 'Art' }];
assert.equal(filterBySubject(items, 'MATH').length, 2);
assert.equal(filterBySubject(items, 'all').length, 4);
assert.equal(filterBySubject(items, '').length, 4);
assert.equal(filterBySubject(items, 'general').length, 1);
assert.deepEqual(groupBySubject(items).map(g => [g.subject, g.items.length]), [['Art', 1], ['General', 1], ['Math', 2]]);
assert.deepEqual(listSubjects({ tasks: [{ subject: 'Zoology' }], cards: [{ subject: 'zoology' }, { subject: 'Art' }], notes: [{ subject: '' }] }), ['Art', 'Zoology']);

const split = partitionNewCards([{ front: 'Existing' }], [{ front: 'existing ' }, { front: 'New' }, { front: 'new' }]);
assert.equal(split.fresh.length, 1);
assert.equal(split.duplicates.length, 2);

// ---- formatters.js ----
assert.equal(toDayKey('2026-10-20'), '2026-10-20');
assert.equal(toDayKey(new Date(2026, 0, 5, 12)), '2026-01-05');
assert.equal(toDayKey('nope'), '');
assert.equal(shiftDayKey('2026-10-31', 1), '2026-11-01');
assert.equal(shiftDayKey('2026-03-01', -1), '2026-02-28');
assert.equal(shiftDayKey('bad', 1), '');

assert.equal(pluralize(1, 'card'), '1 card');
assert.equal(pluralize(2, 'card'), '2 cards');
assert.equal(pluralize(3, 'story', 'stories'), '3 stories');
assert.equal(truncate('short', 10), 'short');
assert.equal(truncate('a long sentence here', 8), 'a long…');
assert.equal(slugify('Café Notes: Week #3!'), 'cafe-notes-week-3');
assert.equal(slugify('???', 'fallback'), 'fallback');

assert.equal(formatPercent(1, 4), '25%');
assert.equal(formatPercent(1, 3, 1), '33.3%');
assert.equal(formatPercent(1, 0), '0%');
assert.equal(formatDuration(0), '0m');
assert.equal(formatDuration(45), '45m');
assert.equal(formatDuration(60), '1h');
assert.equal(formatDuration(135), '2h 15m');
assert.equal(formatDuration('x'), '0m');

assert.equal(formatRelativeDue('2026-10-20T08:00:30.000Z', now), 'due now');
assert.equal(formatRelativeDue('2026-10-20T10:00:00.000Z', now), 'due in 2 hours');
assert.equal(formatRelativeDue('2026-10-23T08:00:00.000Z', now), 'due in 3 days');
assert.equal(formatRelativeDue('2026-10-20T07:15:00.000Z', now), '45 minutes overdue');
assert.equal(formatRelativeDue('2026-10-19T08:00:00.000Z', now), '1 day overdue');
assert.equal(formatRelativeDue('', now), 'Not scheduled');

console.log('Subjects and formatter checks passed.');
