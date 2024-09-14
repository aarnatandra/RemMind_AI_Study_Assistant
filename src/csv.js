import { makeCard } from './subjects.js';

// Dependency-free CSV reading and writing (RFC 4180 style quoting).

// ---- Parsing --------------------------------------------------------------

export function parseCSV(text, { delimiter = ',' } = {}) {
  const input = String(text ?? '').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i += 1; continue;
      }
      field += ch; i += 1; continue;
    }
    if (ch === '"' && field === '') { inQuotes = true; i += 1; continue; }
    if (ch === delimiter) { row.push(field); field = ''; i += 1; continue; }
    if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && input[i + 1] === '\n') i += 1;
      row.push(field); rows.push(row); row = []; field = ''; i += 1; continue;
    }
    field += ch; i += 1;
  }
  if (inQuotes) throw new SyntaxError('Unterminated quoted field in CSV input.');
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => !(r.length === 1 && r[0].trim() === ''));
}

// ---- Writing --------------------------------------------------------------

function escapeField(value, delimiter) {
  const text = String(value ?? '');
  const needsQuotes = text.includes(delimiter) || /["\r\n]/.test(text) || /^\s|\s$/.test(text);
  return needsQuotes ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCSV(rows, { delimiter = ',' } = {}) {
  return rows.map(row => row.map(value => escapeField(value, delimiter)).join(delimiter)).join('\n');
}

// ---- Flashcards -----------------------------------------------------------

/** Read flashcards from CSV. Accepts a front/back/subject header or headerless rows. */
export function csvToCards(text, options = {}, now = new Date()) {
  const rows = parseCSV(text, options);
  const skipped = [];
  if (!rows.length) return { cards: [], skipped };
  const header = rows[0].map(cell => cell.trim().toLowerCase());
  const hasHeader = header.includes('front') && header.includes('back');
  const index = hasHeader
    ? { front: header.indexOf('front'), back: header.indexOf('back'), subject: header.indexOf('subject') }
    : { front: 0, back: 1, subject: 2 };
  const cards = [];
  rows.slice(hasHeader ? 1 : 0).forEach((row, offset) => {
    const line = offset + (hasHeader ? 2 : 1);
    const card = makeCard({ front: row[index.front], back: row[index.back], subject: index.subject >= 0 ? row[index.subject] : '' }, now);
    if (card) cards.push(card);
    else skipped.push({ line, reason: 'Missing front or back text.' });
  });
  return { cards, skipped };
}

export function cardsToCSV(cards) {
  const rows = [['front', 'back', 'subject', 'dueAt']];
  for (const card of cards) rows.push([card.front, card.back, card.subject || '', card.dueAt || '']);
  return toCSV(rows);
}
