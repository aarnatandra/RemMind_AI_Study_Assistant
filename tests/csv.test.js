import assert from 'node:assert/strict';
import { cardsToCSV, csvToCards, parseCSV, toCSV } from '../src/csv.js';

const now = new Date('2026-10-20T08:00:00.000Z');

// parseCSV
assert.deepEqual(parseCSV('a,b\n1,2\n'), [['a', 'b'], ['1', '2']]);
assert.deepEqual(parseCSV('a,b\r\n1,2'), [['a', 'b'], ['1', '2']]);
assert.deepEqual(parseCSV('"x, y","say ""hi"""\n'), [['x, y', 'say "hi"']]);
assert.deepEqual(parseCSV('"line1\nline2",b'), [['line1\nline2', 'b']]);
assert.deepEqual(parseCSV('\uFEFFa;b\n1;2', { delimiter: ';' }), [['a', 'b'], ['1', '2']]);
assert.deepEqual(parseCSV('a,b\n\n\n1,2'), [['a', 'b'], ['1', '2']]);
assert.deepEqual(parseCSV(''), []);
assert.throws(() => parseCSV('"open,quote'), SyntaxError);

// toCSV round trip
const rows = [['plain', 'has,comma', 'has "quote"', 'multi\nline', ' padded ']];
assert.deepEqual(parseCSV(toCSV(rows)), rows);

// csvToCards with header
const withHeader = csvToCards('Front,Back,Subject\nWhat is RAM?,Working memory,CS\n,missing front,CS\nQ2,A2,\n', {}, now);
assert.equal(withHeader.cards.length, 2);
assert.equal(withHeader.cards[0].subject, 'CS');
assert.equal(withHeader.cards[0].dueAt, now.toISOString());
assert.deepEqual(withHeader.skipped, [{ line: 3, reason: 'Missing front or back text.' }]);

// csvToCards without header, reordered header
assert.equal(csvToCards('q1,a1\nq2,a2', {}, now).cards.length, 2);
const reordered = csvToCards('subject,back,front\nMath,four,2+2', {}, now);
assert.equal(reordered.cards[0].front, '2+2');
assert.equal(reordered.cards[0].subject, 'Math');
assert.deepEqual(csvToCards('', {}, now), { cards: [], skipped: [] });

// cardsToCSV round trip
const exported = cardsToCSV(withHeader.cards);
assert.ok(exported.startsWith('front,back,subject,dueAt'));
const again = csvToCards(exported, {}, now);
assert.deepEqual(again.cards.map(c => [c.front, c.back, c.subject]), withHeader.cards.map(c => [c.front, c.back, c.subject]));

console.log('CSV checks passed.');
