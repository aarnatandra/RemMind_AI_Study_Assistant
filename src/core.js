export const STORAGE_KEY = 'remmind_study_hub_v1';
export const APP_VERSION = '1.0.0';

export function createEmptyState() {
  return {
    version: APP_VERSION,
    tasks: [],
    cards: [],
    notes: [],
    reviewCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function createId(prefix = 'item') {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${randomPart}`;
}

function textOrEmpty(value, maxLength = 15000) {
  return typeof value === 'string' ? value.slice(0, maxLength) : '';
}

export function normalizeState(candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    throw new TypeError('The backup must contain a JSON object.');
  }
  for (const key of ['tasks', 'cards', 'notes']) {
    if (candidate[key] !== undefined && !Array.isArray(candidate[key])) {
      throw new TypeError(`The backup field "${key}" must be an array.`);
    }
  }
  const allowedTaskPriority = new Set(['low', 'medium', 'high']);
  const tasks = (candidate.tasks || []).filter(x => x && typeof x === 'object').map((x, i) => ({
    id: textOrEmpty(x.id, 120) || `import-task-${i}`,
    title: textOrEmpty(x.title, 120).trim() || 'Untitled task',
    subject: textOrEmpty(x.subject, 60),
    minutes: Math.max(5, Math.min(600, Number(x.minutes) || 30)),
    dueDate: /^\d{4}-\d{2}-\d{2}$/.test(x.dueDate || '') ? x.dueDate : '',
    priority: allowedTaskPriority.has(x.priority) ? x.priority : 'medium',
    done: Boolean(x.done),
    createdAt: textOrEmpty(x.createdAt, 40) || new Date().toISOString(),
    completedAt: textOrEmpty(x.completedAt, 40)
  }));
  const cards = (candidate.cards || []).filter(x => x && typeof x === 'object').map((x, i) => ({
    id: textOrEmpty(x.id, 120) || `import-card-${i}`,
    front: textOrEmpty(x.front, 800).trim(),
    back: textOrEmpty(x.back, 2000).trim(),
    subject: textOrEmpty(x.subject, 60),
    createdAt: textOrEmpty(x.createdAt, 40) || new Date().toISOString(),
    dueAt: Number.isFinite(Date.parse(x.dueAt)) ? new Date(x.dueAt).toISOString() : new Date().toISOString(),
    intervalDays: Math.max(0, Math.min(3650, Number(x.intervalDays) || 0)),
    ease: Math.max(1.3, Math.min(3, Number(x.ease) || 2.3)),
    repetitions: Math.max(0, Number.parseInt(x.repetitions, 10) || 0),
    lapses: Math.max(0, Number.parseInt(x.lapses, 10) || 0),
    lastReviewedAt: textOrEmpty(x.lastReviewedAt, 40)
  })).filter(x => x.front && x.back);
  const notes = (candidate.notes || []).filter(x => x && typeof x === 'object').map((x, i) => ({
    id: textOrEmpty(x.id, 120) || `import-note-${i}`,
    title: textOrEmpty(x.title, 120).trim() || 'Untitled note',
    subject: textOrEmpty(x.subject, 60),
    content: textOrEmpty(x.content, 15000),
    createdAt: textOrEmpty(x.createdAt, 40) || new Date().toISOString(),
    updatedAt: textOrEmpty(x.updatedAt, 40) || textOrEmpty(x.createdAt, 40) || new Date().toISOString()
  }));
  return {
    version: APP_VERSION,
    tasks,
    cards,
    notes,
    reviewCount: Math.max(0, Number.parseInt(candidate.reviewCount, 10) || 0),
    createdAt: textOrEmpty(candidate.createdAt, 40) || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function getDueCards(cards, now = new Date()) {
  const timestamp = now instanceof Date ? now.getTime() : new Date(now).getTime();
  return cards.filter(card => {
    const due = Date.parse(card.dueAt || 0);
    return Number.isFinite(due) && due <= timestamp;
  }).sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
}

export function scheduleReview(card, rating, now = new Date()) {
  if (!['again', 'hard', 'good', 'easy'].includes(rating)) {
    throw new RangeError('Rating must be again, hard, good or easy.');
  }
  const result = { ...card };
  const currentTime = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const priorInterval = Math.max(0, Number(card.intervalDays) || 0);
  const priorEase = Math.max(1.3, Math.min(3, Number(card.ease) || 2.3));
  if (rating === 'again') {
    result.intervalDays = 0;
    result.repetitions = 0;
    result.lapses = (Number(card.lapses) || 0) + 1;
    result.ease = Math.max(1.3, priorEase - 0.2);
    result.dueAt = new Date(currentTime + 10 * 60 * 1000).toISOString();
  } else if (rating === 'hard') {
    result.intervalDays = priorInterval === 0 ? 1 : Math.max(1, priorInterval * 1.3);
    result.repetitions = (Number(card.repetitions) || 0) + 1;
    result.ease = Math.max(1.3, priorEase - 0.12);
    result.dueAt = new Date(currentTime + result.intervalDays * 24 * 60 * 60 * 1000).toISOString();
  } else if (rating === 'good') {
    result.intervalDays = priorInterval === 0 ? 1 : Math.max(1, priorInterval * priorEase);
    result.repetitions = (Number(card.repetitions) || 0) + 1;
    result.ease = Math.min(3, priorEase + 0.02);
    result.dueAt = new Date(currentTime + result.intervalDays * 24 * 60 * 60 * 1000).toISOString();
  } else {
    result.intervalDays = priorInterval === 0 ? 4 : Math.max(4, priorInterval * Math.max(2.5, priorEase + 0.4));
    result.repetitions = (Number(card.repetitions) || 0) + 1;
    result.ease = Math.min(3, priorEase + 0.15);
    result.dueAt = new Date(currentTime + result.intervalDays * 24 * 60 * 60 * 1000).toISOString();
  }
  result.lastReviewedAt = new Date(currentTime).toISOString();
  return result;
}

export function scoreTextMatch(query, fields) {
  const queryText = String(query || '').toLocaleLowerCase().trim();
  if (!queryText) return 0;
  const combined = fields.map(value => String(value || '')).join(' ').toLocaleLowerCase();
  if (combined.includes(queryText)) return 5;
  const tokens = queryText.split(/[^\p{L}\p{N}]+/u).filter(token => token.length > 2);
  if (!tokens.length) return 0;
  return tokens.reduce((score, token) => score + (combined.includes(token) ? 1 : 0), 0);
}

export function summarizeTasks(tasks) {
  const open = tasks.filter(task => !task.done);
  const done = tasks.length - open.length;
  const openMinutes = open.reduce((sum, task) => sum + (Number(task.minutes) || 0), 0);
  return { total: tasks.length, open: open.length, done, openMinutes };
}
