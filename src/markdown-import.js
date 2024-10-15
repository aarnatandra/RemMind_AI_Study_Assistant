import { makeCard, makeNote } from './subjects.js';

// Markdown import/export for flashcards and notes.
//
// Flashcard syntax:   ## Subject            (optional heading sets the subject)
//                     Q: question text
//                     A: answer text        (answer may continue on following lines)
//                     term :: definition    (one-line shortcut)
// Notes syntax:       # Title, optional "Subject: X" line, then the body.

// ---- Flashcards -----------------------------------------------------------

export function parseFlashcardMarkdown(text, now = new Date()) {
  const lines = String(text ?? '').replace(/^\uFEFF/, '').split(/\r?\n/);
  const cards = [];
  const skipped = [];
  let subject = '';
  let current = null;

  const flush = () => {
    if (!current) return;
    const card = makeCard({ front: current.front, back: current.back, subject: current.subject }, now);
    if (card) cards.push(card);
    else skipped.push({ line: current.line, reason: current.back.trim() ? 'Question is empty.' : 'Question has no answer.' });
    current = null;
  };

  lines.forEach((raw, index) => {
    const lineNumber = index + 1;
    const heading = raw.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
    const question = raw.match(/^\s*(?:Q|Question)\s*:\s*(.*)$/i);
    const answer = raw.match(/^\s*(?:A|Answer)\s*:\s*(.*)$/i);
    const shortcut = raw.match(/^(.+?)\s+::\s+(.+)$/);
    if (heading) { flush(); subject = heading[1].trim(); return; }
    if (question) { flush(); current = { front: question[1], back: '', subject, line: lineNumber, mode: 'front' }; return; }
    if (answer) {
      if (!current) { skipped.push({ line: lineNumber, reason: 'Answer without a preceding question.' }); return; }
      current.mode = 'back'; current.back = answer[1]; return;
    }
    if (shortcut && !current) {
      const card = makeCard({ front: shortcut[1], back: shortcut[2], subject }, now);
      if (card) cards.push(card);
      return;
    }
    if (!raw.trim()) { if (current?.mode === 'back') flush(); return; }
    if (current) current[current.mode] += `${current[current.mode] ? '\n' : ''}${raw.trim()}`;
  });
  flush();
  return { cards, skipped };
}

export function cardsToMarkdown(cards) {
  const out = [];
  let lastSubject = null;
  for (const card of cards) {
    const subject = card.subject || '';
    if (subject !== lastSubject) {
      if (out.length) out.push('');
      if (subject || lastSubject !== null) out.push(`## ${subject || 'General'}`, '');
      lastSubject = subject;
    }
    out.push(`Q: ${String(card.front).replace(/\n+/g, ' ')}`);
    out.push(`A: ${String(card.back).replace(/\n\s*\n+/g, '\n')}`, '');
  }
  return out.join('\n').trimEnd() + (out.length ? '\n' : '');
}

// ---- Notes ----------------------------------------------------------------

export function parseNotesMarkdown(text, now = new Date()) {
  const lines = String(text ?? '').replace(/^\uFEFF/, '').split(/\r?\n/);
  const sections = [];
  let current = { title: '', body: [] };
  let inFence = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    const heading = !inFence && line.match(/^#\s+(.+?)\s*#*\s*$/);
    if (heading) {
      sections.push(current);
      current = { title: heading[1], body: [] };
    } else {
      current.body.push(line);
    }
  }
  sections.push(current);

  const notes = [];
  for (const section of sections) {
    const body = [...section.body];
    while (body.length && !body[0].trim()) body.shift();
    let subject = '';
    const subjectLine = body[0]?.match(/^Subject:\s*(.+)$/i);
    if (subjectLine) { subject = subjectLine[1]; body.shift(); }
    const content = body.join('\n').trim();
    if (!section.title && !content) continue;
    notes.push(makeNote({ title: section.title || 'Imported note', content, subject }, now));
  }
  return { notes, skipped: [] };
}

export function notesToMarkdown(notes) {
  return notes.map(note => {
    const header = [`# ${note.title || 'Untitled note'}`];
    if (note.subject) header.push(`Subject: ${note.subject}`);
    return `${header.join('\n')}\n\n${String(note.content || '').trim()}\n`;
  }).join('\n');
}
