// Small, pure formatting and date helpers shared by the optional tools modules.

// ---- Day keys -------------------------------------------------------------

/** Convert a Date or date string to a local YYYY-MM-DD key. Returns '' if invalid. */
export function toDayKey(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = number => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Move a YYYY-MM-DD key forward or backward by a number of days. */
export function shiftDayKey(key, deltaDays) {
  const date = new Date(`${key}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + deltaDays);
  return toDayKey(date);
}

// ---- Text helpers ---------------------------------------------------------

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${Math.abs(count) === 1 ? singular : plural}`;
}

export function truncate(text, maxLength = 80) {
  const value = String(text ?? '');
  if (maxLength < 2 || value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

export function slugify(text, fallback = 'export') {
  const slug = String(text ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
}

// ---- Numbers and durations ------------------------------------------------

export function formatPercent(part, total, digits = 0) {
  const p = Number(part);
  const t = Number(total);
  if (!Number.isFinite(p) || !Number.isFinite(t) || t <= 0) return '0%';
  return `${((p / t) * 100).toFixed(digits)}%`;
}

export function formatDuration(minutes) {
  const total = Math.round(Number(minutes));
  if (!Number.isFinite(total) || total <= 0) return '0m';
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return [hours ? `${hours}h` : '', rest ? `${rest}m` : ''].filter(Boolean).join(' ');
}

// ---- Relative due dates ---------------------------------------------------

export function formatRelativeDue(iso, now = new Date()) {
  const due = Date.parse(iso);
  if (!Number.isFinite(due)) return 'Not scheduled';
  const diff = due - (now instanceof Date ? now.getTime() : new Date(now).getTime());
  const abs = Math.abs(diff);
  if (abs < 60 * 1000) return 'due now';
  const units = [['day', 86400000], ['hour', 3600000], ['minute', 60000]];
  const [name, size] = units.find(([, ms]) => abs >= ms);
  const amount = Math.floor(abs / size);
  return diff > 0 ? `due in ${pluralize(amount, name)}` : `${pluralize(amount, name)} overdue`;
}
