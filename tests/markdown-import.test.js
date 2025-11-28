import assert from 'node:assert/strict';
import { cardsToMarkdown, notesToMarkdown, parseFlashcardMarkdown, parseNotesMarkdown } from '../src/markdown-import.js';

const now = new Date('2026-10-20T08:00:00.000Z');

// Flashcards: headings, Q/A blocks, multi-line answers, shortcut syntax
const source = [
  '## Networks',
  'Q: What does TCP guarantee?',
  'A: Ordered, reliable delivery.',
  'It retransmits lost segments.',
  '',
  'Question: What is UDP?',
  'Answer: A connectionless protocol.',
  '',
  '## Databases',
  'ACID :: Atomicity, Consistency, Isolation, Durability',
  'Q: Orphan question',
  'Q: Real question',
  'A: Real answer',
  '',
  'A: Orphan answer'
].join('\n');
const parsed = parseFlashcardMarkdown(source, now);
assert.equal(parsed.cards.length, 4);
assert.equal(parsed.cards[0].subject, 'Networks');
assert.equal(parsed.cards[0].back, 'Ordered, reliable delivery.\nIt retransmits lost segments.');
assert.equal(parsed.cards[2].front, 'ACID');
assert.equal(parsed.cards[2].subject, 'Databases');
assert.equal(parsed.cards[3].front, 'Real question');
assert.equal(parsed.skipped.length, 2);
assert.match(parsed.skipped[0].reason, /no answer/);
assert.match(parsed.skipped[1].reason, /without a preceding question/);
assert.deepEqual(parseFlashcardMarkdown('', now), { cards: [], skipped: [] });

// Flashcard round trip
const exported = cardsToMarkdown(parsed.cards);
const roundTrip = parseFlashcardMarkdown(exported, now);
assert.deepEqual(roundTrip.cards.map(c => [c.front, c.back, c.subject]), parsed.cards.map(c => [c.front, c.back, c.subject]));
assert.equal(cardsToMarkdown([]), '');

// Notes
const notes = parseNotesMarkdown('Intro text\n\n# Sorting\nSubject: Algorithms\n\nMerge sort is O(n log n).\n\n```\n# not a heading\n```\n\n# Graphs\nBFS uses a queue.', now).notes;
assert.equal(notes.length, 3);
assert.equal(notes[0].title, 'Imported note');
assert.equal(notes[1].title, 'Sorting');
assert.equal(notes[1].subject, 'Algorithms');
assert.ok(notes[1].content.includes('# not a heading'));
assert.equal(notes[2].content, 'BFS uses a queue.');
assert.deepEqual(parseNotesMarkdown('   ', now).notes, []);

const notesRoundTrip = parseNotesMarkdown(notesToMarkdown(notes), now).notes;
assert.deepEqual(notesRoundTrip.map(n => [n.title, n.subject, n.content]), notes.map(n => [n.title, n.subject, n.content]));

console.log('Markdown import checks passed.');
