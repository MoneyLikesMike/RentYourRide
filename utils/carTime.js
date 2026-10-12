const DEFAULT_TZ = 'America/Winnipeg';

const ZONE_ABBR = {
  'America/Winnipeg': 'CT',
  'America/Regina': 'CT',
  'America/Toronto': 'ET',
  'America/Edmonton': 'MT',
  'America/Vancouver': 'PT',
  'America/Halifax': 'AT',
  'America/Moncton': 'AT',
  'America/St_Johns': 'NT',
  'America/Whitehorse': 'MT',
  'America/Yellowknife': 'MT',
  'America/Iqaluit': 'ET',
};

/** "Winnipeg, CT" for a listing's IANA timezone. */
export function carTimeZoneLabel(tz) {
  const zone = tz || DEFAULT_TZ;
  const city = (zone.split('/').pop() || zone).replace(/_/g, ' ');
  const abbr = ZONE_ABBR[zone];
  return abbr ? `${city}, ${abbr}` : city;
}

export function carTimeNote(tz) {
  return `Pickup and return times are in the car's local time (${carTimeZoneLabel(tz)}).`;
}

/** Calendar date the guest picked ("YYYY-MM-DD") from the phone's own clock. */
export function pickedDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
