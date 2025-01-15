import { loadState, saveState } from './storage.js';
import { cardsToCSV, csvToCards } from './csv.js';
import { cardsToMarkdown, notesToMarkdown, parseFlashcardMarkdown, parseNotesMarkdown } from './markdown-import.js';
import { activityByDay, cardMaturity, computeStreak, summarizeBySubject, workloadForecast } from './analytics.js';
import { previewIntervals } from './sm2.js';
import { partitionNewCards } from './subjects.js';
import { formatDuration, formatPercent, pluralize, slugify, toDayKey, truncate } from './formatters.js';
import { getDueCards } from './core.js';

const $ = selector => document.querySelector(selector);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

const loaded = loadState();
let state = loaded.state;
let pending = null; // parsed import waiting for confirmation

// ---- Rendering ------------------------------------------------------------

function renderStats() {
  const now = new Date();
  const due = getDueCards(state.cards, now).length;
  const dates = [...state.tasks.map(t => (t.done ? t.completedAt : '')), ...state.cards.map(c => c.lastReviewedAt)];
  const streak = computeStreak(dates, now);
  const maturity = cardMaturity(state.cards);
  const done = state.tasks.filter(t => t.done).length;
  const stats = [
    [state.cards.length, `cards (${due} due)`],
    [`${streak.current}`, `day streak (best ${streak.longest})`],
    [formatPercent(done, state.tasks.length), `tasks complete (${done}/${state.tasks.length})`],
    [maturity.mature, `mature cards (${maturity.new} new)`]
  ];
  $('#statGrid').innerHTML = stats.map(([value, label]) => `<div class="stat"><b>${escapeHTML(value)}</b><span>${escapeHTML(label)}</span></div>`).join('');
  const active = activityByDay(state, 7, now).reduce((sum, day) => sum + day.tasksCompleted + day.cardsReviewed, 0);
  $('#storageStatus').textContent = loaded.available
    ? `Reading your local workspace. ${pluralize(active, 'study action')} recorded in the last 7 days.`
    : 'Browser storage is unavailable, so imports cannot be saved. Previews and exports of an empty workspace still work.';
  $('#addBtn').dataset.storage = loaded.available ? 'ok' : 'blocked';
}

function renderForecast() {
  const forecast = workloadForecast(state.tasks, new Date(), 7);
  const peak = Math.max(1, ...forecast.days.map(day => day.minutes));
  $('#forecastNote').textContent = `Overdue: ${formatDuration(forecast.overdueMinutes)} · No deadline: ${formatDuration(forecast.unscheduledMinutes)}`;
  $('#forecastBody').innerHTML = forecast.days.map(day => {
    const label = new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    return `<tr><td>${escapeHTML(label)}</td><td>${day.count}</td><td>${formatDuration(day.minutes)}</td><td><div class="bar" style="width:${Math.round((day.minutes / peak) * 100)}%"></div></td></tr>`;
  }).join('');
}

function renderSubjects() {
  const rows = summarizeBySubject(state, new Date());
  $('#subjectBody').innerHTML = rows.length
    ? rows.map(r => `<tr><td>${escapeHTML(r.subject)}</td><td>${r.tasksOpen}</td><td>${formatDuration(r.openMinutes)}</td><td>${r.cards}</td><td>${r.dueCards}</td><td>${r.notes}</td></tr>`).join('')
    : '<tr><td colspan="6" class="muted">Nothing saved yet. Add tasks, cards or notes in the workspace.</td></tr>';
}

function renderSm2() {
  const next = getDueCards(state.cards, new Date())[0] || state.cards[0];
  if (!next) { $('#sm2Preview').textContent = 'No cards yet.'; return; }
  const p = previewIntervals(next);
  $('#sm2Preview').textContent = `“${truncate(next.front, 60)}” — under SM-2: Again ${p.again}d · Hard ${p.hard}d · Good ${p.good}d · Easy ${p.easy}d. The workspace itself still uses its original scheduler.`;
}

function renderAll() { renderStats(); renderForecast(); renderSubjects(); renderSm2(); }

