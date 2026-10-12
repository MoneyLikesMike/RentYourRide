const DEFAULT_TZ = 'America/Winnipeg';

/** "Winnipeg, CT" for a listing's IANA timezone. */
export function carTimeZoneLabel(tz?: string | null): string {
  const zone = tz || DEFAULT_TZ;
  const city = (zone.split('/').pop() || zone).replace(/_/g, ' ');
  let abbr = '';
  try {
    abbr =
      new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'shortGeneric' })
        .formatToParts(new Date())
        .find((p) => p.type === 'timeZoneName')?.value ?? '';
  } catch {
    abbr = '';
  }
  return abbr ? `${city}, ${abbr}` : city;
}

export function carTimeNote(tz?: string | null): string {
  return `Pickup and return times are in the car's local time (${carTimeZoneLabel(tz)}).`;
}

/** Calendar date the guest picked ("YYYY-MM-DD"), read from the browser's own clock. */
export function pickedDate(value: string | number | Date): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
