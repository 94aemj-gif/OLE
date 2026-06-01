// @ts-check
// Group captures into labeled comparison windows (PRD §7.6): by shift, civil
// day, or ISO week. Feeds compareWindows() for side-by-side analysis.

/** ISO-8601 week key (e.g. "2026-W22") for a YYYY-MM-DD date string. */
export function isoWeekKey(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  d.setUTCDate(d.getUTCDate() - day + 3); // nearest Thursday
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const ftDay = (firstThursday.getUTCDay() + 6) % 7;
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / 86400000 / 7 - (3 - ftDay) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

const KEY_FNS = {
  day: (c) => String(c.hour_bucket).slice(0, 10),
  shift: (c) => `${String(c.hour_bucket).slice(0, 10)} · ${c.shift_id}`,
  week: (c) => isoWeekKey(String(c.hour_bucket).slice(0, 10))
};

/**
 * Build labeled windows from captures.
 *
 * @param {Array<any>} captures
 * @param {'day'|'shift'|'week'} [grouping]
 * @param {{limit?:number}} [opts]
 * @returns {Array<{label:string, captures:any[]}>} oldest→newest, capped to `limit`
 */
export function buildWindows(captures, grouping = 'day', opts = {}) {
  const limit = opts.limit ?? 8;
  const keyFn = KEY_FNS[grouping] ?? KEY_FNS.day;
  const map = new Map();
  for (const c of captures ?? []) {
    if (c.undone) continue;
    const k = keyFn(c);
    const list = map.get(k) ?? [];
    list.push(c);
    map.set(k, list);
  }
  // Order chronologically by each window's earliest capture (labels like
  // "S-EVENING"/"S-MORNING" would sort wrong alphabetically).
  const windows = [...map.entries()]
    .map(([label, caps]) => ({
      label,
      captures: caps,
      min: caps.reduce((m, c) => Math.min(m, Date.parse(c.hour_bucket)), Infinity)
    }))
    .sort((a, b) => a.min - b.min)
    .map(({ label, captures }) => ({ label, captures }));
  return windows.slice(-limit);
}