// ---- Import ---------------------------------------------------------------

function parseImport(format, text) {
  if (format === 'csv-cards') return { kind: 'cards', ...csvToCards(text) };
  if (format === 'md-cards') return { kind: 'cards', ...parseFlashcardMarkdown(text) };
  return { kind: 'notes', ...parseNotesMarkdown(text) };
}

function showPreview() {
  const text = $('#importText').value;
  const out = $('#importResult');
  pending = null;
  $('#addBtn').disabled = true;
  if (!text.trim()) { out.textContent = 'Paste some content or choose a file first.'; return; }
  try {
    const result = parseImport($('#importFormat').value, text);
    const items = result.kind === 'cards' ? result.cards : result.notes;
    let duplicates = 0;
    if (result.kind === 'cards') duplicates = partitionNewCards(state.cards, items).duplicates.length;
    const skipped = result.skipped.slice(0, 8).map(s => `<li>Line ${s.line}: ${escapeHTML(s.reason)}</li>`).join('');
    out.innerHTML = `Found <b>${pluralize(items.length, result.kind === 'cards' ? 'card' : 'note')}</b>`
      + (duplicates ? ` (${pluralize(duplicates, 'duplicate')} will be skipped)` : '')
      + (result.skipped.length ? `, ${pluralize(result.skipped.length, 'entry', 'entries')} skipped:<ul>${skipped}</ul>` : '.');
    if (items.length - duplicates > 0 && loaded.available) { pending = result; $('#addBtn').disabled = false; }
  } catch (error) {
    out.textContent = `Could not read that content: ${error.message}`;
  }
}

function addPending() {
  if (!pending) return;
  const fresh = loadState().state; // re-read in case the workspace changed in another tab
  let added;
  if (pending.kind === 'cards') {
    const split = partitionNewCards(fresh.cards, pending.cards);
    fresh.cards.push(...split.fresh);
    added = pluralize(split.fresh.length, 'card');
  } else {
    fresh.notes.push(...pending.notes);
    added = pluralize(pending.notes.length, 'note');
  }
  const result = saveState(fresh);
  if (!result.ok) { $('#importResult').textContent = 'Could not save. Browser storage may be full or disabled.'; return; }
  state = result.state;
  pending = null;
  $('#addBtn').disabled = true;
  $('#importResult').textContent = `Added ${added} to your workspace.`;
  renderAll();
}

// ---- Export ---------------------------------------------------------------

function download(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportWith(kind, builder, filename, type) {
  const items = state[kind];
  if (!items.length) { $('#exportResult').textContent = `You have no ${kind} to export yet.`; return; }
  download(`${slugify(filename)}-${toDayKey(new Date())}${type.ext}`, builder(items), type.mime);
  $('#exportResult').textContent = `Exported ${pluralize(items.length, kind.slice(0, -1))}.`;
}

// ---- Events ---------------------------------------------------------------

$('#previewBtn').addEventListener('click', showPreview);
$('#addBtn').addEventListener('click', addPending);
$('#importText').addEventListener('input', () => { pending = null; $('#addBtn').disabled = true; });
$('#importFile').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { $('#importResult').textContent = 'That file is larger than 2 MB. Split it into smaller files.'; return; }
  $('#importText').value = await file.text();
  const name = file.name.toLowerCase();
  $('#importFormat').value = name.endsWith('.csv') ? 'csv-cards' : $('#importFormat').value === 'csv-cards' ? 'md-cards' : $('#importFormat').value;
  showPreview();
  event.target.value = '';
});
$('#exportCardsCsv').addEventListener('click', () => exportWith('cards', cardsToCSV, 'remmind-cards', { ext: '.csv', mime: 'text/csv' }));
$('#exportCardsMd').addEventListener('click', () => exportWith('cards', cardsToMarkdown, 'remmind-cards', { ext: '.md', mime: 'text/markdown' }));
$('#exportNotesMd').addEventListener('click', () => exportWith('notes', notesToMarkdown, 'remmind-notes', { ext: '.md', mime: 'text/markdown' }));

renderAll();
