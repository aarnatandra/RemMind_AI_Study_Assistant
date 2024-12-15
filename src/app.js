import { createEmptyState, createId, getDueCards, normalizeState, scheduleReview, scoreTextMatch, summarizeTasks } from './core.js';
import { clearState, loadState, saveState } from './storage.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const fmtDate = value => {
  if (!value) return 'No deadline';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? 'No deadline' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
};
const fmtDateTime = value => {
  const date = value ? new Date(value) : null;
  return !date || Number.isNaN(date.getTime()) ? 'Not scheduled' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const loaded = loadState();
let state = loaded.state;
let taskFilter = 'all';
let currentReviewId = null;
let answerRevealed = false;
let browseAllCards = false;
let quizSession = null;
let pdfObjectUrl = null;
let toastTimer = null;
let timerInterval = null;
let timerSeconds = 25 * 60;
let timerPreset = 25;
let timerRunning = false;

function persist(message = '') {
  const result = saveState(state);
  if (result.ok) state = result.state;
  else showToast('Unable to save. Browser storage may be full or disabled.');
  renderAll();
  if (message) showToast(message);
}

function showToast(message) {
  const toast = $('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function setRoute(route) {
  const validRoutes = ['dashboard', 'planner', 'flashcards', 'notes', 'quiz', 'reader', 'helper', 'settings'];
  const target = validRoutes.includes(route) ? route : 'dashboard';
  $$('.view').forEach(view => view.classList.toggle('active', view.dataset.view === target));
  $$('.nav-item[data-route]').forEach(button => button.classList.toggle('active', button.dataset.route === target));
  const titles = { dashboard: 'Overview', planner: 'Study planner', flashcards: 'Flashcards', notes: 'Notes library', quiz: 'Practice quiz', reader: 'PDF reader', helper: 'Study helper', settings: 'Data & settings' };
  $('#pageTitle').textContent = titles[target];
  $('#sidebar').classList.remove('open');
  $('#mobileMenu').setAttribute('aria-expanded', 'false');
  if (location.hash !== `#${target}`) history.replaceState(null, '', `#${target}`);
  if (target === 'flashcards') renderReview();
  if (target === 'quiz' && !state.cards.length) $('#quizMessage').textContent = 'Add flashcards before starting a quiz.';
}

function renderDashboard() {
  const taskSummary = summarizeTasks(state.tasks);
  const dueCards = getDueCards(state.cards);
  $('#statOpenTasks').textContent = taskSummary.open;
  $('#statDueCards').textContent = dueCards.length;
  $('#statNotes').textContent = state.notes.length;
  $('#statReviews').textContent = state.reviewCount;
  $('#navDueCount').textContent = dueCards.length > 99 ? '99+' : dueCards.length;
  const openTasks = state.tasks.filter(task => !task.done).sort((a, b) => {
    const aDue = a.dueDate || '9999-12-31';
    const bDue = b.dueDate || '9999-12-31';
    const priority = { high: 0, medium: 1, low: 2 };
    return aDue.localeCompare(bDue) || priority[a.priority] - priority[b.priority];
  }).slice(0, 5);
  $('#dashboardTasks').classList.toggle('empty-state', openTasks.length === 0);
  $('#dashboardTasks').innerHTML = openTasks.length ? openTasks.map(taskRowHTML).join('') : 'No open tasks. Add one in your study planner.';
  const dueList = dueCards.slice(0, 4);
  $('#dashboardDue').classList.toggle('empty-state', dueList.length === 0);
  $('#dashboardDue').innerHTML = dueList.length ? dueList.map(card => `<div class="compact-row"><span class="compact-icon">▤</span><div><b>${escapeHTML(card.front)}</b><small>${escapeHTML(card.subject || 'General')} · Due now</small></div></div>`).join('') : state.cards.length ? `Nothing is due right now. Next review: ${escapeHTML(fmtDateTime([...state.cards].sort((a,b) => Date.parse(a.dueAt)-Date.parse(b.dueAt))[0].dueAt))}.` : 'No cards due yet. Create your first deck.';
  const notes = [...state.notes].sort((a,b) => Date.parse(b.updatedAt || b.createdAt)-Date.parse(a.updatedAt || a.createdAt)).slice(0, 3);
  $('#dashboardNotes').classList.toggle('empty-state', notes.length === 0);
  $('#dashboardNotes').innerHTML = notes.length ? notes.map(note => `<div class="compact-row"><span class="compact-icon">✎</span><div><b>${escapeHTML(note.title)}</b><small>${escapeHTML(note.subject || 'General')} · Updated ${escapeHTML(fmtDateTime(note.updatedAt || note.createdAt))}</small></div></div>`).join('') : 'Your saved notes will appear here.';
}

function taskRowHTML(task) {
  const done = task.done;
  const overdue = !done && task.dueDate && task.dueDate < todayISO();
  return `<div class="task-row ${done ? 'is-done' : ''}"><button class="task-toggle ${done ? 'done' : ''}" data-action="toggle-task" data-id="${escapeHTML(task.id)}" aria-label="${done ? 'Mark incomplete' : 'Mark complete'}">${done ? '✓' : ''}</button><div class="task-main"><b>${escapeHTML(task.title)}</b><small>${escapeHTML(task.subject || 'General')} · ${Number(task.minutes) || 30} min · ${escapeHTML(fmtDate(task.dueDate))}${overdue ? ' · OVERDUE' : ''}</small></div><span class="priority-badge priority-${escapeHTML(task.priority)}">${overdue ? 'OVERDUE' : escapeHTML(task.priority.toUpperCase())}</span><button class="icon-button" data-action="delete-task" data-id="${escapeHTML(task.id)}" aria-label="Delete task">×</button></div>`;
}

function renderTasks() {
  const all = state.tasks;
  const filtered = all.filter(task => taskFilter === 'all' || (taskFilter === 'open' && !task.done) || (taskFilter === 'done' && task.done)).sort((a, b) => (a.done === b.done ? (a.dueDate || '9999').localeCompare(b.dueDate || '9999') : Number(a.done) - Number(b.done)));
  $('#taskSummary').textContent = `${all.filter(t => !t.done).length} open · ${all.filter(t => t.done).length} completed · ${all.reduce((n,t) => n + (t.done ? 0 : Number(t.minutes) || 0), 0)} min planned`;
  $('#taskList').classList.toggle('empty-state', filtered.length === 0);
  $('#taskList').innerHTML = filtered.length ? filtered.map(taskRowHTML).join('') : taskFilter === 'done' ? 'No completed tasks yet.' : 'No tasks here. Add a study task to get started.';
  $$('[data-task-filter]').forEach(button => button.classList.toggle('active', button.dataset.taskFilter === taskFilter));
}

function currentReviewQueue() {
  const queue = browseAllCards ? [...state.cards].sort((a,b) => Date.parse(a.dueAt)-Date.parse(b.dueAt)) : getDueCards(state.cards);
  return queue;
}

function renderReview() {
  const queue = currentReviewQueue();
  const dueCount = getDueCards(state.cards).length;
  $('#reviewDueBadge').textContent = `${dueCount} DUE`;
  $('#reviewProgress').textContent = state.cards.length ? `${dueCount} due now · ${state.cards.length} cards total` : 'No flashcards yet.';
  $('#cardBrowseCount').textContent = `${state.cards.length} cards in library`;
  if (!queue.length) {
    $('#reviewArea').className = 'review-area empty-state';
    $('#reviewArea').innerHTML = state.cards.length ? 'You are caught up. Your next review is scheduled for later.' : 'Create a flashcard to begin practising.';
    $('#reviewControls').hidden = true;
    return;
  }
  let card = queue.find(item => item.id === currentReviewId);
  if (!card) card = queue[0];
  currentReviewId = card.id;
  $('#reviewArea').className = `review-area has-card`;
  $('#reviewArea').innerHTML = `<div><div class="review-topic">${escapeHTML(card.subject || 'GENERAL')} · ${browseAllCards ? 'BROWSE MODE' : 'DUE FOR REVIEW'}</div><div class="review-front">${escapeHTML(card.front)}</div><div class="review-bottom"><span>Card ${queue.findIndex(item => item.id === card.id)+1} of ${queue.length}</span><span>Reviewed ${card.repetitions || 0} times</span></div></div>${answerRevealed ? `<div class="review-answer"><strong>Answer</strong><p>${escapeHTML(card.back)}</p></div><button class="button button-primary button-full" id="hideAnswer">Hide answer</button>` : `<button class="button button-primary button-full" id="revealAnswer">Show answer</button>`}`;
  $('#reviewControls').hidden = !answerRevealed;
  $('#reviewControls').innerHTML = '<button class="rating-button rating-again" data-rate="again">Again<span>Not remembered</span></button><button class="rating-button rating-hard" data-rate="hard">Hard<span>Needed effort</span></button><button class="rating-button rating-good" data-rate="good">Good<span>Recalled it</span></button><button class="rating-button rating-easy" data-rate="easy">Easy<span>Very familiar</span></button>';
}

function renderCards() {
  const query = $('#cardSearch').value.trim().toLocaleLowerCase();
  const cards = [...state.cards].filter(card => !query || `${card.front} ${card.back} ${card.subject}`.toLocaleLowerCase().includes(query)).sort((a,b) => Date.parse(b.createdAt)-Date.parse(a.createdAt));
  $('#cardList').classList.toggle('empty-state', cards.length === 0);
  $('#cardList').innerHTML = cards.length ? cards.map(card => `<article class="library-card"><div class="library-card-head"><small>${escapeHTML(card.subject || 'GENERAL')}</small><button class="icon-button" data-action="delete-card" data-id="${escapeHTML(card.id)}" aria-label="Delete card">×</button></div><h3>${escapeHTML(card.front)}</h3><p>${escapeHTML(card.back)}</p><div class="library-card-foot"><span>Next review: ${escapeHTML(fmtDateTime(card.dueAt))}</span><span>${Number(card.repetitions)||0} reviews</span></div></article>`).join('') : query ? 'No cards match that search.' : 'Your cards will be listed here.';
}

function renderNotes() {
  const query = $('#noteSearch').value.trim().toLocaleLowerCase();
  const notes = [...state.notes].filter(note => !query || `${note.title} ${note.subject} ${note.content}`.toLocaleLowerCase().includes(query)).sort((a,b) => Date.parse(b.updatedAt || b.createdAt)-Date.parse(a.updatedAt || a.createdAt));
  $('#noteSummary').textContent = `${state.notes.length} saved note${state.notes.length === 1 ? '' : 's'}`;
  $('#noteList').classList.toggle('empty-state', notes.length === 0);
  $('#noteList').innerHTML = notes.length ? notes.map(note => `<article class="note-card"><span class="note-subject">${escapeHTML(note.subject || 'GENERAL')}</span><h3>${escapeHTML(note.title)}</h3><p>${escapeHTML(note.content)}</p><footer><span>Updated ${escapeHTML(fmtDateTime(note.updatedAt || note.createdAt))}</span><span><button class="text-button" data-action="edit-note" data-id="${escapeHTML(note.id)}">Edit</button><button class="text-button" data-action="delete-note" data-id="${escapeHTML(note.id)}">Delete</button></span></footer></article>`).join('') : query ? 'No notes match that search.' : 'No saved notes yet.';
}

function renderAll() {
  renderDashboard();
  renderTasks();
  renderCards();
  renderNotes();
  renderReview();
  $('#storageStatus').textContent = 'Saved only in this browser';
}

function addTask(form) {
  const data = new FormData(form);
  const title = String(data.get('title') || '').trim();
  if (!title) return;
  state.tasks.push({ id: createId('task'), title, subject: String(data.get('subject') || '').trim(), minutes: Math.max(5, Math.min(600, Number(data.get('minutes')) || 30)), dueDate: String(data.get('dueDate') || ''), priority: ['low','medium','high'].includes(data.get('priority')) ? data.get('priority') : 'medium', done: false, createdAt: new Date().toISOString(), completedAt: '' });
  form.reset();
  form.elements.minutes.value = 30;
  persist('Study task added.');
}

function addCard(form) {
  const data = new FormData(form);
  const front = String(data.get('front') || '').trim();
  const back = String(data.get('back') || '').trim();
  if (!front || !back) return;
  state.cards.push({ id: createId('card'), front, back, subject: String(data.get('subject') || '').trim(), createdAt: new Date().toISOString(), dueAt: new Date().toISOString(), intervalDays: 0, ease: 2.3, repetitions: 0, lapses: 0, lastReviewedAt: '' });
  form.reset();
  browseAllCards = false;
  currentReviewId = state.cards[state.cards.length - 1].id;
  answerRevealed = false;
  persist('Flashcard saved and ready to review.');
  setRoute('flashcards');
}

function addNote(title, subject, content) {
  if (!title.trim() || !content.trim()) return false;
  state.notes.push({ id: createId('note'), title: title.trim(), subject: subject.trim(), content: content.trim(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  persist('Note saved.');
  return true;
}

function removeById(key, id) {
  const before = state[key].length;
  state[key] = state[key].filter(item => item.id !== id);
  if (state[key].length !== before) persist('Item deleted.');
}

function handleAction(action, id, button) {
  if (action === 'toggle-task') {
    const task = state.tasks.find(item => item.id === id);
    if (task) { task.done = !task.done; task.completedAt = task.done ? new Date().toISOString() : ''; persist(task.done ? 'Task completed.' : 'Task reopened.'); }
  } else if (action === 'delete-task') {
    if (confirm('Delete this study task?')) removeById('tasks', id);
  } else if (action === 'delete-card') {
    if (confirm('Delete this flashcard?')) { removeById('cards', id); if (currentReviewId === id) currentReviewId = null; }
  } else if (action === 'delete-note') {
    if (confirm('Delete this note?')) removeById('notes', id);
  } else if (action === 'edit-note') {
    const note = state.notes.find(item => item.id === id);
    if (!note) return;
    const title = prompt('Edit note title:', note.title);
    if (title === null) return;
    const content = prompt('Edit note content:', note.content);
    if (content === null) return;
    const subject = prompt('Edit subject:', note.subject || '');
    if (subject === null) return;
    if (!title.trim() || !content.trim()) { showToast('Title and content cannot be empty.'); return; }
    note.title = title.trim().slice(0,120); note.content = content.trim().slice(0,15000); note.subject = subject.trim().slice(0,60); note.updatedAt = new Date().toISOString(); persist('Note updated.');
  }
}

function rateCurrentCard(rating) {
  const card = state.cards.find(item => item.id === currentReviewId);
  if (!card) return;
  const updated = scheduleReview(card, rating);
  Object.assign(card, updated);
  state.reviewCount += 1;
  currentReviewId = null;
  answerRevealed = false;
  if (quizSession?.active) quizSession.reviewed += 1;
  persist(`Review recorded: ${rating}.`);
}

function createQuiz() {
  if (!state.cards.length) { showToast('Create at least one flashcard first.'); return; }
  const length = Number($('#quizLength').value) || 5;
  const cards = [...state.cards].sort(() => Math.random() - 0.5).slice(0, Math.min(length, state.cards.length));
  quizSession = { cards, index: 0, correct: 0, incorrect: 0, revealed: false, active: true };
  renderQuiz();
}

function renderQuiz() {
  if (!quizSession) {
    $('#quizTitle').textContent = 'Your practice session';
    $('#quizSubtitle').textContent = 'Your quiz results will appear here.';
    $('#quizCounter').textContent = 'NOT STARTED';
    $('#quizArea').className = 'quiz-area empty-state';
    $('#quizArea').textContent = 'Start a quiz when your cards are ready.';
    return;
  }
  if (quizSession.index >= quizSession.cards.length) {
    quizSession.active = false;
    const total = quizSession.cards.length;
    $('#quizTitle').textContent = 'Practice complete';
    $('#quizSubtitle').textContent = `${total} flashcard${total === 1 ? '' : 's'} reviewed`;
    $('#quizCounter').textContent = 'COMPLETE';
    $('#quizArea').className = 'quiz-area';
    $('#quizArea').innerHTML = `<span class="eyebrow">SELF-REPORTED RESULT</span><div class="quiz-result">${Math.round(quizSession.correct / Math.max(1,total) * 100)}%</div><p class="muted">${quizSession.correct} remembered · ${quizSession.incorrect} needs more practice</p><p class="small-text muted">Your ratings have been used to schedule the next review.</p><button class="button button-primary" id="restartQuiz">Try another quiz</button>`;
    return;
  }
  const card = quizSession.cards[quizSession.index];
  $('#quizTitle').textContent = `Question ${quizSession.index + 1}`;
  $('#quizSubtitle').textContent = 'Try to recall the answer before revealing it.';
  $('#quizCounter').textContent = `${quizSession.index + 1} / ${quizSession.cards.length}`;
  $('#quizArea').className = 'quiz-area';
  $('#quizArea').innerHTML = `<span class="result-type">${escapeHTML(card.subject || 'GENERAL')}</span><div class="quiz-question">${escapeHTML(card.front)}</div>${quizSession.revealed ? `<div class="quiz-answer"><strong>Answer</strong><br><br>${escapeHTML(card.back)}</div><div class="quiz-buttons"><button class="button button-outline" data-quiz-grade="incorrect">Need more practice</button><button class="button button-primary" data-quiz-grade="correct">I remembered it</button></div>` : '<button class="button button-primary" id="quizReveal">Reveal answer</button>'}`;
}

function gradeQuiz(correct) {
  if (!quizSession?.active || quizSession.index >= quizSession.cards.length) return;
  const card = quizSession.cards[quizSession.index];
  const rating = correct ? 'good' : 'again';
  Object.assign(card, scheduleReview(card, rating));
  if (correct) quizSession.correct += 1; else quizSession.incorrect += 1;
  state.reviewCount += 1;
  quizSession.index += 1;
  quizSession.revealed = false;
  persist();
  renderQuiz();
}

function runHelper(query) {
  const matches = [];
  for (const note of state.notes) {
    const score = scoreTextMatch(query, [note.title, note.subject, note.content]);
    if (score) matches.push({ type: 'NOTE', title: note.title, subject: note.subject, content: note.content, score });
  }
  for (const card of state.cards) {
    const score = scoreTextMatch(query, [card.front, card.back, card.subject]);
    if (score) matches.push({ type: 'FLASHCARD', title: card.front, subject: card.subject, content: card.back, score });
  }
  matches.sort((a,b) => b.score - a.score);
  const top = matches.slice(0, 8);
  $('#helperResults').classList.toggle('empty-state', top.length === 0);
  $('#helperResults').innerHTML = top.length ? top.map(item => `<article class="result-card"><header><span class="result-type">${item.type}</span><span class="result-score">${item.score >= 5 ? 'Strong match' : 'Keyword match'}</span></header><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.content)}</p><div class="library-card-foot"><span>${escapeHTML(item.subject || 'GENERAL')}</span></div></article>`).join('') : 'No relevant notes or flashcards found. Save study material with matching terms, or try a shorter keyword.';
}

function exportBackup() {
  const blob = new Blob([JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `remmind-study-backup-${todayISO()}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  showToast('Backup downloaded.');
}

function importBackup(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = normalizeState(JSON.parse(String(reader.result)));
      if (!confirm(`Import ${imported.tasks.length} tasks, ${imported.cards.length} cards and ${imported.notes.length} notes? This will replace the current workspace.`)) return;
      state = imported;
      persist('Backup imported.');
      $('#importStatus').textContent = `Imported ${state.tasks.length} tasks, ${state.cards.length} cards and ${state.notes.length} notes.`;
    } catch (error) {
      $('#importStatus').textContent = `Import failed: ${error.message}`;
      showToast('Could not import that backup.');
    } finally {
      $('#importData').value = '';
    }
  };
  reader.onerror = () => { $('#importStatus').textContent = 'Could not read the selected file.'; };
  reader.readAsText(file);
}

function updateTimerDisplay() {
  const minutes = Math.floor(timerSeconds / 60);
  const seconds = timerSeconds % 60;
  $('#timerDisplay').textContent = `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
  $('#timerStart').textContent = timerRunning ? 'Pause timer' : timerSeconds === 0 ? 'Start again' : timerSeconds === timerPreset*60 ? 'Start focus' : 'Resume timer';
  $('#timerState').textContent = timerRunning ? 'Stay with one task' : timerSeconds === 0 ? 'Session complete' : 'Ready when you are';
}

function toggleTimer() {
  if (timerRunning) {
    clearInterval(timerInterval);
    timerInterval = null;
    timerRunning = false;
    updateTimerDisplay();
    return;
  }
  if (timerSeconds <= 0) timerSeconds = timerPreset * 60;
  timerRunning = true;
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    timerSeconds = Math.max(0, timerSeconds - 1);
    updateTimerDisplay();
    if (timerSeconds === 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      timerRunning = false;
      showToast('Focus session complete. Take a short break.');
      updateTimerDisplay();
    }
  }, 1000);
}

function setTimerPreset(minutes) {
  if (timerRunning) { clearInterval(timerInterval); timerInterval = null; timerRunning = false; }
  timerPreset = minutes;
  timerSeconds = minutes * 60;
  $$('.preset').forEach(button => button.classList.toggle('active', Number(button.dataset.minutes) === minutes));
  updateTimerDisplay();
}

// Page events
$$('[data-route]').forEach(button => button.addEventListener('click', () => setRoute(button.dataset.route)));
$('#mobileMenu').addEventListener('click', () => {
  const isOpen = $('#sidebar').classList.toggle('open');
  $('#mobileMenu').setAttribute('aria-expanded', String(isOpen));
});
window.addEventListener('hashchange', () => setRoute(location.hash.slice(1)));
$('#taskForm').addEventListener('submit', event => { event.preventDefault(); addTask(event.currentTarget); });
$('#cardForm').addEventListener('submit', event => { event.preventDefault(); addCard(event.currentTarget); });
$('#noteForm').addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  if (addNote(String(data.get('title') || ''), String(data.get('subject') || ''), String(data.get('content') || ''))) event.currentTarget.reset();
});
$('#readerNoteForm').addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  if (addNote(String(data.get('title') || ''), 'PDF reading', String(data.get('content') || ''))) event.currentTarget.reset();
});
$$('[data-task-filter]').forEach(button => button.addEventListener('click', () => { taskFilter = button.dataset.taskFilter; renderTasks(); }));
$('#cardSearch').addEventListener('input', renderCards);
$('#noteSearch').addEventListener('input', renderNotes);
$('#showAllCards').addEventListener('click', () => { browseAllCards = !browseAllCards; currentReviewId = null; answerRevealed = false; $('#showAllCards').textContent = browseAllCards ? 'Review due cards' : 'Browse all cards'; renderReview(); });
$('#reviewArea').addEventListener('click', event => {
  if (event.target.closest('#revealAnswer')) { answerRevealed = true; renderReview(); }
  else if (event.target.closest('#hideAnswer')) { answerRevealed = false; renderReview(); }
});
$('#reviewControls').addEventListener('click', event => {
  const button = event.target.closest('[data-rate]');
  if (button) rateCurrentCard(button.dataset.rate);
});
$('#cardList').addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (button) handleAction(button.dataset.action, button.dataset.id, button);
});
$('#taskList').addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (button) handleAction(button.dataset.action, button.dataset.id, button);
});
$('#dashboardTasks').addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (button) handleAction(button.dataset.action, button.dataset.id, button);
});
$('#noteList').addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (button) handleAction(button.dataset.action, button.dataset.id, button);
});
$('#startQuiz').addEventListener('click', createQuiz);
$('#quizArea').addEventListener('click', event => {
  if (event.target.closest('#quizReveal') && quizSession?.active) { quizSession.revealed = true; renderQuiz(); }
  const grade = event.target.closest('[data-quiz-grade]');
  if (grade) gradeQuiz(grade.dataset.quizGrade === 'correct');
  if (event.target.closest('#restartQuiz')) createQuiz();
});
$('#helperForm').addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  runHelper(String(data.get('query') || '').trim());
});
$('#pdfInput').addEventListener('change', event => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) { showToast('Choose a PDF file.'); event.target.value = ''; return; }
  if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl);
  pdfObjectUrl = URL.createObjectURL(file);
  $('#pdfFrame').src = pdfObjectUrl;
  $('#pdfFrame').hidden = false;
  $('#pdfEmpty').hidden = true;
  showToast('PDF opened locally in your browser.');
});
$('#exportData').addEventListener('click', exportBackup);
$('#importData').addEventListener('change', event => importBackup(event.target.files?.[0]));
$('#resetData').addEventListener('click', () => {
  if (!confirm('This permanently removes all RemMind Study Hub data saved in this browser. Export a backup first if you may need it. Continue?')) return;
  clearState();
  state = createEmptyState();
  currentReviewId = null; answerRevealed = false; browseAllCards = false; quizSession = null;
  persist('Workspace reset.');
  renderQuiz();
  $('#importStatus').textContent = '';
});
$('#timerStart').addEventListener('click', toggleTimer);
$('#timerReset').addEventListener('click', () => setTimerPreset(timerPreset));
$$('.preset').forEach(button => button.addEventListener('click', () => setTimerPreset(Number(button.dataset.minutes))));

const formattedToday = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
$('#todayLabel').textContent = formattedToday.toUpperCase();
const hour = new Date().getHours();
$('#greeting').textContent = hour < 12 ? 'Good morning.' : hour < 18 ? 'Good afternoon.' : 'Good evening.';
if (!loaded.available) showToast('Browser storage could not be read. Changes may not persist.');
renderAll();
renderQuiz();
updateTimerDisplay();
setRoute(location.hash.slice(1) || 'dashboard');
window.addEventListener('beforeunload', () => {
  if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl);
  if (timerInterval) clearInterval(timerInterval);
});
