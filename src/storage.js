import { createEmptyState, normalizeState, STORAGE_KEY } from './core.js';

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { state: createEmptyState(), available: true };
    return { state: normalizeState(JSON.parse(raw)), available: true };
  } catch (error) {
    console.error('Could not load local workspace:', error);
    return { state: createEmptyState(), available: false, error };
  }
}

export function saveState(state) {
  try {
    const output = { ...state, updatedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(output));
    return { ok: true, state: output };
  } catch (error) {
    console.error('Could not save local workspace:', error);
    return { ok: false, error };
  }
}

export function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Could not clear local workspace:', error);
    return false;
  }
}
