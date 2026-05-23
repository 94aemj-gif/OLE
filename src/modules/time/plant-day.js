// @ts-check
/**
 * Plant day = civil-time day in the configured timezone, anchored at 00:00.
 * Returns the [startIso, endIso) UTC range for a given moment.
 *
 * @param {Date} now
 * @param {string} timezone
 */
export function plantDayRange(now, timezone) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  const localISO = `${parts.year}-${parts.month}-${parts.day}T00:00:00`;
  const start = zonedToUtc(localISO, timezone);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

function zonedToUtc(localISO, timezone) {
  const asUTC = new Date(`${localISO}Z`);
  const tzOffsetMin = getTimezoneOffsetMinutes(asUTC, timezone);
  return new Date(asUTC.getTime() + tzOffsetMin * 60 * 1000);
}

function getTimezoneOffsetMinutes(date, timezone) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  const asLocalUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day === '24' ? '0' : parts.day),
    Number(parts.hour === '24' ? '0' : parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return (date.getTime() - asLocalUTC) / 60000;
}

/**
 * Hour bucket for a moment in plant-local time (returns an ISO at the start of the hour).
 * @param {Date} when
 * @param {string} timezone
 */
export function hourBucket(when, timezone) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = Object.fromEntries(fmt.formatToParts(when).map((p) => [p.type, p.value]));
  const localISO = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:00:00`;
  return zonedToUtc(localISO, timezone).toISOString();
}
