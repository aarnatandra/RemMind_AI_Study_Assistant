import { createId } from './core.js';

// Subject-aware helpers: record builders, grouping, filtering and de-duplication.
// All functions are pure and never mutate their inputs.

export const DEFAULT_SUBJECT = 'General';

// ---- Subject names --------------------------------------------------------

export function normalizeSubject(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 60);
}

/** Case-insensitive grouping key. Empty subjects share the General key. */
export function subjectKey(value) {
  return (normalizeSubject(value) || DEFAULT_SUBJECT).toLowerCase();
}

// ---- Record builders (shape matches normalizeState in core.js) -------------

export function makeCard({ front, back, subject } = {}, now = new Date()) {
  const cleanFront = String(front ?? '').trim().slice(0, 800);
  const cleanBack = String(back ?? '').trim().slice(0, 2000);
  if (!cleanFront || !cleanBack) return null;
  const stamp = now.toISOString();
  return {
    id: createId('card'),
    front: cleanFront,
    back: cleanBack,
    subject: normalizeSubject(subject),
    createdAt: stamp,
    dueAt: stamp,
    intervalDays: 0,
    ease: 2.3,
    repetitions: 0,
    lapses: 0,
    lastReviewedAt: ''
  };
}

export function makeNote({ title, content, subject } = {}, now = new Date()) {
  const stamp = now.toISOString();
  return {
    id: createId('note'),
    title: String(title ?? '').trim().slice(0, 120) || 'Untitled note',
    subject: normalizeSubject(subject),
    content: String(content ?? '').slice(0, 15000),
    createdAt: stamp,
    updatedAt: stamp
  };
}

// ---- Listing, filtering, grouping ----------------------------------------

export function listSubjects(state) {
  const seen = new Map();
  for (const collection of [state?.tasks, state?.cards, state?.notes]) {
    for (const item of collection || []) {
      const name = normalizeSubject(item?.subject);
      if (name && !seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), name);
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

export function filterBySubject(items, subject) {
  const wanted = normalizeSubject(subject);
  if (!wanted || wanted.toLowerCase() === 'all') return [...items];
  const key = subjectKey(wanted);
  return items.filter(item => subjectKey(item?.subject) === key);
}

export function groupBySubject(items) {
  const groups = new Map();
  for (const item of items) {
    const key = subjectKey(item?.subject);
    if (!groups.has(key)) groups.set(key, { key, subject: normalizeSubject(item?.subject) || DEFAULT_SUBJECT, items: [] });
    groups.get(key).items.push(item);
  }
  return [...groups.values()].sort((a, b) => a.subject.localeCompare(b.subject));
}

// ---- De-duplication -------------------------------------------------------

const frontKey = card => String(card?.front ?? '').trim().toLowerCase();

/** Split incoming cards into new ones and ones whose front already exists. */
export function partitionNewCards(existing, incoming) {
  const known = new Set(existing.map(frontKey));
  const fresh = [];
  const duplicates = [];
  for (const card of incoming) {
    const key = frontKey(card);
    if (known.has(key)) duplicates.push(card);
    else { known.add(key); fresh.push(card); }
  }
  return { fresh, duplicates };
}
